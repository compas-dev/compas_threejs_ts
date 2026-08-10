# COMPAS support matrix

This matrix records current behavior and the intended 1.0 contract. An
implementation is not considered supported until it has representative unit
and browser tests.

Status vocabulary:

- **Candidate**: an implementation exists but still needs correctness and
  browser validation.
- **Missing**: the current path is a placeholder or absent.
- **Non-renderable**: valid COMPAS mathematical data that is not scene geometry.
- **Supported**: behavior is implemented, documented, and covered by tests.

## Geometry and datastructures

| COMPAS object  | Current behavior                           | 1.0 target                                                          |
| -------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| Box            | Candidate mesh conversion                  | Supported                                                           |
| Capsule        | Candidate mesh conversion                  | Supported                                                           |
| Circle         | Candidate filled-disc conversion           | Decide curve versus surface semantics, then support                 |
| Cone           | Candidate mesh conversion                  | Supported                                                           |
| Cylinder       | Candidate mesh conversion                  | Supported                                                           |
| Frame          | Candidate axes-helper conversion           | Supported                                                           |
| Line           | Candidate line conversion                  | Supported                                                           |
| Plane          | Candidate finite plane-mesh conversion     | Supported with documented display size                              |
| Point          | Candidate points conversion                | Supported                                                           |
| Pointcloud     | Candidate points conversion                | Supported                                                           |
| Polyline       | Candidate line conversion                  | Supported                                                           |
| Sphere         | Candidate mesh conversion                  | Supported                                                           |
| Torus          | Candidate mesh conversion                  | Supported                                                           |
| Vector         | Candidate arrow-helper conversion          | Supported                                                           |
| Mesh           | Candidate fan-triangulated mesh conversion | Supported after robust triangulation review                         |
| Polyhedron     | Candidate fan-triangulated mesh conversion | Supported after robust triangulation review                         |
| Arc            | Missing; placeholder throws                | Implement and support                                               |
| Bezier         | Missing; placeholder throws                | Implement and support                                               |
| Ellipse        | Missing; placeholder throws                | Implement and support                                               |
| Hyperbola      | Missing; placeholder throws                | Implement and support                                               |
| Parabola       | Missing; placeholder throws                | Implement and support                                               |
| Polygon        | Missing; placeholder throws                | Implement and support                                               |
| Graph          | No viewer conversion                       | Explicitly unsupported in 1.0 unless a rendering design is approved |
| PolyhedronFace | Missing standalone conversion              | Internal helper, not a top-level public viewer object               |
| MeshFaceList   | Missing standalone conversion              | Internal helper, not a top-level public viewer object               |

## Mathematical COMPAS objects

These values can have useful conversion utilities but must not be added to a
Three.js scene as geometry.

| COMPAS object  | Current behavior                                         | 1.0 target                     |
| -------------- | -------------------------------------------------------- | ------------------------------ |
| Projection     | Produces `THREE.Matrix4`, incorrectly routed as geometry | Public conversion utility only |
| Reflection     | Produces `THREE.Matrix4`, incorrectly routed as geometry | Public conversion utility only |
| Scale          | Produces `THREE.Matrix4`, incorrectly routed as geometry | Public conversion utility only |
| Shear          | Produces `THREE.Matrix4`, incorrectly routed as geometry | Public conversion utility only |
| Transformation | Produces `THREE.Matrix4`, incorrectly routed as geometry | Public conversion utility only |
| Quaternion     | Missing; placeholder throws                              | Public conversion utility only |
| Rotation       | Missing; placeholder throws                              | Public conversion utility only |
| Translation    | Missing; placeholder throws                              | Public conversion utility only |

The viewer dispatcher must reject these values with
`UnsupportedCompasObjectError` rather than passing them to `scene.add`.

## Python-to-browser dispatch messages

| `dispatch`        | Variants                                                                      | Current behavior         | 1.0 target                        |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------ | --------------------------------- |
| `material`        | `standard_material`, `line_material`, `point_material`, `physical_material`   | Implemented              | Supported                         |
| `light`           | `ambient_light`, `point_light`, `rect_light`, `sky`, `spot_light`, `sunlight` | Implemented              | Supported                         |
| `scene`           | background, controls, axes, picker, camera, edges                             | Implemented              | Supported                         |
| `theme`           | dark/light and background settings                                            | Implemented              | Supported                         |
| `ui`              | button, slider, number field, JSON loader, checkbox, select                   | Implemented              | Supported                         |
| `text`            | `text_geometry`                                                               | Implemented              | Supported after font/asset review |
| `text_tag`        | screen-space label                                                            | Implemented              | Supported                         |
| `object_infos`    | picker metadata                                                               | Implemented              | Supported                         |
| `object_action`   | picker action controls                                                        | Implemented              | Supported                         |
| `handle_geometry` | remove, set visibility, toggle visibility                                     | Implemented              | Supported                         |
| `spinner`         | show/hide loading state                                                       | Missing frontend handler | Implement before joint release    |

Binary envelopes are the supported Python transport. The WebSocket code
currently parses JSON text received from the server but does not dispatch it;
that path must either be implemented and tested or explicitly removed.

## Browser-to-Python callbacks

| `dispatch`               | Producer                | Current behavior              | 1.0 target                                                   |
| ------------------------ | ----------------------- | ----------------------------- | ------------------------------------------------------------ |
| `object_picked`          | Object picker           | Implemented                   | Supported                                                    |
| `ui_callback`            | Dynamic UI controls     | Implemented                   | Supported                                                    |
| `object_action_callback` | Object action controls  | Implemented                   | Supported                                                    |
| `loaded_json`            | JSON loader             | Implemented                   | Supported with input limits and validation                   |
| `other_action`           | Custom host integration | No standard frontend producer | Document as an advanced host API or remove from the contract |

## Unsupported-input behavior

- Direct converter calls throw `UnsupportedCompasObjectError` with the detected
  object type and a useful reason.
- The viewer dispatcher will catch that error at the message boundary, report
  it through the public error callback, and leave existing viewer state intact.
- Malformed envelopes and malformed command dictionaries use separate decoding
  and validation errors.
- Unsupported data is never silently added, recursively misinterpreted, or
  passed to `THREE.Scene.add`.
