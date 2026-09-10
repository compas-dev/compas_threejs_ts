import { createViewer } from "./library";

const container = document.querySelector<HTMLElement>("#app");
if (!container) throw new Error("Standalone viewer requires an #app container");

const title = new URLSearchParams(window.location.search).get("title") ?? undefined;

createViewer(container, {
  mode: "websocket",
  showToolbar: true,
  title,
});
