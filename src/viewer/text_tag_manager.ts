import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { SCENE_GEOMETRIES } from "./geometry_manager";
import { scene } from "./scene_manager";

type TagData = Record<string, any>;

function buildTagElement(text: string, color?: string): HTMLDivElement {
    const element = document.createElement("div");
    element.className = "text-tag";
    element.textContent = text;

    if (color) {
        element.style.color = color;
    }

    return element;
}

/**
 * Creates or replaces a CSS2D text tag anchored to a 3D point.
 * Tags are registered in SCENE_GEOMETRIES, so the existing "handle_geometry"
 * dispatch (remove / set_visibility / toggle_visibility) works on them too.
 */
export function textTagManager(data: TagData): void {
    const guid = data.guid as string;
    const text = data.text as string;
    const point = new THREE.Vector3(
        data.x as number,
        data.y as number,
        data.z as number
    );
    const color = data.color as string | undefined;

    const existingTag = SCENE_GEOMETRIES[guid];
    if (existingTag) {
        scene.remove(existingTag);
    }

    const element = buildTagElement(text, color);
    const tag = new CSS2DObject(element);
    tag.position.copy(point);

    scene.add(tag);
    SCENE_GEOMETRIES[guid] = tag;
}
