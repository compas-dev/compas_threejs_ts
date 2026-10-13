import {
  Arc,
  Box,
  Graph,
  Polygon,
  Quaternion,
} from "@gramaziokohler/compas-pb-ts";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  convertToThreeJSGeometry,
  UnsupportedCompasObjectError,
} from "../src/conversions/converter";

describe("convertToThreeJSGeometry", () => {
  it("converts a box to renderable scene geometry", () => {
    const box = new Box({
      data: {
        guid: "box-guid",
        name: "Box",
        frame: {
          guid: "box-frame-guid",
          name: "Frame",
          point: { guid: "", name: "", x: 4, y: 5, z: 6 },
          xaxis: { guid: "", name: "", x: 1, y: 0, z: 0 },
          yaxis: { guid: "", name: "", x: 0, y: 1, z: 0 },
        },
        xsize: 1,
        ysize: 2,
        zsize: 3,
      },
    });

    const converted = convertToThreeJSGeometry(box);

    expect(converted).toBeInstanceOf(THREE.Mesh);
    expect(converted.position.toArray()).toEqual([4, 5, 6]);
  });

  it("fills a concave polygon, facing up, with its outline", () => {
    // An L shape of area 3, drawn clockwise seen from above, with a closing
    // point repeating the first.
    const corners = [
      [0, 0],
      [0, 2],
      [1, 2],
      [1, 1],
      [2, 1],
      [2, 0],
      [0, 0],
    ];
    const polygon = new Polygon({
      data: {
        guid: "polygon-guid",
        name: "Polygon",
        points: corners.flatMap(([x, y]) => [x!, y!, 0]),
      },
    });

    const mesh = convertToThreeJSGeometry(polygon) as THREE.Mesh;

    expect(mesh).toBeInstanceOf(THREE.Mesh);
    // Six corners - the closing point is dropped - and four triangles.
    expect(mesh.geometry.getAttribute("position").count).toBe(6);
    expect(mesh.geometry.getIndex()!.count).toBe(12);
    const normal = mesh.geometry.getAttribute("normal");
    expect(normal.getZ(0)).toBeCloseTo(1, 6);
    const area = (() => {
      const index = mesh.geometry.getIndex()!;
      const position = mesh.geometry.getAttribute("position");
      const at = (i: number) =>
        new THREE.Vector3().fromBufferAttribute(position, index.getX(i));
      let total = 0;
      for (let i = 0; i < index.count; i += 3) {
        total += new THREE.Triangle(at(i), at(i + 1), at(i + 2)).getArea();
      }
      return total;
    })();
    expect(area).toBeCloseTo(3, 6);
    expect(mesh.children[0]).toBeInstanceOf(THREE.LineLoop);
  });

  it("samples an arc between its start and end angles", () => {
    const arc = new Arc({
      data: {
        guid: "arc-guid",
        name: "Arc",
        circle: {
          guid: "",
          name: "Circle",
          radius: 2,
          frame: {
            guid: "",
            name: "Frame",
            point: { guid: "", name: "", x: 1, y: 1, z: 0 },
            xaxis: { guid: "", name: "", x: 1, y: 0, z: 0 },
            yaxis: { guid: "", name: "", x: 0, y: 1, z: 0 },
          },
        },
        // compas-pb-ts 2.0.0 rejects an angle of exactly 0 as "missing".
        startAngle: Math.PI / 2,
        endAngle: Math.PI,
      },
    });

    const line = convertToThreeJSGeometry(arc) as THREE.Line;

    expect(line).toBeInstanceOf(THREE.Line);
    const position = line.geometry.getAttribute("position");
    const start = new THREE.Vector3().fromBufferAttribute(position, 0);
    const end = new THREE.Vector3().fromBufferAttribute(
      position,
      position.count - 1,
    );
    expect(start.toArray().map((v) => +v.toFixed(6))).toEqual([1, 3, 0]);
    expect(end.toArray().map((v) => +v.toFixed(6))).toEqual([-1, 1, 0]);
    for (let i = 0; i < position.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(position, i);
      expect(point.distanceTo(new THREE.Vector3(1, 1, 0))).toBeCloseTo(2, 5);
    }
  });

  it("rejects mathematical data instead of adding it to a scene", () => {
    const quaternion = new Quaternion({
      data: {
        guid: "quaternion-guid",
        name: "Quaternion",
        w: 0.5,
        x: 0.5,
        y: 0.5,
        z: 0.5,
      },
    });

    expect(() => convertToThreeJSGeometry(quaternion)).toThrowError(
      new UnsupportedCompasObjectError(
        quaternion,
        "is data, not renderable scene geometry",
      ),
    );
  });

  it("classifies Graph as planned renderable geometry", () => {
    const graph = new Graph({
      data: {
        guid: "graph-guid",
        name: "Graph",
        nodeKeys: [],
        nodeAttributes: [],
        attributes: {},
        defaultNodeAttributes: {},
        defaultEdgeAttributes: {},
        edgeU: [],
        edgeV: [],
        edgeAttributes: [],
      },
    });

    expect(() => convertToThreeJSGeometry(graph)).toThrowError(
      new UnsupportedCompasObjectError(
        graph,
        "does not have an implemented renderer",
      ),
    );
  });

  it("rejects unknown objects with a typed error", () => {
    expect(() => convertToThreeJSGeometry({})).toThrow(
      UnsupportedCompasObjectError,
    );
  });
});
