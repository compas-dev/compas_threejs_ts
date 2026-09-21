<template>
  <TooltipProvider v-if="visible" :delay-duration="600">
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="secondary"
          size="icon"
          :disabled="!enabled"
          @click="handleClick"
        >
          <House />
        </Button>
      </TooltipTrigger>
      <TooltipContent class="z-1000" side="bottom">
        <p>Front view <Kbd>2</Kbd></p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { House } from "lucide-vue-next";
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
const { visible, enabled } = useToolbarControl("view_front");
function handleClick() {
  runtime.setCameraViewPreset("front");
}
</script>
