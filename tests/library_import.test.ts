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
});
