import { createApp, markRaw } from "vue";

import "../style.css";
import App from "../App.vue";
import {
  metadataPlacementKey,
  objectActionsPlacementKey,
  openbarPlacementKey,
  toolbarPlacementKey,
  toolbarTitleKey,
  useViewerRuntime,
  viewerRuntimeKey,
} from "../viewer/viewer_context";
import { ViewerRuntime } from "../viewer/viewer_runtime";
import { useToolbarControl } from "../viewer/useToolbarControl";
import { CompasViewerError } from "./errors";
import type { CompasViewer, CompasViewerOptions } from "./types";

export type {
  CompasViewer,
  CompasViewerOptions,
  PanelPlacement,
  ViewerMode,
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

  if (options.title) {
    document.title = options.title;
  }

  const runtime = markRaw(new ViewerRuntime(container, options));
  const app = createApp(App, {
    runtime,
    showToolbar: options.showToolbar ?? true,
    extraToolbarModules: options.extraToolbarModules ?? [],
  });
  app.provide(viewerRuntimeKey, runtime);
  app.provide(toolbarPlacementKey, options.toolbarPlacement ?? "left");
  app.provide(openbarPlacementKey, options.openbarPlacement ?? "left");
  app.provide(metadataPlacementKey, options.metadataPlacement ?? "right");
  if (options.title) {
    app.provide(toolbarTitleKey, options.title);
  }
  app.provide(
    objectActionsPlacementKey,
    options.objectActionsPlacement ?? "right",
  );
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
