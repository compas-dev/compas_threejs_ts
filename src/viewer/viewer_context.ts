import type { InjectionKey } from "vue";
import { inject } from "vue";

import type {
  ObjectActionsPlacement,
  OpenbarPlacement,
  ToolbarPlacement,
  ToolDefinition,
  ViewerMessaging,
} from "../library/types";
import type { ViewerRuntime } from "./viewer_runtime";

export const viewerRuntimeKey: InjectionKey<ViewerRuntime> = Symbol(
  "compas-viewer-runtime",
);

export const toolbarToolsKey: InjectionKey<ToolDefinition[]> = Symbol(
  "compas-viewer-toolbar-tools",
);

export const toolbarPlacementKey: InjectionKey<ToolbarPlacement> = Symbol(
  "compas-viewer-toolbar-placement",
);

export const openbarPlacementKey: InjectionKey<OpenbarPlacement> = Symbol(
  "compas-viewer-openbar-placement",
);

export const objectActionsPlacementKey: InjectionKey<ObjectActionsPlacement> =
  Symbol("compas-viewer-object-actions-placement");

export function useViewerRuntime(): ViewerRuntime {
  const runtime = inject(viewerRuntimeKey);
  if (!runtime) {
    throw new Error("COMPAS viewer runtime is not available in this component");
  }
  return runtime;
}

export function useToolbarTools(): ToolDefinition[] {
  return inject(toolbarToolsKey, []);
}

export function useToolbarPlacement(): ToolbarPlacement {
  return inject(toolbarPlacementKey, "corner");
}

export function useOpenbarPlacement(): OpenbarPlacement {
  return inject(openbarPlacementKey, "corner");
}

export function useObjectActionsPlacement(): ObjectActionsPlacement {
  return inject(objectActionsPlacementKey, "corner");
}

/**
 * Public, minimal messaging surface for custom tools - deliberately narrower than
 * ViewerRuntime so consumers depend on a small stable contract instead of internals
 * that are free to change.
 */
export function useViewerMessaging(): ViewerMessaging {
  const runtime = useViewerRuntime();
  return {
    send: (message) => runtime.send(message),
    sendData: (message) => runtime.sendData(message),
  };
}
