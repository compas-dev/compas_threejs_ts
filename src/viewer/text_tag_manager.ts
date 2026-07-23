import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { SCENE_GEOMETRIES } from "./geometry_manager";
import { scene } from "./scene_manager";

type TagData = Record<string, { value: unknown }>;

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
    const guid = data.guid.value as string;
    const text = data.text.value as string;
    const point = new THREE.Vector3(
        data.x.value as number,
        data.y.value as number,
        data.z.value as number
    );
    const colorEntry = data.color as { value: string } | undefined;

    const existingTag = SCENE_GEOMETRIES[guid];
    if (existingTag) {
        scene.remove(existingTag);
    }

    const element = buildTagElement(text, colorEntry?.value);
    const tag = new CSS2DObject(element);
    tag.position.copy(point);

    scene.add(tag);
    SCENE_GEOMETRIES[guid] = tag;
}
