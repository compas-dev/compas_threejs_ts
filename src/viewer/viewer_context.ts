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
