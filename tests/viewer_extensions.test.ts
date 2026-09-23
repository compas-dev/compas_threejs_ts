/** @vitest-environment happy-dom */

import { Box, pbDumpBytes } from "@gramaziokohler/compas-pb-ts";
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
  type CompasViewer,
  type CompasViewerOptions,
  type ViewerExtensionContext,
  type ViewerPlugin,
} from "../src/library";
import * as THREE from "three";

const viewers: CompasViewer[] = [];

// The viewer's default camera sits at (8, -15, 15) looking at the origin, so the
// center of a stubbed 800x600 canvas casts a ray straight through (0, 0, 0).
const CENTER = { clientX: 400, clientY: 300 };

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

/** Creates an embedded viewer with one plugin and returns the context it got. */
function viewerWithContext(options: CompasViewerOptions = {}): {
  viewer: CompasViewer;
  context: ViewerExtensionContext;
  container: HTMLElement;
} {
  const container = document.createElement("div");
  document.body.append(container);
  let captured: ViewerExtensionContext | null = null;
  const viewer = createViewer(container, {
    mode: "embedded",
    showToolbar: false,
    ...options,
    plugins: [
      {
        id: "probe",
        install(context) {
          captured = context;
        },
      },
      ...(options.plugins ?? []),
    ],
  });
  viewers.push(viewer);
  const context = captured as ViewerExtensionContext | null;
  if (!context) throw new Error("probe plugin was not installed");
  vi.spyOn(context.canvas, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
  } as DOMRect);
  return { viewer, context, container };
}

function mouse(type: string, button = 0): MouseEvent {
  return new MouseEvent(type, { ...CENTER, button, bubbles: true });
}

function key(value: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { key: value, bubbles: true });
}

afterEach(() => {
  viewers.splice(0).forEach((viewer) => viewer.dispose());
  document.body.replaceChildren();
});

describe("viewer plugins", () => {
  it("installs plugins in order with a narrow, frozen context", () => {
    const order: string[] = [];
    const plugin = (id: string): ViewerPlugin => ({
      id,
      install: () => void order.push(id),
    });
    const { context } = viewerWithContext({
      plugins: [plugin("a"), plugin("b")],
    });

    expect(order).toEqual(["a", "b"]);
    expect(Object.isFrozen(context)).toBe(true);
    expect(context.canvas).toBeInstanceOf(HTMLCanvasElement);
    for (const internal of ["scene", "camera", "renderer", "controls"]) {
      expect(internal in context).toBe(false);
    }
  });

  it("rejects duplicate ids before installing anything", () => {
    const install = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);

    expect(() =>
      createViewer(container, {
        mode: "embedded",
        plugins: [
          { id: "same", install },
          { id: "same", install },
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "lifecycle_error",
        details: { plugin: "same" },
      }),
    );
    expect(install).not.toHaveBeenCalled();
    expect(container.childElementCount).toBe(0);
  });

  it("disposes the viewer, cleaning up earlier plugins, when one fails to install", () => {
    const cleanup = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);

    let thrown: unknown;
    try {
      createViewer(container, {
        mode: "embedded",
        plugins: [
          { id: "ok", install: () => cleanup },
          {
            id: "broken",
            install() {
              throw new Error("boom");
            },
          },
        ],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CompasViewerError);
    expect(thrown).toMatchObject({
      code: "lifecycle_error",
      details: { plugin: "broken" },
    });
    expect((thrown as Error).cause).toEqual(new Error("boom"));
    expect(cleanup).toHaveBeenCalledOnce();
    expect(container.childElementCount).toBe(0);
  });

  it("runs cleanups in reverse order on dispose and reports their errors", () => {
    const order: string[] = [];
    const onError = vi.fn();
    const { viewer } = viewerWithContext({
      onError,
      plugins: [
        { id: "first", install: () => () => void order.push("first") },
        {
          id: "failing",
          install: () => () => {
            order.push("failing");
            throw new Error("cleanup failed");
          },
        },
        { id: "last", install: () => () => void order.push("last") },
      ],
    });

    viewer.dispose();

    expect(order).toEqual(["last", "failing", "first"]);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "lifecycle_error" }),
    );
  });
});

describe("ViewerExtensionContext", () => {
  it("keeps overlays out of picking, reset and backend-managed objects", () => {
    const { viewer, context } = viewerWithContext();
    const overlay = new THREE.Mesh(
      new THREE.BoxGeometry(100, 100, 100),
      new THREE.MeshBasicMaterial(),
    );
    const remove = context.addOverlay(overlay);

    expect(overlay.parent?.parent).toBeInstanceOf(THREE.Scene);
    // A huge overlay box surrounds the camera ray, yet only backend objects pick.
    expect(context.pickObjects(CENTER)).toEqual([]);
    expect(context.objectBounds()).toEqual([]);

    viewer.reset();
    expect(overlay.parent).not.toBeNull();

    remove();
    remove();
    expect(overlay.parent).toBeNull();
  });

  it("removes remaining overlays on dispose, each with its own removed event", () => {
    const { viewer, context } = viewerWithContext();
    const nested = new THREE.Group();
    const leftover = new THREE.Object3D();
    const removed = vi.fn();
    leftover.addEventListener("removed", removed);
    context.addOverlay(nested);
    context.addOverlay(leftover);

    viewer.dispose();

    expect(removed).toHaveBeenCalledOnce();
    expect(leftover.parent).toBeNull();
    expect(nested.parent).toBeNull();
    expect(() => context.addOverlay(new THREE.Object3D())).toThrowError(
      expect.objectContaining({ code: "lifecycle_error" }),
    );
  });

  it("casts pointer rays onto horizontal planes", () => {
    const { context } = viewerWithContext();

    const ray = context.pointerRay(CENTER);
    expect(ray?.origin.distanceTo(new THREE.Vector3(8, -15, 15))).toBeCloseTo(
      0,
    );

    const ground = context.pointerOnPlane(CENTER, 0);
    expect(ground?.x).toBeCloseTo(0);
    expect(ground?.y).toBeCloseTo(0);
    expect(ground?.z).toBeCloseTo(0);

    // Halfway up the camera's height, the ray is halfway to the origin.
    const raised = context.pointerOnPlane(CENTER, 7.5);
    expect(raised?.x).toBeCloseTo(4);
    expect(raised?.y).toBeCloseTo(-7.5);
    expect(raised?.z).toBeCloseTo(7.5);

    vi.mocked(context.canvas.getBoundingClientRect).mockReturnValue({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    } as DOMRect);
    expect(context.pointerRay(CENTER)).toBeNull();
    expect(context.pointerOnPlane(CENTER, 0)).toBeNull();
    expect(context.pickObjects(CENTER)).toEqual([]);
  });

  it("picks and bounds visible backend objects by guid", () => {
    const { viewer, context } = viewerWithContext();
    viewer.dispatch(boxBytes("box-guid"));

    const [hit, ...rest] = context.pickObjects(CENTER);
    expect(rest).toEqual([]);
    expect(hit?.guid).toBe("box-guid");
    expect(hit?.distance).toBeGreaterThan(0);

    const [bounds] = context.objectBounds();
    expect(bounds?.guid).toBe("box-guid");
    expect(bounds?.min.x).toBeCloseTo(-0.5);
    expect(bounds?.min.y).toBeCloseTo(-1);
    expect(bounds?.min.z).toBeCloseTo(-1.5);
    expect(bounds?.max.x).toBeCloseTo(0.5);
    expect(bounds?.max.y).toBeCloseTo(1);
    expect(bounds?.max.z).toBeCloseTo(1.5);
  });

  it("reports viewport size and notifies resize listeners until unsubscribed", () => {
    const { viewer, context } = viewerWithContext();
    const listener = vi.fn();
    const unsubscribe = context.onResize(listener);

    viewer.resize();
    expect(listener).toHaveBeenCalledWith(context.viewportSize());

    unsubscribe();
    viewer.resize();
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe("backend, selection and material access", () => {
  it("sends plugin messages through the viewer's transport", () => {
    const send = vi.fn();
    const { context } = viewerWithContext({ send });

    const message = {
      dispatch: "create_geometry",
      type: "point",
      point: [1, 2, 3],
    };
    expect(context.send(message)).toBe(true);

    expect(send).toHaveBeenCalledWith(message);
  });

  it("reports the picked object and notifies until unsubscribed", () => {
    const { viewer, context } = viewerWithContext();
    viewer.dispatch(boxBytes("box-guid"));
    const listener = vi.fn();
    const unsubscribe = context.onSelectionChange(listener);
    expect(context.selection()).toBeNull();

    context.canvas.dispatchEvent(mouse("mousedown"));
    expect(context.selection()).toBe("box-guid");
    expect(listener).toHaveBeenLastCalledWith("box-guid");

    // Beginning an interaction clears the pick.
    context.beginInteraction({}).release();
    expect(listener).toHaveBeenLastCalledWith(null);

    unsubscribe();
    context.canvas.dispatchEvent(mouse("mousedown"));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("reads and edits an object's material, telling the backend", () => {
    const send = vi.fn();
    const { viewer, context } = viewerWithContext({ send });
    viewer.dispatch(boxBytes("box-guid"));

    // A box the backend sent without a material has nothing to read.
    expect(context.getMaterial("box-guid")).toBeNull();

    context.setMaterial("box-guid", { color: "#ff0000", roughness: 0.2 });
    expect(send).toHaveBeenCalledWith({
      dispatch: "material_edit",
      guid: "box-guid",
      color: "#ff0000",
      roughness: 0.2,
    });
  });
});

describe("beginInteraction", () => {
  it("routes input to the session instead of picking and shortcuts, until released", () => {
    const send = vi.fn();
    const { viewer, context } = viewerWithContext({ send });
    viewer.dispatch(boxBytes("box-guid"));
    const canvas = context.canvas;

    // Ordinary picking works before any session.
    canvas.dispatchEvent(mouse("mousedown"));
    expect(send).toHaveBeenCalledWith({
      dispatch: "object_picked",
      guid: "box-guid",
    });
    send.mockClear();

    const handlers = {
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onKeyDown: vi.fn(),
    };
    // Started from a control outside the viewer, which holds focus.
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    const session = context.beginInteraction(handlers);
    expect(session.active).toBe(true);
    expect(document.activeElement).toBe(canvas);

    canvas.dispatchEvent(mouse("mousedown"));
    canvas.dispatchEvent(mouse("mousemove"));
    // Keys typed after focus moved reach the session via the viewer root.
    document.activeElement!.dispatchEvent(key("Escape"));
    canvas.dispatchEvent(key("p"));
    expect(handlers.onPointerDown).toHaveBeenCalledOnce();
    expect(handlers.onPointerMove).toHaveBeenCalledOnce();
    expect(handlers.onKeyDown.mock.calls.map(([event]) => event.key)).toEqual([
      "Escape",
      "p",
    ]);
    expect(send).not.toHaveBeenCalled();

    session.release();
    session.release();
    expect(session.active).toBe(false);

    canvas.dispatchEvent(mouse("mousedown"));
    canvas.dispatchEvent(mouse("mousemove"));
    expect(handlers.onPointerDown).toHaveBeenCalledOnce();
    expect(handlers.onPointerMove).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith({
      dispatch: "object_picked",
      guid: "box-guid",
    });
  });

  it("interrupts the previous session when another begins", () => {
    const { context } = viewerWithContext();
    const first = { onInterrupt: vi.fn(), onPointerDown: vi.fn() };
    const second = { onInterrupt: vi.fn(), onPointerDown: vi.fn() };

    const firstSession = context.beginInteraction(first);
    const secondSession = context.beginInteraction(second);

    expect(first.onInterrupt).toHaveBeenCalledOnce();
    expect(firstSession.active).toBe(false);
    expect(secondSession.active).toBe(true);

    // Releasing the stale session must not end the current one.
    firstSession.release();
    context.canvas.dispatchEvent(mouse("mousedown"));
    expect(second.onPointerDown).toHaveBeenCalledOnce();
    expect(first.onPointerDown).not.toHaveBeenCalled();

    secondSession.release();
    expect(second.onInterrupt).not.toHaveBeenCalled();
  });

  it("interrupts the active session on dispose before cleanups run", () => {
    const order: string[] = [];
    let context: ViewerExtensionContext | null = null;
    const { viewer } = viewerWithContext({
      plugins: [
        {
          id: "session-owner",
          install(ctx) {
            context = ctx;
            return () => void order.push("cleanup");
          },
        },
      ],
    });
    const session = context!.beginInteraction({
      onInterrupt: () => void order.push("interrupt"),
    });

    viewer.dispose();

    expect(order).toEqual(["interrupt", "cleanup"]);
    expect(session.active).toBe(false);
    expect(() => context!.beginInteraction({})).toThrowError(
      expect.objectContaining({ code: "lifecycle_error" }),
    );
  });
});
