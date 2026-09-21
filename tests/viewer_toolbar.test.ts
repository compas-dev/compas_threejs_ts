/** @vitest-environment happy-dom */

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

import { ViewerRuntime } from "../src/viewer/viewer_runtime";
import {
  resolveToolbarGroups,
  sortedToolbarGroups,
  visibleSortedItems,
} from "../src/viewer/toolbar_utils";
import { resolveToolbarIcon } from "../src/viewer/toolbar_icons";
import type { ToolbarGroup, ToolbarState } from "../src/viewer/viewer_store";

function toolbarMessage() {
  return {
    dispatch: "toolbar",
    obj_id: "toolbar",
    toolbar: {
      groups: [
        {
          id: "model",
          order: 10,
          items: [
            {
              id: "export_model",
              kind: "button",
              label: "Export Model",
              icon: "download",
              tooltip: "Export the current model",
              enabled: true,
              visible: true,
              order: 10,
            },
            {
              id: "show_fasteners",
              kind: "checkbox",
              label: "Show Fasteners",
              icon: null,
              tooltip: null,
              color: "#a1b2c3",
              default_value: true,
              enabled: true,
              visible: true,
              order: 20,
            },
            {
              id: "lod_filter",
              kind: "select",
              label: "Level of Detail",
              icon: null,
              tooltip: null,
              options: ["All", "Components", "Elements", "Parts"],
              default_value: "Components",
              enabled: true,
              visible: true,
              order: 30,
            },
          ],
        },
      ],
    },
  };
}

describe("toolbar dispatch (store)", () => {
  it("parses a full toolbar message and stores it verbatim", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    runtime.attach(container);

    const internals = runtime as unknown as {
      dispatchObject(object: unknown): void;
    };
    internals.dispatchObject(toolbarMessage());

    expect(runtime.store.toolbar.groups).toHaveLength(1);
    expect(runtime.store.toolbar.groups[0]!.items).toHaveLength(3);
    expect(runtime.store.toolbar.groups[0]!.items[0]).toMatchObject({
      id: "export_model",
      kind: "button",
      label: "Export Model",
    });

    runtime.dispose();
  });

  it("replaces the stored toolbar wholesale on every message, never merging", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    runtime.attach(container);

    const internals = runtime as unknown as {
      dispatchObject(object: unknown): void;
    };
    internals.dispatchObject(toolbarMessage());
    expect(runtime.store.toolbar.groups).toHaveLength(1);

    // A second, smaller message must fully replace the first - if this were
    // merged instead of replaced, the "model" group from the first message
    // would still be present alongside "view".
    internals.dispatchObject({
      dispatch: "toolbar",
      obj_id: "toolbar",
      toolbar: {
        groups: [
          {
            id: "view",
            order: 5,
            items: [
              {
                id: "reset_view",
                kind: "button",
                label: "Reset View",
                icon: null,
                tooltip: null,
                enabled: true,
                visible: true,
                order: 10,
              },
            ],
          },
        ],
      },
    });

    expect(runtime.store.toolbar.groups).toHaveLength(1);
    expect(runtime.store.toolbar.groups[0]!.id).toBe("view");

    runtime.dispose();
  });

  it("sends a ui_callback keyed by the item id when a button item fires", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const runtime = new ViewerRuntime(container, { mode: "embedded" });
    runtime.attach(container);

    const sendSpy = vi.spyOn(runtime, "send").mockReturnValue(true);

    runtime.handleUiAction("export_model");

    expect(sendSpy).toHaveBeenCalledWith({
      dispatch: "ui_callback",
      action: "export_model",
      value: null,
    });

    runtime.dispose();
  });
});

describe("toolbar ordering/visibility helpers", () => {
  const state: ToolbarState = {
    groups: [
      {
        id: "b-group",
        order: 20,
        items: [
          {
            id: "hidden",
            kind: "button",
            label: "Hidden",
            icon: null,
            tooltip: null,
            enabled: true,
            visible: false,
            order: 5,
          },
          {
            id: "second",
            kind: "button",
            label: "Second",
            icon: null,
            tooltip: null,
            enabled: true,
            visible: true,
            order: 20,
          },
          {
            id: "first",
            kind: "button",
            label: "First",
            icon: null,
            tooltip: null,
            enabled: false,
            visible: true,
            order: 10,
          },
        ],
      },
      {
        id: "a-group",
        order: 10,
        items: [
          {
            id: "only",
            kind: "separator",
            label: "",
            icon: null,
            tooltip: null,
            enabled: true,
            visible: true,
            order: 1,
          },
        ],
      },
    ],
  };

  it("sorts groups by ascending order", () => {
    const sorted = sortedToolbarGroups(state);
    expect(sorted.map((group) => group.id)).toEqual(["a-group", "b-group"]);
  });

  it("sorts a group's items by ascending order and drops invisible ones", () => {
    const group = state.groups.find((g) => g.id === "b-group") as ToolbarGroup;
    const items = visibleSortedItems(group);

    expect(items.map((item) => item.id)).toEqual(["first", "second"]);
  });

  it("keeps a disabled-but-visible item in the resolved list (enabled is not a visibility filter)", () => {
    const group = state.groups.find((g) => g.id === "b-group") as ToolbarGroup;
    const items = visibleSortedItems(group);
    const first = items.find((item) => item.id === "first");

    expect(first).toBeDefined();
    expect(first?.enabled).toBe(false);
  });

  it("resolves groups in order, each with its visible items in order, dropping empty groups", () => {
    const resolved = resolveToolbarGroups({
      groups: [
        ...state.groups,
        { id: "c-group-empty", order: 30, items: [] },
      ],
    });

    expect(resolved.map((entry) => entry.group.id)).toEqual([
      "a-group",
      "b-group",
    ]);
    expect(resolved[1]!.items.map((item) => item.id)).toEqual([
      "first",
      "second",
    ]);
  });
});

describe("resolveToolbarIcon", () => {
  it("resolves a simple lowercase icon name to its PascalCase lucide component", () => {
    expect(resolveToolbarIcon("download")).toBeTruthy();
  });

  it("resolves a multi-word kebab-case icon name", () => {
    expect(resolveToolbarIcon("arrow-big-left-dash")).toBeTruthy();
  });

  it("returns null for a null or unknown icon name", () => {
    expect(resolveToolbarIcon(null)).toBeNull();
    expect(resolveToolbarIcon("definitely-not-a-real-icon-xyz")).toBeNull();
  });
});
