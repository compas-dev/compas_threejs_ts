<template>
  <div
    v-if="sections.length"
    ref="toolbarElement"
    class="toolbar theme"
    id="toolbar"
  >
    <h1 class="text-lg font-bold" :class="{ dark: theme.value === 'dark' }">
      COMPAS ThreeJs
    </h1>
    <section
      v-for="section in sections"
      :key="section.name"
      class="toolbar-section"
      :data-plugin="section.name"
    >
      <h2 v-if="section.title" class="toolbar-section-title">
        {{ section.title }}
      </h2>
      <div class="toolbar-groups">
        <div
          v-for="(group, groupIndex) in section.groups"
          :key="groupIndex"
          class="toolbar-group"
        >
          <component
            :is="button"
            v-for="(button, index) in group"
            :key="index"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { buttonGroups } from "@/library/plugins";
import { useViewerRuntime } from "@/viewer/viewer_context";
import { useHover } from "@/composables/useHover";
import { ref, watchEffect } from "vue";

const toolbarElement = ref<HTMLElement | null>(null);
const { isHovered } = useHover(toolbarElement);
const runtime = useViewerRuntime();
const { theme, blockPicker } = runtime.store;
// One section per plugin that has buttons, in the order the plugins were given;
// inside it, one segment per button group.
const sections = runtime.plugins
  .map((plugin) => ({
    name: plugin.name,
    title: plugin.title,
    groups: buttonGroups(plugin.buttons ?? []),
  }))
  .filter((section) => section.groups.length);

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

.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar-section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.toolbar-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* A group is a shaded segment; groups sit side by side while they fit. */
.toolbar-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 3px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--foreground) 6%, transparent);
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
