# COMPAS ThreeJS TypeScript viewer

## Run the frontend in development

```bash
npm install
npm run dev
```

The viewer connects to `ws://127.0.0.1:9001/ws?workspace=main` by default. The host, port, and workspace can be changed with the `ws_host`, `ws_port`, and `workspace` URL parameters.

## Embed the built viewer and dispatch a box

The generated JavaScript entry exposes the frontend's existing message dispatcher as `window.compasViewer.dispatch`. A standalone example uses the sibling [`compas_pb_ts`](https://github.com/gramaziokohler/compas_pb_ts) clone to create, serialize, and dispatch a box:

```bash
npm --prefix ../compas_pb_ts run build
npm install --no-save --package-lock=false ../compas_pb_ts
npm run build
cd ..
python3 -m http.server 8765
```

The local install step makes the viewer bundle use the same sibling protobuf
codec as the example. Once the COMPAS-Protobuf 1.0-compatible TypeScript
package is published, replace it with the corresponding normal package-version
update.

Then open:

```text
http://localhost:8765/compas_threejs_ts/examples/embedded_box.html
```

See `examples/embedded_box.html` for the complete example. Its essential code is:

```js
import { Box, pbDumpBytes } from "@gramaziokohler/compas-pb-ts";

window.compasViewer = {
  mode: "embedded",
  defaultLighting: true,
  showToolbar: false,
};
await import("../dist/assets/index.js");

const box = new Box({
  data: {
    // frame and dimensions...
  },
});

window.compasViewer.dispatch(pbDumpBytes(box));
```

Set the mode before importing the viewer bundle. In `embedded` mode the viewer
does not create or retry a WebSocket connection. Without this setting, it keeps
the normal `websocket` behavior. The bundle adds `dispatch` to that same
`compasViewer` object when it loads. Set `defaultLighting` to add the viewer's
standalone lighting rig; geometries without a material use its standard COMPAS
blue material.

Set `showToolbar` to `false` before importing the bundle to hide the tool
palette. It defaults to `true`, preserving the standalone and WebSocket viewer
behavior.

`pbDumpBytes` is the TypeScript equivalent of Python's `compas_pb.pb_dump_bts`: it adds the complete COMPAS-Protobuf message envelope around any supported wrapper object.

Embedded hosts can call `window.compasViewer.reset()` before replacing a scene.
The dispatcher also walks protobuf lists and dictionaries recursively, rendering
the supported geometry objects they contain. To receive picker and UI messages
without a WebSocket, provide a host callback before importing the bundle:

```js
window.compasViewer = {
  mode: "embedded",
  send(message) {
    hostTransport.postMessage(message);
    return true;
  },
};
```
