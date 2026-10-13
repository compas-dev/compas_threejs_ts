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
    <section
      v-for="plugin in groups"
      :key="plugin.name"
      class="toolbar-section"
      :data-plugin="plugin.name"
    >
      <h2 v-if="plugin.title" class="toolbar-section-title">
        {{ plugin.title }}
      </h2>
      <div class="toolbar-group">
        <component
          :is="button"
          v-for="(button, index) in plugin.buttons"
          :key="index"
        />
      </div>
    </section>
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
// One section per plugin that has buttons, in the order the plugins were given.
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

.toolbar-section + .toolbar-section {
  border-top: 1px solid var(--border);
  padding-top: 10px;
}

.toolbar-section-title {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
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
