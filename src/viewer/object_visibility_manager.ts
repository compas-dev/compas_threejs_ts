import { SCENE_GEOMETRIES } from "./geometry_manager";

// Tracks guids hidden via hideObjectByGuid so showAllObjects only restores what it hid.
const hiddenObjectGuids = new Set<string>();

/**
 * Hide a single object in the scene by guid. Hidden objects are also
 * excluded from picking (see object_picker.ts's visible-only filter).
 */
export function hideObjectByGuid(guid: string): void {
    const object = SCENE_GEOMETRIES[guid];
    if (!object) {
        return;
    }

    object.visible = false;
    hiddenObjectGuids.add(guid);
}

/**
 * Re-show every object previously hidden via hideObjectByGuid.
 */
export function showAllObjects(): void {
    hiddenObjectGuids.forEach((guid) => {
        const object = SCENE_GEOMETRIES[guid];
        if (object) {
            object.visible = true;
        }
    });
    hiddenObjectGuids.clear();
}
