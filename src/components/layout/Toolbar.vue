<template>
  <div
    ref="toolbarElement"
    class="toolbar theme"
    :class="{ 'panel-horizontal': isHorizontal }"
    id="toolbar"
  >
    <h1 class="text-lg font-bold" :class="{ dark: theme.value === 'dark' }">
      {{ toolbarTitle }}
    </h1>
    <TransformGroup />
    <AddObjectGroup />
    <ViewGroup />
    <DisplayGroup />
    <component
      :is="mod"
      v-for="(mod, index) in extraToolbarModules"
      :key="index"
    />
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import TransformGroup from "@/components/tools/transforms/TransformGroup.vue";
import AddObjectGroup from "@/components/tools/objects/AddObjectGroup.vue";
import ViewGroup from "@/components/tools/views/ViewGroup.vue";
import DisplayGroup from "@/components/tools/display/DisplayGroup.vue";
import {
  isHorizontalPlacement,
  useToolbarPlacement,
  useToolbarTitle,
  useViewerRuntime,
} from "@/viewer/viewer_context";
import { useHover } from "@/composables/useHover";
import { ref, watchEffect } from "vue";

withDefaults(defineProps<{ extraToolbarModules?: Component[] }>(), {
  extraToolbarModules: () => [],
});

const toolbarElement = ref<HTMLElement | null>(null);
const { isHovered } = useHover(toolbarElement);
const { theme, blockPicker } = useViewerRuntime().store;
const placement = useToolbarPlacement();
const isHorizontal = isHorizontalPlacement(placement);
const toolbarTitle = useToolbarTitle();

watchEffect(() => {
  blockPicker.value = isHovered.value;
});
</script>

<style scoped>
.toolbar {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1001;
  border-radius: 10px;
  padding: 12px;
  margin: 0px;
  height: auto;
  width: 100%;
  pointer-events: auto;
}

.toolbar.panel-horizontal {
  /* Stays full width (the base .toolbar's own width: 100%) - top/bottom docks stack
     panels as separate full-width bars, so this one keeps the base width instead of
     shrinking to fit its content. */
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
}

:deep(.toolbar-group) {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  gap: 6px;
  padding-right: 6px;
}

:deep(.button-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transform-origin: center;
}

:deep(.button-icon.front-icon) {
  transform: scale(0.75);
}

:deep(.display-tools-wrapper) {
  display: contents;
}

:deep(Button) {
  &:hover {
    box-shadow: var(--toolbar-button-hover-shadow);
  }

  &.active {
    box-shadow: var(--toolbar-button-active-shadow);
  }
}
h1 {
  color: var(--foreground);
}
</style>
