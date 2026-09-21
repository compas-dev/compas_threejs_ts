<template>
  <div
    v-if="objectBarData.isVisible"
    class="theme metadata"
    :class="{ 'panel-horizontal': isHorizontal }"
    id="metadata-panel"
    ref="metadataPanel"
  >
    <div id="data-container">
      <div class="item">
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
      id="closeMetadata"
      @click="objectBarData.isVisible = false"
    >
      <component :is="collapseIcon" />
    </Button>
  </div>
  <Button
    v-else
    variant="secondary"
    size="icon"
    id="openMetadata"
    :class="`edge-${placement}`"
    @click="objectBarData.isVisible = true"
  >
    <component :is="expandIcon" />
  </Button>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { useHover } from "@/composables/useHover";
import { ref, watchEffect } from "vue";
import {
  ArrowBigDownDash,
  ArrowBigLeftDash,
  ArrowBigRightDash,
  ArrowBigUpDash,
  EyeOff,
} from "lucide-vue-next";
import {
  isHorizontalPlacement,
  useMetadataPlacement,
  useViewerRuntime,
  type PanelPlacement,
} from "@/viewer/viewer_context";

const runtime = useViewerRuntime();
const { objectBarData, blockPicker, theme, selectedObjectGuid } =
  runtime.store;
const metadataPanel = ref<HTMLElement | null>(null);
const placement = useMetadataPlacement();
const isHorizontal = isHorizontalPlacement(placement);

const collapseIconByPlacement: Record<PanelPlacement, unknown> = {
  left: ArrowBigLeftDash,
  right: ArrowBigRightDash,
  top: ArrowBigUpDash,
  bottom: ArrowBigDownDash,
};
const expandIconByPlacement: Record<PanelPlacement, unknown> = {
  left: ArrowBigRightDash,
  right: ArrowBigLeftDash,
  top: ArrowBigDownDash,
  bottom: ArrowBigUpDash,
};
const collapseIcon = collapseIconByPlacement[placement];
const expandIcon = expandIconByPlacement[placement];

function handleHide() {
  if (!selectedObjectGuid.value) return;
  runtime.hideObjectByGuid(selectedObjectGuid.value);
  runtime.deselectObject();
}

const { isHovered } = useHover(metadataPanel);

watchEffect(() => {
  blockPicker.value = isHovered.value;
});
</script>

<style scoped>
div.metadata {
  z-index: 1000; /* Ensure it appears above other content */
  padding: 20px;
  max-width: 400px;
  border-radius: 10px;
  max-height: 100%;
  margin: 0px;
  flex: 0 1 auto; /* Size to content within its dock zone, but shrink if it doesn't fit */
  display: flex;
  flex-direction: column;
  color: var(--foreground);
  pointer-events: auto;
}

div.metadata.panel-horizontal {
  /* Full width - top/bottom docks stack panels as separate full-width bars. */
  max-width: none;
  width: 100%;
  flex-direction: row;
  align-items: flex-start;
  gap: 20px;
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

Button#closeMetadata {
  position: relative;
  align-self: flex-end;
  margin-top: auto;
}

div.metadata.panel-horizontal Button#closeMetadata {
  margin-top: 0;
  margin-left: auto;
  align-self: center;
}

Button#openMetadata {
  position: absolute;
  z-index: 1001;
  margin: 0px;
  pointer-events: auto;
}

Button#openMetadata.edge-left {
  bottom: 40px;
  left: 40px;
}
Button#openMetadata.edge-right {
  bottom: 40px;
  right: 40px;
}
Button#openMetadata.edge-top {
  top: 40px;
  left: 40px;
}
Button#openMetadata.edge-bottom {
  bottom: 40px;
  left: 40px;
}
</style>
