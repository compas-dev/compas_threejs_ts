import { createApp, markRaw } from "vue";

import "../style.css";
import App from "../App.vue";
import { viewerRuntimeKey } from "../viewer/viewer_context";
import { ViewerRuntime } from "../viewer/viewer_runtime";
import type { CompasViewer, CompasViewerOptions } from "./types";

export type {
  CompasViewer,
  CompasViewerOptions,
  ViewerMode,
  ViewerWebSocketOptions,
} from "./types";

export function createViewer(
  container: HTMLElement,
  options: CompasViewerOptions = {},
): CompasViewer {
  if (
    typeof HTMLElement === "undefined" ||
    !(container instanceof HTMLElement)
  ) {
    throw new TypeError("createViewer requires an HTMLElement container");
  }

  const runtime = markRaw(new ViewerRuntime(container, options));
  const app = createApp(App, {
    runtime,
    showToolbar: options.showToolbar ?? true,
  });
  app.provide(viewerRuntimeKey, runtime);
  app.mount(container);

  let disposed = false;
  return {
    dispatch(message) {
      runtime.dispatch(message);
    },
    reset() {
      runtime.reset();
    },
    resize() {
      runtime.resize();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      app.unmount();
      runtime.dispose();
    },
  };
}
