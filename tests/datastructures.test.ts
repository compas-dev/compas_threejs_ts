import { Mesh, Polyhedron } from "@gramaziokohler/compas-pb-ts";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  meshToThreeJS,
  polyhedronToThreeJS,
} from "../src/conversions/datastructures";

// A unit square, offset well away from the world origin - vertices are what
// `mesh.vertices` receives from the backend: absolute world coordinates, not
// coordinates relative to some local frame. In order: v0 (9.5, 9.5, 10),
// v1 (10.5, 9.5, 10), v2 (10.5, 10.5, 10), v3 (9.5, 10.5, 10).
const OFFSET_SQUARE_VERTICES = [
  9.5, 9.5, 10, 10.5, 9.5, 10, 10.5, 10.5, 10, 9.5, 10.5, 10,
];

describe("meshToThreeJS", () => {
  it("places the object's own origin at the mesh's bounding-box center, not the world origin", () => {
    const mesh = new Mesh({
      data: {
        guid: "mesh-guid",
        name: "Mesh",
        vertices: OFFSET_SQUARE_VERTICES,
        faceVertices: [0, 1, 2, 3],
        faceSizes: [4],
        attributes: {},
        vertexAttributeColumns: [],
        faceAttributeColumns: [],
        edgeAttributeColumns: [],
        edgeKeys: [],
        defaultVertexAttributes: {},
        defaultFaceAttributes: {},
        defaultEdgeAttributes: {},
      },
    });

    const result = meshToThreeJS(mesh);

    // This is what a gizmo attaches to (`TransformControls.attach` reads the
    // object's own position/matrixWorld) - it must sit at the mesh's visual
    // center, not (0, 0, 0).
    expect(result.position.toArray()).toEqual([10, 10, 10]);

    // The geometry was re-centered by the same offset, so every vertex still
    // renders at its original world position once the object's transform is
    // applied.
    result.updateMatrixWorld();
    // Local (0.5, 0.5, 0) is v2 once re-centered - its original world
    // position was (10.5, 10.5, 10).
    const worldVertex = new THREE.Vector3(0.5, 0.5, 0).applyMatrix4(
      result.matrixWorld,
    );
    expect(worldVertex.toArray()).toEqual([10.5, 10.5, 10]);
    const box = new THREE.Box3().setFromObject(result);
    expect(box.min.toArray()).toEqual([9.5, 9.5, 10]);
    expect(box.max.toArray()).toEqual([10.5, 10.5, 10]);
  });
});

describe("polyhedronToThreeJS", () => {
  it("places the object's own origin at the mesh's bounding-box center, not the world origin", () => {
    const polyhedron = new Polyhedron({
      data: {
        guid: "polyhedron-guid",
        name: "Polyhedron",
        vertices: OFFSET_SQUARE_VERTICES,
        faces: [{ vertexIndices: [0, 1, 2, 3] }],
      },
    });

    const result = polyhedronToThreeJS(polyhedron);

    expect(result.position.toArray()).toEqual([10, 10, 10]);
    const box = new THREE.Box3().setFromObject(result);
    expect(box.min.toArray()).toEqual([9.5, 9.5, 10]);
    expect(box.max.toArray()).toEqual([10.5, 10.5, 10]);
  });
});
