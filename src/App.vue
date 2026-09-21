<template>
  <div class="app-container" :class="{ dark: theme.value === 'dark' }">
    <!--
      Toolbar, Openbar, Metadata and ObjectActions are four independent panels, each
      with its own placement option - none of them share a wrapper component. They're
      grouped here only by which edge they're currently docked to, in a fixed priority
      order per edge, so panels that land on the same edge stack predictably.
    -->
    <PanelDock v-if="hasTop" edge="top">
      <Toolbar
        v-if="toolbarPlacement === 'top' && props.showToolbar"
        :extra-toolbar-modules="props.extraToolbarModules"
      />
      <Openbar v-if="openbarPlacement === 'top'" />
      <Metadata v-if="metadataPlacement === 'top'" />
      <ObjectActions v-if="objectActionsPlacement === 'top'" />
    </PanelDock>
    <PanelDock v-if="hasRight" edge="right">
      <Toolbar
        v-if="toolbarPlacement === 'right' && props.showToolbar"
        :extra-toolbar-modules="props.extraToolbarModules"
      />
      <Openbar v-if="openbarPlacement === 'right'" />
      <Metadata v-if="metadataPlacement === 'right'" />
      <ObjectActions v-if="objectActionsPlacement === 'right'" />
    </PanelDock>
    <PanelDock v-if="hasBottom" edge="bottom">
      <Toolbar
        v-if="toolbarPlacement === 'bottom' && props.showToolbar"
        :extra-toolbar-modules="props.extraToolbarModules"
      />
      <Openbar v-if="openbarPlacement === 'bottom'" />
      <Metadata v-if="metadataPlacement === 'bottom'" />
      <ObjectActions v-if="objectActionsPlacement === 'bottom'" />
    </PanelDock>
    <PanelDock v-if="hasLeft" edge="left">
      <Toolbar
        v-if="toolbarPlacement === 'left' && props.showToolbar"
        :extra-toolbar-modules="props.extraToolbarModules"
      />
      <Openbar v-if="openbarPlacement === 'left'" />
      <Metadata v-if="metadataPlacement === 'left'" />
      <ObjectActions v-if="objectActionsPlacement === 'left'" />
    </PanelDock>

    <div ref="threeContainer" class="three-container"></div>
    <ThemeIndicator />
    <GlobalSpinner />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, type Component } from "vue";
import Metadata from "@/components/layout/Metadata.vue";
import ObjectActions from "@/components/layout/ObjectActions.vue";
import Openbar from "@/components/layout/Openbar.vue";
import PanelDock from "@/components/layout/PanelDock.vue";
import ThemeIndicator from "@/components/layout/ThemeIndicator.vue";
import GlobalSpinner from "@/components/layout/GlobalSpinner.vue";
import Toolbar from "@/components/layout/Toolbar.vue";
import {
  useMetadataPlacement,
  useObjectActionsPlacement,
  useOpenbarPlacement,
  useToolbarPlacement,
} from "@/viewer/viewer_context";
import type { ViewerRuntime } from "@/viewer/viewer_runtime";

const threeContainer = ref<HTMLDivElement | null>(null);
const props = withDefaults(
  defineProps<{
    runtime: ViewerRuntime;
    showToolbar?: boolean;
    extraToolbarModules?: Component[];
  }>(),
  {
    showToolbar: true,
    extraToolbarModules: () => [],
  },
);
const { theme } = props.runtime.store;

const toolbarPlacement = useToolbarPlacement();
const openbarPlacement = useOpenbarPlacement();
const metadataPlacement = useMetadataPlacement();
const objectActionsPlacement = useObjectActionsPlacement();

const hasTop = computed(
  () =>
    (toolbarPlacement === "top" && props.showToolbar) ||
    openbarPlacement === "top" ||
    metadataPlacement === "top" ||
    objectActionsPlacement === "top",
);
const hasRight = computed(
  () =>
    (toolbarPlacement === "right" && props.showToolbar) ||
    openbarPlacement === "right" ||
    metadataPlacement === "right" ||
    objectActionsPlacement === "right",
);
const hasBottom = computed(
  () =>
    (toolbarPlacement === "bottom" && props.showToolbar) ||
    openbarPlacement === "bottom" ||
    metadataPlacement === "bottom" ||
    objectActionsPlacement === "bottom",
);
const hasLeft = computed(
  () =>
    (toolbarPlacement === "left" && props.showToolbar) ||
    openbarPlacement === "left" ||
    metadataPlacement === "left" ||
    objectActionsPlacement === "left",
);

onMounted(() => {
  if (threeContainer.value) props.runtime.attach(threeContainer.value);
});
</script>

<style scoped>
div.app-container {
  padding: 0px;
  margin: 0px;
  /*
   * A 3x3 border layout: the top/bottom docks span the full width (row 1 and row 3),
   * the left/right docks are inset to the middle row only, so they never grow into a
   * corner a top/bottom dock is already occupying. Each dock's own row/column is
   * `auto`-sized to its content, so an empty edge takes up no space.
   */
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  width: 100%; /* Full viewport width */ /* Ensure it doesn't exceed viewport width */
  overflow: hidden;
  position: relative;
}

div.three-container {
  /* Always fills the whole container regardless of dock sizes - absolute positioning
     takes it out of grid layout entirely, the same way ThemeIndicator/GlobalSpinner's
     own absolute/fixed positioning already does. */
  position: absolute;
  inset: 0;
  overflow: hidden; /* Hide any overflow from the Three.js canvas */
}
</style>
