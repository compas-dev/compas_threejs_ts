<template>
  <TooltipProvider v-if="visible" :delay-duration="600">
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="secondary"
          size="icon"
          class="toolbar-button"
          :disabled="!enabled"
          @click="handleClick"
        >
          <Plane />
        </Button>
      </TooltipTrigger>
      <TooltipContent class="z-1000" side="bottom">
        <p>Top view <Kbd>5</Kbd></p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { Plane } from "lucide-vue-next";
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
const { visible, enabled } = useToolbarControl("view_top");
function handleClick() {
  runtime.setCameraViewPreset("top");
}
</script>
