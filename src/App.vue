<template>
  <div class="app-container" :class="{ dark: theme.value === 'dark' }">
    <!-- <Toolbar />
        <Openbar v-if="sideBarInfoState.isVisible" /> -->
    <Sidebar :show-toolbar="props.showToolbar" />
    <div ref="threeContainer" class="three-container"></div>
    <ThemeIndicator />
    <ObjectInfo />
    <ObjectActions />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import ObjectInfo from "./components/layout/ObjectInfo.vue";
import ObjectActions from "./components/layout/ObjectActions.vue";
import Sidebar from "@/components/layout/Sidebar.vue";
import ThemeIndicator from "@/components/layout/ThemeIndicator.vue";
import type { ViewerRuntime } from "@/viewer/viewer_runtime";

const threeContainer = ref<HTMLDivElement | null>(null);
const props = withDefaults(
  defineProps<{ runtime: ViewerRuntime; showToolbar?: boolean }>(),
  {
    showToolbar: true,
  },
);
const { theme } = props.runtime.store;

onMounted(() => {
  if (threeContainer.value) props.runtime.attach(threeContainer.value);
});
</script>

<style scoped>
div.app-container {
  padding: 0px;
  margin: 0px;
  display: inline-flex;
  height: 100%;
  width: 100%; /* Full viewport width */ /* Ensure it doesn't exceed viewport width */
  overflow: hidden;
  position: relative;
}

div.three-container {
  flex: 1; /* Take up remaining space */
  position: relative;
  overflow: hidden; /* Hide any overflow from the Three.js canvas */
}
</style>
