# Extending the embeddable viewer

`@compas-dev/compas-threejs-ts` ships an embeddable API (`src/library/index.ts`) built around
`createViewer(container, options)`. Consumers add their own UI - custom toolbar buttons, panels,
whatever - by passing options into that call, not by forking this repo's app shell
(`App.vue`/`Toolbar.vue`/`Sidebar.vue`). `timber_model_viewer/frontend-src` is a real, working
example of this pattern - read alongside this guide.

## Installing the package

```sh
npm install @compas-dev/compas-threejs-ts three vue
```

`three` and `vue` are peer/regular dependencies you provide yourself. Once installed:

```ts
import "@compas-dev/compas-threejs-ts/style.css";
import { createViewer } from "@compas-dev/compas-threejs-ts";

const container = document.getElementById("app")!;
createViewer(container, { mode: "websocket" });
```

While the extension API below is still evolving, point your `package.json` at a branch instead
of a published version:

```json
"@compas-dev/compas-threejs-ts": "github:compas-dev/compas_threejs_ts#<branch>"
```

`npm install` builds the package automatically on install (via its `prepare` script) - no manual
build step in the dependency's checkout required. To pick up new commits on that branch:

```sh
npm update @compas-dev/compas-threejs-ts
```

Once your customization has stabilized, prefer switching to a published semver range
(`^1.x`) - see [`releasing.md`](./releasing.md). Registry installs are reproducible from the
lockfile alone; branch installs re-resolve to whatever the branch currently points at.

## Adding a custom toolbar tool

Pass `toolbarTools` - an array of `{ id, component, order? }` - to `createViewer`. Each
`component` is mounted directly inside the toolbar, after the built-in tool groups:

```ts
// tools/MyTool.vue
```

```vue
<template>
  <Button variant="secondary" size="icon" @click="handleClick">Hi</Button>
</template>

<script setup lang="ts">
import { Button } from "@compas-dev/compas-threejs-ts/ui";
import { useViewerMessaging } from "@compas-dev/compas-threejs-ts";

const { sendData } = useViewerMessaging();

function handleClick() {
  sendData({ dispatch: "other_action", action: "my_action" });
}
</script>
```

```ts
// main.ts
import { createViewer } from "@compas-dev/compas-threejs-ts";
import MyTool from "./tools/MyTool.vue";

createViewer(container, {
  mode: "websocket",
  toolbarTools: [{ id: "my-tool", component: MyTool, order: 10 }],
});
```

- `order` controls left-to-right placement among _your_ tools (lower first, default `0`); the
  built-in groups (transform, add-object, view, display) always render first, ahead of any
  `toolbarTools`.
- Group several related buttons under one entry by wrapping them in a single component (see
  `timber_model_viewer/frontend-src/src/tools/CompasTimberGroup.vue`, which bundles five buttons
  behind one `ToolDefinition`).

## Talking to your backend

`useViewerMessaging()` is the public, minimal messaging surface - deliberately not the full
internal viewer runtime, so tools depend on a small stable contract instead of internals that
are free to change:

```ts
interface ViewerMessaging {
  send(message: unknown): boolean; // sent as-is if already a string/binary, else JSON.stringify'd
  sendData(message: Record<string, unknown>): boolean; // always JSON
}
```

Use `sendData` for structured messages, and `send` when you've already built the raw payload
yourself (e.g. splicing a large uploaded JSON file straight into a message envelope without an
extra parse/stringify round trip - see `LoadTimberModel.vue`).

## UI kit

`@compas-dev/compas-threejs-ts/ui` re-exports the subset of the internal component kit that's
stable for building tools with: `Button`, `Kbd`, `KbdGroup`, `Tooltip`, `TooltipContent`,
`TooltipProvider`, `TooltipTrigger`. Use these instead of writing your own so custom tools look
consistent with the built-in toolbar.

## What's public vs. internal

Only what's exported from `@compas-dev/compas-threejs-ts` and `@compas-dev/compas-threejs-ts/ui`
is a stable contract (`src/library/public.d.ts` / `src/library/ui.d.ts` are the hand-maintained
source of truth for what ships - keep them in sync with `src/library/types.ts` / `src/library/
ui.ts` when changing the public surface). Everything else under `src/` - `components/`,
`viewer/`, `composables/`, `communications/`, `conversions/`, `store/` - is free to change
between versions; don't import from `@/...` paths across the package boundary.

## Adding a new extension point

If `toolbarTools` isn't enough for what you're building (e.g. a docked side panel rather than a
toolbar button), extend the pattern rather than forking the app shell:

1. Add the option to `CompasViewerOptions` in `src/library/types.ts`, and mirror it in
   `src/library/public.d.ts`.
2. Add an injection key + `useX()` composable in `src/viewer/viewer_context.ts`.
3. `app.provide()` it in `src/library/index.ts`'s `createViewer`.
4. Consume it generically in the relevant layout component (e.g. `Sidebar.vue`) - default to
   today's built-in behavior when the option is omitted, so existing consumers (including this
   repo's own standalone app, `src/main.ts`) are unaffected.
5. Run `npm run check` before opening a PR - it covers lint, typecheck (including the strict
   `tsconfig.core.json` pass over the public-facing files), tests, and both build targets.
