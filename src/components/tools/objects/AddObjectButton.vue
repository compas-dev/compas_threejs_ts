<template>
  <TooltipProvider :delay-duration="600">
    <Popover v-model:open="isOpen" :modal="true">
      <PopoverTrigger as-child>
        <Button variant="secondary" size="icon">
          <Tooltip>
            <TooltipTrigger as-child>
              <span
                class="inline-flex h-full w-full items-center justify-center"
              >
                <Shapes />
              </span>
            </TooltipTrigger>
            <TooltipContent class="z-1000" side="bottom">
              <p>Add object</p>
            </TooltipContent>
          </Tooltip>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        class="theme z-[4000] w-64 rounded-xl p-3 text-secondary-foreground"
        side="bottom"
        align="start"
      >
        <div class="add-object-form">
          <Select v-model="shapeType">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent class="z-[4000]">
              <SelectItem
                v-for="option in SHAPE_TYPES"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <div v-if="shapeType === 'box'" class="param-grid">
            <label class="param-label">
              Size X
              <NumberField v-model="boxSize.xsize" :min="0.01" :step="0.1">
                <NumberFieldContent>
                  <NumberFieldDecrement />
                  <NumberFieldInput />
                  <NumberFieldIncrement />
                </NumberFieldContent>
              </NumberField>
            </label>
            <label class="param-label">
              Size Y
              <NumberField v-model="boxSize.ysize" :min="0.01" :step="0.1">
                <NumberFieldContent>
                  <NumberFieldDecrement />
                  <NumberFieldInput />
                  <NumberFieldIncrement />
                </NumberFieldContent>
              </NumberField>
            </label>
            <label class="param-label">
              Size Z
              <NumberField v-model="boxSize.zsize" :min="0.01" :step="0.1">
                <NumberFieldContent>
                  <NumberFieldDecrement />
                  <NumberFieldInput />
                  <NumberFieldIncrement />
                </NumberFieldContent>
              </NumberField>
            </label>
          </div>

          <div v-else-if="shapeType === 'sphere'" class="param-grid">
            <label class="param-label">
              Radius
              <NumberField v-model="sphereRadius" :min="0.01" :step="0.1">
                <NumberFieldContent>
                  <NumberFieldDecrement />
                  <NumberFieldInput />
                  <NumberFieldIncrement />
                </NumberFieldContent>
              </NumberField>
            </label>
          </div>

          <Button variant="secondary" class="w-full" @click="handleAdd">
            Add
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Shapes } from "lucide-vue-next";
import { useViewerRuntime } from "@/viewer/viewer_context";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ShapeType = "box" | "sphere" | "point";

const SHAPE_TYPES: { value: ShapeType; label: string }[] = [
  { value: "box", label: "Box" },
  { value: "sphere", label: "Sphere" },
  { value: "point", label: "Point" },
];

const runtime = useViewerRuntime();
const isOpen = ref(false);
const shapeType = ref<ShapeType>("box");
const boxSize = ref({ xsize: 1, ysize: 1, zsize: 1 });
const sphereRadius = ref(1);

function handleAdd() {
  const params: Record<string, number> =
    shapeType.value === "box"
      ? { ...boxSize.value }
      : shapeType.value === "sphere"
        ? { radius: sphereRadius.value }
        : {};
  runtime.createGeometry(shapeType.value, params);
  isOpen.value = false;
}
</script>

<style scoped>
.add-object-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.param-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
}
</style>
