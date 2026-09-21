<template>
  <div class="panel-dock" :class="`panel-dock-${edge}`">
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { PanelPlacement } from "@/viewer/viewer_context";

defineProps<{ edge: PanelPlacement }>();
</script>

<style scoped>
/*
 * Generic positioning zone for one edge of the viewer. Any panel can be placed into
 * any edge's zone; this component knows nothing about which panels those are. Panels
 * own their own visual chrome (background, border-radius, padding) and their own
 * pointer-events: auto, the same way they did as children of the old Sidebar/
 * RightSidebar wrappers - this only handles where the zone sits and how its panels
 * stack.
 *
 * Placement is via CSS Grid (see App.vue's `.app-container`, a 3x3 border layout),
 * not position: absolute - that's what keeps a top dock and a left dock from
 * overlapping at the corner they'd otherwise both claim: the top/bottom docks own the
 * full-width top/bottom rows, and the left/right docks are confined to the middle
 * row between them.
 */
div.panel-dock {
  z-index: 1000;
  display: flex;
  padding: 20px;
  gap: 20px;
  pointer-events: none;
  min-width: 0;
  min-height: 0;
}

div.panel-dock-left,
div.panel-dock-right {
  grid-row: 2;
  flex-direction: column;
  width: 30vw;
  max-width: 300px;
  min-width: 250px;
}

div.panel-dock-left {
  grid-column: 1;
}

div.panel-dock-right {
  grid-column: 3;
}

div.panel-dock-top,
div.panel-dock-bottom {
  /* Column, not row: panels sharing the top/bottom edge stack as separate
     full-width bars (toolbar, then openbar, then objectActions, ...) rather than
     being crammed side by side into one row. Each panel still lays its own
     content out horizontally - see each panel's own `panel-horizontal` styling. */
  grid-column: 1 / -1;
  flex-direction: column;
}

div.panel-dock-top {
  grid-row: 1;
}

div.panel-dock-bottom {
  grid-row: 3;
}
</style>
