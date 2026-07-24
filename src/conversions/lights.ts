import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";

interface LightData extends Record<string, unknown> {
    type: string;
    guid?: string ;
    helper?: boolean ;
    color: string ;
    intensity: number ;
    x: number ;
    y: number ;
    z: number ;
}

export function ligthtToThree(data: LightData): THREE.Light | null {
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
        default:
            console.warn(`Unknown light type: ${lightType}`);
            return null;
    }
}

function parseColor(colorString: string): number {
    const hex = colorString.replace("#", "0x");
    return parseInt(hex);
}

function buildPointLight(
    data: LightData & { distance: number; decay: number }
): THREE.PointLight {
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

function buildSpotLight(
    data: LightData & {
        distance: number;
        angle: number;
        penumbra: number;
        decay: number;
        tx: number;
        ty: number;
        tz: number;
    }
): THREE.SpotLight {
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

function buildRectLight(
    data: LightData & {
        width: number;
        height: number;
        tx: number;
        ty: number;
        tz: number;
    }
): THREE.RectAreaLight {
    const light = new THREE.RectAreaLight();

    light.color.setHex(parseColor(data.color));
    light.intensity = data.intensity;
    light.width = data.width;
    light.height = data.height;
    light.position.set(data.x, data.y, data.z);
    light.lookAt(data.tx, data.ty, data.tz);

    return light;
}

function buildSunlight(
    data: LightData & { tx: number; ty: number; tz: number }
): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight();

    light.color.setHex(parseColor(data.color));
    light.intensity = data.intensity;
    light.position.set(data.x, data.y, data.z);
    light.target.position.set(data.tx, data.ty, data.tz);
    light.castShadow = true;

    return light;
}

function buildSky(
    data: LightData & {
        turbidity: number;
        rayleigh: number;
        mie_coefficient: number;
        mie_directional_g: number;
        elevation: number;
        azimuth: number;
    }
): Sky {
    const sky = new Sky();
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);

    sky.scale.setScalar(1000);
    sky.material.uniforms["up"].value = new THREE.Vector3(0, 0, 1);
    sky.material.uniforms["turbidity"].value = data.turbidity;
    sky.material.uniforms["rayleigh"].value = data.rayleigh;
    sky.material.uniforms["mieCoefficient"].value = data.mie_coefficient;
    sky.material.uniforms["mieDirectionalG"].value = data.mie_directional_g;

    const sunPosition = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - data.elevation);
    const theta = THREE.MathUtils.degToRad(data.azimuth);
    sunPosition.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms["sunPosition"].value = sunPosition;

    sun.position.copy(sky.material.uniforms.sunPosition.value);
    sun.color.copy(getSunColor(data.elevation));

    ambient.color.copy(getSunColor(data.elevation)).multiplyScalar(0.6);

    return sky;
}

function getSunColor(elevation: number): THREE.Color {
    if (elevation > 10) return new THREE.Color(0xffffff); // White sun when high
    if (elevation > 0) {
        // Transition from yellow to white
        const t = elevation / 10.0;
        return new THREE.Color(0xffffcc).lerp(new THREE.Color(0xffffff), t);
    }
    if (elevation > -5) {
        // Transition from orange to yellow
        const t = (elevation + 5) / 5.0;
        return new THREE.Color(0xffcc66).lerp(new THREE.Color(0xffffcc), t);
    }
    // Red sun below the horizon
    return new THREE.Color(0xffcc66);
}

function buildAmbientLight(data: LightData): THREE.AmbientLight {
    const light = new THREE.AmbientLight();

    light.color.setHex(parseColor(data.color));
    light.intensity = data.intensity;

    return light;
}
