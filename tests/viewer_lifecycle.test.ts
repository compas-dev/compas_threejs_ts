/** @vitest-environment happy-dom */

import {
  Box,
  Frame,
  pbDumpBytes,
  Quaternion,
} from "@gramaziokohler/compas-pb-ts";
import { nextTick } from "vue";
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

import { CompasViewerError, createViewer } from "../src/library";
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
    const first = createViewer(firstRoot, {
      mode: "embedded",
    });
    const second = createViewer(secondRoot, {
      mode: "embedded",
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

  describe("setTransformSnap", () => {
    function setup() {
      const container = document.createElement("div");
      document.body.append(container);
      const send = vi.fn();
      const runtime = new ViewerRuntime(container, { mode: "embedded", send });
      runtime.attach(container);
      // Box of size 1 x 2 x 3 centered on the origin.
      runtime.dispatch(boxBytes("snap-box"));
      const box = runtime.geometries.get("snap-box")!;
      const internals = runtime as unknown as {
        transformControls: THREE.EventDispatcher & {
          attach(object: THREE.Object3D): void;
          setMode(mode: string): void;
          translationSnap: number | null;
          rotationSnap: number | null;
        };
      };
      const controls = internals.transformControls;
      controls.attach(box);
      function drag(mode: string, edit: () => void): void {
        controls.setMode(mode);
        controls.dispatchEvent({
          type: "dragging-changed",
          value: true,
        } as never);
        edit();
        box.updateMatrixWorld(true);
        controls.dispatchEvent({
          type: "dragging-changed",
          value: false,
        } as never);
        controls.dispatchEvent({ type: "mouseUp" } as never);
      }
      return { runtime, box, controls, drag, send };
    }

    it("sets the gizmo's translation and rotation snap", () => {
      const { runtime, controls } = setup();
      runtime.setTransformSnap({ grid: 0.5, angle: Math.PI / 12 });
      expect(controls.translationSnap).toBe(0.5);
      expect(controls.rotationSnap).toBeCloseTo(Math.PI / 12);

      runtime.setTransformSnap({ grid: null, angle: null });
      expect(controls.translationSnap).toBeNull();
      expect(controls.rotationSnap).toBeNull();
      runtime.dispose();
    });

    it("snaps the distance moved on release, leaving other axes alone", () => {
      const { runtime, box, drag, send } = setup();
      runtime.setTransformSnap({ grid: 0.5, angle: null });

      drag("translate", () => {
        box.position.x += 0.37;
        box.position.y += 0.0001;
      });

      expect(box.position.x).toBeCloseTo(0.5, 9);
      expect(box.position.y).toBeCloseTo(0, 9);
      expect(box.position.z).toBeCloseTo(0, 9);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          dispatch: "object_transform",
          guid: "snap-box",
        }),
      );
      runtime.dispose();
    });

    it("snaps each moved face to the grid when scaling", () => {
      const { runtime, box, drag } = setup();
      runtime.setTransformSnap({ grid: 1, angle: null });

      // x faces move from -0.5/0.5 to -0.85/0.85: they snap to -1 and 1.
      drag("scale", () => {
        box.scale.x = 1.7;
      });

      const bounds = new THREE.Box3().setFromObject(box);
      expect(bounds.min.x).toBeCloseTo(-1, 9);
      expect(bounds.max.x).toBeCloseTo(1, 9);
      expect(bounds.min.y).toBeCloseTo(-1, 9);
      expect(bounds.max.z).toBeCloseTo(1.5, 9);
      runtime.dispose();
    });

    it("leaves drags alone while snapping is off", () => {
      const { box, drag, runtime } = setup();
      drag("translate", () => {
        box.position.x += 0.37;
      });
      expect(box.position.x).toBeCloseTo(0.37, 9);
      runtime.dispose();
    });
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

  it("skips an apply_transform command for an object currently being dragged", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    runtime.attach(container);

    runtime.dispatch(boxBytes("dragged-box"));
    const object = runtime.geometries.get("dragged-box")!;
    const internals = runtime as unknown as {
      dispatchObject(object: unknown): void;
      transformControls: { dragging: boolean; object?: THREE.Object3D };
    };
    internals.transformControls.dragging = true;
    internals.transformControls.object = object;

    internals.dispatchObject({
      dispatch: "handle_geometry",
      type: "apply_transform",
      guid: "dragged-box",
      matrix: [
        [1, 0, 0, 99],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ],
    });

    expect(object.position.toArray()).toEqual([0, 0, 0]);

    runtime.dispose();
  });
});
