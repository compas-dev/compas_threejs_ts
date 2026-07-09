import * as THREE from "three";
import { GEOMETRY_MATERIALS, SCENE_MATERIALS } from "./material_manager";

/**
 * Manages material highlighting and restoration for picked objects
 */
export class MaterialHighlighter {
  private highlightMaterial: THREE.Material;
  private savedMaterialGuid: string | undefined;
  private savedOriginalMaterial: THREE.Material | THREE.Material[] | null =
    null;

  constructor(highlightMaterial: THREE.Material) {
    this.highlightMaterial = highlightMaterial;
  }

  /**
   * Apply highlight material to an object and save its original material
   */
  highlight(object: THREE.Object3D, geometryGuid: string | undefined): void {
    // Save the original material
    const material = (object as any).material;
    if (material instanceof THREE.Material || Array.isArray(material)) {
      this.savedOriginalMaterial = material;
    }

    // Save the material GUID for fallback restoration
    if (geometryGuid) {
      this.savedMaterialGuid = GEOMETRY_MATERIALS.get(geometryGuid);
    }

    // Apply highlight material
    (object as any).material = this.highlightMaterial;
  }

  /**
   * Restore the original material to an object
   */
  dehighlight(object: THREE.Object3D): void {
    // Retrive the material from the materials registry
    const material = SCENE_MATERIALS.get(this.savedMaterialGuid);
    object.material = material.material;
  }
}
