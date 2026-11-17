<template>
  <TooltipProvider :delay-duration="600">
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          variant="secondary"
          size="icon"
          :class="{ active, disabled: isDisabled }"
          :disabled="isDisabled"
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
import { computed, inject } from "vue";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { buttonStateKey } from "@/library/plugins";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const props = withDefaults(
  defineProps<{
    tooltip?: string;
    shortcut?: string;
    active?: boolean;
    disabled?: boolean;
  }>(),
  { tooltip: "", shortcut: "", active: false, disabled: false },
);
const emit = defineEmits<{ click: [event: MouseEvent] }>();
// Disabled by its own prop, or by Python through the plugin's button state.
const state = inject(buttonStateKey, null);
const isDisabled = computed(() => props.disabled || state?.enabled === false);
</script>
