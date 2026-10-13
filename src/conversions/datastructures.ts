import {
  PolyhedronFace,
  MeshFaceList,
  Mesh,
  Polyhedron,
} from "@gramaziokohler/compas-pb-ts";
import * as THREE from "three";

interface VertexLike {
  x: number;
  y: number;
  z: number;
}

/**
 * Read a COMPAS vertex list into a flat Float32Array of positions.
 *
 * @param vertices - ordered COMPAS vertices
 * @returns Flat `[x, y, z, ...]` positions suitable for a BufferAttribute
 */
function positionsFromVertices(vertices: readonly VertexLike[]): Float32Array {
  const positions = new Float32Array(vertices.length * 3);
  vertices.forEach((vertex, index) => {
    positions[index * 3] = vertex.x;
    positions[index * 3 + 1] = vertex.y;
    positions[index * 3 + 2] = vertex.z;
  });
  return positions;
}

/**
 * Fan-triangulate polygonal faces into a flat triangle index list.
 *
 * Every face is triangulated as (v0, vi, vi+1). Faces with fewer than three
 * vertices contribute no triangles. Indices are validated against the vertex
 * count so that malformed input fails deliberately at the conversion boundary
 * instead of producing corrupt buffers.
 *
 * Limitation: fan triangulation is only correct for convex, planar faces.
 *
 * @param faces - per-face vertex index lists
 * @param vertexCount - number of vertices the indices may address
 * @returns Flat triangle index list
 * @throws RangeError when a face references a vertex that does not exist
 */
function triangulateFaces(
  faces: readonly (readonly number[])[],
  vertexCount: number,
): number[] {
  const indices: number[] = [];
  faces.forEach((face, faceIndex) => {
    const at = (position: number): number => {
      const index = face[position];
      if (
        index === undefined ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= vertexCount
      ) {
        throw new RangeError(
          `Face ${faceIndex} references vertex ${String(index)}, which is outside the ${vertexCount} available vertices`,
        );
      }
      return index;
    };

    for (let i = 1; i < face.length - 1; i++) {
      indices.push(at(0), at(i), at(i + 1));
    }
  });
  return indices;
}

/**
 * Convert a single PolyhedronFace protobuf into a THREE.Mesh.
 *
 * Note: This function is currently a placeholder and throws an Error.
 *
 * Implementation notes:
 * - A PolyhedronFace typically contains indices into a polyhedron's vertex list.
 * - The intended implementation should create a BufferGeometry using those vertices,
 *   triangulate the polygon (e.g., fan triangulation) and return a THREE.Mesh.
 *
 * @param face - PolyhedronFace from compas-pb-ts
 * @returns THREE.Mesh representing the face
 */
export function polyhedronFaceToThreeJS(_face: PolyhedronFace): THREE.Mesh {
  throw new Error("polyhedronFaceToThreeJS not implemented");
}

/**
 * Convert a MeshFaceList (collection of faces) into a THREE.Mesh.
 *
 * Note: This is currently unimplemented and throws an Error.
 *
 * @param faceList - MeshFaceList to convert
 * @returns THREE.Mesh representing the face list
 */
export function meshFaceListToThreeJS(_faceList: MeshFaceList): THREE.Mesh {
  throw new Error("meshFaceListToThreeJS not implemented");
}

/**
 * Re-center a geometry on its own bounding-box middle and return that
 * midpoint.
 *
 * `mesh.vertices`/`polyhedron.vertices` arrive as absolute world
 * coordinates, and get written into the BufferGeometry as-is - so without
 * this step, the returned THREE.Mesh's own `.position` stays at the world
 * origin no matter where the mesh actually sits. That's invisible for
 * rendering (the geometry itself is already in the right place), but it
 * breaks anything that reads `.position`/`matrixWorld` instead of the
 * geometry - notably `TransformControls.attach`, which plants the transform
 * gizmo at the object's origin, not at its visual center. Translating the
 * geometry by `-center` and setting `mesh.position = center` keeps every
 * rendered vertex in exactly the same world position while giving the
 * object an origin a gizmo (or anything else keyed off object position)
 * finds where the mesh actually is.
 *
 * @param geometry - geometry already populated with absolute-coordinate positions
 * @returns the world-space center the geometry was translated by
 */
function centerGeometry(geometry: THREE.BufferGeometry): THREE.Vector3 {
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox?.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
  return center;
}

/**
 * Convert a COMPAS Mesh object to a THREE.Mesh.
 *
 * The conversion:
 * - Creates a BufferGeometry and fills its "position" attribute from mesh.vertices.
 * - Triangulates polygonal faces using a simple fan triangulation (indices: 0,i,i+1).
 * - Sets the index buffer and computes vertex normals.
 * - Re-centers the geometry on its bounding-box middle and moves that offset onto
 *   `mesh.position` (see `centerGeometry`), so the returned object's own origin -
 *   not just its rendered geometry - sits where the mesh visually is.
 * - Creates a MeshStandardMaterial with a default blue color and flat shading.
 *
 * Limitations:
 * - Assumes `mesh.vertices` items have numeric `x`, `y`, `z` properties.
 * - Faces are triangulated with a fan; non-planar or self-intersecting faces may render incorrectly.
 *
 * @param mesh - Mesh protobuf object to convert
 * @returns THREE.Mesh ready for rendering
 */
export function meshToThreeJS(mesh: Mesh): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();

  const vertices = positionsFromVertices(mesh.vertices);
  const indices = triangulateFaces(
    mesh.faces.map((face) => face.indices),
    mesh.vertices.length,
  );

  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

  const center = centerGeometry(geometry);

  // Compute normals for shading
  geometry.computeVertexNormals();

  // Create a basic material
  const material = new THREE.MeshStandardMaterial({
    color: 0x0077ff, // Default color
    flatShading: true,
    side: THREE.DoubleSide,
  });

  // Create and return the THREE.js Mesh
  const result = new THREE.Mesh(geometry, material);
  result.position.copy(center);
  return result;
}

/**
 * Convert a COMPAS Polyhedron object to a THREE.Mesh.
 *
 * Similar to meshToThreeJS but reads faces from `face.vertexIndices` and uses a default
 * green material. Also re-centers the geometry and moves the offset onto `mesh.position`,
 * for the same reason as `meshToThreeJS` - see `centerGeometry`.
 *
 * @param polyhedron - Polyhedron protobuf object to convert
 * @returns THREE.Mesh representing the polyhedron
 */
export function polyhedronToThreeJS(polyhedron: Polyhedron): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();

  const vertices = positionsFromVertices(polyhedron.vertices);
  const indices = triangulateFaces(
    polyhedron.faces.map((face) => face.vertexIndices),
    polyhedron.vertices.length,
  );

  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

  const center = centerGeometry(geometry);

  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x00cc44,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(center);
  return mesh;
}
