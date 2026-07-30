import { getDefaultAutoSelectFamily } from "net";
import { reactive } from "vue";

export const objectBarData = reactive({
    title: "Object Infos",
    isVisible: false,
    data: null,
});

export const objectActionsState = reactive([]);

export const sideBarInfoState = reactive({
    title: "Sidebar Infos",
    isVisible: false,
    data: null,
});
c
export const pickerEnabled = reactive({ value: true });

export const selectedObjectGuid = reactive({ value: null as string | null });

export const pickerMode = reactive({ value: "translate" });

export const blockPicker = reactive({ value: false });
export const showEdges = reactive({ value: false });

export const theme = reactive({
    value: "light",
});

export const spinnerState = reactive({
    visible: getDefaultAutoSelectFamily(),
    message: null as string | null,
});
