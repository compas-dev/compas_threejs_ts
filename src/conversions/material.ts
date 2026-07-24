import * as THREE from "three";

interface MaterialData extends Record<string, unknown> {
  type: string ;
  color:  string ;
}

export function materialToThree(
  materialData: MaterialData,
): THREE.Material | null {
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
    default:
      console.warn(`Unknown material type: ${materialType}`);
      return null;
  }
}

function parseColor(colorString: string): number {
  const hex = colorString.replace("#", "0x");
  return parseInt(hex);
}

function buildStandardMaterial(
  data: MaterialData & {
    metalness: number;
    roughness: number;
    emissive: string;
    emissive_intensity: number;
    flat_shading: boolean;
    wireframe: boolean;
    transparent: boolean;
    opacity: number;
  },
): THREE.MeshStandardMaterial {
  console.log("Building standard material with data:", data);
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

function buildLineMaterial(data: MaterialData): THREE.LineBasicMaterial {
  const material = new THREE.LineBasicMaterial({
    color: parseColor(data.color),
  });
  return material;
}

function buildPointsMaterial(
  data: MaterialData & {
    size: number;
  },
): THREE.PointsMaterial {
  const material = new THREE.PointsMaterial({
    color: parseColor(data.color),
    size: data.size,
  });
  return material;
}

function buildPhysicalMaterial(
  data: MaterialData & {
    metalness: number;
    roughness: number;
    emissive: string;
    emissive_intensity: number;
    flat_shading: boolean;
    wireframe: boolean;
    anisotropy: number;
    anisotropy_rotation: number;
    attenuation_color: string;
    attenuation_distance: number;
    clearcoat: number;
    clearcoat_roughness: number;
    dispersion: number;
    ior: number;
    iridescence: number;
    iridescence_ior: number;
    iridescence_thickness_start: number;
    iridescence_thickness_end: number;
    reflectivity: number;
    sheen: number;
    sheen_color: string;
    sheenRoughness: number;
    sheen_roughness: number;
    specular_color: string;
    specular_intensity: number;
    thickness: number;
    transmission: number;
  },
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
