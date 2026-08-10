# Compatibility policy

This document defines the intended compatibility baseline for the public 1.0
release of `@gramaziokohler/compas-threejs`.

## Package and runtime

- The npm package is ESM-only: JavaScript consumers use standard `import` and
  `export` syntax. We will not publish a separate CommonJS build for `require()`.
  This does not affect Python users of the bundled static application.
- Rendering is browser-only and requires WebGL 2.
- Importing the library must remain safe in non-browser tooling and must not
  access the DOM until a viewer is explicitly created.
- Development, CI, and release automation use Node.js 22.
- The supported browser policy is the latest two stable major releases of
  Chrome, Edge, Firefox, and Safari at the time of a package release.
- Browser support is verified by automated tests where CI runners are
  available. Any documented exception must be listed in release notes.

## Protobuf compatibility

- `@gramaziokohler/compas-pb-ts` 2.x is the TypeScript codec supported by the
  1.0 viewer.
- It implements the `compas_pb` 1.x wire format. The npm package major and the
  protobuf wire-format major are independent.
- Python producers must use `compas_pb >=1,<2`.
- Messages from pre-1.0 Python codecs are not compatible because their binary
  schema predates the current wire format.
- Cross-language fixtures are generated with a recorded Python package version
  and are decoded during the TypeScript test suite.

The sibling Python project requires `compas_pb >=1,<2`, and its lockfile is
validated against the same 1.x wire format as the frontend fixtures.

## Python application compatibility

The Python `compas_threejs` package is a first-class consumer:

- The frontend continues to produce a self-contained static application in
  `dist`.
- Python copies that directory into its wheel and serves it through FastAPI.
- Python users do not need Node.js at installation or runtime.
- The frontend reads `ws_host`, `ws_port`, and `workspace` query parameters and
  connects to `/ws?workspace=<id>`.
- Python-to-browser messages are binary `compas_pb` envelopes.
- Browser-to-Python picker and UI callbacks are JSON text messages.
- Replayed workspace state must be handled deterministically.

The static Python application and the reusable npm library are separate build
products backed by the same implementation. Neither may be removed in favor of
the other.

## Public entry points

The 1.0 package will expose:

- An instance-based ESM library API.
- An explicit stylesheet entry.
- A standalone static application build for the Python package.

The prototype `window.compasViewer` integration is not public API and will be
removed when its VS Code consumer migrates to the instance-based ESM API.

Internal source paths are not public API. Consumers must not depend on `src`,
hashed build internals, or unlisted package subpaths.

## Future organization migration

The initial package is published as `@gramaziokohler/compas-threejs`. A future
move to `@compas-dev/compas-threejs` is a package migration because npm scopes
cannot be renamed in place. The transition must include:

1. Publishing the same supported API under the new scope.
2. Deprecating the old package with a replacement message.
3. Publishing migration instructions and a compatibility window.
4. Coordinating Python package assets and documentation with the new package.
