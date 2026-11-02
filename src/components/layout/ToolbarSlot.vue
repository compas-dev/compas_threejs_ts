<template>
  <div
    class="toolbar-slot"
    :class="{ disabled: !enabled }"
    :data-button="button.id"
    :inert="!enabled || undefined"
  >
    <span
      v-if="failed"
      class="toolbar-slot-failed"
      :title="`The ${plugin} plugin's ${button.id} failed`"
      >!</span
    >
    <component :is="button.component" v-else />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onErrorCaptured,
  onMounted,
  provide,
  reactive,
  ref,
} from "vue";

import { buttonStateKey, type PluginButton } from "@/library/plugins";
import { useViewerRuntime } from "@/viewer/viewer_context";

// One plugin button, following the state Python gave it: a disabled button is greyed
// out and inert (so popovers can't open), and its ToolbarButton and shortcuts stand down.
const props = defineProps<{
  plugin: string;
  group?: string;
  button: PluginButton;
}>();
const runtime = useViewerRuntime();
const { pluginButtons } = runtime.store;

// Disabling the group disables each of its buttons.
const enabled = computed(() => {
  const disabled = pluginButtons[props.plugin]?.disabled ?? [];
  return (
    !(props.group && disabled.includes(props.group)) &&
    !disabled.includes(props.button.id)
  );
});
provide(
  buttonStateKey,
  reactive({
    enabled,
  }),
);

// A plugin component that throws is reported, and stops there: the rest of the viewer
// carries on. One that fails to set up or draw is replaced by a "!" mark; a failing
// click or watcher, after it mounted, leaves it in place.
const failed = ref(false);
let mounted = false;
onMounted(() => (mounted = true));
onErrorCaptured((error) => {
  if (!mounted) failed.value = true;
  runtime.pluginFailed(
    props.plugin,
    `The "${props.plugin}" plugin's "${props.button.id}" failed`,
    error,
  );
  return false;
});
</script>

<style scoped>
.toolbar-slot {
  display: contents;
}

.toolbar-slot-failed {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.375rem;
  font-weight: 700;
  color: var(--destructive, #d0342c);
  border: 1px dashed currentColor;
}

.toolbar-slot.disabled > :deep(*) {
  opacity: 0.45;
}
</style>
