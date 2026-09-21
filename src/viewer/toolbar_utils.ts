import type { ToolbarGroup, ToolbarItem, ToolbarState } from "./viewer_store";

/**
 * Groups in ascending `order`. Ties keep their original relative order
 * (`Array.prototype.sort` is stable), matching how a backend author would
 * expect equal-order groups to stay in declaration order.
 */
export function sortedToolbarGroups(state: ToolbarState): ToolbarGroup[] {
  return [...state.groups].sort((a, b) => a.order - b.order);
}

/**
 * A single group's items, filtered down to the currently `visible` ones and
 * sorted by ascending `order`. `enabled` is intentionally not filtered here -
 * a disabled item is still rendered (greyed out / non-interactive), only an
 * invisible one is omitted entirely.
 */
export function visibleSortedItems(group: ToolbarGroup): ToolbarItem[] {
  return group.items
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);
}

export interface ResolvedToolbarGroup {
  group: ToolbarGroup;
  items: ToolbarItem[];
}

/**
 * The full render-ready structure: groups in order, each with its visible
 * items in order, dropping any group left with nothing visible to show.
 */
export function resolveToolbarGroups(state: ToolbarState): ResolvedToolbarGroup[] {
  return sortedToolbarGroups(state)
    .map((group) => ({ group, items: visibleSortedItems(group) }))
    .filter(({ items }) => items.length > 0);
}
