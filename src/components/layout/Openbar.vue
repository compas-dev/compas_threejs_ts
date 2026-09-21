<template>
  <div
    v-if="sideBarInfoState.isVisible"
    ref="openbarElement"
    id="openbar"
    class="fixed-openbar theme"
    :class="{ 'is-hidden': !isVisible, 'panel-horizontal': isHorizontal }"
    :style="{ transform: collapseTransform }"
  >
    <!-- Dynamically render components from the store -->
    <div v-for="item in sidebarComponents" :key="item.id" class="dynamic-item">
      <label
        v-if="item.label"
        class="dynamic-label"
        :class="{ dark: theme.value === 'dark' }"
      >
        {{ item.label }}
      </label>

      <div v-if="item.component === 'Button'" class="button-container">
        <Button variant="secondary" @click="handleAction(item.action)">
          {{ item.props.text }}
        </Button>
      </div>

      <div v-else-if="item.component === 'Slider'" class="slider-container">
        <Slider
          :min="item.props.min"
          :max="item.props.max"
          :step="item.props.step"
          :default-value="item.props.defaultValue"
          v-model="item.props.defaultValue"
          @update:model-value="(value) => handleAction(item.action, value?.[0])"
          class="w-[80%]"
        />
        <span v-if="item.props.defaultValue" class="slider-value">
          {{ item.props.defaultValue[0] }}
        </span>
      </div>

      <div
        v-else-if="item.component === 'NumberField'"
        class="number-field-container"
      >
        <NumberField
          :min="item.props.min"
          :max="item.props.max"
          :step="item.props.step"
          :default-value="item.props.value"
          v-model="item.props.value"
          @update:model-value="(value) => handleAction(item.action, value)"
          class="w-full"
        >
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>
      </div>

      <div
        v-else-if="item.component === 'LoadJsonButton'"
        class="load-json-button-container"
      >
        <LoadJsonButton :text="item.props.text" :action="item.action" />
      </div>

      <div
        v-else-if="item.component === 'Checkbox'"
        class="checkbox-ui-component"
      >
        <Checkbox
          :id="`checkbox-${item.id}`"
          :model-value="Boolean(item.props.defaultValue)"
          @update:model-value="
            (checked) => {
              item.props.defaultValue = Boolean(checked);
              handleAction(item.action, checked);
            }
          "
        />
        <span v-if="item.props.text">
          {{ item.props.text }}
        </span>
      </div>

      <div v-else-if="item.component === 'Select'" class="select-container">
        <Select
          :model-value="item.props.defaultValue ?? ''"
          @update:model-value="
            (value) => {
              item.props.defaultValue = typeof value === 'string' ? value : '';
              handleAction(item.action, value);
            }
          "
        >
          <SelectTrigger class="w-full">
            <SelectValue
              :placeholder="item.props.placeholder ?? 'Select an option'"
            />
          </SelectTrigger>
          <SelectContent class="z-[4000]">
            <SelectItem
              v-for="option in item.props.options"
              :key="option"
              :value="option"
            >
              {{ option }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <Button
      variant="secondary"
      size="icon"
      class="mb-4"
      @click="toggleSideBar()"
    >
      <component :is="collapseIcon" />
    </Button>
  </div>
  <Button
    v-if="sideBarInfoState.isVisible"
    variant="secondary"
    size="icon"
    id="openOpenbar"
    class="mb-5"
    :class="[`edge-${placement}`, { 'is-hidden': !isVisible }]"
    @click="toggleSideBar()"
  >
    <component :is="expandIcon" />
  </Button>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  isHorizontalPlacement,
  useOpenbarPlacement,
  useViewerRuntime,
  type PanelPlacement,
} from "@/viewer/viewer_context";
import {
  ArrowBigDownDash,
  ArrowBigLeftDash,
  ArrowBigRightDash,
  ArrowBigUpDash,
} from "lucide-vue-next";
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHover } from "@/composables/useHover";
import { watchEffect } from "vue";
import LoadJsonButton from "@/components/tools/actions/LoadJsonButton.vue";
import { useKeyboardShortcuts } from "@/components/tools/useKeyboardShortcuts";

const isVisible = ref(true);
const openbarElement = ref<HTMLElement | null>(null);
const runtime = useViewerRuntime();
const { sidebarComponents, theme, blockPicker, sideBarInfoState } =
  runtime.store;
const handleAction = (action: string, value?: unknown) =>
  runtime.handleUiAction(action, value);
const placement = useOpenbarPlacement();
const isHorizontal = isHorizontalPlacement(placement);

const collapseTransformByPlacement: Record<PanelPlacement, string> = {
  left: "translateX(-150%)",
  right: "translateX(150%)",
  top: "translateY(-150%)",
  bottom: "translateY(150%)",
};
const collapseTransform = computed(() =>
  isVisible.value ? undefined : collapseTransformByPlacement[placement],
);

const collapseIconByPlacement: Record<PanelPlacement, unknown> = {
  left: ArrowBigLeftDash,
  right: ArrowBigRightDash,
  top: ArrowBigUpDash,
  bottom: ArrowBigDownDash,
};
const expandIconByPlacement: Record<PanelPlacement, unknown> = {
  left: ArrowBigRightDash,
  right: ArrowBigLeftDash,
  top: ArrowBigDownDash,
  bottom: ArrowBigUpDash,
};
const collapseIcon = collapseIconByPlacement[placement];
const expandIcon = expandIconByPlacement[placement];

function toggleSideBar() {
  isVisible.value = !isVisible.value;
}

useKeyboardShortcuts({ q: toggleSideBar });

const { isHovered } = useHover(openbarElement);
const isOpenbarVisible = computed(() => isVisible.value);

watchEffect(() => {
  blockPicker.value = isHovered.value && isOpenbarVisible.value;
});
</script>

<style scoped>
div#openbar {
  position: relative;
  z-index: 1000; /* Ensure it appears above other content */
  width: 100%;
  margin: 0px;
  height: auto;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px; /* Adjust spacing */
  align-items: left;
  height: 100%;
  pointer-events: auto;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); /* Smooth sliding effect */
  will-change: transform;

  /*overflow: ;*/
  overflow-y: auto;
}

div#openbar.is-hidden {
  /* transform (direction depends on which edge it's docked to) is applied inline
     via `collapseTransform` */
  pointer-events: none;
}

div#openbar.panel-horizontal {
  /* Stays full width - top/bottom docks stack panels as separate full-width bars, so
     this one keeps the base width: 100% instead of shrinking to fit its content. */
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  height: auto;
  max-height: 40vh;
}

div#openbar.panel-horizontal .dynamic-item {
  width: auto;
  min-width: 150px;
}

div#openbar.panel-horizontal Button.mb-4 {
  margin-top: 0;
  margin-left: auto;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 10px; /* Adds space between the slider and the value */
}

.dynamic-item {
  width: 100%;
  display: flex;
  flex-direction: column; /* Stack label on top of the component */
  align-items: left;
  gap: 8px; /* Space between label and component */
}

.dynamic-label {
  font-weight: 500;
  font-size: 15px;
  color: var(--foreground);
  padding: 0;
}

.slider-value {
  color: var(--foreground);
}

.checkbox-ui-component {
  display: flex;
  align-items: center;
  gap: 8px; /* Space between the checkbox and its label text */
}

.select-container {
  display: flex;
  align-items: center;
  width: 100%;
}

Button.mb-4 {
  position: relative;
  margin: 0px;
  margin-top: auto;
}
Button.mb-5 {
  margin: 0px;
  position: absolute;
  z-index: 1; /* Ensure it appears above its dock zone */
  opacity: 0; /* Slightly transparent for better aesthetics */
  display: flex;
  visibility: hidden;
  transition: visibility 1s;
  pointer-events: auto;
}

Button.mb-5.edge-left {
  bottom: 40px;
  left: 40px;
}
Button.mb-5.edge-right {
  bottom: 40px;
  right: 40px;
}
Button.mb-5.edge-top {
  top: 40px;
  left: 40px;
}
Button.mb-5.edge-bottom {
  bottom: 40px;
  left: 40px;
}

Button.mb-5.is-hidden {
  opacity: 1;
  visibility: visible;
}
</style>
