import { createViewer } from "./library";

const container = document.querySelector<HTMLElement>("#app");
if (!container) throw new Error("Standalone viewer requires an #app container");

createViewer(container, {
  mode: "websocket",
  showToolbar: true,
});
