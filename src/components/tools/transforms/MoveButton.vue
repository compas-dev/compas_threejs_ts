<template>
  <TooltipProvider :delay-duration="600">
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="secondary"
          size="icon"
          :class="{
            active: pickerMode.value == 'translate',
            disabled: !pickerEnabled.value,
          }"
          @click="handleClick"
          :disabled="!pickerEnabled.value"
        >
          <Move3d />
        </Button>
      </TooltipTrigger>
      <TooltipContent class="z-1000" side="bottom">
        <p>Move mode <Kbd>W</Kbd></p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { Move3d } from "lucide-vue-next";
import { useViewerRuntime } from "@/viewer/viewer_context";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
// You don't need `ref` here because you are using the store's ref directly

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

const runtime = useViewerRuntime();
const { pickerEnabled, pickerMode } = runtime.store;
function handleClick() {
  runtime.setTransformMode("translate");
}
</script>
