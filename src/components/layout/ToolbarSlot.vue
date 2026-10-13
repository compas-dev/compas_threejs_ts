<template>
  <div
    class="toolbar-slot"
    :class="{ disabled: !enabled }"
    :data-button="button.id"
    :inert="!enabled || undefined"
  >
    <component :is="button.component" />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, reactive } from "vue";

import { buttonStateKey, type PluginButton } from "@/library/plugins";
import { useViewerRuntime } from "@/viewer/viewer_context";

// One plugin button, following the state Python gave it: a disabled button is greyed
// out and inert (so popovers can't open), and its ToolbarButton and shortcuts stand down.
const props = defineProps<{
  plugin: string;
  group: string;
  button: PluginButton;
}>();
const { pluginButtons } = useViewerRuntime().store;

// Disabling the group disables each of its buttons.
const enabled = computed(() => {
  const disabled = pluginButtons[props.plugin]?.disabled ?? [];
  return !disabled.includes(props.group) && !disabled.includes(props.button.id);
});
provide(
  buttonStateKey,
  reactive({
    enabled,
  }),
);
</script>

<style scoped>
.toolbar-slot {
  display: contents;
}

.toolbar-slot.disabled > :deep(*) {
  opacity: 0.45;
}
</style>
