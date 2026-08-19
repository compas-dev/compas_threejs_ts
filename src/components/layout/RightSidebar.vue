<template>
  <TransitionGroup tag="div" id="right-sidebar" name="right-sidebar-item">
    <ObjectInfo v-if="objectBarData.isVisible" key="object-info" />
    <ObjectActions
      v-if="objectActionsPlacement === 'corner'"
      key="object-actions"
    />
  </TransitionGroup>

  <Button
    variant="secondary"
    size="icon"
    id="openObjectBar"
    :class="{ 'is-hidden': !objectBarData.isVisible }"
    @click="objectBarData.isVisible = true"
  >
    <ArrowBigLeftDash />
  </Button>
</template>

<script setup lang="ts">
import ObjectInfo from "@/components/layout/ObjectInfo.vue";
import ObjectActions from "@/components/layout/ObjectActions.vue";
import { Button } from "@/components/ui/button";
import { ArrowBigLeftDash } from "lucide-vue-next";
import {
  useObjectActionsPlacement,
  useViewerRuntime,
} from "@/viewer/viewer_context";

const { objectBarData } = useViewerRuntime().store;
const objectActionsPlacement = useObjectActionsPlacement();
</script>

<style scoped>
#right-sidebar {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px; /* Padding around the content */
  z-index: 1000; /* Ensure it stays above the Three.js canvas */
  row-gap: 20px; /* Space between ObjectInfo and ObjectActions */

  /* WIDTH */
  width: 30vw;
  max-width: 300px;
  min-width: 250px;
  pointer-events: none;
}

.right-sidebar-item-move,
.right-sidebar-item-enter-active,
.right-sidebar-item-leave-active {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.right-sidebar-item-enter-from,
.right-sidebar-item-leave-to {
  transform: translateX(150%);
}

.right-sidebar-item-leave-active {
  /* Drop out of flow immediately so ObjectActions animates into place right
     away instead of waiting for the leave transition to finish. */
  position: absolute;
}

Button#openObjectBar {
  position: absolute;
  bottom: 40px;
  right: 40px;
  z-index: 1001;
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
