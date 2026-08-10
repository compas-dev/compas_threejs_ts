import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { Box, Point } from "@gramaziokohler/compas-pb-ts";
import { describe, expect, it } from "vitest";

import { decodeMessage } from "../src/communications/decode";

interface FixtureManifest {
    fixtures: Record<string, { bytes: number; sha256: string }>;
}

function fixtureFile(filename: string): Uint8Array {
    const url = new URL(`./fixtures/python/${filename}`, import.meta.url);
    const encoded = readFileSync(url, "utf8").trim();
    return Uint8Array.from(Buffer.from(encoded, "base64"));
}

function fixtureBytes(name: string): Uint8Array {
    return fixtureFile(`${name}.pb.b64`);
}

const manifest = JSON.parse(
    readFileSync(
        new URL("./fixtures/python/manifest.json", import.meta.url),
        "utf8",
    ),
) as FixtureManifest;

describe("Python compas_pb compatibility", () => {
    it.each(Object.entries(manifest.fixtures))(
        "matches the recorded bytes and checksum for %s",
        (filename, expected) => {
            const bytes = fixtureFile(filename);

            expect(bytes.byteLength).toBe(expected.bytes);
            expect(createHash("sha256").update(bytes).digest("hex")).toBe(
                expected.sha256,
            );
        },
    );

    it("decodes a Python-generated Box wrapper", () => {
        const decoded = decodeMessage(fixtureBytes("box"));

        expect(decoded).toBeInstanceOf(Box);
        const box = decoded as Box;
        expect(box.guid).toBe("11111111-2222-3333-4444-555555555555");
        expect(box.name).toBe("Python box");
        expect([box.xsize, box.ysize, box.zsize]).toEqual([1, 2, 3]);
        expect([
            box.frame.point.x,
            box.frame.point.y,
            box.frame.point.z,
        ]).toEqual([4, 5, 6]);
    });

    it("materializes nested Python lists and dictionaries", () => {
        const decoded = decodeMessage(fixtureBytes("nested")) as Record<
            string,
            unknown
        >;
        const geometry = decoded.geometry as [Point, [Point]];
        const values = decoded.values as Record<string, unknown>;

        expect(decoded.source).toBe("python-compas-pb");
        expect(decoded.version).toBe("1.1.0");
        expect(geometry[0]).toBeInstanceOf(Point);
        expect([geometry[0].x, geometry[0].y, geometry[0].z]).toEqual([
            1.25, -2.5, 3.75,
        ]);
        expect(geometry[1][0]).toBeInstanceOf(Point);
        expect([geometry[1][0].x, geometry[1][0].y, geometry[1][0].z]).toEqual([
            9, 8, 7,
        ]);
        expect(values).toEqual({
            enabled: true,
            ratio: 0.25,
            count: 7,
            empty: null,
        });
    });

    it("decodes a Python-generated scene command", () => {
        expect(decodeMessage(fixtureBytes("scene"))).toEqual({
            dispatch: "scene",
            type: "camera_position",
            x: 8,
            y: -15,
            z: 15,
        });
    });
});
