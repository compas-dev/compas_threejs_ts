# Changelog

## [1.2.1](https://github.com/compas-dev/compas_threejs_ts/compare/v1.2.0...v1.2.1) (2026-09-07)


### Bug Fixes

* **release:** publish app build via npm files instead of a release asset ([5fcf8d6](https://github.com/compas-dev/compas_threejs_ts/commit/5fcf8d6b204aef752367d387b19a4c4bd615b2bd))
* revert accidental compas-pb-ts devDependency bump ([51e35dc](https://github.com/compas-dev/compas_threejs_ts/commit/51e35dc99de7348e05d5fa593ec7cbd2a853a8f1))

## [1.2.0](https://github.com/compas-dev/compas_threejs_ts/compare/v1.1.0...v1.2.0) (2026-08-21)


### Features

* spinner ([af23c05](https://github.com/compas-dev/compas_threejs_ts/commit/af23c052de639d6626cd2ca34622e46dd20b5681))

## [1.1.0](https://github.com/compas-dev/compas_threejs_ts/compare/v1.0.2...v1.1.0) (2026-08-17)


### Features

* add per-object hide and show-all-objects ([aa7fda6](https://github.com/compas-dev/compas_threejs_ts/commit/aa7fda6f5d64a37d2668903dc5c792acf6df8d76))
* adds hiuide action for slectred object and show all button ([c48f03a](https://github.com/compas-dev/compas_threejs_ts/commit/c48f03a9cc66a70d7c2af7bf826bf9ce9163b04d))

## [1.0.2](https://github.com/compas-dev/compas_threejs_ts/compare/v1.0.1...v1.0.2) (2026-08-17)


### Bug Fixes

* allow anonymous geometry (geometry without GUIDs) ([2b760e2](https://github.com/compas-dev/compas_threejs_ts/commit/2b760e27934d5661f71c28328f341910d86f2859))
* render geometry without external guid ([80e95ac](https://github.com/compas-dev/compas_threejs_ts/commit/80e95ac7623bbeb5d79f32303b3b3e860a802d59))

## [1.0.1](https://github.com/compas-dev/compas_threejs_ts/compare/v1.0.0...v1.0.1) (2026-08-13)

### Bug Fixes

- make npm publication retryable ([4d72110](https://github.com/compas-dev/compas_threejs_ts/commit/4d72110a6a1302c7535da4abccabc733c8adc802))

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
