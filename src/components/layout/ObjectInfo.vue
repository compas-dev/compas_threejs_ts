<template>
  <div class="right-bar">
    <div
      class="theme object-info"
      :class="{ 'is-hidden': !objectBarData.isVisible }"
      id="info-panel"
      ref="infoPanel"
    >
      <div id="data-container">
        <div class="metadata item">
          <h1
            class="text-lg font-bold section-title"
            :class="{ dark: theme.value === 'dark' }"
          >
            METADATA
          </h1>
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
        @click="toggleObjectBar()"
      >
        <ArrowBigRightDash />
      </Button>
    </div>

    <Button
      variant="secondary"
      size="icon"
      id="openObjectBar"
      :class="{ 'is-hidden': !objectBarData.isVisible }"
      @click="toggleObjectBar()"
    >
      <ArrowBigLeftDash />
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { useHover } from "@/composables/useHover";
import { ref, watchEffect } from "vue";
import { ArrowBigLeftDash, ArrowBigRightDash } from "lucide-vue-next";
import { useViewerRuntime } from "@/viewer/viewer_context";

const runtime = useViewerRuntime();
const { objectBarData, blockPicker, theme } = runtime.store;
const infoPanel = ref<HTMLElement | null>(null);

const { isHovered } = useHover(infoPanel);

watchEffect(() => {
  blockPicker.value = isHovered.value && objectBarData.isVisible;
});

const toggleObjectBar = () => {
  objectBarData.isVisible = !objectBarData.isVisible;
};
</script>

<style scoped>
div.right-bar {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px; /* Padding around the content */

  /* WIDTH */
  width: 30vw;
  max-width: 300px;
  min-width: 250px;
  pointer-events: none;
}

/* 'scoped' means these styles only apply to this module */
div.object-info {
  z-index: 1000; /* Ensure it appears above other content */
  padding: 20px;
  max-width: 400px;
  border-radius: 10px;
  height: 100%;
  margin: 0px;
  right: 0%;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  color: var(--foreground);
  pointer-events: auto;
}

div.is-hidden {
  transform: translateX(+150%);
  /*display: none;*/
  pointer-events: none;
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

Button#openObjectBar {
  position: absolute;
  bottom: 40px;
  right: 40px;
  z-index: 1;
  display: flex;
  visibility: hidden;
  transition: visibility 1s;
  pointer-events: auto;
}

Button#openObjectBar.is-hidden {
  opacity: 1;
  visibility: visible;
}
</style>
