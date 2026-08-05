<template>
    <div class="toolbar-group">
        <LoadTimberModel />
        <ProcessJoinery />
        <TimberModelTreeView />
        <TimberModelGraphView />
        <TimberModelElementsList />
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { setTransformMode } from "@/viewer/toolbar_actions";
import { useKeyboardShortcuts } from "@/components/tools/useKeyboardShortcuts";
import { LoadTimberModel } from "./index";
import ProcessJoinery from "./ProcessJoinery.vue";
import { TimberModelTreeView } from "./index";
import { TimberModelGraphView } from "./index";
import { TimberModelElementsList } from "./index";
</script>
S
