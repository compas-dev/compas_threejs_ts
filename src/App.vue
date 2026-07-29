<template>
    <div class="app-container" :class="{ dark: theme.value === 'dark' }">
        <Toolbar />
        <ObjectActionsToolbar />
        <div class="workspace">
            <Sidebar />
            <div ref="threeContainer" class="three-container"></div>
            <ObjectInfo />
            <ThemeIndicator />
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import ObjectInfo from "./components/layout/ObjectInfo.vue";
import { attachSceneToContainer } from "./viewer/scene_manager";
import { initializeWebSocketConnection } from "./communications/websocket";
import Sidebar from "@/components/layout/Sidebar.vue";
import Toolbar from "@/components/layout/Toolbar.vue";
import ObjectActionsToolbar from "@/components/layout/ObjectActionsToolbar.vue";
import ThemeIndicator from "@/components/layout/ThemeIndicator.vue";
import { theme } from "@/store/store";

const threeContainer = ref<HTMLDivElement | null>(null);

onMounted(() => {
    if (threeContainer.value) {
        attachSceneToContainer(threeContainer.value);
        initializeWebSocketConnection();
    }
});
</script>

<style scoped>
div.app-container {
    padding: 0px;
    margin: 0px;
    display: flex;
    flex-direction: column;
    height: 100vh; /* Full viewport height */
    width: 100%; /* Full viewport width */
    overflow: hidden;
    position: relative;
}

div.workspace {
    position: relative;
    flex: 1 1 auto; /* Fill the space left by the docked toolbar */
    min-height: 0;
    overflow: hidden;
}

div.three-container {
    position: absolute;
    inset: 0;
    overflow: hidden; /* Hide any overflow from the Three.js canvas */
}
</style>
