import { getObjectFromMessage, Dictionary, List } from "@gramaziokohler/compas-pb-ts";
import { lightManagerFromData } from "../viewer/light_manager";
import { geometryManager, geometryHandler } from "../viewer/geometry_manager";
import { materialManagerFromData } from "../viewer/material_manager";
import { sceneManager } from "../viewer/scene_manager";
import { themeManager } from "../viewer/theme_manager";
import { uiManager } from "./sidebarStore";
import { textManager } from "../viewer/text_manager";
import { textTagManager } from "../viewer/text_tag_manager";
import { objectInfoManager } from "./objectInfo";
import { objectActionManager } from "./objectInfo";

export function dispatchMessage(message: Uint8Array) {
    const object = decodeWebsocketMessage(message);
    dispatchObject(object);
}

function dispatchObject(object: any): void {
    if (object instanceof Dictionary) {
        dispatchObject(object.asDict);
        return;
    }
    if (object instanceof List) {
        dispatchObject(object.asList);
        return;
    }
    if (Array.isArray(object)) {
        object.forEach(dispatchObject);
        return;
    }
    if (object && typeof object === "object" && typeof object.dispatch === "string") {
        analyzeDictionary(object);
        return;
    }
    if (object && typeof object === "object" && object.bytes instanceof Uint8Array && "guid" in object) {
        geometryManager(object);
        return;
    }
    if (object && typeof object === "object") {
        Object.values(object).forEach(dispatchObject);
    }
}

export function decodeWebsocketMessage(message: Uint8Array) {
    const object = getObjectFromMessage(message);
    return object;
}

function analyzeDictionary(data: Record<string, any>) {
    switch (data.dispatch) {
        case "material":
            materialManagerFromData(data);
            break;
        case "light":
            lightManagerFromData(data);
            break;
        case "scene":
            sceneManager(data);
            break;
        case "theme":
            themeManager(data);
            break;
        case "ui":
            uiManager(data);
            break;
        case "text":
            textManager(data);
            break;
        case "text_tag":
            textTagManager(data);
            break;
        case "object_infos":
            objectInfoManager(data);
            break;
            return;
        case "object_action":
            objectActionManager(data);
            break;
            return;
        case "handle_geometry":
            geometryHandler(data);
            break;
        default:
            console.warn("Unknown dispatch value:", data.dispatch);
    }
}
