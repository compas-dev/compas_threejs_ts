# COMPAS ThreeJS TypeScript viewer

## Run the frontend in development

```bash
npm install
npm run dev
```

The viewer connects to `ws://127.0.0.1:9001/ws?workspace=main` by default. The host, port, and workspace can be changed with the `ws_host`, `ws_port`, and `workspace` URL parameters.

See the [compatibility policy](docs/compatibility.md) and
[COMPAS support matrix](docs/support-matrix.md) for the public 1.0 contract and
current implementation status.

## Use the library build

The public API creates an explicit viewer instance in a container. Importing the
package does not mount anything or access the DOM; browser work starts when
`createViewer` is called.

```bash
npm install
npm run build
python3 -m http.server 8765
```

Then open:

```text
http://localhost:8765/examples/embedded_box.html
```

See `examples/embedded_box.html` for the complete local-build example. Its
essential code is:

```ts
import { createViewer } from "@compas-dev/compas-threejs-ts";
import "@compas-dev/compas-threejs-ts/style.css";
import { Box, pbDumpBytes } from "@gramaziokohler/compas-pb-ts";

const viewer = createViewer(document.querySelector<HTMLElement>("#viewer")!, {
  mode: "embedded",
  defaultLighting: true,
  showToolbar: false,
  send(message) {
    hostTransport.postMessage(message);
  },
  onError(error) {
    console.error(error.code, error.message, error.details);
  },
});

const box = new Box({
  data: {
    // frame and dimensions...
  },
});

viewer.dispatch(pbDumpBytes(box));

// Later:
viewer.reset();
viewer.resize();
viewer.dispose();
```

`embedded` is the default mode and does not open or retry a WebSocket. The optional
`send` callback receives picker and UI messages. `defaultLighting` adds the
standalone lighting rig, and `showToolbar` controls the built-in toolbar.

`onError` receives a `CompasViewerError` with a stable `code` and optional
`details`. Synchronous dispatch and lifecycle errors are thrown when no callback
is provided. Asynchronous connection and asset-loading errors are reported to
the callback, or to the console when no callback is configured. The current
codes are `decode_error`, `invalid_message`, `unsupported_message`,
`connection_error`, `lifecycle_error`, and `render_error`.

`pbDumpBytes` is the TypeScript equivalent of Python's `compas_pb.pb_dump_bts`: it adds the complete COMPAS-Protobuf message envelope around any supported wrapper object.

The viewer decodes that envelope with the 2.x `pbLoadBytes` API. Protobuf lists
and dictionaries are materialized recursively as plain JavaScript arrays and
objects before dispatch. The npm package major and wire-format version are
independent: `compas-pb-ts` 2.x still targets the `compas_pb` 1.x wire format.

The dispatcher also walks protobuf lists and dictionaries recursively, rendering
the supported geometry objects they contain. In `websocket` mode the standalone
app reads `ws_host`, `ws_port`, and `workspace` from the URL, preserving the
Python package integration.

For a broader visual smoke test, open
`examples/embedded_kitchen_sink.html`. It uses the same public embedded API to
display every geometry and helper type included in the 1.0 support matrix in a
labelled 4×4 grid.

Maintainers can find the dependency policy in
[`docs/dependencies.md`](docs/dependencies.md) and the automated release flow in
[`docs/releasing.md`](docs/releasing.md).

## Plugins

The viewer has no toolbar of its own: plugins add it, each in a section of its own.

```ts
import { createViewer, definePlugin } from "@compas-dev/compas-threejs-ts";
import { FrontButton, SaveViewButton, TopButton } from "./buttons";

const camera = definePlugin({
  name: "camera",
  title: "Camera", // optional, shown above the section
  // Groups of Vue components, by id, in toolbar order; each group is one segment.
  groups: {
    presets: { top: TopButton, front: FrontButton },
    saved: { save_view: SaveViewButton },
  },
  setup(viewer) {}, // optional; may return a cleanup
});

createViewer(container, { plugins: [camera] });
```

A plugin owns its tools' behaviour; the viewer only gives primitives. Inside a button,
`useViewer()` gives the selection, objects (hide, pickable, commit a transform), the
camera (get, set, view presets), the theme and image capture; `viewer.three` goes closer
to the scene (camera, canvas, objects, overlays, pointer rays, pausing navigation,
vetoing picks, taking over input with `beginInteraction`) for interactive tools like a
gizmo or drawing tools. `useChannel(name)` sends to and receives from the
plugin's Python half, and `useShortcuts({ key: handler })` binds keys.

A plugin can also add `objectActions` (`{ hide: HideAction }`): components shown in the
FUNCTIONS panel for the selected object.

The Python half can hide or disable a group or a single button by its id. The viewer
applies it to any button: a disabled one is greyed out and inert, and its `useShortcuts`
stand down.

`ToolbarButton`, `Button`, `Popover`,
`Tooltip`, ... make buttons look like the viewer's own.

The page the Python `App` serves loads its plugins at runtime from `plugins.json`. It
maps `vue`, `three` and `@compas-dev/compas-threejs-ts` with an import map, so a plugin is
built with those three left external and shares the page's copies. See
[compas_threejs_plugins](https://github.com/compas-dev/compas_threejs_plugins).
