import { watch } from "vue";

import { asCompasViewerError, CompasViewerError } from "../library/errors";
import type { ViewerExtensionContext, ViewerPlugin } from "../library/types";
import type { ViewerRuntime } from "./viewer_runtime";

/**
 * The narrow, public view of a runtime handed to each plugin. Built from explicit
 * delegates rather than passing the runtime itself, so a plugin can't reach the
 * scene/camera/renderer/controls even by ignoring its declared type.
 */
export function createExtensionContext(
  runtime: ViewerRuntime,
): ViewerExtensionContext {
  return Object.freeze({
    canvas: runtime.renderer.domElement,
    addOverlay: (object) => runtime.addOverlay(object),
    pointerRay: (event) => runtime.pointerRay(event),
    pointerOnPlane: (event, elevation) =>
      runtime.pointerOnPlane(event, elevation),
    pickObjects: (event) => runtime.pickObjects(event),
    objectBounds: () => runtime.objectBounds(),
    viewportSize: () => runtime.viewportSize(),
    onResize: (listener) => runtime.addResizeListener(listener),
    beginInteraction: (handlers) => runtime.beginInteraction(handlers),
    requestRender: () => runtime.requestRender(),
    onDispose: (listener) => runtime.addDisposeListener(listener),
    send: (message) => runtime.sendData(message),
    selection: () => runtime.store.pickedObjectGuid.value,
    onSelectionChange(listener) {
      // Synchronous, so a plugin sees the change in the same tick as the pick.
      const stop = watch(
        () => runtime.store.pickedObjectGuid.value,
        (guid) => listener(guid),
        { flush: "sync" },
      );
      const removeDispose = runtime.addDisposeListener(stop);
      return () => {
        stop();
        removeDispose();
      };
    },
    getMaterial: (guid) => runtime.getMaterialSnapshot(guid),
    setMaterial: (guid, fields) => runtime.setMaterial(guid, fields),
  } satisfies ViewerExtensionContext);
}

/**
 * Installs `plugins` in order. Ids are all checked before any plugin installs,
 * so a duplicate never leaves the viewer half set up. A cleanup returned from
 * `install` runs on dispose, in reverse install order.
 */
export function installPlugins(
  runtime: ViewerRuntime,
  plugins: readonly ViewerPlugin[],
): void {
  const ids = new Set<string>();
  for (const plugin of plugins) {
    if (ids.has(plugin.id)) {
      throw new CompasViewerError(
        "lifecycle_error",
        `Duplicate viewer plugin id "${plugin.id}"`,
        { details: { plugin: plugin.id } },
      );
    }
    ids.add(plugin.id);
  }

  if (plugins.length === 0) return;
  const context = createExtensionContext(runtime);
  for (const plugin of plugins) {
    let cleanup: void | (() => void);
    try {
      cleanup = plugin.install(context);
    } catch (error) {
      throw asCompasViewerError(
        error,
        "lifecycle_error",
        `Viewer plugin "${plugin.id}" failed to install`,
        { plugin: plugin.id },
      );
    }
    if (typeof cleanup === "function") runtime.addDisposeListener(cleanup);
  }
}
