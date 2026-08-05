import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { dispatchMessage } from "./communications/messages";
import { addDefaultLighting } from "./viewer/scene_manager";

declare global {
  interface Window {
    compasViewer?: {
      mode?: "websocket" | "embedded";
      defaultLighting?: boolean;
      dispatch?: typeof dispatchMessage;
    };
  }
}

const compasViewer = (window.compasViewer ??= {});
const app = createApp(App, {
  connectWebSocket: compasViewer.mode !== "embedded",
});
app.mount("#app");

if (compasViewer.defaultLighting) {
  addDefaultLighting();
}

// Expose the existing decoder/dispatcher to pages that embed the built bundle.
compasViewer.dispatch = dispatchMessage;
