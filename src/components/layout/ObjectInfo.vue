<template>
  <div class="theme object-info" id="info-panel" ref="infoPanel">
    <div id="data-container">
      <div class="metadata item">
        <h1
          class="text-lg font-bold section-title"
          :class="{ dark: theme.value === 'dark' }"
        >
          METADATA
        </h1>
        <div v-if="selectedObjectGuid.value" class="single_data">
          <Button variant="outline" class="w-full" @click="handleHide">
            <EyeOff class="size-4" />
            Hide
          </Button>
        </div>
        <div
          v-for="(value, key) in objectBarData.data"
          :key="key"
          class="data-entry"
        >
          <p>
            <strong> {{ key }}:</strong> {{ value }}
          </p>
        </div>
      </div>
    </div>

    <Button
      variant="secondary"
      size="icon"
      id="closeObjectBar"
      @click="objectBarData.isVisible = false"
    >
      <ArrowBigRightDash />
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { useHover } from "@/composables/useHover";
import { ref, watchEffect } from "vue";
import { ArrowBigLeftDash, ArrowBigRightDash, EyeOff } from "lucide-vue-next";
import { useViewerRuntime } from "@/viewer/viewer_context";

const runtime = useViewerRuntime();
const {
  objectActionsState,
  objectBarData,
  blockPicker,
  theme,
  selectedObjectGuid,
} = runtime.store;
const handleObjectAction = (action: ObjectAction, value?: unknown) =>
  runtime.handleObjectAction({ ...action }, value);
const infoPanel = ref<HTMLElement | null>(null);

function handleHide() {
  if (!selectedObjectGuid.value) return;
  runtime.hideObjectByGuid(selectedObjectGuid.value);
  runtime.deselectObject();
}

const { isHovered } = useHover(infoPanel);

watchEffect(() => {
  blockPicker.value = isHovered.value;
});
</script>

<style scoped>
div.object-info {
  z-index: 1000; /* Ensure it appears above other content */
  padding: 20px;
  max-width: 400px;
  border-radius: 10px;
  max-height: 100%;
  margin: 0px;
  flex: 0 1 auto; /* Size to content within RightSidebar's column, but shrink if it doesn't fit */
  display: flex;
  flex-direction: column;
  color: var(--foreground);
  pointer-events: auto;
}

div#data-container {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  gap: 30px;
}
div.item {
  display: flex;
  flex-direction: column; /* Stack label on top of the component */
  align-items: left;
}

h1.section-title {
  margin-bottom: 10px;
  color: var(--foreground);
  background: color-mix(in oklab, var(--background) 25%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  /*border: 1px solid rgba(255, 255, 255, 0.2);*/
  padding: 5px;
  padding-left: 10px;
  border-radius: 10px;
  box-shadow:
    1px 1px 3px 0px color-mix(in oklab, var(--foreground) 35%, transparent)
      inset,
    -1px -1px 3px 0px color-mix(in oklab, var(--background) 70%, transparent)
      inset;
}

div.data-entry {
  margin-bottom: 8px;
  padding: 0 0 0 10px;
}

Button#closeObjectBar {
  position: relative;
  align-self: flex-end;
  margin-top: auto;
}
</style>
