import { reactive } from "vue";

export interface ObjectAction {
  guid: string;
  label?: string;
  type: string;
  objectGuid: string;
  text?: string;
  options?: string[];
  placeholder?: string;
  defaultValue?: unknown;
}

export interface ButtonComponent {
  id: number;
  component: "Button";
  label?: string;
  props: { variant: string; text: string };
  action: string;
}

export interface SliderComponent {
  id: number;
  component: "Slider";
  label?: string;
  props: { min: number; max: number; step: number; defaultValue: number[] };
  action: string;
}

export interface NumberFieldComponent {
  id: number;
  component: "NumberField";
  label?: string;
  props: { min: number; max: number; step: number; value: number };
  action: string;
}

export interface LoadJsonButtonComponent {
  id: number;
  component: "LoadJsonButton";
  label?: string;
  props: { variant: string; text: string };
  action: string;
}

export interface CheckboxComponent {
  id: number;
  component: "Checkbox";
  label?: string;
  props: { text: string; defaultValue: boolean };
  action: string;
}

export interface SelectComponent {
  id: number;
  component: "Select";
  label?: string;
  props: { options: string[]; placeholder?: string; defaultValue?: string };
  action: string;
}

export type DynamicComponent =
  | ButtonComponent
  | SliderComponent
  | NumberFieldComponent
  | LoadJsonButtonComponent
  | CheckboxComponent
  | SelectComponent;

export interface ViewerStore {
  objectBarData: {
    title: string;
    isVisible: boolean;
    data: Record<string, unknown> | null;
  };
  objectActionsState: ObjectAction[];
  sideBarInfoState: {
    title: string;
    isVisible: boolean;
    data: Record<string, unknown> | null;
  };
  sidebarComponents: DynamicComponent[];
  pickerEnabled: { value: boolean };
  pickerMode: { value: "translate" | "rotate" | "scale" };
  blockPicker: { value: boolean };
  showEdges: { value: boolean };
  theme: { value: "light" | "dark" };
  selectedObjectGuid: { value: string | null };
}

export function createViewerStore(): ViewerStore {
  return {
    objectBarData: reactive({
      title: "Object Infos",
      isVisible: false,
      data: null as Record<string, unknown> | null,
    }),
    objectActionsState: reactive<ObjectAction[]>([]),
    sideBarInfoState: reactive({
      title: "Sidebar Infos",
      isVisible: false,
      data: null as Record<string, unknown> | null,
    }),
    sidebarComponents: reactive<DynamicComponent[]>([]),
    pickerEnabled: reactive({ value: true }),
    pickerMode: reactive({ value: "translate" as const }),
    blockPicker: reactive({ value: false }),
    showEdges: reactive({ value: false }),
    theme: reactive({ value: "light" as const }),
    selectedObjectGuid: reactive({ value: null as string | null }),
  };
}
