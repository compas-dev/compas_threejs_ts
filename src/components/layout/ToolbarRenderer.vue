<template>
  <TooltipProvider :delay-duration="400">
    <div
      v-if="resolvedGroups.length"
      id="toolbar-renderer"
      class="toolbar-renderer theme"
      :class="{ dark: theme.value === 'dark' }"
    >
      <template v-for="(entry, groupIndex) in resolvedGroups" :key="entry.group.id">
        <div
          v-if="groupIndex > 0"
          class="toolbar-renderer-group-divider"
          role="separator"
        />
        <div class="toolbar-renderer-group" :data-group-id="entry.group.id">
          <template v-for="item in entry.items" :key="item.id">
            <div
              v-if="item.kind === 'separator'"
              class="toolbar-renderer-separator"
              role="separator"
            />

            <ToolbarItemTooltip v-else :text="item.tooltip">
              <Button
                v-if="item.kind === 'button'"
                variant="secondary"
                size="icon"
                :disabled="!item.enabled"
                :aria-label="item.label"
                :data-item-id="item.id"
                @click="handleButtonClick(item)"
              >
                <component
                  :is="resolveToolbarIcon(item.icon)"
                  v-if="resolveToolbarIcon(item.icon)"
                />
                <span v-else>{{ item.label }}</span>
              </Button>

              <div
                v-else-if="item.kind === 'checkbox'"
                class="toolbar-renderer-checkbox"
                :data-item-id="item.id"
              >
                <Checkbox
                  :id="`toolbar-checkbox-${item.id}`"
                  :model-value="Boolean(item.default_value)"
                  :disabled="!item.enabled"
                  @update:model-value="
                    (checked) => handleCheckboxChange(item, checked)
                  "
                />
                <span
                  v-if="item.color"
                  class="toolbar-renderer-color-dot"
                  :style="{ backgroundColor: item.color }"
                />
                <label :for="`toolbar-checkbox-${item.id}`">{{
                  item.label
                }}</label>
              </div>

              <div
                v-else-if="item.kind === 'select'"
                class="toolbar-renderer-select"
                :data-item-id="item.id"
              >
                <label :for="`toolbar-select-${item.id}`">{{
                  item.label
                }}</label>
                <Select
                  :model-value="item.default_value"
                  :disabled="!item.enabled"
                  @update:model-value="
                    (value) => handleSelectChange(item, value)
                  "
                >
                  <SelectTrigger :id="`toolbar-select-${item.id}`">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent class="z-[4000]">
                    <SelectItem
                      v-for="option in item.options"
                      :key="option"
                      :value="option"
                    >
                      {{ option }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </ToolbarItemTooltip>
          </template>
        </div>
      </template>
    </div>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import ToolbarItemTooltip from "@/components/layout/ToolbarItemTooltip.vue";
import { useViewerRuntime } from "@/viewer/viewer_context";
import { resolveToolbarIcon } from "@/viewer/toolbar_icons";
import { resolveToolbarGroups } from "@/viewer/toolbar_utils";
import type { ToolbarItem } from "@/viewer/viewer_store";

const runtime = useViewerRuntime();
const { toolbar, theme } = runtime.store;

const resolvedGroups = computed(() => resolveToolbarGroups(toolbar));

/**
 * The outbound mechanism a backend-declared toolbar item's interaction sends
 * back over the wire - reusing exactly the same `{ dispatch: "ui_callback",
 * action, value }` shape/call (`runtime.handleUiAction`) that the existing
 * `register_action`/`Checkbox`/`Select` dynamic UI elements already use, so
 * the backend does not need a second callback-handling code path for this
 * new toolbar concept. `action` is keyed by the item's `id`.
 */
function handleButtonClick(item: ToolbarItem): void {
  if (item.kind !== "button" || !item.enabled) return;
  runtime.handleUiAction(item.id);
}

function handleCheckboxChange(
  item: ToolbarItem,
  checked: boolean | "indeterminate",
): void {
  if (item.kind !== "checkbox") return;
  const value = checked === true;
  item.default_value = value;
  runtime.handleUiAction(item.id, value);
}

function handleSelectChange(item: ToolbarItem, value: unknown): void {
  if (item.kind !== "select") return;
  const nextValue = typeof value === "string" ? value : String(value ?? "");
  item.default_value = nextValue;
  runtime.handleUiAction(item.id, nextValue);
}
</script>

<style scoped>
.toolbar-renderer {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  z-index: 1001;
  border-radius: 10px;
  padding: 10px 12px;
  pointer-events: auto;
  background: color-mix(in oklab, var(--background) 78%, transparent);
  border: 1px solid color-mix(in oklab, var(--foreground) 14%, transparent);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(10px);
}

.dark.toolbar-renderer {
  background: oklch(0.269 0 0);
  border-color: color-mix(in oklab, var(--foreground) 14%, transparent);
}

.toolbar-renderer-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-renderer-group-divider {
  width: 1px;
  align-self: stretch;
  background: var(--border, currentColor);
  opacity: 0.3;
}

.toolbar-renderer-separator {
  width: 1px;
  height: 20px;
  background: var(--border, currentColor);
  opacity: 0.3;
}

.toolbar-renderer-checkbox,
.toolbar-renderer-select {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-renderer-checkbox label,
.toolbar-renderer-select label {
  font-size: 13px;
  color: var(--foreground);
  white-space: nowrap;
}

.toolbar-renderer-color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  flex-shrink: 0;
}
</style>
