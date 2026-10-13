import { inject, onBeforeUnmount, onMounted } from "vue";
import type { Component, InjectionKey } from "vue";
import type * as THREE from "three";

import type {
  CameraState,
  InteractionHandlers,
  InteractionSession,
  ViewerRuntime,
  ViewPreset,
} from "../viewer/viewer_runtime";

export type { InteractionHandlers, InteractionSession };

/** A two-way message channel between a plugin's frontend and its Python half. */
export interface PluginChannel {
  /** Sends `data` to the plugin's Python `@action(action)` handler. */
  send(action: string, data?: unknown): boolean;
  /** Calls `handler` with every `action` Python sends; returns an unsubscribe function. */
  on(action: string, handler: (data: unknown) => void): () => void;
}

/** The editable fields of an object's standard material. */
export interface ObjectMaterial {
  /** `#rrggbb` */
  color: string;
  metalness: number;
  roughness: number;
}

/**
 * Scene-level access, for plugins that build interactive tools (a gizmo, drawing, ...).
 * It is closer to the viewer's internals than the rest of `PluginViewer`.
 */
export interface PluginThree {
  readonly camera: THREE.PerspectiveCamera;
  readonly canvas: HTMLCanvasElement;
  /** The scene object of a backend geometry, by guid. */
  object(guid: string): THREE.Object3D | undefined;
  /** Adds a plugin-owned object to the scene; never picked. Returns its removal. */
  addOverlay(object: THREE.Object3D): () => void;
  /** Stops camera navigation until released. */
  pauseNavigation(): () => void;
  /** A click picks nothing while `guard` returns true. Returns its removal. */
  addPickGuard(guard: (event: MouseEvent) => boolean): () => void;
  /** Backend updates of this object wait until released (e.g. during a drag). */
  holdObjectUpdates(guid: string): () => void;
  /** The world-space ray under the pointer, or null while the canvas has no size. */
  pointerRay(event: { clientX: number; clientY: number }): THREE.Ray | null;
  /** The visible backend objects, with their guids (e.g. to snap to them). */
  objects(): { guid: string; object: THREE.Object3D }[];
  /** The canvas size in CSS pixels. */
  viewportSize(): { width: number; height: number };
  /** Called with the new size whenever the viewer resizes. Returns its removal. */
  onResize(
    listener: (size: { width: number; height: number }) => void,
  ): () => void;
  /**
   * Takes over pointer and keyboard input until released, e.g. while a drawing tool
   * is active: picking, the viewer's keys and every plugin's `useShortcuts` stand
   * down, the selection is cleared, and events go to `handlers`. Orbiting keeps
   * working. Beginning another session interrupts this one (`onInterrupt`).
   */
  beginInteraction(handlers: InteractionHandlers): InteractionSession;
}

/** What a plugin can see and do: the viewer's primitives; the tools are the plugins'. */
export interface PluginViewer {
  readonly root: HTMLElement;
  /** Reactive state; read `.value`. `pickerEnabled` may also be written. */
  readonly state: {
    readonly pickerEnabled: { value: boolean };
    readonly selectedGuid: { readonly value: string | null };
    readonly theme: { readonly value: "light" | "dark" };
    /** Whether a plugin holds input (`three.beginInteraction`). */
    readonly interacting: { readonly value: boolean };
    /**
     * Snap steps shared between plugins - one sets them (Draw's Snap settings),
     * others follow them (Essentials' gizmo): `grid` in world units, `angle` in
     * degrees, null for off.
     */
    readonly snap: { grid: number | null; angle: number | null };
  };
  readonly selection: {
    clear(): void;
    /** Called with the picked guid (or null) when it changes, or its object is rebuilt. */
    onChange(listener: (guid: string | null) => void): () => void;
  };
  readonly objects: {
    /** Hides the object in this browser (deselecting it) until `showAll`. */
    hide(guid: string): void;
    showAll(): void;
    /** Whether clicking can pick it; making a picked object unpickable deselects it. */
    setPickable(guid: string, pickable: boolean): void;
    /** Tells Python the object moved by `matrix`, a row-major 4x4 delta. */
    commitTransform(guid: string, matrix: number[][]): void;
    /** The object's standard material, or null if it has none. */
    getMaterial(guid: string): ObjectMaterial | null;
    /** Edits the object's standard material, here and in Python. */
    setMaterial(guid: string, fields: Partial<ObjectMaterial>): void;
  };
  readonly camera: {
    get(): CameraState;
    set(state: Partial<CameraState>): void;
    setView(preset: ViewPreset): void;
  };
  setTheme(mode: "light" | "dark"): void;
  /** Renders the current view into a new canvas (default size: the viewport's). */
  captureImage(options?: {
    width?: number;
    height?: number;
  }): HTMLCanvasElement;
  channel(plugin: string): PluginChannel;
  readonly three: PluginThree;
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
  /**
   * Actions for the selected object, by id, shown in its panel: `{ hide: HideAction }`.
   * Each is a Vue component that reads the object from `useViewer().state.selectedGuid`.
   * Their ids share the plugin's namespace with groups and buttons.
   */
  objectActions?: ButtonGroup;
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
  const { pickerEnabled, pickedObjectGuid, theme, interacting, snap } =
    runtime.store;
  return {
    root: runtime.root,
    state: {
      pickerEnabled,
      selectedGuid: pickedObjectGuid,
      theme,
      interacting,
      snap,
    },
    selection: {
      clear: () => runtime.deselectObject(),
      onChange: (listener) => runtime.onSelectionChange(listener),
    },
    objects: {
      hide(guid) {
        if (pickedObjectGuid.value === guid) runtime.deselectObject();
        runtime.hideObjectByGuid(guid);
      },
      showAll: () => runtime.showAllObjects(),
      setPickable: (guid, pickable) =>
        runtime.setObjectPickable(guid, pickable),
      commitTransform: (guid, matrix) =>
        runtime.commitObjectTransform(guid, matrix),
      getMaterial: (guid) => runtime.getMaterialSnapshot(guid),
      setMaterial: (guid, fields) => runtime.setMaterial(guid, fields),
    },
    camera: {
      get: () => runtime.getCamera(),
      set: (state) => runtime.setCamera(state),
      setView: (preset) => runtime.setCameraViewPreset(preset),
    },
    setTheme: (mode) => runtime.setTheme(mode),
    captureImage: (options) => runtime.captureImage(options),
    channel: (plugin) => ({
      send: (action, data) => runtime.sendToPlugin(plugin, action, data),
      on: (action, handler) => runtime.onPluginMessage(plugin, action, handler),
    }),
    three: {
      camera: runtime.camera,
      canvas: runtime.renderer.domElement,
      object: (guid) => runtime.object(guid),
      addOverlay: (object) => runtime.addOverlay(object),
      pauseNavigation: () => runtime.pauseNavigation(),
      addPickGuard: (guard) => runtime.addPickGuard(guard),
      holdObjectUpdates: (guid) => runtime.holdObjectUpdates(guid),
      pointerRay: (event) => runtime.pointerRay(event),
      objects: () => runtime.visibleObjects(),
      viewportSize: () => runtime.viewportSize(),
      onResize: (listener) => runtime.addResizeListener(listener),
      beginInteraction: (handlers) => runtime.beginInteraction(handlers),
    },
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
  const { root, state } = useViewer();
  const button = inject(buttonStateKey, null);
  const onKeyDown = (event: KeyboardEvent) => {
    if (ignoresShortcuts(event) || button?.enabled === false) return;
    // A plugin holding input (e.g. a drawing tool) gets the keys instead.
    if (state.interacting.value) return;
    const handler = shortcuts[event.key.toLowerCase()];
    if (!handler) return;
    event.preventDefault();
    handler(event);
  };
  onMounted(() => root.addEventListener("keydown", onKeyDown));
  onBeforeUnmount(() => root.removeEventListener("keydown", onKeyDown));
}
