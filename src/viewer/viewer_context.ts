import type { InjectionKey } from "vue";
import { inject } from "vue";

import type { ViewerRuntime } from "./viewer_runtime";

export const viewerRuntimeKey: InjectionKey<ViewerRuntime> = Symbol(
  "compas-viewer-runtime",
);

export function useViewerRuntime(): ViewerRuntime {
  const runtime = inject(viewerRuntimeKey);
  if (!runtime) {
    throw new Error("COMPAS viewer runtime is not available in this component");
  }
  return runtime;
}

/**
 * Which edge of the viewer a panel docks to. Panels sharing an edge stack along it, in
 * a fixed priority order (toolbar, openbar, metadata, objectActions) - see App.vue.
 */
export type PanelPlacement = "top" | "right" | "bottom" | "left";

export function isHorizontalPlacement(placement: PanelPlacement): boolean {
  return placement === "top" || placement === "bottom";
}

export const toolbarPlacementKey: InjectionKey<PanelPlacement> = Symbol(
  "compas-viewer-toolbar-placement",
);

export const openbarPlacementKey: InjectionKey<PanelPlacement> = Symbol(
  "compas-viewer-openbar-placement",
);

export const metadataPlacementKey: InjectionKey<PanelPlacement> = Symbol(
  "compas-viewer-metadata-placement",
);

export const objectActionsPlacementKey: InjectionKey<PanelPlacement> = Symbol(
  "compas-viewer-object-actions-placement",
);

export function useToolbarPlacement(): PanelPlacement {
  return inject(toolbarPlacementKey, "left");
}

export function useOpenbarPlacement(): PanelPlacement {
  return inject(openbarPlacementKey, "left");
}

export function useMetadataPlacement(): PanelPlacement {
  return inject(metadataPlacementKey, "right");
}

export function useObjectActionsPlacement(): PanelPlacement {
  return inject(objectActionsPlacementKey, "right");
}
