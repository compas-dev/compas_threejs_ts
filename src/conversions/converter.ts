import {
    Arc,
    Bezier,
    Box,
    Capsule,
    Circle,
    Cone,
    Cylinder,
    Ellipse,
    Frame,
    Graph,
    Hyperbola,
    Line,
    Mesh,
    Parabola,
    Plane,
    Point,
    Pointcloud,
    Polygon,
    Polyhedron,
    Polyline,
    Projection,
    Quaternion,
    Reflection,
    Rotation,
    Scale,
    Shear,
    Sphere,
    Torus,
    Transformation,
    Translation,
    Vector,
} from "@gramaziokohler/compas-pb-ts";

import * as THREE from "three";

import * as GEOCONV from "./geometry";
import * as DATASTRUCTCONV from "./datastructures";

const UNIMPLEMENTED_RENDERABLES = [
    Arc,
    Bezier,
    Ellipse,
    Graph,
    Hyperbola,
    Parabola,
    Polygon,
];
const NON_RENDERABLES = [
    Projection,
    Quaternion,
    Reflection,
    Rotation,
    Scale,
    Shear,
    Transformation,
    Translation,
];

function objectType(object: unknown): string {
    if (object === null) return "null";
    if (object === undefined) return "undefined";
    if (typeof object !== "object") return typeof object;
    return object.constructor?.name || "object";
}

export class UnsupportedCompasObjectError extends TypeError {
    readonly objectType: string;

    constructor(object: unknown, reason = "is not supported by the viewer") {
        const type = objectType(object);
        super(`${type} ${reason}`);
        this.name = "UnsupportedCompasObjectError";
        this.objectType = type;
    }
}

export function convertToThreeJSGeometry(object: unknown): THREE.Object3D {
    if (UNIMPLEMENTED_RENDERABLES.some((Type) => object instanceof Type)) {
        throw new UnsupportedCompasObjectError(
            object,
            "does not have an implemented renderer",
        );
    }

    if (NON_RENDERABLES.some((Type) => object instanceof Type)) {
        throw new UnsupportedCompasObjectError(
            object,
            "is data, not renderable scene geometry",
        );
    }

    switch (true) {
        case object instanceof Box:
            return GEOCONV.boxToThreeJS(object);
        case object instanceof Capsule:
            return GEOCONV.capsuleToThreeJS(object, 32, 32);
        case object instanceof Circle:
            return GEOCONV.circleToThreeJS(object, 64);
        case object instanceof Cone:
            return GEOCONV.coneToThreeJS(object, 64);
        case object instanceof Cylinder:
            return GEOCONV.cylinderToThreeJS(object, 64);
        case object instanceof Frame:
            return GEOCONV.frameToThreeJS(object);
        case object instanceof Line:
            return GEOCONV.lineToThreeJS(object);
        case object instanceof Plane:
            return GEOCONV.planeToThreeJS(object);
        case object instanceof Point:
            return GEOCONV.pointToThreeJS(object);
        case object instanceof Pointcloud:
            return GEOCONV.pointcloudToThreeJS(object);
        case object instanceof Polyline:
            return GEOCONV.polylineToThreeJS(object);
        case object instanceof Sphere:
            return GEOCONV.sphereToThreeJS(object);
        case object instanceof Torus:
            return GEOCONV.torusToThreeJS(object);
        case object instanceof Vector:
            return GEOCONV.vectorToThreeJS(object);
        case object instanceof Mesh:
            return DATASTRUCTCONV.meshToThreeJS(object);
        case object instanceof Polyhedron:
            return DATASTRUCTCONV.polyhedronToThreeJS(object);
    }

    throw new UnsupportedCompasObjectError(object);
}
