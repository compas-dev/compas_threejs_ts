<template>
    <div class="right-bar" id="info-panel" :class="{ 'is-hidden': !objectBarData.isVisible }">
        <div class="theme metadata-panel" id="metadata-panel">
            <Button
                variant="ghost"
                size="icon-sm"
                id="closeObjectBar"
                @click="toggleObjectBar()"
            >
                <X />
            </Button>
            <h2 class="metadata-title" :class="{ dark: theme.value === 'dark' }">Metadata</h2>
            <dl class="metadata-list">
                <template v-for="(value, key) in objectBarData.data" :key="key">
                    <dt>{{ key }}</dt>
                    <dd>{{ value }}</dd>
                </template>
            </dl>
        </div>
    </div>

    <Button
        variant="secondary"
        size="icon"
        id="openObjectBar"
        :class="{ 'is-hidden': !objectBarData.isVisible }"
        @click="toggleObjectBar()"
    >
        <ArrowBigLeftDash />
    </Button>
</template>

<script setup>
import { objectBarData } from "../../store/store";
import { blockPicker } from "../../store/store";
import { Button } from "@/components/ui/button";
import { useHover } from "@/composables/useHover";
import { watchEffect } from "vue";
import { ArrowBigLeftDash, X } from "lucide-vue-next";
import { theme } from "@/store/store";

const { isHovered } = useHover("info-panel");

watchEffect(() => {
    blockPicker.value = isHovered.value && objectBarData.isVisible;
});

const toggleObjectBar = () => {
    objectBarData.isVisible = !objectBarData.isVisible;
};
</script>

<style scoped>
div.right-bar {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px; /* Padding around the content */
    z-index: 1000;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);

    /* WIDTH */
    width: 30vw;
    max-width: 300px;
    min-width: 250px;
    pointer-events: none;
}

div.right-bar.is-hidden {
    transform: translateX(+150%);
    pointer-events: none;
}

/* 'scoped' means these styles only apply to this module */
.metadata-panel {
    position: relative;
    border-radius: 10px;
    padding: 16px;
    color: var(--foreground);
    pointer-events: auto;
    max-height: 100%;
    overflow-y: auto;
}

.metadata-title {
    margin: 0 24px 8px 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--foreground);
}

.metadata-list {
    margin: 0;
    font-size: 12.5px;
}

.metadata-list dt {
    color: var(--muted-foreground);
    margin-top: 8px;
}

.metadata-list dt:first-child {
    margin-top: 0;
}

.metadata-list dd {
    margin: 2px 0 0 0;
    color: var(--foreground);
    word-break: break-word;
}

Button#closeObjectBar {
    position: absolute;
    top: 8px;
    right: 8px;
}

Button#openObjectBar {
    position: fixed;
    bottom: 40px;
    right: 40px;
    z-index: 1;
    display: flex;
    visibility: hidden;
    transition: visibility 1s;
    pointer-events: auto;
}

Button#openObjectBar.is-hidden {
    opacity: 1;
    visibility: visible;
}
</style>
