<template>
  <div
    class="theme object-actions"
    :class="{ 'is-empty': !objectActionsState.length }"
    id="actions-panel"
    ref="actionsPanel"
  >
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
div.object-actions {
  z-index: 1000; /* Ensure it appears above other content */
  padding: 20px;
  max-width: 400px;
  border-radius: 10px;
  margin: 0px;
  flex: 0 1 auto; /* Size to content within RightSidebar's column, but shrink if it doesn't fit */
  max-height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 30px;
  color: var(--foreground);
  pointer-events: auto;
}

div.object-actions.is-empty {
  /* Stay mounted (rather than v-if) so ordinary content refreshes — e.g.
     reselecting a different object — don't trigger RightSidebar's
     TransitionGroup enter/leave transition, which is reserved for the
     deliberate ObjectInfo open/close toggle. */
  display: none;
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
