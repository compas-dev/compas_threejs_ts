# Compatibility

This is the compatibility baseline for `@compas-dev/compas-threejs-ts` 1.x.

## Runtime and packaging

| Area       | Support                                                      |
| ---------- | ------------------------------------------------------------ |
| JavaScript | ESM only; no CommonJS build                                  |
| Rendering  | Browser with WebGL 2                                         |
| Browsers   | Latest two stable Chrome, Edge, Firefox, and Safari releases |
| Tooling    | Node.js 22.12 or newer                                       |
| Three.js   | Peer dependency on the tested `0.182.x` line                 |
| Vue        | Internal runtime dependency; not part of the public API      |

Importing the package is side-effect free. DOM access, rendering, and network
connections begin only when a viewer is created.

## Protobuf and Python

| Component        | Supported version                  |
| ---------------- | ---------------------------------- |
| TypeScript codec | `@gramaziokohler/compas-pb-ts` 2.x |
| Python codec     | `compas_pb >=1,<2`                 |
| Wire format      | `compas_pb` 1.x                    |

Python sends binary protobuf envelopes to the browser. Picker and UI callbacks
return JSON text. The Python package embeds the standalone `dist` build in its
wheel, so Python users do not need Node.js. WebSocket configuration uses the
`ws_host`, `ws_port`, and `workspace` query parameters and the `/ws` endpoint.

## Public API

The package exposes the instance-based `createViewer` API and an explicit CSS
entry point. The Python wheel consumes a separate standalone build made from the
same source.

`window.compasViewer`, internal `src` paths, hashed build files, and unlisted
package subpaths are not public API. The VS Code extension must also use
`createViewer`.

## Errors

`CompasViewerError` reports decode, validation, unsupported-message,
connection, lifecycle, and rendering failures. Synchronous failures call
`onError` or throw; asynchronous failures call `onError` or are logged.
