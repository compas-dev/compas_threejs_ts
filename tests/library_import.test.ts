import { describe, expect, it } from "vitest";

describe("public library entry", () => {
  it("imports without browser globals or automatic mounting", async () => {
    expect(globalThis.window).toBeUndefined();
    expect(globalThis.document).toBeUndefined();

    const library = await import("../src/library");

    expect(library.createViewer).toBeTypeOf("function");
    expect(globalThis.window).toBeUndefined();
    expect(globalThis.document).toBeUndefined();
    expect(() => library.createViewer({} as HTMLElement)).toThrowError(
      expect.objectContaining<
        Partial<InstanceType<typeof library.CompasViewerError>>
      >({
        code: "lifecycle_error",
      }),
    );
  });

  it("exposes useViewerMessaging as a function", async () => {
    const library = await import("../src/library");
    expect(library.useViewerMessaging).toBeTypeOf("function");
  });

  it("exposes the documented ui kit re-export surface", async () => {
    const ui = await import("../src/library/ui");
    expect(Object.keys(ui).sort()).toEqual([
      "Button",
      "Kbd",
      "KbdGroup",
      "Tooltip",
      "TooltipContent",
      "TooltipProvider",
      "TooltipTrigger",
    ]);
    for (const component of Object.values(ui)) {
      expect(component).toBeTruthy();
    }
  });
});
