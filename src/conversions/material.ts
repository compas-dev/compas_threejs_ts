import * as THREE from "three";
import type {
  LineMaterialCommand,
  MaterialCommand,
  PhysicalMaterialCommand,
  PointMaterialCommand,
  StandardMaterialCommand,
} from "../viewer/viewer_commands";

export function materialToThree(materialData: MaterialCommand): THREE.Material {
  const materialType = materialData.type;

  switch (materialType) {
    case "standard_material":
      return buildStandardMaterial(materialData);
    case "line_material":
      return buildLineMaterial(materialData);
    case "point_material":
      return buildPointsMaterial(materialData);
    case "physical_material":
      return buildPhysicalMaterial(materialData);
  }
}

function parseColor(colorString: string): number {
  const hex = colorString.replace("#", "0x");
  return parseInt(hex);
}

function buildStandardMaterial(
  data: StandardMaterialCommand,
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: parseColor(data.color),
    metalness: data.metalness,
    roughness: data.roughness,
    emissive: parseColor(data.emissive),
    emissiveIntensity: data.emissive_intensity,
    flatShading: data.flat_shading,
    wireframe: data.wireframe,
    side: THREE.DoubleSide,
    transparent: data.transparent,
    opacity: data.opacity,
  });
  return material;
}

function buildLineMaterial(data: LineMaterialCommand): THREE.LineBasicMaterial {
  const material = new THREE.LineBasicMaterial({
    color: parseColor(data.color),
  });
  return material;
}

function buildPointsMaterial(data: PointMaterialCommand): THREE.PointsMaterial {
  const material = new THREE.PointsMaterial({
    color: parseColor(data.color),
    size: data.size,
  });
  return material;
}

function buildPhysicalMaterial(
  data: PhysicalMaterialCommand,
): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: parseColor(data.color),
    metalness: data.metalness,
    roughness: data.roughness,
    emissive: parseColor(data.emissive),
    emissiveIntensity: data.emissive_intensity,
    flatShading: data.flat_shading,
    wireframe: data.wireframe,
    side: THREE.DoubleSide,
    anisotropy: data.anisotropy,
    anisotropyRotation: data.anisotropy_rotation,
    attenuationColor: parseColor(data.attenuation_color),
    attenuationDistance: data.attenuation_distance,
    clearcoat: data.clearcoat,
    clearcoatRoughness: data.clearcoat_roughness,
    dispersion: data.dispersion,
    ior: data.ior,
    iridescence: data.iridescence,
    iridescenceIOR: data.iridescence_ior,
    iridescenceThicknessRange: [
      data.iridescence_thickness_start,
      data.iridescence_thickness_end,
    ],
    reflectivity: data.reflectivity,
    sheen: data.sheen,
    sheenColor: parseColor(data.sheen_color),
    specularColor: parseColor(data.specular_color),
    sheenRoughness: data.sheen_roughness,
    specularIntensity: data.specular_intensity,
    thickness: data.thickness,
    transmission: data.transmission,
  });

  return material;
}
