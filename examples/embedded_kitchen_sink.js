import {
  Box,
  Capsule,
  Circle,
  Cone,
  Cylinder,
  Dictionary,
  Frame,
  Line,
  Mesh,
  Plane,
  Point,
  Pointcloud,
  Polyhedron,
  Polyline,
  Sphere,
  Torus,
  Vector,
  pbDumpBytes,
} from "@gramaziokohler/compas-pb-ts";

import { createViewer } from "../dist-lib/index.js";

const container = document.querySelector("#viewer");
if (!(container instanceof HTMLElement)) {
  throw new Error("Viewer container was not found");
}

const errors = [];
const viewer = createViewer(container, {
  mode: "embedded",
  defaultLighting: true,
  showToolbar: false,
  onError(error) {
    errors.push(error);
    console.error(error.code, error.message, error.details);
  },
});

const id = (name) => `kitchen-sink-${name.toLowerCase()}`;
const point = (x, y, z = 0) => ({ guid: "", name: "", x, y, z });
const vector = (x, y, z = 0) => ({ guid: "", name: "", x, y, z });
const frame = (name, x, y, z = 0) => ({
  guid: `${id(name)}-frame`,
  name: `${name} frame`,
  point: point(x, y, z),
  xaxis: vector(1, 0, 0),
  yaxis: vector(0, 1, 0),
});

const commandValue = (value) =>
  typeof value === "number" ? { doubleValue: value } : { value };
const command = (values) =>
  new Dictionary({
    data: {
      items: Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          commandValue(value),
        ]),
      ),
    },
  });

const cells = [
  {
    name: "Vector",
    x: 0,
    y: 0,
    object: new Vector({
      data: { guid: id("Vector"), name: "Vector", x: 1.4, y: 1, z: 1.2 },
    }),
  },
  {
    name: "Frame",
    x: 4,
    y: 0,
    object: new Frame({ data: frame("Frame", 4, 0) }),
  },
  {
    name: "Point",
    x: 8,
    y: 0,
    object: new Point({
      data: { guid: id("Point"), name: "Point", x: 8, y: 0, z: 0.5 },
    }),
  },
  {
    name: "Line",
    x: 12,
    y: 0,
    object: new Line({
      data: {
        guid: id("Line"),
        name: "Line",
        start: point(11, -0.7, 0),
        end: point(13, 0.7, 1.5),
      },
    }),
  },
  {
    name: "Pointcloud",
    x: 0,
    y: 4,
    object: new Pointcloud({
      data: {
        guid: id("Pointcloud"),
        name: "Pointcloud",
        points: [-1, 3.2, 0, -0.4, 4.6, 1, 0.3, 3.5, 1.5, 0.9, 4.4, 0.4],
      },
    }),
  },
  {
    name: "Polyline",
    x: 4,
    y: 4,
    object: new Polyline({
      data: {
        guid: id("Polyline"),
        name: "Polyline",
        points: [3, 3.2, 0, 3.5, 4.7, 1, 4.3, 3.3, 1.5, 5, 4.5, 0.3],
      },
    }),
  },
  {
    name: "Circle",
    x: 8,
    y: 4,
    object: new Circle({
      data: {
        guid: id("Circle"),
        name: "Circle",
        radius: 1.1,
        frame: frame("Circle", 8, 4, 0.2),
      },
    }),
  },
  {
    name: "Plane",
    x: 12,
    y: 4,
    object: new Plane({
      data: {
        guid: id("Plane"),
        name: "Plane",
        point: point(12, 4, 0.5),
        normal: vector(0.35, 0.2, 1),
      },
    }),
  },
  {
    name: "Box",
    x: 0,
    y: 8,
    object: new Box({
      data: {
        guid: id("Box"),
        name: "Box",
        frame: frame("Box", 0, 8, 0.7),
        xsize: 2,
        ysize: 2,
        zsize: 1.4,
      },
    }),
  },
  {
    name: "Sphere",
    x: 4,
    y: 8,
    object: new Sphere({
      data: {
        guid: id("Sphere"),
        name: "Sphere",
        radius: 1.1,
        frame: frame("Sphere", 4, 8, 1.1),
      },
    }),
  },
  {
    name: "Cylinder",
    x: 8,
    y: 8,
    object: new Cylinder({
      data: {
        guid: id("Cylinder"),
        name: "Cylinder",
        radius: 0.9,
        height: 2.2,
        frame: frame("Cylinder", 8, 8, 1.1),
      },
    }),
  },
  {
    name: "Cone",
    x: 12,
    y: 8,
    object: new Cone({
      data: {
        guid: id("Cone"),
        name: "Cone",
        radius: 1.1,
        height: 2.4,
        frame: frame("Cone", 12, 8, 1.2),
      },
    }),
  },
  {
    name: "Capsule",
    x: 0,
    y: 12,
    object: new Capsule({
      data: {
        guid: id("Capsule"),
        name: "Capsule",
        radius: 0.65,
        height: 1.4,
        frame: frame("Capsule", 0, 12, 1.3),
      },
    }),
  },
  {
    name: "Torus",
    x: 4,
    y: 12,
    object: new Torus({
      data: {
        guid: id("Torus"),
        name: "Torus",
        radiusAxis: 1,
        radiusPipe: 0.32,
        frame: frame("Torus", 4, 12, 1),
      },
    }),
  },
  {
    name: "Mesh",
    x: 8,
    y: 12,
    object: new Mesh({
      data: {
        guid: id("Mesh"),
        name: "Mesh",
        vertices: [7, 11, 0, 9, 11, 0, 9, 13, 0, 7, 13, 0, 8, 12, 2],
        faceVertices: [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4, 0, 3, 2, 1],
        faceSizes: [3, 3, 3, 3, 4],
        attributes: {},
        vertexAttributeColumns: [],
        faceAttributeColumns: [],
        edgeAttributeColumns: [],
        edgeKeys: [],
        defaultVertexAttributes: {},
        defaultFaceAttributes: {},
        defaultEdgeAttributes: {},
      },
    }),
  },
  {
    name: "Polyhedron",
    x: 12,
    y: 12,
    object: new Polyhedron({
      data: {
        guid: id("Polyhedron"),
        name: "Polyhedron",
        vertices: [11, 11, 0, 13, 11, 0, 12, 13, 0, 12, 12, 2],
        faces: [
          { vertexIndices: [0, 1, 3] },
          { vertexIndices: [1, 2, 3] },
          { vertexIndices: [2, 0, 3] },
          { vertexIndices: [0, 2, 1] },
        ],
      },
    }),
  },
];

for (const cell of cells) {
  viewer.dispatch(pbDumpBytes(cell.object));
  viewer.dispatch(
    pbDumpBytes(
      command({
        dispatch: "text_tag",
        guid: `${id(cell.name)}-label`,
        text: cell.name,
        x: cell.x,
        y: cell.y,
        z: 2.8,
      }),
    ),
  );
}

for (const sceneCommand of [
  { dispatch: "scene", type: "world_axis", show: false },
  { dispatch: "scene", type: "camera_target", x: 6, y: 6, z: 0.5 },
  { dispatch: "scene", type: "camera_position", x: 18, y: -15, z: 20 },
]) {
  viewer.dispatch(pbDumpBytes(command(sceneCommand)));
}

document.body.dataset.exampleReady = "true";
window.__compasKitchenSink = { viewer, cells, errors };
window.addEventListener("pagehide", () => viewer.dispose(), { once: true });
