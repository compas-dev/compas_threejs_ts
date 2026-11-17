<template>
  <div
    v-if="panels.length"
    ref="panelsElement"
    class="plugin-panels"
    :data-side="side"
  >
    <section
      v-for="panel in panels"
      :key="`${panel.plugin}/${panel.id}`"
      class="plugin-panel"
      :class="{ theme: panel.title, framed: panel.title }"
      :data-plugin="panel.plugin"
      :data-panel="panel.id"
    >
      <button
        v-if="panel.title"
        type="button"
        class="plugin-panel-title"
        :aria-expanded="!isFolded(panel)"
        @click="toggle(panel)"
      >
        <span>{{ panel.title }}</span>
        <ChevronDown
          class="plugin-panel-chevron"
          :class="{ folded: isFolded(panel) }"
        />
      </button>
      <div v-show="!isFolded(panel)" class="plugin-panel-body">
        <ToolbarSlot
          :plugin="panel.plugin"
          :button="{ id: panel.id, component: panel.component }"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from "vue";
import { ChevronDown } from "lucide-vue-next";

import ToolbarSlot from "@/components/layout/ToolbarSlot.vue";
import { useHover } from "@/composables/useHover";
import {
  pluginPanels,
  type PanelSide,
  type PluginPanel,
} from "@/library/plugins";
import { useViewerRuntime } from "@/viewer/viewer_context";

// The plugins' panels docked on one side, in plugin order, minus those Python hid.
// Left and right stack in their sidebar; top and bottom lie in a row along that edge
// of the view, between the sidebars. A panel with a title gets a frame whose title bar
// folds it; a disabled panel is greyed out and inert, like a disabled button.
const props = defineProps<{ side: PanelSide }>();
const runtime = useViewerRuntime();
const { pluginButtons, blockPicker } = runtime.store;

const panels = computed(() =>
  pluginPanels(runtime.plugins).filter(
    (panel) =>
      panel.side === props.side &&
      !pluginButtons[panel.plugin]?.hidden.includes(panel.id),
  ),
);

// Folded or not, per panel: the user's choice, remembered in the browser.
const folded = reactive<Record<string, boolean>>({});
const storageKey = (panel: PluginPanel) =>
  `compas-viewer.panel.${panel.plugin}.${panel.id}.folded`;

function isFolded(panel: PluginPanel): boolean {
  const key = storageKey(panel);
  if (!(key in folded)) {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(key);
    } catch {
      // No storage (private window, blocked site data): the default it is.
    }
    folded[key] = saved === null ? panel.folded : saved === "true";
  }
  return folded[key]!;
}

function toggle(panel: PluginPanel): void {
  const key = storageKey(panel);
  folded[key] = !isFolded(panel);
  try {
    localStorage.setItem(key, String(folded[key]));
  } catch {
    // Remembered for this page only.
  }
}

const panelsElement = ref<HTMLElement | null>(null);
const { isHovered } = useHover(panelsElement);
watchEffect(() => {
  blockPicker.value = isHovered.value;
});
</script>

<style scoped>
.plugin-panels {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 0 1 auto; /* Size to content in the sidebar's column, scroll if it doesn't fit */
  min-height: 0;
  overflow-y: auto;
  pointer-events: auto;
  color: var(--foreground);
}

/* Top and bottom: a row between the sidebars (their width: 30vw, 250px to 300px) */
.plugin-panels[data-side="top"],
.plugin-panels[data-side="bottom"] {
  position: absolute;
  left: clamp(250px, 30vw, 300px);
  right: clamp(250px, 30vw, 300px);
  z-index: 1000; /* Above the Three.js canvas, like the sidebars */
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  max-height: 40%;
  pointer-events: none; /* Clicks between the panels reach the canvas */
}

.plugin-panels[data-side="top"] {
  top: 20px;
}

.plugin-panels[data-side="bottom"] {
  bottom: 20px;
  align-items: flex-end;
  align-content: flex-end;
}

.plugin-panels[data-side="top"] .plugin-panel,
.plugin-panels[data-side="bottom"] .plugin-panel {
  pointer-events: auto;
  max-width: 100%;
}

.plugin-panel {
  flex-shrink: 0;
}

.plugin-panel.framed {
  border-radius: 10px;
  padding: 10px 12px;
}

.plugin-panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.plugin-panel-chevron {
  width: 14px;
  height: 14px;
  transition: transform 0.15s ease;
}

.plugin-panel-chevron.folded {
  transform: rotate(-90deg);
}

.plugin-panel.framed .plugin-panel-body {
  margin-top: 8px;
}
</style>
