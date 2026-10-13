import { inject, onBeforeUnmount, onMounted } from "vue";
import type { Component, InjectionKey } from "vue";

import type {
  SavedView,
  ScreenshotOptions,
  ViewerRuntime,
  ViewPreset,
} from "../viewer/viewer_runtime";

export type TransformMode = "translate" | "rotate" | "scale";

/** A two-way message channel between a plugin's frontend and its Python half. */
export interface PluginChannel {
  /** Sends `data` to the plugin's Python `@action(action)` handler. */
  send(action: string, data?: unknown): boolean;
  /** Calls `handler` with every `action` Python sends; returns an unsubscribe function. */
  on(action: string, handler: (data: unknown) => void): () => void;
}

/** What a plugin can see and do. Deliberately narrow: the scene, camera and renderer stay internal. */
export interface PluginViewer {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  /** Reactive state; read and write `.value`. */
  readonly state: {
    readonly pickerEnabled: { value: boolean };
    readonly pickerMode: { readonly value: TransformMode };
    readonly selectedGuid: { readonly value: string | null };
    readonly theme: { readonly value: "light" | "dark" };
  };
  setTransformMode(mode: TransformMode): void;
  setCameraView(preset: ViewPreset): void;
  captureView(name: string): SavedView;
  applyView(view: SavedView): void;
  saveScreenshot(options?: ScreenshotOptions): void;
  showAllObjects(): void;
  toggleTheme(): void;
  channel(plugin: string): PluginChannel;
}

/** A group of toolbar buttons, by id: `{ move: MoveButton, rotate: RotateButton }`. */
export type ButtonGroup = Record<string, Component>;

/**
 * A viewer plugin: a toolbar section of buttons (each a Vue component, shown in this order) and an
 * optional `setup`, run once before the viewer mounts; it may return a cleanup.
 */
export interface ViewerPlugin {
  name: string;
  /** Shown above the plugin's buttons, which get a toolbar section of their own. */
  title?: string;
  /**
   * Button groups by id, each shown as one segment, in this order:
   * `{ gizmo: { move: MoveButton, rotate: RotateButton }, display: { ... } }`.
   * Python hides or disables a group or a single button by its id, so ids are unique
   * within the plugin; use names, not numbers, to keep the order.
   */
  groups?: Record<string, ButtonGroup>;
  setup?(viewer: PluginViewer): void | (() => void);
}

export interface PluginButton {
  id: string;
  component: Component;
}

export interface PluginButtonGroup {
  id: string;
  buttons: PluginButton[];
}

/** The plugin's groups and their buttons, in order, without empty groups. */
export function buttonGroups(plugin: ViewerPlugin): PluginButtonGroup[] {
  return Object.entries(plugin.groups ?? {})
    .map(([id, group]) => ({
      id,
      buttons: Object.entries(group).map(([buttonId, component]) => ({
        id: buttonId,
        component,
      })),
    }))
    .filter((group) => group.buttons.length);
}

/** Whether Python has disabled a button; see `ButtonStates`. */
export interface ButtonState {
  readonly enabled: boolean;
}

/** Provided to each toolbar button, so ToolbarButton and useShortcuts follow Python's state. */
export const buttonStateKey: InjectionKey<ButtonState> = Symbol(
  "compas-plugin-button-state",
);

/** The group and button ids Python hid or disabled, per plugin name. */
export type ButtonStates = Record<
  string,
  { hidden: readonly string[]; disabled: readonly string[] }
>;

export function definePlugin(plugin: ViewerPlugin): ViewerPlugin {
  return plugin;
}

export const pluginViewerKey: InjectionKey<PluginViewer> = Symbol(
  "compas-plugin-viewer",
);

export function createPluginViewer(runtime: ViewerRuntime): PluginViewer {
  const { pickerEnabled, pickerMode, pickedObjectGuid, theme } = runtime.store;
  return {
    root: runtime.root,
    canvas: runtime.renderer.domElement,
    state: { pickerEnabled, pickerMode, selectedGuid: pickedObjectGuid, theme },
    setTransformMode: (mode) => runtime.setTransformMode(mode),
    setCameraView: (preset) => runtime.setCameraViewPreset(preset),
    captureView: (name) => runtime.captureCurrentView(name),
    applyView: (view) => runtime.applySavedView(view),
    saveScreenshot: (options) => runtime.saveCurrentCanvasImage(options),
    showAllObjects: () => runtime.showAllObjects(),
    toggleTheme: () => runtime.toggleTheme(),
    channel: (plugin) => ({
      send: (action, data) => runtime.sendToPlugin(plugin, action, data),
      on: (action, handler) => runtime.onPluginMessage(plugin, action, handler),
    }),
  };
}

/** The viewer, from inside a plugin's component. */
export function useViewer(): PluginViewer {
  const viewer = inject(pluginViewerKey);
  if (!viewer) {
    throw new Error("useViewer() must be called inside a viewer component");
  }
  return viewer;
}

/** The plugin's channel to Python; handlers registered with `on` end with the component. */
export function useChannel(plugin: string): PluginChannel {
  const channel = useViewer().channel(plugin);
  const unsubscribes: (() => void)[] = [];
  onBeforeUnmount(() => unsubscribes.forEach((unsubscribe) => unsubscribe()));
  return {
    send: channel.send,
    on(action, handler) {
      const unsubscribe = channel.on(action, handler);
      unsubscribes.push(unsubscribe);
      return unsubscribe;
    },
  };
}

function ignoresShortcuts(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return true;
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/**
 * Binds keys (lower-case `event.key`) to handlers while the component is mounted. In a
 * toolbar button, they stand down while Python disables the button.
 */
export function useShortcuts(
  shortcuts: Record<string, (event: KeyboardEvent) => void>,
): void {
  const { root } = useViewer();
  const button = inject(buttonStateKey, null);
  const onKeyDown = (event: KeyboardEvent) => {
    if (ignoresShortcuts(event) || button?.enabled === false) return;
    const handler = shortcuts[event.key.toLowerCase()];
    if (!handler) return;
    event.preventDefault();
    handler(event);
  };
  onMounted(() => root.addEventListener("keydown", onKeyDown));
  onBeforeUnmount(() => root.removeEventListener("keydown", onKeyDown));
}
