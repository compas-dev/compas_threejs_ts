import { expect, test } from "@playwright/test";

test("renders a custom toolbar tool and routes its messages through `send`", async ({
  page,
}) => {
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

  await page.goto("/examples/embedded_custom_tool.html");
  await expect(page.locator("body")).toHaveAttribute(
    "data-example-ready",
    "true",
  );
  await expect(page.locator("canvas")).toHaveCount(1);

  const pingButton = page.getByTestId("ping-tool-button");
  await expect(pingButton).toBeVisible();
  await pingButton.click();
  await pingButton.click();

  const outgoing = await page.evaluate(() => {
    const customTool = (
      window as typeof window & {
        __compasCustomTool?: { outgoingMessages: unknown[] };
      }
    ).__compasCustomTool;
    return customTool?.outgoingMessages ?? [];
  });

  expect(outgoing).toEqual([
    { dispatch: "other_action", action: "ping", count: 1 },
    { dispatch: "other_action", action: "ping", count: 2 },
  ]);
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});
