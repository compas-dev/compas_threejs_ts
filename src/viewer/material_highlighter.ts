import * as THREE from "three";
import { GEOMETRY_MATERIALS, SCENE_MATERIALS } from "./material_manager";

type MaterialObject = THREE.Object3D & {
  material: THREE.Material | THREE.Material[];
};

function hasMaterial(object: THREE.Object3D): object is MaterialObject {
  return "material" in object;
}

/**
 * Manages material highlighting and restoration for picked objects
 */
export class MaterialHighlighter {
  private highlightMaterial: THREE.Material;
  private savedMaterialGuid: string | undefined;
  private savedOriginalMaterial: THREE.Material | THREE.Material[] | null =
    null;
  private highlightedObject: THREE.Object3D | null = null;

  constructor(highlightMaterial: THREE.Material) {
    this.highlightMaterial = highlightMaterial;
  }

  /**
   * Apply highlight material to an object and save its original material
   */
  highlight(object: THREE.Object3D, geometryGuid: string | undefined): void {
    if (this.highlightedObject === object || !hasMaterial(object)) {
      return;
    }

    // Save the original material
    const material = object.material;
    if (material instanceof THREE.Material || Array.isArray(material)) {
      this.savedOriginalMaterial = material;
    }

    // Save the material GUID for fallback restoration
    if (geometryGuid) {
      this.savedMaterialGuid = GEOMETRY_MATERIALS.get(geometryGuid);
    }

    // Apply highlight material
    object.material = this.highlightMaterial;
    this.highlightedObject = object;
  }

  /**
   * Restore the original material to an object
   */
  dehighlight(object: THREE.Object3D): void {
    // Prefer a material updated by the backend while the object was selected,
    // otherwise restore the material that was present before highlighting.
    const registeredMaterial = this.savedMaterialGuid
      ? SCENE_MATERIALS.get(this.savedMaterialGuid)?.material
      : undefined;
    const material = registeredMaterial ?? this.savedOriginalMaterial;

    if (material && hasMaterial(object)) {
      object.material = material;
    }

    this.savedMaterialGuid = undefined;
    this.savedOriginalMaterial = null;
    this.highlightedObject = null;
  }
}
