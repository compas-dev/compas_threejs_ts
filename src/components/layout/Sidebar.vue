<template>
    <div id="sidebar">
        <Openbar v-if="sideBarInfoState.isVisible" />
    </div>
</template>

<script setup lang="ts">
import Openbar from "@/components/layout/Openbar.vue";
import { sideBarInfoState } from "@/store/store.ts";
</script>

<style scoped>
div#sidebar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px; /* Padding around the content */
    z-index: 1000; /* Ensure it stays above the Three.js canvas */

    /* WIDTH */
    width: 30vw;
    max-width: 300px;
    min-width: 250px;
    pointer-events: none;
}

:deep(#openbar) {
    pointer-events: auto;
}
</style>
