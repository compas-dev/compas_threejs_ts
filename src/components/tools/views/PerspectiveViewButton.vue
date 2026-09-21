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
          <span class="button-icon">
            <Box :size="16" :stroke-width="2" aria-hidden="true" />
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent class="z-1000" side="bottom">
        <p>Perspective view <Kbd>3</Kbd></p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { Box } from "lucide-vue-next";
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
const { visible, enabled } = useToolbarControl("view_perspective");
function handleClick() {
  runtime.setCameraViewPreset("front_right");
}
</script>
