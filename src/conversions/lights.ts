import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import type {
  AmbientLightCommand,
  LightCommand,
  PointLightCommand,
  RectLightCommand,
  SkyCommand,
  SpotLightCommand,
  SunlightCommand,
} from "../viewer/viewer_commands";

/**
 * Build the Three.js object for a light command.
 *
 * The return type is `THREE.Object3D` rather than `THREE.Light` because the
 * `sky` variant produces a `Sky`, which is a `THREE.Mesh` carrying a sky
 * shader, not a light source. `ViewerRuntime.manageLight` adds the companion
 * sun and ambient lights for that case.
 */
export function lightToThree(data: LightCommand): THREE.Object3D {
  const lightType = data.type;

  switch (lightType) {
    case "point_light":
      return buildPointLight(data);
    case "spot_light":
      return buildSpotLight(data);
    case "rect_light":
      return buildRectLight(data);
    case "sunlight":
      return buildSunlight(data);
    case "sky":
      return buildSky(data);
    case "ambient_light":
      return buildAmbientLight(data);
  }
}

function parseColor(colorString: string): number {
  const hex = colorString.replace("#", "0x");
  return parseInt(hex);
}

function buildPointLight(data: PointLightCommand): THREE.PointLight {
  const light = new THREE.PointLight();

  light.color.setHex(parseColor(data.color));
  light.intensity = data.intensity;
  light.distance = data.distance;
  light.decay = data.decay;
  light.position.set(data.x, data.y, data.z);
  light.castShadow = true;
  light.shadow.bias = -0.002;
  light.shadow.normalBias = 0.02;

  return light;
}

function buildSpotLight(data: SpotLightCommand): THREE.SpotLight {
  const light = new THREE.SpotLight();

  light.color.setHex(parseColor(data.color));
  light.intensity = data.intensity;
  light.distance = data.distance;
  light.angle = data.angle;
  light.penumbra = data.penumbra;
  light.decay = data.decay;
  light.position.set(data.x, data.y, data.z);
  light.castShadow = true;
  light.shadow.bias = -0.002;
  light.shadow.normalBias = 0.02;

  const target = new THREE.Object3D();
  target.position.set(data.tx, data.ty, data.tz);
  light.target = target;
  // Note: target will be added to scene by light_manager

  return light;
}

function buildRectLight(data: RectLightCommand): THREE.RectAreaLight {
  const light = new THREE.RectAreaLight();

  light.color.setHex(parseColor(data.color));
  light.intensity = data.intensity;
  light.width = data.width;
  light.height = data.height;
  light.position.set(data.x, data.y, data.z);
  light.lookAt(data.tx, data.ty, data.tz);

  return light;
}

function buildSunlight(data: SunlightCommand): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight();

  light.color.setHex(parseColor(data.color));
  light.intensity = data.intensity;
  light.position.set(data.x, data.y, data.z);
  light.target.position.set(data.tx, data.ty, data.tz);
  light.castShadow = true;

  return light;
}

function buildSky(data: SkyCommand): Sky {
  const sky = new Sky();

  sky.scale.setScalar(1000);
  setSkyUniform(sky, "up", new THREE.Vector3(0, 0, 1));
  setSkyUniform(sky, "turbidity", data.turbidity);
  setSkyUniform(sky, "rayleigh", data.rayleigh);
  setSkyUniform(sky, "mieCoefficient", data.mie_coefficient);
  setSkyUniform(sky, "mieDirectionalG", data.mie_directional_g);

  const sunPosition = new THREE.Vector3();
  const phi = THREE.MathUtils.degToRad(90 - data.elevation);
  const theta = THREE.MathUtils.degToRad(data.azimuth);
  sunPosition.setFromSphericalCoords(1, phi, theta);
  setSkyUniform(sky, "sunPosition", sunPosition);

  // TODO(release 7C): this function used to also build a directional sun and an
  // ambient light, colored by elevation and positioned at `sunPosition`, then
  // discard them without returning them. ViewerRuntime.manageLight instead adds
  // its own hardcoded white lights at the world origin, so `elevation` and
  // `azimuth` never affect the scene lighting. The dead code was removed here;
  // reimplementing the intended behavior in manageLight is audit item B3 in the
  // release plan.
  return sky;
}

function setSkyUniform(sky: Sky, name: string, value: unknown): void {
  const uniform = sky.material.uniforms[name];
  if (!uniform) {
    throw new Error(`The Three.js Sky shader has no "${name}" uniform`);
  }
  uniform.value = value;
}

function buildAmbientLight(data: AmbientLightCommand): THREE.AmbientLight {
  const light = new THREE.AmbientLight();

  light.color.setHex(parseColor(data.color));
  light.intensity = data.intensity;

  return light;
}
