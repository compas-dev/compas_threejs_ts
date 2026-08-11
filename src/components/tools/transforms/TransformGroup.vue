<template>
  <div class="toolbar-group">
    <EnablePicker
      :active="activeTransform === 'move'"
      @activated="setActiveTransform('move')"
    />

    <MoveButton
      :active="activeTransform === 'move'"
      @activated="setActiveTransform('move')"
    />
    <RotateButton
      :active="activeTransform === 'rotate'"
      @activated="setActiveTransform('rotate')"
    />
    <ScaleButton
      :active="activeTransform === 'scale'"
      @activated="setActiveTransform('scale')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useViewerRuntime } from "@/viewer/viewer_context";
import { useKeyboardShortcuts } from "@/components/tools/useKeyboardShortcuts";
import { EnablePicker, MoveButton, RotateButton, ScaleButton } from "./index";

type TransformTool = "move" | "rotate" | "scale";

const activeTransform = ref<TransformTool | null>(null);
const runtime = useViewerRuntime();

function setActiveTransform(tool: TransformTool) {
  activeTransform.value = tool;
}

useKeyboardShortcuts({
  w: () => {
    runtime.setTransformMode("translate");
    setActiveTransform("move");
  },
  e: () => {
    runtime.setTransformMode("rotate");
    setActiveTransform("rotate");
  },
  r: () => {
    runtime.setTransformMode("scale");
    setActiveTransform("scale");
  },
});
</script>
