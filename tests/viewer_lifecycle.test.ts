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
  useViewerMessaging,
} from "../src/library";
import type { ToolDefinition } from "../src/library/types";
import { ViewerRuntime } from "../src/viewer/viewer_runtime";
import * as THREE from "three";

const viewers: Array<{ dispose(): void }> = [];

function definePingTool(toolId: string) {
  return defineComponent({
    name: `PingTool-${toolId}`,
    setup() {
      const { sendData } = useViewerMessaging();
      function handleClick() {
        sendData({ dispatch: "other_action", action: "ping", tool: toolId });
      }
      return () =>
        h(
          "button",
          { class: "ping-tool", "data-tool-id": toolId, onClick: handleClick },
          toolId,
        );
    },
  });
}

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
});

describe("toolbar extension API", () => {
  it("mounts toolbarTools after the built-in groups, sorted by order", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const tools: ToolDefinition[] = [
      { id: "later", component: definePingTool("later"), order: 20 },
      { id: "earlier", component: definePingTool("earlier"), order: 5 },
      { id: "unordered", component: definePingTool("unordered") },
    ];

    const viewer = createViewer(container, {
      mode: "embedded",
      toolbarTools: tools,
    });
    viewers.push(viewer);

    const toolbar = container.querySelector(".toolbar");
    expect(toolbar).not.toBeNull();

    const builtInGroups = toolbar!.querySelectorAll(".toolbar-group");
    expect(builtInGroups).toHaveLength(4);

    const toolIds = Array.from(toolbar!.querySelectorAll(".ping-tool")).map(
      (button) => button.getAttribute("data-tool-id"),
    );
    expect(toolIds).toEqual(["unordered", "earlier", "later"]);

    const lastBuiltInGroup = builtInGroups[builtInGroups.length - 1]!;
    const firstToolButton = toolbar!.querySelector(".ping-tool")!;
    expect(
      lastBuiltInGroup.compareDocumentPosition(firstToolButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("routes useViewerMessaging().sendData through the `send` option", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const outgoing: unknown[] = [];

    const viewer = createViewer(container, {
      mode: "embedded",
      toolbarTools: [{ id: "ping", component: definePingTool("ping") }],
      send: (message) => {
        outgoing.push(message);
        return true;
      },
    });
    viewers.push(viewer);

    const button = container.querySelector<HTMLButtonElement>(".ping-tool");
    expect(button).not.toBeNull();
    button!.click();
    button!.click();

    expect(outgoing).toEqual([
      { dispatch: "other_action", action: "ping", tool: "ping" },
      { dispatch: "other_action", action: "ping", tool: "ping" },
    ]);
  });

  it("renders only the built-in groups when toolbarTools is omitted", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const viewer = createViewer(container, { mode: "embedded" });
    viewers.push(viewer);

    expect(container.querySelectorAll(".toolbar-group")).toHaveLength(4);
    expect(container.querySelectorAll(".ping-tool")).toHaveLength(0);
  });
});
