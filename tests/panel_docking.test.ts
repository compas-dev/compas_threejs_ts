/** @vitest-environment happy-dom */

import { Dictionary, pbDumpBytes } from "@gramaziokohler/compas-pb-ts";
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

import { createViewer } from "../src/library";

const viewers: Array<{ dispose(): void }> = [];

function dictBytes(fields: Record<string, unknown>): Uint8Array {
  const commandValue = (value: unknown) =>
    typeof value === "number" ? { doubleValue: value } : { value };
  return pbDumpBytes(
    new Dictionary({
      data: {
        items: Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [
            key,
            commandValue(value),
          ]),
        ),
      },
    }),
  );
}

function uiButtonBytes(guid: string): Uint8Array {
  return dictBytes({
    dispatch: "ui",
    type: "button",
    guid,
    text: "Test",
    variant: "secondary",
  });
}

function objectActionButtonBytes(guid: string, objectGuid: string): Uint8Array {
  return dictBytes({
    dispatch: "object_action",
    type: "button",
    guid,
    object_guid: objectGuid,
    text: "Do it",
  });
}

function mountViewer(
  options: Parameters<typeof createViewer>[1] = {},
): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const viewer = createViewer(container, { mode: "embedded", ...options });
  viewers.push(viewer);
  return container;
}

afterEach(() => {
  viewers.splice(0).forEach((viewer) => viewer.dispose());
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("panel docking", () => {
  it("defaults toolbar/openbar to the left edge and metadata/objectActions to the right, with no shared wrapper", async () => {
    const container = mountViewer();
    const viewer = viewers[viewers.length - 1] as ReturnType<
      typeof createViewer
    >;

    expect(container.querySelector("#sidebar")).toBeNull();
    expect(container.querySelector("#right-sidebar")).toBeNull();

    expect(
      container.querySelector(".panel-dock-left > #toolbar"),
    ).not.toBeNull();
    expect(
      container.querySelector(".panel-dock-right > #actions-panel"),
    ).not.toBeNull();
    expect(
      container.querySelector(".panel-dock-right > #openMetadata"),
    ).not.toBeNull();

    viewer.dispatch(uiButtonBytes("ui-button"));
    await nextTick();
    expect(
      container.querySelector(".panel-dock-left > #openbar"),
    ).not.toBeNull();
  });

  it("docks the toolbar independently of the openbar - they are not siblings in a shared component", async () => {
    const container = mountViewer({
      toolbarPlacement: "top",
      openbarPlacement: "left",
    });
    const viewer = viewers[viewers.length - 1] as ReturnType<
      typeof createViewer
    >;

    expect(
      container.querySelector(".panel-dock-top > #toolbar.panel-horizontal"),
    ).not.toBeNull();
    expect(container.querySelector(".panel-dock-left #toolbar")).toBeNull();

    viewer.dispatch(uiButtonBytes("ui-button"));
    await nextTick();

    expect(
      container.querySelector(".panel-dock-left > #openbar"),
    ).not.toBeNull();
    expect(container.querySelector(".panel-dock-top #openbar")).toBeNull();
  });

  it("docks metadata and objectActions to different, independently chosen edges", () => {
    const container = mountViewer({
      metadataPlacement: "bottom",
      objectActionsPlacement: "top",
    });

    expect(
      container.querySelector(
        ".panel-dock-top > #actions-panel.panel-horizontal",
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(".panel-dock-bottom > #openMetadata.edge-bottom"),
    ).not.toBeNull();
    expect(container.querySelector(".panel-dock-right")).toBeNull();
  });

  it("supports all four edges for a single panel", () => {
    for (const edge of ["top", "right", "bottom", "left"] as const) {
      const container = mountViewer({ objectActionsPlacement: edge });
      expect(
        container.querySelector(`.panel-dock-${edge} > #actions-panel`),
      ).not.toBeNull();
    }
  });

  it.each(["left", "top"] as const)(
    "stacks every panel sharing the %s edge in a fixed priority order: toolbar, openbar, metadata, objectActions",
    async (edge) => {
      const container = mountViewer({
        toolbarPlacement: edge,
        openbarPlacement: edge,
        metadataPlacement: edge,
        objectActionsPlacement: edge,
      });
      const viewer = viewers[viewers.length - 1] as ReturnType<
        typeof createViewer
      >;

      viewer.dispatch(uiButtonBytes("ui-button"));
      viewer.dispatch(objectActionButtonBytes("action-guid", "object-guid"));
      await nextTick();

      const dock = container.querySelector(`.panel-dock-${edge}`)!;
      const ids = Array.from(dock.children).map((el) => el.id);

      expect(ids).toEqual([
        "toolbar",
        "openbar",
        "openOpenbar",
        "openMetadata",
        "actions-panel",
      ]);
    },
  );

});
