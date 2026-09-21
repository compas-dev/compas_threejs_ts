/** @vitest-environment happy-dom */

import { createApp } from "vue";
import { describe, expect, it, vi } from "vitest";

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

import { CompasViewerError } from "../src/library";
import { parseViewerCommand } from "../src/viewer/viewer_commands";
import { ViewerRuntime } from "../src/viewer/viewer_runtime";
import { viewerRuntimeKey } from "../src/viewer/viewer_context";
import { useToolbarControl } from "../src/viewer/useToolbarControl";

function toolbarControlMessage(overrides: Record<string, unknown>) {
  return { dispatch: "toolbar_control", obj_id: "toolbar", overrides };
}

function createAttachedRuntime(): ViewerRuntime {
  const container = document.createElement("div");
  document.body.append(container);
  const runtime = new ViewerRuntime(container, { mode: "embedded" });
  runtime.attach(container);
  return runtime;
}

describe("toolbar_control validation", () => {
  it("accepts a well-formed overrides map", () => {
    const command = parseViewerCommand(
      toolbarControlMessage({
        add_objects: { visible: false },
        move: { enabled: false },
      }),
    );

    expect(command).toEqual(
      toolbarControlMessage({
        add_objects: { visible: false },
        move: { enabled: false },
      }),
    );
  });

  it("rejects a non-object overrides field", () => {
    expect(() =>
      parseViewerCommand(toolbarControlMessage(undefined as never)),
    ).toThrowError(
      expect.objectContaining<Partial<CompasViewerError>>({
        code: "invalid_message",
      }),
    );
  });

  it("rejects a non-boolean visible/enabled value", () => {
    expect(() =>
      parseViewerCommand(
        toolbarControlMessage({ add_objects: { visible: "no" } }),
      ),
    ).toThrowError(
      expect.objectContaining<Partial<CompasViewerError>>({
        code: "invalid_message",
      }),
    );
  });
});

describe("toolbar_control dispatch (store)", () => {
  it("merges a control message's overrides into the store", () => {
    const runtime = createAttachedRuntime();
    const internals = runtime as unknown as {
      dispatchObject(object: unknown): void;
    };

    internals.dispatchObject(
      toolbarControlMessage({ add_objects: { visible: false } }),
    );

    expect(runtime.store.toolbarOverrides).toEqual({
      add_objects: { visible: false },
    });

    runtime.dispose();
  });

  it("replaces the stored overrides wholesale on every message, never merging across messages", () => {
    const runtime = createAttachedRuntime();
    const internals = runtime as unknown as {
      dispatchObject(object: unknown): void;
    };

    internals.dispatchObject(
      toolbarControlMessage({ add_objects: { visible: false } }),
    );
    expect(runtime.store.toolbarOverrides).toEqual({
      add_objects: { visible: false },
    });

    // A second message must fully replace the first - if this were merged
    // instead of replaced, "add_objects" would still be present alongside "move".
    internals.dispatchObject(toolbarControlMessage({ move: { enabled: false } }));

    expect(runtime.store.toolbarOverrides).toEqual({
      move: { enabled: false },
    });

    runtime.dispose();
  });

  it("keeps the toolbarOverrides object's own identity across replaces", () => {
    const runtime = createAttachedRuntime();
    const internals = runtime as unknown as {
      dispatchObject(object: unknown): void;
    };
    const overridesRef = runtime.store.toolbarOverrides;

    internals.dispatchObject(
      toolbarControlMessage({ add_objects: { visible: false } }),
    );

    expect(runtime.store.toolbarOverrides).toBe(overridesRef);

    runtime.dispose();
  });
});

describe("useToolbarControl", () => {
  it("defaults to visible/enabled with no override, and reflects overrides live", () => {
    const runtime = createAttachedRuntime();
    const app = createApp({});
    app.provide(viewerRuntimeKey, runtime);

    let control!: ReturnType<typeof useToolbarControl>;
    app.runWithContext(() => {
      control = useToolbarControl("add_objects");
    });

    expect(control.visible.value).toBe(true);
    expect(control.enabled.value).toBe(true);

    const internals = runtime as unknown as {
      dispatchObject(object: unknown): void;
    };
    internals.dispatchObject(
      toolbarControlMessage({ add_objects: { visible: false } }),
    );

    expect(control.visible.value).toBe(false);
    expect(control.enabled.value).toBe(true);

    runtime.dispose();
  });
});
