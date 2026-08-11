<template>
  <TooltipProvider :delay-duration="600">
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="secondary"
          size="icon"
          class="toolbar-button"
          :class="{
            active: pickerMode.value == 'scale',
            disabled: !pickerEnabled.value,
          }"
          @click="handleClick"
          :disabled="!pickerEnabled.value"
        >
          <span class="button-icon">
            <Scale3d :size="16" :stroke-width="2" aria-hidden="true" />
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent class="z-1000" side="bottom">
        <p>Rotate mode <Kbd>R</Kbd></p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { Scale3d } from "lucide-vue-next";
import { useViewerRuntime } from "@/viewer/viewer_context";
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

defineProps<{
  active: boolean;
}>();

// TODO(release 8A): TransformGroup binds @activated on the move, rotate, and
// scale buttons, but none of them ever emits it, so setActiveTransform never
// runs. Tracked as audit item B12 in the release plan.
defineEmits<{
  (e: "activated"): void;
}>();

function handleClick() {
  runtime.setTransformMode("scale");
}
</script>
