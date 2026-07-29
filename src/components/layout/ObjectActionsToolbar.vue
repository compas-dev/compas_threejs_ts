<template>
    <div class="actions-toolbar" id="actions-toolbar">
        <span class="actions-toolbar-label" :class="{ dark: theme.value === 'dark' }">Object Actions</span>
        <div class="toolbar-divider" />

        <div v-if="selectedObjectGuid.value" class="actions-toolbar-controls">
            <Button variant="outline" size="sm" @click="handleHide">
                <EyeOff class="size-4" />
                Hide
            </Button>

            <div v-if="objectActionsState.length" class="toolbar-divider" />

            <template v-for="action in objectActionsState" :key="action">
                <Button
                    v-if="action.type === 'button'"
                    variant="outline"
                    size="sm"
                    @click="handleObjectAction(action)"
                >
                    {{ action.text }}
                </Button>

                <Select
                    v-else-if="action.type === 'select'"
                    :model-value="action.defaultValue"
                    @update:model-value="(value) => {
                        action.defaultValue = value;
                        handleObjectAction(action, value);
                    }"
                >
                    <SelectTrigger class="w-auto">
                        <SelectValue :placeholder="action.placeholder ?? 'Select an option'" />
                    </SelectTrigger>
                    <SelectContent class="z-[4000]">
                        <SelectItem v-for="option in action.options" :key="option" :value="option">
                            {{ option }}
                        </SelectItem>
                    </SelectContent>
                </Select>
            </template>
        </div>

        <span v-else class="actions-toolbar-empty">No object selected</span>
    </div>
</template>

<script setup lang="ts">
import { watchEffect } from "vue";
import { EyeOff } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { objectActionsState, blockPicker, selectedObjectGuid, theme } from "@/store/store";
import { handleObjectAction } from "@/communications/objectInfo";
import { hideObjectByGuid, deselectCurrentObject } from "@/viewer/toolbar_actions";
import { useHover } from "@/composables/useHover";

const { isHovered } = useHover("actions-toolbar");

watchEffect(() => {
    blockPicker.value = isHovered.value;
});

function handleHide() {
    if (!selectedObjectGuid.value) {
        return;
    }
    hideObjectByGuid(selectedObjectGuid.value);
    deselectCurrentObject();
}
</script>

<style scoped>
.actions-toolbar {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;
    z-index: 1001;
    padding: 8px 20px;
    margin: 0px;
    width: 100%;
    /* Fixed height regardless of content (empty state vs N wrapped buttons) so the
       workspace below never resizes the canvas/renderer when the selection changes. */
    height: 53px;
    box-sizing: border-box;
    background: var(--card);
    border-bottom: 1px solid var(--border);
    pointer-events: auto;
}

.actions-toolbar-label {
    flex: 0 0 auto;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--muted-foreground);
    white-space: nowrap;
}

.toolbar-divider {
    flex: 0 0 auto;
    width: 1px;
    height: 20px;
    background: var(--border);
}

.actions-toolbar-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    /* Overflow scrolls horizontally instead of wrapping to new rows, which would
       otherwise change the bar's height. */
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
}

.actions-toolbar-controls > * {
    flex-shrink: 0;
}

.actions-toolbar-empty {
    flex: 0 0 auto;
    font-size: 0.8125rem;
    color: var(--muted-foreground);
    font-style: italic;
}
</style>
