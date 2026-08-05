<template>
    <TooltipProvider :delay-duration="600">
        <Tooltip>
            <TooltipTrigger>
                <input
                    ref="fileInput"
                    type="file"
                    class="hidden"
                    accept=".json"
                />
                <Button
                    variant="secondary"
                    size="icon"
                    @click="handleClick"
                >
                    LS
                </Button>
            </TooltipTrigger>
            <TooltipContent class="z-1000" side="bottom"s>
                <p>Elements List</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { sendDataMessage } from "@/communications/websocket";

const fileInput = ref<HTMLInputElement | null>(null);

function handleClick() {
    const payload = {
        dispatch: "other_action",
        action: "go_timber_model_elements_list"
    };
    sendDataMessage(payload as any);
}

</script>
