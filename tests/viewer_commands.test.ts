import { describe, expect, it } from "vitest";

import { CompasViewerError } from "../src/library";
import { parseViewerCommand } from "../src/viewer/viewer_commands";

describe("viewer command validation", () => {
  it("returns a typed scene command after validating its payload", () => {
    const command = parseViewerCommand({
      dispatch: "scene",
      type: "camera_position",
      x: 8,
      y: -15,
      z: 15,
    });

    expect(command).toEqual({
      dispatch: "scene",
      type: "camera_position",
      x: 8,
      y: -15,
      z: 15,
    });
  });

  it("rejects malformed fields with a stable invalid-message error", () => {
    expect(() =>
      parseViewerCommand({
        dispatch: "scene",
        type: "camera_position",
        x: 8,
        y: "not-a-number",
        z: 15,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CompasViewerError>>({
        code: "invalid_message",
        details: expect.objectContaining({ field: "y" }),
      }),
    );
  });

  it("distinguishes unsupported dispatch and variant values", () => {
    for (const input of [
      { dispatch: "spinner", type: "show" },
      { dispatch: "scene", type: "unknown_scene_action" },
    ]) {
      expect(() => parseViewerCommand(input)).toThrowError(
        expect.objectContaining<Partial<CompasViewerError>>({
          code: "unsupported_message",
        }),
      );
    }
  });

  it("validates complete material payloads before conversion", () => {
    expect(() =>
      parseViewerCommand({
        dispatch: "material",
        type: "point_material",
        guid: "material-guid",
        geometry_guid: "geometry-guid",
        color: "#00ffff",
        size: Number.NaN,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<CompasViewerError>>({
        code: "invalid_message",
        details: expect.objectContaining({ field: "size" }),
      }),
    );
  });

  it("allows the unbounded PhysicalMaterial attenuation default", () => {
    const command = {
      dispatch: "material",
      type: "physical_material",
      guid: "material-guid",
      geometry_guid: "geometry-guid",
      color: "#ffffff",
      metalness: 0,
      roughness: 1,
      emissive: "#000000",
      emissive_intensity: 0,
      flat_shading: false,
      wireframe: false,
      anisotropy: 0,
      anisotropy_rotation: 0,
      attenuation_color: "#ffffff",
      clearcoat: 0,
      clearcoat_roughness: 0,
      dispersion: 0,
      ior: 1.5,
      iridescence: 0,
      iridescence_ior: 1.3,
      iridescence_thickness_start: 100,
      iridescence_thickness_end: 400,
      reflectivity: 0.5,
      sheen: 0,
      sheen_color: "#000000",
      sheen_roughness: 1,
      specular_color: "#ffffff",
      specular_intensity: 1,
      thickness: 0,
      transmission: 0,
    };

    expect(parseViewerCommand(command)).toEqual(command);
    expect(() =>
      parseViewerCommand({ ...command, attenuation_distance: Infinity }),
    ).toThrowError(
      expect.objectContaining<Partial<CompasViewerError>>({
        code: "invalid_message",
        details: expect.objectContaining({ field: "attenuation_distance" }),
      }),
    );
  });

  it("accepts the Sky payload emitted by the Python package", () => {
    expect(
      parseViewerCommand({
        dispatch: "light",
        type: "sky",
        turbidity: 10,
        rayleigh: 3,
        mie_coefficient: 0.005,
        mie_directional_g: 0.7,
        azimuth: 180,
        elevation: 2,
        guid: "sky-guid",
      }),
    ).toMatchObject({ type: "sky", guid: "sky-guid" });
  });
});
