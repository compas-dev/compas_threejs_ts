<template>
  <div
    class="theme object-actions"
    :class="{ 'is-empty': !objectActionsState.length && !pluginActions.length }"
    id="actions-panel"
    ref="actionsPanel"
  >
    <!-- Titled like the plugins' panels -->
    <h2 class="object-actions-title">Actions</h2>
    <!-- Each plugin's actions in a group of their own, shaded like the toolbar's -->
    <div
      v-for="group in pluginGroups"
      :key="group.plugin"
      class="action-group plugin-actions"
      :data-plugin="group.plugin"
    >
      <ToolbarSlot
        v-for="action in group.actions"
        :key="`${action.plugin}/${action.button.id}`"
        :plugin="action.plugin"
        :button="action.button"
      />
    </div>
    <div v-if="objectActionsState.length" class="action-group">
      <div
        v-for="action in objectActionsState"
        :key="action.guid"
        class="single_data"
      >
        <Button
          v-if="action.type === 'button'"
          variant="secondary"
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
import { computed, ref, watchEffect } from "vue";
import ToolbarSlot from "@/components/layout/ToolbarSlot.vue";
import { useViewerRuntime } from "@/viewer/viewer_context";
import type { ObjectAction } from "@/viewer/viewer_store";

const runtime = useViewerRuntime();
const { objectActionsState, blockPicker, pickedObjectGuid, pluginButtons } =
  runtime.store;
// The plugins' actions for the picked object, in plugin order, minus those Python hid.
const pluginActions = computed(() =>
  pickedObjectGuid.value === null
    ? []
    : runtime.plugins.flatMap((plugin) => {
        const hidden = pluginButtons[plugin.name]?.hidden ?? [];
        return Object.entries(plugin.objectActions ?? {})
          .filter(([id]) => !hidden.includes(id))
          .map(([id, component]) => ({
            plugin: plugin.name,
            button: { id, component },
          }));
      }),
);
// The same, by plugin: one group each, in plugin order
const pluginGroups = computed(() => {
  const groups: { plugin: string; actions: typeof pluginActions.value }[] = [];
  for (const action of pluginActions.value) {
    const group = groups.at(-1);
    if (group?.plugin === action.plugin) group.actions.push(action);
    else groups.push({ plugin: action.plugin, actions: [action] });
  }
  return groups;
});
const handleObjectAction = (action: ObjectAction, value?: unknown) =>
  runtime.handleObjectAction({ ...action }, value);
const actionsPanel = ref<HTMLElement | null>(null);

const { isHovered } = useHover(actionsPanel);

watchEffect(() => {
  blockPicker.value = isHovered.value;
});
</script>

<style scoped>
/* Framed and titled like the plugins' panels (PluginPanels.vue) */
div.object-actions {
  z-index: 1000; /* Ensure it appears above other content */
  padding: 10px 12px;
  max-width: 400px;
  border-radius: 10px;
  margin: 0px;
  flex: 0 1 auto; /* Size to content within RightSidebar's column, but shrink if it doesn't fit */
  max-height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--foreground);
  pointer-events: auto;
}

/* A group is a shaded segment, as in the toolbar (Toolbar.vue's .toolbar-group) */
div.action-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 3px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--foreground) 6%, transparent);
}

/* An action that draws nothing for this object (a comment only) leaves no gap, and a
   group of only those no empty segment */
div.action-group > :empty,
div.action-group:not(:has(> :not(:empty))) {
  display: none;
}

/* Buttons as the toolbar's: grey, with its hover */
div.action-group :deep(button:hover) {
  box-shadow: var(--toolbar-button-hover-shadow);
}

div.object-actions.is-empty {
  /* Stay mounted (rather than v-if) so ordinary content refreshes — e.g.
     reselecting a different object — don't trigger RightSidebar's
     TransitionGroup enter/leave transition, which is reserved for the
     deliberate ObjectInfo open/close toggle. */
  display: none;
}

.object-actions-title {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
