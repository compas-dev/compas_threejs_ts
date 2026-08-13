import { expect, test } from "@playwright/test";

test("renders every supported geometry in embedded mode", async ({ page }) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") externalRequests.push(request.url());
  });

  await page.goto("/examples/embedded_kitchen_sink.html");
  await expect(page.locator("body")).toHaveAttribute(
    "data-example-ready",
    "true",
  );
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator(".text-tag")).toHaveCount(16);

  const state = await page.evaluate(() => {
    const kitchenSink = (
      window as typeof window & {
        __compasKitchenSink?: {
          cells: unknown[];
          errors: unknown[];
        };
      }
    ).__compasKitchenSink;
    return {
      cellCount: kitchenSink?.cells.length ?? 0,
      errorCount: kitchenSink?.errors.length ?? 0,
    };
  });

  expect(state).toEqual({ cellCount: 16, errorCount: 0 });
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});
