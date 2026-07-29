<template>
    <div class="toolbar" id="toolbar">
        <h1 class="text-lg font-bold" :class="{ dark: theme.value === 'dark' }">TIMBER Viewer</h1>
        <div class="toolbar-controls">
            <TransformGroup />
            <div class="toolbar-divider" />
            <ViewGroup />
            <div class="toolbar-divider" />
            <DisplayGroup />
        </div>
    </div>
</template>

<script setup lang="ts">
import TransformGroup from "@/components/tools/transforms/TransformGroup.vue";
import ViewGroup from "@/components/tools/views/ViewGroup.vue";
import DisplayGroup from "@/components/tools/display/DisplayGroup.vue";
import { theme } from "@/store/store";
import { blockPicker, pickerEnabled } from "../../store/store";
import { useHover } from "@/composables/useHover";
import { watchEffect } from "vue";

const { isHovered } = useHover("toolbar");

watchEffect(() => {
    blockPicker.value = isHovered.value;
});
</script>

<style scoped>
.toolbar {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    z-index: 1001;
    padding: 10px 20px;
    margin: 0px;
    width: 100%;
    background: var(--card);
    border-bottom: 1px solid var(--border);
    pointer-events: auto;
}

.toolbar-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.toolbar-divider {
    width: 1px;
    height: 20px;
    background: var(--border);
    margin: 0 4px;
}

:deep(.toolbar-group) {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    gap: 6px;
    padding-right: 6px;
}

:deep(.button-icon) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transform-origin: center;
}

:deep(.button-icon.front-icon) {
    transform: scale(0.75);
}

:deep(.display-tools-wrapper) {
    display: contents;
}

:deep(Button) {
    &:hover {
        box-shadow: var(--toolbar-button-hover-shadow);
    }

    &.active {
        box-shadow: var(--toolbar-button-active-shadow);
    }
}
h1 {
    color: var(--foreground);
}
</style>
