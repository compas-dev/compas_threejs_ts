# Changelog

## [1.4.1](https://github.com/compas-dev/compas_threejs_ts/compare/v1.4.0...v1.4.1) (2026-10-13)


### Bug Fixes

* **viewer:** keep material edits on a picked object after deselecting it ([f4ea4ad](https://github.com/compas-dev/compas_threejs_ts/commit/f4ea4ad03df154276ba4f749b06f073f4a60fea0))

## [1.4.0](https://github.com/compas-dev/compas_threejs_ts/compare/v1.3.0...v1.4.0) (2026-10-13)


### Features

* **viewer:** add backend-declared toolbar dispatch, store, and validation ([b74d053](https://github.com/compas-dev/compas_threejs_ts/commit/b74d0532825f937ef8f53acbd0933bed88ddba74))
* **viewer:** render the backend-declared toolbar generically ([d89be52](https://github.com/compas-dev/compas_threejs_ts/commit/d89be523929a2cc3e51406d5e6ae29e80a99e739))


### Bug Fixes

* **ci:** pass shell: true so test:package can spawn npm.cmd on Windows ([70a55db](https://github.com/compas-dev/compas_threejs_ts/commit/70a55db213668253d19bb96afbb3c9b4520c29db))
* **conversions:** re-center mesh/polyhedron geometry so TransformControls attaches at the visual center ([71e4d1c](https://github.com/compas-dev/compas_threejs_ts/commit/71e4d1ce252f0f063b88a4b5abb0a302e2db45d2))
* **conversions:** re-center mesh/polyhedron geometry so TransformControls attaches at the visual center ([54079dd](https://github.com/compas-dev/compas_threejs_ts/commit/54079dd6de17930e1c46306a323b834a4e06c65f))
* **deps:** bump vue to 3.5.44 and source-map-js to 1.2.2 ([9829e25](https://github.com/compas-dev/compas_threejs_ts/commit/9829e251b99bb12afa8a368047db898ed771856c))
* **lint:** exclude playwright-report/ and test-results/ from eslint ([7a72662](https://github.com/compas-dev/compas_threejs_ts/commit/7a7266208e0cea4eb6d24fc13e17190f38b583c7))
* **viewer:** always reschedule or reset the drain, even if the loop throws ([64a901e](https://github.com/compas-dev/compas_threejs_ts/commit/64a901e885c6b82b7eead1b4cea2489a2c0db241))
* **viewer:** drain WebSocket messages in frame-budgeted slices, not all at once ([07555d1](https://github.com/compas-dev/compas_threejs_ts/commit/07555d1ff9fd4b88d822507330c26cfcab0ead71))


### Reverts

* back out toolbar-schema work that was pushed to main by mistake ([cacb394](https://github.com/compas-dev/compas_threejs_ts/commit/cacb39404ae18628b7e0842a194ed1c8c7dc801e))

## [1.3.0](https://github.com/compas-dev/compas_threejs_ts/compare/v1.2.1...v1.3.0) (2026-09-07)


### Features

* bidirectional-sync ([7b5d135](https://github.com/compas-dev/compas_threejs_ts/commit/7b5d135e7fa492f5b7bcb4f1d9f08faa858f6fe1))
* **viewer:** add apply_transform handle_geometry command ([19e42ac](https://github.com/compas-dev/compas_threejs_ts/commit/19e42acb09a5eb04e09cd19577c579bd14c4973d))

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
