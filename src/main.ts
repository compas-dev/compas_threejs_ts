import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { dispatchMessage } from "./communications/messages";
import { addDefaultLighting } from "./viewer/scene_manager";
import { resetViewer } from "./viewer/reset";

declare global {
  interface Window {
    compasViewer?: {
      mode?: "websocket" | "embedded";
      defaultLighting?: boolean;
      showToolbar?: boolean;
      dispatch?: typeof dispatchMessage;
      reset?: typeof resetViewer;
      send?: (message: unknown) => boolean | void;
    };
  }
}

const compasViewer = (window.compasViewer ??= {});
const app = createApp(App, {
  connectWebSocket: compasViewer.mode !== "embedded",
  showToolbar: compasViewer.showToolbar !== false,
});
app.mount("#app");

if (compasViewer.defaultLighting) {
  addDefaultLighting();
}

// Expose the existing decoder/dispatcher to pages that embed the built bundle.
compasViewer.dispatch = dispatchMessage;
compasViewer.reset = resetViewer;
