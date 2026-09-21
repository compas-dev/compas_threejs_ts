<template>
  <Tooltip v-if="text">
    <TooltipTrigger as-child>
      <slot />
    </TooltipTrigger>
    <TooltipContent class="z-[4000]" side="bottom">
      <p>{{ text }}</p>
    </TooltipContent>
  </Tooltip>
  <slot v-else />
</template>

<script setup lang="ts">
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

defineProps<{ text: string | null }>();
</script>
