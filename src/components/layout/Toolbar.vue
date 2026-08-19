<template>
  <div
    ref="toolbarElement"
    class="toolbar theme"
    :class="{ 'docked-top': toolbarPlacement === 'docked-top' }"
    id="toolbar"
  >
    <h1 class="text-lg font-bold" :class="{ dark: theme.value === 'dark' }">
      COMPAS ThreeJs
    </h1>
    <TransformGroup />
    <AddObjectGroup />
    <ViewGroup />
    <DisplayGroup />
    <component
      :is="tool.component"
      v-for="tool in sortedToolbarTools"
      :key="tool.id"
    />
  </div>
</template>

<script setup lang="ts">
import TransformGroup from "@/components/tools/transforms/TransformGroup.vue";
import AddObjectGroup from "@/components/tools/objects/AddObjectGroup.vue";
import ViewGroup from "@/components/tools/views/ViewGroup.vue";
import DisplayGroup from "@/components/tools/display/DisplayGroup.vue";
import {
  useToolbarPlacement,
  useToolbarTools,
  useViewerRuntime,
} from "@/viewer/viewer_context";
import { useHover } from "@/composables/useHover";
import { computed, ref, watchEffect } from "vue";

const toolbarElement = ref<HTMLElement | null>(null);
const { isHovered } = useHover(toolbarElement);
const { theme, blockPicker } = useViewerRuntime().store;
const toolbarTools = useToolbarTools();
const toolbarPlacement = useToolbarPlacement();
const sortedToolbarTools = computed(() =>
  [...toolbarTools].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
);

watchEffect(() => {
  blockPicker.value = isHovered.value;
});
</script>

<style scoped>
/* `div.` prefix (matching Sidebar/ObjectActions/Openbar's own root selectors) is not
   just style: without it, this rule's specificity exactly ties a consumer's `:root
   .theme { border: ... }` override (also class+pseudo-class = two), and loses that tie
   to source order - the extra element-type selector here breaks the tie properly, so
   --toolbar-background/--toolbar-border-color stay overridable regardless of where a
   consumer's override happens to sit in the cascade. */
div.toolbar {
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
  background: var(--toolbar-background);
  border: 1px solid var(--toolbar-border-color);
}

div.toolbar.docked-top {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  padding: var(--docked-bar-padding);
  min-height: var(--docked-bar-height);
  width: auto;
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
