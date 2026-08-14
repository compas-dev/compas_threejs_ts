<template>
  <div class="actions-bar" v-if="objectActionsState.length">
    <div class="theme object-actions" id="actions-panel" ref="actionsPanel">
      <h1
        class="text-lg font-bold section-title"
        :class="{ dark: theme.value === 'dark' }"
      >
        FUNCTIONS
      </h1>
      <div
        v-for="action in objectActionsState"
        :key="action.guid"
        class="single_data"
      >
        <Button
          v-if="action.type === 'button'"
          variant="outline"
          @click="handleObjectAction(action)"
          class="w-full"
        >
          {{ action.text }}
        </Button>

        <Select
          v-else-if="action.type === 'select'"
          :model-value="
            typeof action.defaultValue === 'string' ? action.defaultValue : ''
          "
          @update:model-value="
            (value) => {
              action.defaultValue = typeof value === 'string' ? value : '';
              handleObjectAction(action, value);
            }
          "
        >
          <SelectTrigger class="w-full">
            <SelectValue
              :placeholder="action.placeholder ?? 'Select an option'"
            />
          </SelectTrigger>
          <SelectContent class="z-[4000]">
            <SelectItem
              v-for="option in action.options"
              :key="option"
              :value="option"
            >
              {{ option }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHover } from "@/composables/useHover";
import { ref, watchEffect } from "vue";
import { useViewerRuntime } from "@/viewer/viewer_context";
import type { ObjectAction } from "@/viewer/viewer_store";

const runtime = useViewerRuntime();
const { objectActionsState, blockPicker, theme } = runtime.store;
const handleObjectAction = (action: ObjectAction, value?: unknown) =>
  runtime.handleObjectAction({ ...action }, value);
const actionsPanel = ref<HTMLElement | null>(null);

const { isHovered } = useHover(actionsPanel);

watchEffect(() => {
  blockPicker.value = isHovered.value;
});
</script>

<style scoped>
div.actions-bar {
  position: absolute;
  bottom: 0;
  right: 0;
  padding: 20px; /* Padding around the content */

  /* WIDTH */
  width: 30vw;
  max-width: 300px;
  min-width: 250px;
  pointer-events: none;
}

/* 'scoped' means these styles only apply to this module */
div.object-actions {
  z-index: 1000; /* Ensure it appears above other content */
  padding: 20px;
  max-width: 400px;
  border-radius: 10px;
  margin: 0px;
  display: flex;
  flex-direction: column;
  gap: 30px;
  color: var(--foreground);
  pointer-events: auto;
}

h1.section-title {
  margin-bottom: 10px;
  color: var(--foreground);
  background: color-mix(in oklab, var(--background) 25%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 5px;
  padding-left: 10px;
  border-radius: 10px;
  box-shadow:
    1px 1px 3px 0px color-mix(in oklab, var(--foreground) 35%, transparent)
      inset,
    -1px -1px 3px 0px color-mix(in oklab, var(--background) 70%, transparent)
      inset;
}
</style>
