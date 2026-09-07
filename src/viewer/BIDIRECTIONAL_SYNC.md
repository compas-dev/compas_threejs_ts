# Bidirectional sync — context for a future agent

This documents the frontend half of making the viewer bidirectional: dragging an object,
adding a new one, and editing its material all send messages back to the backend, which
mutates the corresponding _live_ Python object rather than the frontend just displaying
whatever the backend last pushed. Before this work, outbound traffic was limited to UI
callbacks (`ui_callback`, `object_picked`, `object_action_callback`) — see
`ViewerRuntime.handleUiAction`/`handleObjectAction` in `viewer_runtime.ts` for that
existing pattern, which the new code follows.

The paired backend implementation lives in the sibling `compas_threejs` repo, at
`src/compas_threejs/viewer/BIDIRECTIONAL_SYNC.md` — read that alongside this file,
especially for the exact message shapes each handler expects. Both repos carry this work
on a branch called `feature/bidirectional-sync`, branched off `main` in each.

Everything below lives in `ViewerRuntime` (`viewer_runtime.ts`) unless noted otherwise.
All outbound sends go through the existing `sendData()` → `ViewerConnection.send()` path,
same as every pre-existing callback.

## `object_transform` — the transform gizmo

The gizmo (`TransformControls`) already existed, wired to picking, before this work — it
just didn't send anything. Two things were added:

1. In the constructor, the existing `"dragging-changed"` listener now also captures
   `this.dragStartMatrix = this.transformControls.object?.matrix.clone()` when a drag
   _starts_ (`event.value === true`).
2. A new `"mouseUp"` listener (fires once, when the drag ends — unlike `"objectChange"`,
   which fires every frame) calls `sendObjectTransform()`.

`sendObjectTransform()` computes `delta = object.matrix.clone().multiply(dragStartMatrix.clone().invert())`
and sends it as `{dispatch: "object_transform", guid, matrix}`, where `matrix` is a
**row-major 4x4 nested list**. `THREE.Matrix4.elements` is column-major internally, so the
conversion explicitly transposes — see the comment at the transpose site if you touch
this, it's the kind of thing that silently breaks (this exact class of bug — wrong matrix
convention — is what caused `Remote`'s old camera/background messages to be dead code
before an earlier refactor, per the backend's `CONTEXTE.md`).

**Why a delta, and why `dragStartMatrix` matters — read this before changing the math.**
Geometry conversion (`buildTransformationFromFrame` + `Object3D.applyMatrix4` in
`conversions/geometry.ts`) does **not** bake an object's frame into its vertex buffer.
`Object3D.applyMatrix4()` premultiplies the matrix into `object.matrix` and then
_decomposes_ it into `position`/`quaternion`/`scale`. So a freshly-converted mesh already
sits at its real, absolute world placement — it is not at identity. Two real bugs came
from getting this wrong, in order:

- **Bug 1 — sent the absolute matrix as if it were a delta.** The original
  implementation assumed `object.matrix` started at identity, so it sent the post-drag
  matrix directly. The backend applied it via `geometry.transform(T)`, which composes `T`
  _on top of_ the object's current state — so the object landed somewhere else entirely
  (looked "inverted" or like it teleported). Fixed by capturing `dragStartMatrix` and
  sending `M_after * M_before^-1` instead — see the backend doc's `Transformation`
  section for why this composes correctly.
- **Bug 2 — a continuously self-animating object (e.g. a spinning torus with an
  `App.loop` callback) fought its own drag.** The backend's loop calls `update_geometry`
  many times a second regardless of what the frontend is doing. Every one of those
  broadcasts was rebuilding the mesh mid-drag at the backend's last-known (not-yet-moved)
  position, undoing the user's drag in real time — by `mouseUp`, the net movement was
  ~zero, looking like the object "snapped back." Fixed in `manageGeometry` (see below).

`manageGeometry` now has an early-return guard: if the incoming update's guid is the
object currently attached to `transformControls` **and** `transformControls.dragging` is
true, the update is dropped entirely rather than rebuilding the mesh out from under the
user. The next update after the drag ends — either the echo of the just-sent
`object_transform`, or the animation's next tick — resyncs normally.

Separately, `manageGeometry` also carries gizmo attachment and highlight material over to
a freshly-rebuilt mesh when the _currently picked_ object's guid gets an update (e.g. the
echo of your own edit, or an unrelated animation tick while merely selected-but-not-
dragging) — otherwise every echo would silently detach the gizmo.

**Known limitation, not solved**: the backend applies the delta on top of whatever its
live object's state is _at message-processing time_, which — for a continuously-animating
object — may have moved further since `dragStartMatrix` was captured (the drag can take a
second or more; the backend keeps animating the whole time). The result can carry a small
amount of "extra" motion corresponding to that elapsed animation. This is different from
(and much more minor than) Bug 2 above — it's an accepted characteristic of editing a live
object, not a bug to chase.

## `apply_transform` — the reverse direction (backend → frontend)

Everything above is frontend → backend. `apply_transform` is the mirror image: a script
calls `Workspace.transform_geometry(geometry, transformation)` on the backend, and instead
of re-sending the whole (potentially large) geometry, the frontend gets a small
`{dispatch: "handle_geometry", type: "apply_transform", guid, matrix}` message and applies
`matrix` directly to the existing `THREE.Object3D` via `applyMatrix4` — no mesh rebuild.

`matrix` is a **row-major 4x4 nested list** — the exact same shape
`compas.geometry.Transformation.matrix` already has, and the exact same shape
`sendObjectTransform()` above already produces for the opposite direction (see its
transpose comment: `THREE.Matrix4.elements` is column-major, but the row-major nested list
built from it is verified to represent the same matrix, not its transpose). This message is
routed through the existing `handle_geometry` dispatch (`handleGeometry()` in
`viewer_runtime.ts`, next to `remove`/`set_visibility`/`toggle_visibility`), not a new
top-level dispatch type.

**Conversion**: `matrix4FromRowMajor()` in `conversions/geometry.ts` builds the
`THREE.Matrix4` for this. It is deliberately **not** `matrixFromElements()`/
`transformationToThreeJS()` a few lines above it — those consume a different (flat,
`compas_pb`-decoded) wire shape and apply an extra transpose that function's own docstring
flags as unverified. `THREE.Matrix4.set()` already takes arguments in row-major order, so a
row-major COMPAS matrix needs no reordering — if you're tempted to unify these two helpers,
don't, until that TODO is resolved.

**Same dragging guard as `manageGeometry`**: if the object currently attached to
`transformControls` is mid-drag, an incoming `apply_transform` is dropped rather than
applied — otherwise a live gizmo drag would fight a backend-driven transform arriving mid-
drag (e.g. an `App.loop` callback transforming the same object every frame).

**Reconnect correctness**: the backend also silently refreshes its reconnect-replay
snapshot after sending this (see the backend doc's `Workspace.transform_geometry` section)
so a client that connects mid-sequence sees the object's current position, not its
original one — nothing extra is needed on the frontend for that; it's purely a backend
bookkeeping concern.

## `create_geometry` — "Add object" toolbar button

`ViewerRuntime.createGeometry(type, params)` sends
`{dispatch: "create_geometry", type, point: [x,y,z], params}`, where `point` is the
camera's current orbit target (`this.controls.target`) so new objects spawn in view
instead of at a fixed, possibly-buried world origin.

UI: `src/components/tools/objects/AddObjectButton.vue` — a toolbar `Popover` (pattern
copied from `SavedViewsButton.vue`) with a shape-type `Select` and per-type `NumberField`
params. On "Add", it calls `createGeometry` and closes.

**No new receive-side code was needed.** The created object comes back as an ordinary
`add_geometry` broadcast — the existing `manageGeometry`/`dispatch()` path renders it
exactly like anything a script adds. This symmetry (reusing the backend's existing
`add_geometry` outbound path) is why this was a small feature: the frontend only had to
learn to _send_ one new message, not _receive_ one.

**Placement UX was deliberately kept simple**: spawn at a sensible default, then let the
user drag it into place with the (already-existing, already-fixed) gizmo — not a
click/drag-to-draw-in-3D-space sketch tool. That would need a new interaction state
machine (raycasting against a ground plane, live preview mesh, per-shape-type gesture
logic) and was explicitly scoped out as a much larger follow-up.

## `material_edit` — toolbar color/metalness/roughness

Two new `ViewerRuntime` methods:

- `getMaterialSnapshot(guid)` — reads `this.geometryMaterials.get(guid)` →
  `this.materials.get(materialGuid)`, returns `{color, metalness, roughness} | null`.
  Returns `null` if the object has no material yet, or its `materialType` isn't
  `"standard_material"` — this is the gate that keeps material editing scoped to
  `compas_threejs.materials.Material`-backed objects; `PointMaterial`/`LineMaterial`/
  `PhysicalMaterial` have unrelated property sets (e.g. a point's material has `size`, not
  metalness/roughness) and aren't editable through this control.
- `setMaterial(guid, {color?, metalness?, roughness?})` — mutates the local
  `THREE.MeshStandardMaterial` **in place** first (instant visual feedback, no round-trip
  wait), then sends `{dispatch: "material_edit", guid, ...fields}`.

UI: `src/components/tools/objects/MaterialButton.vue`, folded into the same toolbar
group as `AddObjectButton`. Disabled unless something is picked. Color swatch + two
`Slider` controls (0–1, step 0.05) for metalness/roughness, each firing `setMaterial` on
every change — edits stream continuously as you drag, matching how this app's existing
dynamic `Slider`/`NumberField` UI components already behave (see `Openbar.vue`), and
deliberately _not_ the "send once on release" pattern `object_transform` uses — materials
aren't touched by any per-frame animation loop, so there's no equivalent of Bug 2 above to
worry about here.

**New reactive store field**: `ViewerStore.pickedObjectGuid` (`viewer_store.ts`). Nothing
previously exposed "what's currently picked" to Vue — `pickedObject` was a private plain
TS field on `ViewerRuntime`. Set in `pickFromPointer` (on pick), cleared in
`clearPickedObject` (on deselect/Escape/pick-miss). `MaterialButton.vue`'s enable/disable
state and target guid both come from this.

## Verifying changes here

`object_transform`/`create_geometry`/`material_edit` predate this repo's `vitest` suite and
have no automated coverage — verification during that work was `vue-tsc` (`npm run build`)
plus manual end-to-end checks against a real running backend `App`. `apply_transform` does
have coverage: `tests/viewer_commands.test.ts` (command validation) and
`tests/viewer_lifecycle.test.ts` (applying the matrix to an existing `Object3D`, and the
dragging guard) — run with `npm test`. For end-to-end confidence, also start an example,
pick/drag/add/recolor objects in the browser, and separately confirm the backend's
Python-side object state via ad hoc scripts (see the backend doc). After any change here,
the frontend must be rebuilt (`npm run build`) and the `dist/` output copied into
`compas_threejs/src/compas_threejs/viewer/frontend/` before it's reachable from a real
browser session — the backend serves its own bundled copy, not this repo live.
