import { reactive } from "vue";
import { sendDataMessage } from "@/communications/websocket";
import { sideBarInfoState } from "../store/store";

// Define a type for the components we want to add.
// This can be expanded later (e.g., to include different component types).
interface ButtonComponent {
    id: number;
    component: "Button";
    label?: string;
    props: {
        variant: "outline" | "default" | "destructive" | "secondary" | "ghost" | "link";
        text: string;
    };
    action: string; // GUID for click action
}

interface SliderComponent {
    id: number;
    component: "Slider";
    label?: string;
    props: {
        min: number;
        max: number;
        step: number;
        defaultValue: number[];
    };
    action: string; // GUID for value change action
}

interface NumberFieldComponent {
    id: number;
    component: "NumberField";
    label?: string;
    props: {
        min: number;
        max: number;
        step: number;
        value: number[];
    };
    action: string; // GUID for value change action
}

interface LoadJsonButtonComponent {
    id: number;
    component: "LoadJsonButton";
    label?: string;
    props: {
        variant: "outline" | "default" | "destructive" | "secondary" | "ghost" | "link";
        text: string;
    };
    action: string; // GUID for click action
}


interface CheckboxComponent{
    id: number;
    component: "Checkbox",
    label?: string,
    props: {
        text: string;
        defaultValue: boolean;
    };
    action: string
}

interface SelectComponent {
    id: number;
    component: "Select";
    label?: string;
    props: {
        options: string[];
        placeholder?: string;
        defaultValue?: string;
    };
    action: string; // GUID for value change action
}


// --- The main type is now a union of all supported components ---
export type DynamicComponent = ButtonComponent | SliderComponent | NumberFieldComponent | LoadJsonButtonComponent |  CheckboxComponent | SelectComponent;
export const sidebarComponents = reactive<DynamicComponent[]>([]);

export function uiManager(data: Record<string, any>) {
    const type = data.type;
    switch (type) {
        case "button":
            addButton(data);
            sideBarInfoState.isVisible = true;
            break;
        case "slider":
            addSlider(data);
            sideBarInfoState.isVisible = true;
            break;
        case "number_field":
            addNumberField(data);
            sideBarInfoState.isVisible = true;
            break;
        case "load_json_button":
            addLoadJsonButton(data);
            sideBarInfoState.isVisible = true;
            break
        case "checkbox":
            addCheckbox(data);
            sideBarInfoState.isVisible = true;
            break
        case "select":
            addSelect(data);
            sideBarInfoState.isVisible = true;
            break
        default:
            console.warn("Unknown component type:", type);
    }
}

// --- Function to add a Button ---
export function addButton(data: Record<string, any>) {
    const newButton: ButtonComponent = {
        id: Date.now(),
        component: "Button",
        label: data.label,
        props: {
            text: data.text,
            variant: data.variant,
        },
        action: data.guid,
    };
    sidebarComponents.push(newButton);
}

// --- Function to add a Slider ---
export function addSlider(data: Record<string, any>) {
    const newSlider: SliderComponent = {
        id: Date.now(),
        component: "Slider",
        label: data.label,
        props: {
            min: data.min,
            max: data.max,
            step: data.step,
            defaultValue: [data.default_value],
        },
        action: data.guid,
    };
    sidebarComponents.push(newSlider);
}

export function addNumberField(data: Record<string, any>) {
    const newNumberField: NumberFieldComponent = {
        id: Date.now(),
        component: "NumberField",
        label: data.label,
        props: {
            min: data.min,
            max: data.max,
            step: data.step,
            value: data.value,
        },
        action: data.guid,
    };
    sidebarComponents.push(newNumberField);
}

export function addLoadJsonButton(data: Record<string, any>) {
    const newButton: LoadJsonButtonComponent = {
        id: Date.now(),
        component: "LoadJsonButton",
        label: data.label,
        props: {
            text: data.text,
            variant: data.variant,
        },
        action: data.guid,
    };
    console.log("Adding LoadJsonButton:", newButton);
    sidebarComponents.push(newButton);
}

export function addCheckbox(data: Record<string, any>) {
    const checkbox: CheckboxComponent = {
        id: Date.now(),
        component: "Checkbox",
        label: data.label,
        props: {
            text: data.text,
            defaultValue: data.default_value,
        },
        action: data.guid,
    };
    console.log("Adding Checkbox:", checkbox);
    sidebarComponents.push(checkbox);
}

export function addSelect(data: Record<string, any>) {
    console.log("Adding Select:", data);
    const newSelect: SelectComponent = {
        id: Date.now(),
        component: "Select",
        label: data.label,
        props: {
            options: data.options,
            placeholder: data.placeholder,
            defaultValue: data.default_value,
        },
        action: data.guid,
    };
    sidebarComponents.push(newSelect);
}

// --- Updated Action Handler ---
// It now accepts a payload, which will be the slider's value.
export function handleAction(actionGuid: string, value?: unknown) {
    const message = {
        dispatch: "ui_callback",
        action: actionGuid,
        value: null,
    };
    if (value !== undefined) {
        message.value = value;
    }

    sendDataMessage(message);
}
