# Support matrix

Version 1.0 intentionally supports a limited rendering surface. Unsupported
objects fail with `unsupported_message` and do not modify the scene.

## Geometry

| Status                | Objects                                                                                 | Notes                                                                                |
| --------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Included              | Box, Capsule, Circle, Cone, Cylinder, Line, Point, Pointcloud, Polyline, Sphere, Torus  | Native Three.js representations                                                      |
| Included              | Mesh, Polyhedron                                                                        | Polygonal faces use fan triangulation; complex faces should be triangulated upstream |
| Included helpers      | Frame, Plane, Vector                                                                    | Frame and Vector are visual helpers; Plane is displayed as a finite surface          |
| Python mesh path      | Brep                                                                                    | Python sends its view mesh while retaining the Brep identity for callbacks           |
| Deferred              | Arc, Bezier, Ellipse, Hyperbola, Parabola, Polygon, Graph                               | Planned after 1.0                                                                    |
| Not top-level objects | MeshFaceList, PolyhedronFace                                                            | Internal protobuf helper types                                                       |
| Non-renderable data   | Projection, Quaternion, Reflection, Rotation, Scale, Shear, Transformation, Translation | Deliberately rejected as scene geometry                                              |

Circle is currently displayed as a filled disc. Native converters are retained;
objects are not converted to meshes unless their integration explicitly does so,
as with Python Breps.

## Commands

| Status              | Commands                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Included            | Basic materials and lights, scene and theme settings, UI controls, text tags, metadata, object actions, removal, and visibility, Spinner. |
| Included callbacks  | Object picking, UI actions, object actions, loaded JSON, and custom host actions                                                |
| Deferred or limited | Text geometry fonts, advanced physical-material options, Sky, and RectAreaLight                                        |

Python-to-browser commands use binary protobuf envelopes. Browser-to-Python
callbacks use JSON text.

Malformed envelopes report `decode_error`; malformed known commands report
`invalid_message`; unsupported objects and commands report
`unsupported_message`.
