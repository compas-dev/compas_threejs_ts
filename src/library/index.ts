import { createApp, markRaw } from "vue";

import "../style.css";
import App from "../App.vue";
import { useViewerRuntime, viewerRuntimeKey } from "../viewer/viewer_context";
import { installPlugins } from "../viewer/viewer_extensions";
import { ViewerRuntime } from "../viewer/viewer_runtime";
import { useToolbarControl } from "../viewer/useToolbarControl";
import { CompasViewerError } from "./errors";
import type { CompasViewer, CompasViewerOptions } from "./types";

export type {
  CompasViewer,
  CompasViewerOptions,
  InteractionHandlers,
  InteractionSession,
  ViewerExtensionContext,
  ViewerMaterial,
  ViewerTransformSnap,
  ViewerMode,
  ViewerObjectBounds,
  ViewerObjectHit,
  ViewerObjectVertices,
  ViewerPlugin,
  ViewerPoint,
  ViewerPointerLike,
  ViewerSize,
  ViewerWebSocketOptions,
} from "./types";
export {
  type CompasViewerErrorCode,
  type CompasViewerErrorOptions,
} from "./errors";
export { CompasViewerError };

// Exposed so a custom or npm-installed `extraToolbarModules` component can react to
// backend-driven visible/enabled overrides (`useToolbarControl`) and send its own
// interactions back to the backend (`useViewerRuntime().handleUiAction`), the same way
// every built-in toolbar button does.
export { useViewerRuntime, useToolbarControl };

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
    extraToolbarModules: options.extraToolbarModules ?? [],
  });
  app.provide(viewerRuntimeKey, runtime);
  app.mount(container);

  let disposed = false;
  const viewer: CompasViewer = {
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

  try {
    installPlugins(runtime, options.plugins ?? []);
  } catch (error) {
    // Runs the cleanups of any plugin that did install before rethrowing.
    viewer.dispose();
    throw error;
  }
  return viewer;
}
