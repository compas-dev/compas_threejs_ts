<template>
  <div class="theme object-info" id="info-panel" ref="infoPanel">
    <!-- Titled like the plugins' panels -->
    <header class="object-info-header">
      <h2 class="object-info-title">Metadata</h2>
      <Button
        variant="ghost"
        size="icon"
        id="closeObjectBar"
        class="object-info-close"
        aria-label="Close the object's info"
        title="Close"
        @click="objectBarData.isVisible = false"
      >
        <ArrowBigRightDash />
      </Button>
    </header>
    <dl id="data-container">
      <div
        v-for="(value, key) in objectBarData.data"
        :key="key"
        class="data-entry"
      >
        <dt>{{ key }}</dt>
        <dd>{{ value }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { useHover } from "@/composables/useHover";
import { ref, watchEffect } from "vue";
import { ArrowBigRightDash } from "lucide-vue-next";
import { useViewerRuntime } from "@/viewer/viewer_context";

const runtime = useViewerRuntime();
const { objectBarData, blockPicker } = runtime.store;
const infoPanel = ref<HTMLElement | null>(null);

const { isHovered } = useHover(infoPanel);

watchEffect(() => {
  blockPicker.value = isHovered.value;
});
</script>

<style scoped>
/* Framed and titled like the plugins' panels (PluginPanels.vue) */
div.object-info {
  z-index: 1000; /* Ensure it appears above other content */
  padding: 10px 12px;
  max-width: 400px;
  border-radius: 10px;
  max-height: 100%;
  margin: 0px;
  flex: 0 1 auto; /* Size to content within RightSidebar's column, but shrink if it doesn't fit */
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--foreground);
  pointer-events: auto;
}

.object-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.object-info-title {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.object-info-close {
  width: 24px;
  height: 24px;
}

.object-info-close :deep(svg) {
  width: 16px;
  height: 16px;
}

dl#data-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  overflow-y: auto;
  font-size: 13px;
}

div.data-entry {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr);
  gap: 8px;
}

div.data-entry dt {
  color: var(--muted-foreground);
}

div.data-entry dd {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
