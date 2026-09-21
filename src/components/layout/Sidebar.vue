<template>
  <div id="sidebar">
    <Toolbar v-if="showToolbar" />
    <Openbar v-if="sideBarInfoState.isVisible" />
  </div>
</template>

<script setup lang="ts">
import Toolbar from "@/components/layout/Toolbar.vue";
import Openbar from "@/components/layout/Openbar.vue";
import { useViewerRuntime } from "@/viewer/viewer_context";

const { sideBarInfoState } = useViewerRuntime().store;

withDefaults(defineProps<{ showToolbar?: boolean }>(), {
  showToolbar: true,
});
</script>

<style scoped>
div#sidebar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px; /* Padding around the content */
  z-index: 1000; /* Ensure it stays above the Three.js canvas */
  row-gap: 30px; /* Space between Toolbar and Openbar */

  /* WIDTH */
  width: 30vw;
  max-width: 300px;
  min-width: 250px;
  pointer-events: none;
}

:deep(.toolbar) {
  pointer-events: auto;
}

:deep(#openbar) {
  pointer-events: auto;
}
</style>
