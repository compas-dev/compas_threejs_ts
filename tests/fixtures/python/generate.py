import base64
import hashlib
import json
from pathlib import Path
from uuid import UUID

import compas_pb
from compas.geometry import Box, Frame, Point, Vector
from compas_pb.core import serialize_message


HERE = Path(__file__).parent


def dump_fixture(value):
    """Use deterministic map ordering so regenerated fixture bytes are stable."""
    return serialize_message(value).SerializeToString(deterministic=True)


def fixture_values():
    box = Box(
        1,
        2,
        3,
        Frame(Point(4, 5, 6), Vector(1, 0, 0), Vector(0, 1, 0)),
        name="Python box",
    )
    box._guid = UUID("11111111-2222-3333-4444-555555555555")

    point = Point(1.25, -2.5, 3.75, name="Fixture point")
    point._guid = UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")

    nested_point = Point(9, 8, 7)
    nested_point._guid = UUID("99999999-8888-7777-6666-555555555555")

    return {
        "box": box,
        "nested": {
            "source": "python-compas-pb",
            "version": compas_pb.__version__,
            "geometry": [point, [nested_point]],
            "values": {
                "enabled": True,
                "count": 7,
                "ratio": 0.25,
                "empty": None,
            },
        },
        "scene": {
            "dispatch": "scene",
            "type": "camera_position",
            "x": 8.0,
            "y": -15.0,
            "z": 15.0,
        },
    }


def main():
    manifest = {
        "generator": "compas_pb.core.serialize_message(deterministic=True)",
        "python_package_version": compas_pb.__version__,
        "wire_version": "1.0.0",
        "fixtures": {},
    }

    for name, value in fixture_values().items():
        raw = dump_fixture(value)
        filename = f"{name}.pb.b64"
        (HERE / filename).write_text(base64.b64encode(raw).decode("ascii") + "\n")
        manifest["fixtures"][filename] = {
            "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(),
        }

    (HERE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
