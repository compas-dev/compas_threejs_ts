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

describe("concave faces", () => {
  // An L in the XY plane, one face of six corners: the notch at (1..2, 1..2).
  const L = [0, 0, 0, 2, 0, 0, 2, 1, 0, 1, 1, 0, 1, 2, 0, 0, 2, 0];

  function triangles(result: THREE.Mesh): THREE.Triangle[] {
    const index = result.geometry.getIndex()!;
    const position = result.geometry.getAttribute("position");
    const at = (i: number) =>
      new THREE.Vector3().fromBufferAttribute(position, index.getX(i));
    const list: THREE.Triangle[] = [];
    for (let i = 0; i < index.count; i += 3)
      list.push(new THREE.Triangle(at(i), at(i + 1), at(i + 2)));
    return list;
  }

  it("are triangulated inside their outline, not across the notch", () => {
    const mesh = new Mesh({
      data: {
        guid: "l-guid",
        name: "L",
        vertices: L,
        faceVertices: [0, 1, 2, 3, 4, 5],
        faceSizes: [6],
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
    const list = triangles(result);
    expect(list).toHaveLength(4);
    // The L's area, 3: a fan from corner 0 would cover the notch too.
    const area = list.reduce((sum, t) => sum + t.getArea(), 0);
    expect(area).toBeCloseTo(3, 6);
    // No triangle's middle in the notch (the geometry is re-centered: shift back).
    for (const t of list) {
      const middle = t.getMidpoint(new THREE.Vector3()).add(result.position);
      expect(middle.x > 1 && middle.y > 1).toBe(false);
    }
  });
});
