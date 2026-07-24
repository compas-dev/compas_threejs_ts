import { objectActionsState } from "../store/store";
import { sendDataMessage } from "@/communications/websocket";
import { objectBarData } from "../store/store";

export function showObjectInfo() {
    objectBarData.isVisible = true;
}

export function hideObjectInfo() {
    objectBarData.isVisible = false;
}

export function updateObjectInfo(newInfo: { title: string; description: string; status: string }) {
    objectBarData.title = newInfo.title;
}

export function objectInfoManager(data: Record<string, unknown> | null) {
    if (data != null) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { dispatch, ...rest } = data;
        objectBarData.data = rest;
    }
}

export function objectActionManager(data: Record<string, any>) {
    const action = {
        guid: data.guid,
        label: data.label,
        type: data.type,
        objectGuid: data.object_guid,
        text: data.text,
        options: data.options,
        placeholder: data.placeholder,
        defaultValue: data.default_value,
    };
    objectActionsState.push(action);
}

export function handleObjectAction(action: Record<string, unknown>, value?: unknown) {
    const message = {
        dispatch: "object_action_callback",
        action_guid: action.guid,
        value: null,
        object_guid: action.objectGuid,
    };

    if (value !== undefined) {
        message.value = value;
    }

    sendDataMessage(message);
}

document.addEventListener("keydown", (event) => {
    if (event.key === "I" || event.key === "i") {
        if (objectBarData.isVisible) {
            hideObjectInfo();
        } else {
            showObjectInfo();
        }
    }
});
