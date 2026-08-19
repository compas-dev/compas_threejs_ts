<template>
  <div
    class="app-container"
    :class="{
      dark: theme.value === 'dark',
      'docked-top': isDockedTop,
    }"
  >
    <div v-if="isDockedTop" class="dock-top">
      <Toolbar v-if="props.showToolbar && toolbarPlacement === 'docked-top'" />
      <ObjectActions v-if="objectActionsPlacement === 'docked-top'" />
    </div>

    <div class="workspace">
      <Openbar v-if="openbarPlacement === 'docked-left'" />
      <Sidebar :show-toolbar="props.showToolbar" />
      <div ref="threeContainer" class="three-container"></div>
      <ThemeIndicator />
      <RightSidebar />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ObjectActions from "@/components/layout/ObjectActions.vue";
import Openbar from "@/components/layout/Openbar.vue";
import RightSidebar from "./components/layout/RightSidebar.vue";
import Sidebar from "@/components/layout/Sidebar.vue";
import ThemeIndicator from "@/components/layout/ThemeIndicator.vue";
import Toolbar from "@/components/layout/Toolbar.vue";
import {
  useObjectActionsPlacement,
  useOpenbarPlacement,
  useToolbarPlacement,
} from "@/viewer/viewer_context";
import type { ViewerRuntime } from "@/viewer/viewer_runtime";

const threeContainer = ref<HTMLDivElement | null>(null);
const props = withDefaults(
  defineProps<{ runtime: ViewerRuntime; showToolbar?: boolean }>(),
  {
    showToolbar: true,
  },
);
const { theme } = props.runtime.store;
const toolbarPlacement = useToolbarPlacement();
const openbarPlacement = useOpenbarPlacement();
const objectActionsPlacement = useObjectActionsPlacement();
const isDockedTop = computed(
  () =>
    toolbarPlacement === "docked-top" ||
    objectActionsPlacement === "docked-top",
);

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

div.app-container.docked-top {
  flex-direction: column;
}

div.dock-top {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  flex: 0 0 auto;
  padding: 12px 16px;
}

div.workspace {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
  min-height: 0; /* Let it shrink below content size inside the column-direction app-container */
}
</style>
