import type * as THREE from "three";
import type { Component, DefineComponent } from "vue";

export type ViewerMode = "embedded" | "websocket";

export type CompasViewerErrorCode =
  | "decode_error"
  | "invalid_message"
  | "unsupported_message"
  | "connection_error"
  | "lifecycle_error"
  | "render_error";

export interface CompasViewerErrorOptions {
  cause?: unknown;
  details?: Readonly<Record<string, unknown>>;
}

export declare class CompasViewerError extends Error {
  readonly code: CompasViewerErrorCode;
  readonly details: Readonly<Record<string, unknown>> | undefined;
  constructor(
    code: CompasViewerErrorCode,
    message: string,
    options?: CompasViewerErrorOptions,
  );
}

export interface ViewerWebSocketOptions {
  host?: string;
  port?: number;
  workspace?: string;
  secure?: boolean;
}

export interface CompasViewerOptions {
  mode?: ViewerMode;
  websocket?: ViewerWebSocketOptions;
  defaultLighting?: boolean;
  showToolbar?: boolean;
  /** Plugins, in toolbar order. Without any, the viewer has no toolbar. */
  plugins?: ViewerPlugin[];
  send?: (message: unknown) => boolean | void;
  onError?: (error: CompasViewerError) => void;
}

export interface CompasViewer {
  dispatch(message: Uint8Array): void;
  reset(): void;
  resize(): void;
  dispose(): void;
}

export declare function createViewer(
  container: HTMLElement,
  options?: CompasViewerOptions,
): CompasViewer;

export type ViewPreset =
  | "top"
  | "bottom"
  | "front"
  | "back"
  | "left"
  | "right"
  | "front_left"
  | "front_right"
  | "back_left"
  | "back_right";

/** Where the camera is and what it looks at. */
export interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
  fov: number;
}

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

export interface InteractionHandlers {
  onPointerDown?(event: MouseEvent): void;
  onPointerMove?(event: MouseEvent): void;
  onKeyDown?(event: KeyboardEvent): void;
  /** The viewer ended the session (another `beginInteraction`, or dispose). */
  onInterrupt?(): void;
}

export interface InteractionSession {
  /** False once released or interrupted. */
  readonly active: boolean;
  /** Gives input back to picking and shortcuts. Idempotent. */
  release(): void;
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
  /** The id of the workspace this page shows ("main" unless the URL has `?workspace=`). */
  readonly workspace: string;
  /**
   * This page's URL, showing workspace `id` instead. Open it from a click, e.g.
   * `window.open(viewer.workspaceUrl(guid))`, while Python fills the workspace - a tab
   * opened after waiting for Python is blocked as a pop-up.
   */
  workspaceUrl(id: string): string;
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

export declare function definePlugin(plugin: ViewerPlugin): ViewerPlugin;
/** The viewer, from inside a plugin's component. */
export declare function useViewer(): PluginViewer;
/** The plugin's channel to Python; handlers registered with `on` end with the component. */
export declare function useChannel(plugin: string): PluginChannel;
/**
 * Binds keys (lower-case `event.key`) to handlers while the component is mounted. In a
 * toolbar button, they stand down while Python disables the button.
 */
export declare function useShortcuts(
  shortcuts: Record<string, (event: KeyboardEvent) => void>,
): void;

// UI primitives, so plugin buttons look like the viewer's own.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UiComponent = DefineComponent<Record<string, any>>;

export declare const ToolbarButton: DefineComponent<{
  tooltip?: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
}>;
export declare const Button: UiComponent;
export declare const Checkbox: UiComponent;
export declare const Kbd: UiComponent;
export declare const KbdGroup: UiComponent;
export declare const NumberField: UiComponent;
export declare const NumberFieldContent: UiComponent;
export declare const NumberFieldDecrement: UiComponent;
export declare const NumberFieldIncrement: UiComponent;
export declare const NumberFieldInput: UiComponent;
export declare const Popover: UiComponent;
export declare const PopoverContent: UiComponent;
export declare const PopoverTrigger: UiComponent;
export declare const Select: UiComponent;
export declare const SelectContent: UiComponent;
export declare const SelectGroup: UiComponent;
export declare const SelectItem: UiComponent;
export declare const SelectItemText: UiComponent;
export declare const SelectLabel: UiComponent;
export declare const SelectScrollDownButton: UiComponent;
export declare const SelectScrollUpButton: UiComponent;
export declare const SelectSeparator: UiComponent;
export declare const SelectTrigger: UiComponent;
export declare const SelectValue: UiComponent;
export declare const Slider: UiComponent;
export declare const Tooltip: UiComponent;
export declare const TooltipContent: UiComponent;
export declare const TooltipProvider: UiComponent;
export declare const TooltipTrigger: UiComponent;
