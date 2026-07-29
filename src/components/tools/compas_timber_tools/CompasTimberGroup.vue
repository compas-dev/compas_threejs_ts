<template>
    <div class="toolbar-group">
        <LoadTimberModel />
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { setTransformMode } from "@/viewer/toolbar_actions";
import { useKeyboardShortcuts } from "@/components/tools/useKeyboardShortcuts";
import { LoadTimberModel } from "./index";
</script>
