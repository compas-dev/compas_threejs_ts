import { Box, Graph, Quaternion } from "@gramaziokohler/compas-pb-ts";
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
