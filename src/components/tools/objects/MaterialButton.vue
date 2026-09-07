<template>
  <TooltipProvider :delay-duration="600">
    <Popover v-model:open="isOpen" :modal="true">
      <PopoverTrigger as-child>
        <Button
          variant="secondary"
          size="icon"
          :disabled="!pickedObjectGuid.value"
        >
          <Tooltip>
            <TooltipTrigger as-child>
              <span
                class="inline-flex h-full w-full items-center justify-center"
              >
                <Palette />
              </span>
            </TooltipTrigger>
            <TooltipContent class="z-1000" side="bottom">
              <p>Material</p>
            </TooltipContent>
          </Tooltip>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        class="theme z-[4000] w-64 rounded-xl p-3 text-secondary-foreground"
        side="bottom"
        align="start"
      >
        <div class="material-form">
          <label class="param-label">
            Color
            <input
              type="color"
              :value="color"
              class="color-input"
              @input="handleColorInput"
            />
          </label>

          <label class="param-label">
            Metalness
            <div class="slider-row">
              <Slider
                :model-value="[metalness]"
                :min="0"
                :max="1"
                :step="0.05"
                @update:model-value="(value) => handleMetalness(value?.[0])"
              />
              <span class="slider-value">{{ metalness.toFixed(2) }}</span>
            </div>
          </label>

          <label class="param-label">
            Roughness
            <div class="slider-row">
              <Slider
                :model-value="[roughness]"
                :min="0"
                :max="1"
                :step="0.05"
                @update:model-value="(value) => handleRoughness(value?.[0])"
              />
              <span class="slider-value">{{ roughness.toFixed(2) }}</span>
            </div>
          </label>
        </div>
      </PopoverContent>
    </Popover>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Palette } from "lucide-vue-next";
import { useViewerRuntime } from "@/viewer/viewer_context";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const runtime = useViewerRuntime();
const { pickedObjectGuid } = runtime.store;

const isOpen = ref(false);
const color = ref("#ffffff");
const metalness = ref(0);
const roughness = ref(1);

function refreshFromSnapshot() {
  const guid = pickedObjectGuid.value;
  const snapshot = guid ? runtime.getMaterialSnapshot(guid) : null;
  color.value = snapshot?.color ?? "#ffffff";
  metalness.value = snapshot?.metalness ?? 0;
  roughness.value = snapshot?.roughness ?? 1;
}

watch(isOpen, (open) => {
  if (open) refreshFromSnapshot();
});

watch(
  () => pickedObjectGuid.value,
  (guid) => {
    if (!guid) {
      isOpen.value = false;
      return;
    }
    if (isOpen.value) refreshFromSnapshot();
  },
);

function handleColorInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  color.value = value;
  const guid = pickedObjectGuid.value;
  if (guid) runtime.setMaterial(guid, { color: value });
}

function handleMetalness(value: number | undefined) {
  if (value === undefined) return;
  metalness.value = value;
  const guid = pickedObjectGuid.value;
  if (guid) runtime.setMaterial(guid, { metalness: value });
}

function handleRoughness(value: number | undefined) {
  if (value === undefined) return;
  roughness.value = value;
  const guid = pickedObjectGuid.value;
  if (guid) runtime.setMaterial(guid, { roughness: value });
}
</script>

<style scoped>
.material-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8rem;
}

.color-input {
  width: 100%;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: none;
  cursor: pointer;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-value {
  min-width: 2.5em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
