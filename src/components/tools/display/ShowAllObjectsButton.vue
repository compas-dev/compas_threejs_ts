<template>
    <TooltipProvider :delay-duration="600">
        <Tooltip>
            <TooltipTrigger>
                <Button variant="secondary" size="icon" class="toolbar-button" @click="handleClick">
                    <Eye />
                </Button>
            </TooltipTrigger>
            <TooltipContent class="z-1000" side="bottom">
                <p>Show all objects</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
</template>

<script setup lang="ts">
import { Eye } from "lucide-vue-next";
import { showAllObjects } from "@/viewer/toolbar_actions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

function handleClick() {
    showAllObjects();
}
</script>
