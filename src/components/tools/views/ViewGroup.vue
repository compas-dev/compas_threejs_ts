<template>
  <div class="toolbar-group">
    <TopViewButton />
    <FrontViewButton />
    <RightViewButton />
    <PerspectiveViewButton />
  </div>
</template>

<script setup lang="ts">
import { useViewerRuntime } from "@/viewer/viewer_context";
import { useKeyboardShortcuts } from "@/components/tools/useKeyboardShortcuts";
import {
  TopViewButton,
  FrontViewButton,
  RightViewButton,
  PerspectiveViewButton,
} from "./index";

const runtime = useViewerRuntime();
useKeyboardShortcuts({
  "2": () => {
    runtime.setCameraViewPreset("front");
  },
  "3": () => {
    runtime.setCameraViewPreset("front_right");
  },
  "5": () => {
    runtime.setCameraViewPreset("top");
  },
  "6": () => {
    runtime.setCameraViewPreset("right");
  },
});
</script>
