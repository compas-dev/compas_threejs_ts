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

export type TransformMode = "translate" | "rotate" | "scale";

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

export interface SavedView {
  id: string;
  name: string;
  cameraPosition: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
  fov: number;
}

export type ScreenshotFormat = "png" | "jpg" | "webp";

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  format?: ScreenshotFormat;
  fileName?: string;
  quality?: number;
}

/** A two-way message channel between a plugin's frontend and its Python half. */
export interface PluginChannel {
  /** Sends `data` to the plugin's Python `@action(action)` handler. */
  send(action: string, data?: unknown): boolean;
  /** Calls `handler` with every `action` Python sends; returns an unsubscribe function. */
  on(action: string, handler: (data: unknown) => void): () => void;
}

/** What a plugin can see and do. */
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
