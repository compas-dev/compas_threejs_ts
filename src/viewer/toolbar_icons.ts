import * as LucideIcons from "lucide-vue-next";
import type { Component } from "vue";

/**
 * Resolves a backend-declared toolbar item's `icon` string (e.g. "download",
 * "arrow-big-left-dash") to a lucide-vue-next icon component.
 *
 * There's no pre-existing name -> icon lookup convention elsewhere in this
 * codebase to reuse: every other call site (Openbar.vue, the per-tool
 * buttons under components/tools/**) imports the specific icon component it
 * needs statically, since it always knows which icon it wants ahead of time.
 * This is the first place an icon has to be resolved dynamically from a
 * string arriving over the wire, so this is a new, minimal resolver: split
 * on `-`/`_`/whitespace, title-case each part, and join - matching lucide's
 * own kebab-case icon names (https://lucide.dev) to their PascalCase
 * `lucide-vue-next` export.
 */
export function resolveToolbarIcon(name: string | null): Component | null {
  if (!name) return null;
  const pascalCase = name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
  const icon = (LucideIcons as unknown as Record<string, unknown>)[pascalCase];
  return typeof icon === "function" || typeof icon === "object"
    ? (icon as Component)
    : null;
}
