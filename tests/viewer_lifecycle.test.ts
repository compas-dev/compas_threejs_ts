/** @vitest-environment happy-dom */

import {
  Box,
  Frame,
  pbDumpBytes,
  Quaternion,
} from "@gramaziokohler/compas-pb-ts";
import { defineComponent, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");

  class WebGLRenderer {
    readonly domElement = document.createElement("canvas");
    readonly shadowMap = { enabled: false, type: 0 };
    toneMapping = 0;
    toneMappingExposure = 1;
    outputColorSpace = "";

    setPixelRatio(): void {}
    setSize(width: number, height: number): void {
      this.domElement.width = width;
      this.domElement.height = height;
    }
    render(): void {}
    dispose(): void {}
  }

  return { ...actual, WebGLRenderer };
});

import {
  CompasViewerError,
  createViewer,
  definePlugin,
  useShortcuts,
  useViewer,
} from "../src/library";
import { ViewerRuntime } from "../src/viewer/viewer_runtime";
import * as THREE from "three";

const viewers: Array<{ dispose(): void }> = [];

function boxBytes(guid: string): Uint8Array {
  return pbDumpBytes(
    new Box({
      data: {
        guid,
        name: "Box",
        frame: {
          guid: "frame-guid",
          name: "Frame",
          point: { guid: "", name: "", x: 0, y: 0, z: 0 },
          xaxis: { guid: "", name: "", x: 1, y: 0, z: 0 },
          yaxis: { guid: "", name: "", x: 0, y: 1, z: 0 },
        },
        xsize: 1,
        ysize: 2,
        zsize: 3,
      },
    }),
  );
}

function frameBytes(guid: string): Uint8Array {
  return pbDumpBytes(
    new Frame({
      data: {
        guid,
        name: "Frame",
        point: { guid: "", name: "", x: 0, y: 0, z: 0 },
        xaxis: { guid: "", name: "", x: 1, y: 0, z: 0 },
        yaxis: { guid: "", name: "", x: 0, y: 1, z: 0 },
      },
    }),
  );
}

afterEach(() => {
  viewers.splice(0).forEach((viewer) => viewer.dispose());
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("createViewer", () => {
  it("creates, resets, and disposes an embedded viewer", () => {
    const defaultUp = THREE.Object3D.DEFAULT_UP.clone();
    const container = document.createElement("div");
    document.body.append(container);
    const viewer = createViewer(container, {
      mode: "embedded",
      showToolbar: false,
    });
    viewers.push(viewer);

    expect(THREE.Object3D.DEFAULT_UP.equals(defaultUp)).toBe(true);
    viewer.dispatch(boxBytes("box-one"));
    expect(container.querySelectorAll("canvas")).toHaveLength(1);

    viewer.reset();
    viewer.resize();
    viewer.dispose();
    viewers.pop();

    expect(container.childElementCount).toBe(0);
    expect(() => viewer.dispose()).not.toThrow();
  });

  it("reports decoding and unsupported-object errors through onError", () => {
    const errors: CompasViewerError[] = [];
    const container = document.createElement("div");
    document.body.append(container);
    const viewer = createViewer(container, {
      mode: "embedded",
      showToolbar: false,
      onError: (error) => errors.push(error),
    });
    viewers.push(viewer);

    viewer.dispatch(new Uint8Array());
    viewer.dispatch(
      pbDumpBytes(
        new Quaternion({
          data: {
            guid: "quaternion-guid",
            name: "Quaternion",
            w: 0.5,
            x: 0.5,
            y: 0.5,
            z: 0.5,
          },
        }),
      ),
    );

    expect(errors.map((error) => error.code)).toEqual([
      "decode_error",
      "unsupported_message",
    ]);
    expect(errors.every((error) => error instanceof CompasViewerError)).toBe(
      true,
    );
  });

  it("throws structured errors when no callback handles them", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const viewer = createViewer(container, {
      mode: "embedded",
      showToolbar: false,
    });
    viewers.push(viewer);

    expect(() => viewer.dispatch(new Uint8Array())).toThrowError(
      expect.objectContaining<Partial<CompasViewerError>>({
        code: "decode_error",
      }),
    );

    viewer.dispose();
    viewers.pop();
    expect(() => viewer.dispatch(boxBytes("disposed-box"))).toThrowError(
      expect.objectContaining<Partial<CompasViewerError>>({
        code: "lifecycle_error",
      }),
    );
  });

  it("keeps two viewer roots independent", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => undefined,
    });
    const firstRoot = document.createElement("div");
    const secondRoot = document.createElement("div");
    document.body.append(firstRoot, secondRoot);
    const darkMode = definePlugin({
      name: "dark_mode",
      groups: {
        display: {
          theme: defineComponent(() => {
            const viewer = useViewer();
            useShortcuts({
              d: () =>
                viewer.setTheme(
                  viewer.state.theme.value === "dark" ? "light" : "dark",
                ),
            });
            return () => h("button");
          }),
        },
      },
    });
    const first = createViewer(firstRoot, {
      mode: "embedded",
      plugins: [darkMode],
    });
    const second = createViewer(secondRoot, {
      mode: "embedded",
      plugins: [darkMode],
    });
    viewers.push(first, second);

    first.dispatch(boxBytes("first-box"));
    second.dispatch(boxBytes("second-box"));
    firstRoot.dispatchEvent(
      new KeyboardEvent("keydown", { key: "d", bubbles: true }),
    );
    await nextTick();

    expect(
      firstRoot.querySelector(".app-container")?.classList.contains("dark"),
    ).toBe(true);
    expect(
      secondRoot.querySelector(".app-container")?.classList.contains("dark"),
    ).toBe(false);

    first.reset();

    expect(firstRoot.querySelectorAll("canvas")).toHaveLength(1);
    expect(secondRoot.querySelectorAll("canvas")).toHaveLength(1);

    first.dispose();
    viewers.shift();
    expect(firstRoot.childElementCount).toBe(0);
    expect(secondRoot.childElementCount).toBeGreaterThan(0);
  });

  it("opens a WebSocket only when websocket mode is requested", () => {
    const openedUrls: string[] = [];
    class MockWebSocket {
      static readonly OPEN = 1;
      readonly readyState = 0;
      binaryType = "";
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;

      constructor(url: string) {
        openedUrls.push(url);
      }

      send(): void {}
      close(): void {}
    }
    vi.stubGlobal("WebSocket", MockWebSocket);

    const embeddedRoot = document.createElement("div");
    const websocketRoot = document.createElement("div");
    document.body.append(embeddedRoot, websocketRoot);
    const embedded = createViewer(embeddedRoot, {
      showToolbar: false,
    });
    viewers.push(embedded);
    expect(openedUrls).toEqual([]);

    const connected = createViewer(websocketRoot, {
      mode: "websocket",
      showToolbar: false,
      websocket: {
        host: "viewer.test",
        port: 9443,
        workspace: "secondary",
        secure: true,
      },
    });
    viewers.push(connected);

    expect(openedUrls).toEqual([
      "wss://viewer.test:9443/ws?workspace=secondary",
    ]);
  });

  it("preserves frame colors and releases viewer-owned materials", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, {
      mode: "embedded",
      defaultLighting: true,
    });
    runtime.attach(container);

    const materialDispose = vi.spyOn(THREE.Material.prototype, "dispose");
    runtime.dispatch(boxBytes("resource-box"));
    expect(materialDispose).toHaveBeenCalled();
    materialDispose.mockRestore();

    runtime.dispatch(frameBytes("colored-frame"));
    const frame = runtime.geometries.get("colored-frame");
    expect(frame).toBeInstanceOf(THREE.AxesHelper);
    expect(
      (frame as THREE.AxesHelper).material instanceof THREE.Material
        ? (frame as THREE.AxesHelper).material.vertexColors
        : false,
    ).toBe(true);

    const registered = new THREE.MeshStandardMaterial();
    const registeredDispose = vi.fn();
    registered.dispose = registeredDispose;
    const internals = runtime as unknown as {
      materials: Map<
        string,
        { material: THREE.Material; materialType: string }
      >;
    };
    internals.materials.set("registered-material", {
      material: registered,
      materialType: "standard_material",
    });

    runtime.dispose();

    expect(registeredDispose).toHaveBeenCalledOnce();
  });

  it("keeps a material edit on a picked object after it is deselected", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    runtime.attach(container);
    vi.spyOn(
      runtime.renderer.domElement,
      "getBoundingClientRect",
    ).mockReturnValue({ left: 0, top: 0, width: 800, height: 600 } as DOMRect);
    // A backend object without a material of its own, like `add_geometry(box)`.
    runtime.dispatch(boxBytes("plain-box"));
    const box = runtime.geometries.get("plain-box") as THREE.Mesh;
    const internals = runtime as unknown as {
      dispatchObject(object: unknown): void;
      pickFromPointer(event: MouseEvent): void;
      clearPickedObject(): void;
    };
    internals.pickFromPointer(
      new MouseEvent("mousedown", { clientX: 400, clientY: 300, button: 0 }),
    );
    expect(runtime.store.pickedObjectGuid.value).toBe("plain-box");

    // The backend's echo of a material edit arrives while the box is picked.
    internals.dispatchObject({
      dispatch: "material",
      type: "standard_material",
      guid: "edited-material",
      geometry_guid: "plain-box",
      color: "#00ff00",
      metalness: 0,
      roughness: 1,
      emissive: "#000000",
      emissive_intensity: 0,
      flat_shading: false,
      wireframe: false,
      transparent: false,
      opacity: 1,
    });
    const shown = () =>
      `#${(box.material as THREE.MeshStandardMaterial).color.getHexString()}`;
    expect(shown()).toBe("#00ff00");

    internals.clearPickedObject();
    expect(shown()).toBe("#00ff00");

    // A local edit shows at once too, instead of hiding under the highlight.
    internals.pickFromPointer(
      new MouseEvent("mousedown", { clientX: 400, clientY: 300, button: 0 }),
    );
    runtime.setMaterial("plain-box", { color: "#0000ff" });
    expect(shown()).toBe("#0000ff");

    runtime.dispose();
  });

  it("renders geometry without an external GUID", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    runtime.attach(container);

    runtime.dispatch(boxBytes(""));
    runtime.dispatch(boxBytes(""));

    expect(runtime.geometries.size).toBe(2);
    for (const [sceneKey, object] of runtime.geometries) {
      expect(sceneKey).toBe(object.uuid);
    }

    runtime.dispatch(boxBytes("addressable-box"));
    runtime.dispatch(boxBytes("addressable-box"));
    expect(runtime.geometries.size).toBe(3);
    expect(runtime.geometries.has("addressable-box")).toBe(true);

    runtime.dispose();
  });

  it("applies an apply_transform command to the existing Object3D in place", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    runtime.attach(container);

    runtime.dispatch(boxBytes("transformable-box"));
    const object = runtime.geometries.get("transformable-box")!;
    expect(object.position.toArray()).toEqual([0, 0, 0]);

    // apply_transform is a dict-shaped command, wire-encoded via compas_pb's DictData
    // fallback on the Python side (see Workspace.transform_geometry / Outbox.send_dict) -
    // there's no JS-side encoder for that shape since the frontend never sends dicts back
    // (see viewer_connection.ts), so this dispatches the already-decoded object directly,
    // exactly like `dispatch()` would after `decodeMessage()` returned it.
    const internals = runtime as unknown as {
      dispatchObject(object: unknown): void;
    };
    internals.dispatchObject({
      dispatch: "handle_geometry",
      type: "apply_transform",
      guid: "transformable-box",
      matrix: [
        [1, 0, 0, 10],
        [0, 1, 0, 5],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ],
    });

    expect(runtime.geometries.get("transformable-box")).toBe(object);
    expect(object.position.toArray()).toEqual([10, 5, 0]);

    runtime.dispose();
  });

  it("lets plugins veto picks, make objects unpickable, and follow the selection", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    runtime.attach(container);
    vi.spyOn(
      runtime.renderer.domElement,
      "getBoundingClientRect",
    ).mockReturnValue({ left: 0, top: 0, width: 800, height: 600 } as DOMRect);
    runtime.dispatch(boxBytes("box"));
    const internals = runtime as unknown as {
      pickFromPointer(event: MouseEvent): void;
    };
    const click = () =>
      internals.pickFromPointer(
        new MouseEvent("mousedown", { clientX: 400, clientY: 300, button: 0 }),
      );
    const seen: (string | null)[] = [];
    runtime.onSelectionChange((guid) => seen.push(guid));

    // An overlay in front of the box is never picked.
    const overlay = new THREE.Mesh(
      new THREE.BoxGeometry(50, 50, 50),
      new THREE.MeshBasicMaterial(),
    );
    const removeOverlay = runtime.addOverlay(overlay);
    click();
    expect(runtime.store.pickedObjectGuid.value).toBe("box");
    removeOverlay();
    expect(overlay.parent).toBeNull();

    // Locking the picked object deselects it, and it can't be picked again.
    runtime.setObjectPickable("box", false);
    click();
    expect(runtime.store.pickedObjectGuid.value).toBeNull();
    runtime.setObjectPickable("box", true);

    // A guard vetoes the pick.
    let busy = true;
    const removeGuard = runtime.addPickGuard(() => busy);
    click();
    expect(runtime.store.pickedObjectGuid.value).toBeNull();
    busy = false;
    click();
    removeGuard();

    // Rebuilding the picked object (the backend's echo) tells listeners again.
    runtime.dispatch(boxBytes("box"));
    expect(seen).toEqual(["box", null, "box", "box"]);

    runtime.dispose();
  });

  it("hands input to one plugin interaction at a time", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    runtime.attach(container);
    const canvas = runtime.renderer.domElement;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    } as DOMRect);
    runtime.dispatch(boxBytes("box"));
    const at = { clientX: 400, clientY: 300, button: 0, bubbles: true };

    expect(runtime.pointerRay(at)?.direction.length()).toBeCloseTo(1);
    expect(runtime.visibleObjects().map((entry) => entry.guid)).toEqual([
      "box",
    ]);

    const events: string[] = [];
    const first = runtime.beginInteraction({
      onPointerDown: () => events.push("first down"),
      onPointerMove: () => events.push("first move"),
      onKeyDown: (event) => events.push(`first ${event.key}`),
      onInterrupt: () => events.push("first interrupted"),
    });
    expect(runtime.store.interacting.value).toBe(true);
    canvas.dispatchEvent(new MouseEvent("mousedown", at));
    canvas.dispatchEvent(new MouseEvent("mousemove", at));
    container.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    // The click went to the plugin, so nothing was picked.
    expect(runtime.store.pickedObjectGuid.value).toBeNull();

    const second = runtime.beginInteraction({});
    expect(first.active).toBe(false);
    second.release();
    expect(runtime.store.interacting.value).toBe(false);
    canvas.dispatchEvent(new MouseEvent("mousedown", at));
    expect(runtime.store.pickedObjectGuid.value).toBe("box");

    expect(events).toEqual([
      "first down",
      "first move",
      "first Escape",
      "first interrupted",
    ]);
    runtime.dispose();
  });

  it("renders the view into a canvas of the requested size", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    runtime.attach(container);
    const context = { drawImage: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as never,
    );
    const canvas = runtime.captureImage({ width: 320, height: 200 });
    expect([canvas.width, canvas.height]).toEqual([320, 200]);
    expect(context.drawImage).toHaveBeenCalledOnce();
    runtime.dispose();
  });

  it("skips an apply_transform command for an object a plugin holds", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    runtime.attach(container);

    runtime.dispatch(boxBytes("dragged-box"));
    const object = runtime.geometries.get("dragged-box")!;
    const internals = runtime as unknown as {
      dispatchObject(object: unknown): void;
    };
    const moveBy = (x: number) =>
      internals.dispatchObject({
        dispatch: "handle_geometry",
        type: "apply_transform",
        guid: "dragged-box",
        matrix: [
          [1, 0, 0, x],
          [0, 1, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 1],
        ],
      });

    const release = runtime.holdObjectUpdates("dragged-box");
    moveBy(99);
    expect(object.position.toArray()).toEqual([0, 0, 0]);

    release();
    moveBy(2);
    expect(object.position.toArray()).toEqual([2, 0, 0]);

    runtime.dispose();
  });
  it("shows metadata fields in the order the backend sent them", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    const internals = runtime as unknown as {
      dispatchObject(data: Record<string, unknown>): void;
    };
    // A protobuf map on the way loses the order: "__order__" carries it.
    internals.dispatchObject({
      dispatch: "object_infos",
      Length: "3.48 m",
      Type: "Beam",
      Floor: "F1",
      __order__: ["Type", "Floor", "Length"],
    });
    expect(Object.keys(runtime.store.objectBarData.data!)).toEqual([
      "Type",
      "Floor",
      "Length",
    ]);
    runtime.dispose();
  });
  it("outlines one object's edges, as see-through as the object, kept across re-sends", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    runtime.attach(container);
    const internals = runtime as unknown as {
      dispatchObject(object: unknown): void;
    };
    const edgesOf = (guid: string) =>
      runtime.geometries
        .get(guid)!
        .children.filter(
          (child) => child.userData.edges,
        ) as THREE.LineSegments[];
    runtime.dispatch(boxBytes("outlined"));
    runtime.dispatch(boxBytes("plain"));
    internals.dispatchObject({
      dispatch: "handle_geometry",
      type: "set_edges",
      guid: "outlined",
      show: true,
    });
    expect(edgesOf("outlined")).toHaveLength(1);
    expect(edgesOf("plain")).toHaveLength(0);
    expect(edgesOf("outlined")[0]!.layers.mask).toBe(1 << 1); // never picked

    // A see-through material makes the outline see-through too.
    internals.dispatchObject({
      dispatch: "material",
      type: "standard_material",
      guid: "ghost",
      geometry_guid: "outlined",
      color: "#ff0000",
      metalness: 0,
      roughness: 1,
      emissive: "#000000",
      emissive_intensity: 0,
      flat_shading: false,
      wireframe: false,
      transparent: true,
      opacity: 0.25,
    });
    const line = edgesOf("outlined")[0]!.material as THREE.LineBasicMaterial;
    expect(line.transparent).toBe(true);
    expect(line.opacity).toBeCloseTo(0.25);

    // Kept by guid: a re-sent object is outlined again, once.
    runtime.dispatch(boxBytes("outlined"));
    expect(edgesOf("outlined")).toHaveLength(1);

    internals.dispatchObject({
      dispatch: "handle_geometry",
      type: "set_edges",
      guid: "outlined",
      show: false,
    });
    expect(edgesOf("outlined")).toHaveLength(0);

    runtime.dispose();
  });
});
