<template>
  <TooltipProvider :delay-duration="600">
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          variant="secondary"
          size="icon"
          :class="{ active, disabled }"
          :disabled="disabled"
          @click="emit('click', $event)"
        >
          <slot />
        </Button>
      </TooltipTrigger>
      <TooltipContent class="z-1000" side="bottom">
        <slot name="tooltip">
          <p>
            {{ tooltip }}
            <Kbd v-if="shortcut">{{ shortcut }}</Kbd>
          </p>
        </slot>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

withDefaults(
  defineProps<{
    tooltip?: string;
    shortcut?: string;
    active?: boolean;
    disabled?: boolean;
  }>(),
  { tooltip: "", shortcut: "", active: false, disabled: false },
);
const emit = defineEmits<{ click: [event: MouseEvent] }>();
</script>
