<template>
    <TooltipProvider :delay-duration="600">
        <Tooltip>
            <TooltipTrigger>
                <input
                    ref="fileInput"
                    type="file"
                    class="hidden"
                    accept=".json"
                    @change="handleFileChange"
                />
                <Button
                    variant="secondary"
                    size="icon"
                    @click="handleClick"
                >
                    CTM
                </Button>
            </TooltipTrigger>
            <TooltipContent class="z-1000" side="bottom">
                <p> Load Timber Model <Kbd>W</Kbd></p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { sendRawMessage } from "@/communications/websocket";

const fileInput = ref<HTMLInputElement | null>(null);

function handleClick() {
    fileInput.value?.click();
}

function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;

    if (target.files && target.files.length > 0) {
        const file = target.files[0];

        const reader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                const textContent = e.target?.result as string;

                // Splice the raw file text straight into the envelope instead of
                // JSON.parse-ing it just to have sendDataMessage JSON.stringify it
                // right back — for large models that double pass was the bottleneck.
                const message = `{"dispatch":"other_action","action":"load_timber_model","json_data":${textContent}}`;

                const success = sendRawMessage(message);

                if (success) {
                    console.log("Successfully sent timber model JSON payload via WS");
                }
            } catch (error) {
                console.error("Failed to send uploaded timber model file:", error);
            }
        };

        reader.onerror = () => {
            console.error("Failed to read uploaded timber model file:", reader.error);
        };

        reader.readAsText(file);

        target.value = "";
    }
}
</script>
