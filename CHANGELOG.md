# Changelog

## [1.0.1](https://github.com/compas-dev/compas_threejs_ts/compare/v1.0.0...v1.0.1) (2026-08-13)


### Bug Fixes

* make npm publication retryable ([4d72110](https://github.com/compas-dev/compas_threejs_ts/commit/4d72110a6a1302c7535da4abccabc733c8adc802))

## 1.0.0 (2026-08-13)

### Highlights

- First public release of the reusable COMPAS Three.js viewer as
  `@compas-dev/compas-threejs-ts`.
- Support both embedded integrations and the standalone WebSocket application
  used by `compas_threejs`.
- Render the initial 1.0 geometry set: Box, Capsule, Circle, Cone, Cylinder,
  Frame, Line, Mesh, Plane, Point, Pointcloud, Polyhedron, Polyline, Sphere,
  Torus, and Vector.

### Features

- Add the instance-based `createViewer` API with explicit dispatch, reset,
  resize, and disposal lifecycle methods.
- Decode COMPAS Protobuf envelopes, including recursively nested lists and
  dictionaries, using the `compas_pb` 1.x wire format.
- Add materials, lighting, camera and scene controls, themes, text tags,
  metadata, visibility controls, object actions, and host callbacks.
- Add optional toolbar and default-lighting controls for embedded consumers.
- Publish an ESM library with TypeScript declarations and a standalone browser
  build from the same source.
- Add an embedded kitchen-sink example covering every geometry type in the 1.0
  support matrix.

### Reliability and compatibility

- Add stable typed errors for decoding, validation, unsupported messages,
  connections, lifecycle operations, and rendering failures.
- Reject unsupported and non-renderable COMPAS messages without modifying the
  scene.
- Correct geometry, selection, visibility, plane positioning, material reuse,
  and viewer resource-disposal behavior.
- Verify compatibility with Python-generated protobuf fixtures and
  `@gramaziokohler/compas-pb-ts` 2.x.
- Add Node 22 CI, unit and browser tests, clean packed-consumer validation,
  dependency auditing, and automated npm releases through Trusted Publishing.
- Self-host the Inter variable font under the SIL Open Font License so the
  viewer makes no external font request.
