import * as THREE from "three";
import { sidebarComponents } from "@/communications/sidebarStore";
import {
  objectActionsState,
  objectBarData,
  sideBarInfoState,
} from "@/store/store";
import { SCENE_GEOMETRIES } from "./geometry_manager";
import { clearAllLights } from "./light_manager";
import { clearAllMaterials } from "./material_manager";
import { scene } from "./scene_manager";

/** Clear content received from a host while retaining the camera and viewer shell. */
export function resetViewer(): void {
  for (const [guid, object] of Object.entries(SCENE_GEOMETRIES)) {
    scene.remove(object);
    disposeObject(object);
    delete SCENE_GEOMETRIES[guid];
  }

  clearAllLights();
  clearAllMaterials();
  sidebarComponents.splice(0);
  objectActionsState.splice(0);
  objectBarData.data = null;
  objectBarData.isVisible = false;
  sideBarInfoState.data = null;
  sideBarInfoState.isVisible = false;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const renderable = child as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    renderable.geometry?.dispose();
    if (Array.isArray(renderable.material)) {
      renderable.material.forEach((material) => material.dispose());
    } else {
      renderable.material?.dispose();
    }
  });
}
