<template>
  <div
    v-if="groups.length"
    ref="toolbarElement"
    class="toolbar theme"
    id="toolbar"
  >
    <h1 class="text-lg font-bold" :class="{ dark: theme.value === 'dark' }">
      COMPAS ThreeJs
    </h1>
    <div
      v-for="plugin in groups"
      :key="plugin.name"
      class="toolbar-group"
      :data-plugin="plugin.name"
    >
      <component
        :is="button"
        v-for="(button, index) in plugin.buttons"
        :key="index"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useViewerRuntime } from "@/viewer/viewer_context";
import { useHover } from "@/composables/useHover";
import { ref, watchEffect } from "vue";

const toolbarElement = ref<HTMLElement | null>(null);
const { isHovered } = useHover(toolbarElement);
const runtime = useViewerRuntime();
const { theme, blockPicker } = runtime.store;
// One row per plugin that has buttons, in the order the plugins were given.
const groups = runtime.plugins.filter((plugin) => plugin.buttons?.length);

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

.toolbar-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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
