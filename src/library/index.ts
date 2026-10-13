import { createApp, markRaw } from "vue";

import "../style.css";
import App from "../App.vue";
import { viewerRuntimeKey } from "../viewer/viewer_context";
import { ViewerRuntime } from "../viewer/viewer_runtime";
import { CompasViewerError } from "./errors";
import { createPluginViewer, pluginViewerKey } from "./plugins";
import type { CompasViewer, CompasViewerOptions } from "./types";

export type {
  CompasViewer,
  CompasViewerOptions,
  ViewerMode,
  ViewerWebSocketOptions,
} from "./types";
export {
  type CompasViewerErrorCode,
  type CompasViewerErrorOptions,
} from "./errors";
export { CompasViewerError };
export {
  definePlugin,
  useChannel,
  useShortcuts,
  useViewer,
  type PluginChannel,
  type PluginViewer,
  type TransformMode,
  type ViewerPlugin,
} from "./plugins";
export type {
  SavedView,
  ScreenshotFormat,
  ScreenshotOptions,
  ViewPreset,
} from "../viewer/viewer_runtime";
export * from "../components/ui/button";
export * from "../components/ui/checkbox";
export * from "../components/ui/kbd";
export * from "../components/ui/number-field";
export * from "../components/ui/popover";
export * from "../components/ui/select";
export * from "../components/ui/slider";
export * from "../components/ui/toolbar-button";
export * from "../components/ui/tooltip";

export function createViewer(
  container: HTMLElement,
  options: CompasViewerOptions = {},
): CompasViewer {
  if (
    typeof HTMLElement === "undefined" ||
    !(container instanceof HTMLElement)
  ) {
    throw new CompasViewerError(
      "lifecycle_error",
      "createViewer requires an HTMLElement container",
    );
  }

  const runtime = markRaw(new ViewerRuntime(container, options));
  const app = createApp(App, {
    runtime,
    showToolbar: options.showToolbar ?? true,
  });
  const viewer = createPluginViewer(runtime);
  app.provide(viewerRuntimeKey, runtime);
  app.provide(pluginViewerKey, viewer);
  const cleanups: (() => void)[] = [];
  const names = new Set<string>();
  for (const plugin of runtime.plugins) {
    if (names.has(plugin.name)) {
      throw new CompasViewerError(
        "lifecycle_error",
        `Two plugins are named "${plugin.name}"`,
      );
    }
    names.add(plugin.name);
    const cleanup = plugin.setup?.(viewer);
    if (cleanup) cleanups.push(cleanup);
  }
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
      cleanups.reverse().forEach((cleanup) => cleanup());
      runtime.dispose();
    },
  };
}
