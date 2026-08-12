# Dependency policy

This document records why each direct dependency exists and how it reaches a
package consumer. Review it whenever a dependency is added, removed, bundled,
or externalized.

## Published runtime dependencies

| Package | Role                                                                 | Packaging decision                                                                                                                              |
| ------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `vue`   | Mounts the viewer UI and provides per-instance reactive state.       | Externalized from the library bundle and installed as a normal runtime dependency. Vue is an implementation detail, not part of the public API. |
| `three` | Provides rendering, controls, helpers, and Three.js example modules. | Declared as a peer dependency so the host and viewer share one Three.js runtime. It is also a development dependency for builds and tests.      |

## Bundled implementation dependencies

These packages are required to build the viewer but are bundled into
`dist-lib/index.js`. They are development dependencies because the published
JavaScript contains no imports from them.

| Package                                              | Role                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@gramaziokohler/compas-pb-ts`                       | Decodes COMPAS Protobuf envelopes and supplies wrapper types used by converters and tests. |
| `@bufbuild/protobuf`                                 | Runtime used by `compas-pb-ts`; it is also mapped explicitly by the local browser example. |
| `reka-ui`                                            | Accessible Vue primitives used by the built-in controls.                                   |
| `@vueuse/core`                                       | Vue composition utilities used by those controls.                                          |
| `lucide-vue-next`                                    | Toolbar and status icons.                                                                  |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Component variant and CSS-class composition.                                               |

## Styling and build tooling

| Package                                              | Role                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `tailwindcss`, `tw-animate-css`, `@tailwindcss/vite` | Compile the distributed stylesheet and component animations. |
| `vite`, `@vitejs/plugin-vue`                         | Build the standalone application and ESM library.            |
| `typescript`, `vue-tsc`, `@types/node`               | Type-check application, Vue, and build configuration code.   |

## Test and quality tooling

| Package                                                               | Role                                                  |
| --------------------------------------------------------------------- | ----------------------------------------------------- |
| `vitest`, `happy-dom`                                                 | Unit, compatibility, import, and DOM lifecycle tests. |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier` | JavaScript and TypeScript static analysis.            |
| `prettier`                                                            | Source formatting checks.                             |

## Security policy for dependencies

- Unused direct dependencies are removed rather than left available for future
  use.
- Install scripts are denied by default. `vue-demi@0.14.10` is pinned and
  allowed to select its Vue 3 compatibility files; optional `fsevents@2.3.3` is
  pinned and allowed to build Vite's macOS file-watching integration.
- Production and complete dependency trees must have no unreviewed critical or
  high advisories before release.
- Bundling a package does not exempt it from the complete-tree audit.
- Major build-tool upgrades require the same tests, builds, and packed-consumer
  checks as runtime dependency changes.
