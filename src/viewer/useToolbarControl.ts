import { computed, type ComputedRef } from "vue";
import { useViewerRuntime } from "./viewer_context";

/**
 * The backend can show/hide or enable/disable a toolbar button by id, but never define
 * one - a button that wants to be backend-addressable reads its own `visible`/`enabled`
 * from here, keyed by the same id it registers elsewhere (e.g. click handling). Absent
 * any override, a button defaults to visible and enabled.
 */
export function useToolbarControl(id: string): {
  visible: ComputedRef<boolean>;
  enabled: ComputedRef<boolean>;
} {
  const { toolbarOverrides } = useViewerRuntime().store;
  return {
    visible: computed(() => toolbarOverrides[id]?.visible ?? true),
    enabled: computed(() => toolbarOverrides[id]?.enabled ?? true),
  };
}
