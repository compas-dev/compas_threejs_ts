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
import { sendDataMessage } from "@/communications/websocket";

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
                const jsonContent = JSON.parse(textContent);

                const payload = {
                    dispatch: "other_action",
                    action: "load_timber_model",
                    json_data: jsonContent,
                };

                const success = sendDataMessage(payload as any);

                if (success) {
                    console.log("Successfully sent timber model JSON payload via WS");
                }
            } catch (error) {
                console.error("Failed to parse or send uploaded timber model file:", error);
            }
        };

        reader.readAsText(file);

        target.value = "";
    }
}
</script>
