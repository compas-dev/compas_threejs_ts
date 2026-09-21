<template>
  <TooltipProvider v-if="visible" :delay-duration="600">
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="secondary"
          size="icon"
          :class="{
            active: pickerMode.value == 'rotate',
            disabled: !pickerEnabled.value,
          }"
          @click="handleClick"
          :disabled="!enabled || !pickerEnabled.value"
        >
          <Rotate3d :size="16" :stroke-width="2" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent class="z-1000" side="bottom">
        <p>Rotate mode <Kbd>E</Kbd></p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { Rotate3d } from "lucide-vue-next";
import { useViewerRuntime } from "@/viewer/viewer_context";
import { useToolbarControl } from "@/viewer/useToolbarControl";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
const runtime = useViewerRuntime();
const { pickerEnabled, pickerMode } = runtime.store;
const { visible, enabled } = useToolbarControl("rotate");

function handleClick() {
  runtime.setTransformMode("rotate");
}
</script>
