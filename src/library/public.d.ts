import type { Component, ComputedRef } from "vue";
import type { Object3D, Ray } from "three";

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
  /**
   * Extra toolbar modules mounted after the built-in groups - e.g. a component
   * installed from an npm package. Each module owns its own icons/behavior/ids the
   * same way a built-in button does; the backend can only toggle an id's
   * visible/enabled state (see `useToolbarControl`), never define what it renders.
   */
  extraToolbarModules?: Component[];
  send?: (message: unknown) => boolean | void;
  onError?: (error: CompasViewerError) => void;
  /** Add-ons installed once the viewer is mounted, in array order. */
  plugins?: ViewerPlugin[];
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

/**
 * The subset of the viewer's internal runtime a custom `extraToolbarModules`
 * component needs: sending its own interaction back to the backend, the same way
 * every built-in toolbar button does. Must be called from within a component
 * mounted inside the viewer (e.g. one passed via `extraToolbarModules`).
 */
export interface ViewerActions {
  /**
   * Sends `{ dispatch: "ui_callback", action, value }` to the backend - the same
   * message a built-in checkbox/select toolbar button sends on interaction. On the
   * Python side, receive it with `App.register_action` (plain click, `value`
   * omitted) or `App.register_toggle_action`/`register_select_action`
   * (value-carrying), registered against this same `action` id.
   */
  handleUiAction(action: string, value?: unknown): void;
}

export declare function useViewerRuntime(): ViewerActions;

/**
 * Reactive visible/enabled state for a toolbar button id, driven by the backend's
 * `app.toolbar.set_visible(id, ...)`/`set_enabled(id, ...)` - both default to `true`
 * until the backend says otherwise. Use it in a custom `extraToolbarModules`
 * component to make it backend-addressable the same way a built-in button is.
 */
export declare function useToolbarControl(id: string): {
  visible: ComputedRef<boolean>;
  enabled: ComputedRef<boolean>;
};

/**
 * An add-on that extends the viewer through `ViewerExtensionContext` - e.g. an
 * authoring tool that draws its own overlay geometry and takes over pointer input
 * for the length of a session. Pass it via `CompasViewerOptions.plugins`.
 */
export interface ViewerPlugin {
  /** Unique per viewer; a duplicate id throws a `lifecycle_error`. */
  readonly id: string;
  /** Called once. The returned function (if any) runs on viewer dispose. */
  install(context: ViewerExtensionContext): void | (() => void);
}

export interface ViewerPoint {
  x: number;
  y: number;
  z: number;
}

/** A backend-managed object's world-space axis-aligned bounding box. */
export interface ViewerObjectBounds {
  guid: string;
  min: ViewerPoint;
  max: ViewerPoint;
}

export interface ViewerObjectHit {
  guid: string;
  point: ViewerPoint;
  distance: number;
}

/** Anything carrying viewport pointer coordinates, e.g. a `MouseEvent`. */
export interface ViewerPointerLike {
  clientX: number;
  clientY: number;
}

export interface ViewerSize {
  width: number;
  height: number;
}

/**
 * What an installed `ViewerPlugin` may do with the viewer. Deliberately narrow:
 * the scene, camera, renderer and controls stay internal, so add-ons only depend
 * on these purpose-built primitives.
 */
export interface ViewerExtensionContext {
  /** The viewer's canvas (for cursor styles, focus). Do not attach listeners
   * for input handling - use `beginInteraction` instead. */
  readonly canvas: HTMLCanvasElement;
  /** Adds `object` to a viewer-owned overlay layer: rendered, never picked,
   * untouched by `reset()` and backend messages. Returns a remover
   * (idempotent). Anything still added is removed on dispose. */
  addOverlay(object: Object3D): () => void;
  /** World-space ray under the pointer, or null if the canvas has no size. */
  pointerRay(event: ViewerPointerLike): Ray | null;
  /** Where the pointer ray meets the horizontal plane z = `elevation`, or null
   * if it doesn't (e.g. the ray runs parallel to it). */
  pointerOnPlane(
    event: ViewerPointerLike,
    elevation: number,
  ): ViewerPoint | null;
  /** Visible backend-managed objects under the pointer, nearest first. */
  pickObjects(event: ViewerPointerLike): ViewerObjectHit[];
  /** World AABBs of all visible backend-managed objects (a snapshot). */
  objectBounds(): ViewerObjectBounds[];
  /** Canvas size in CSS pixels (e.g. for `LineMaterial.resolution`). */
  viewportSize(): ViewerSize;
  /** Called with the new canvas size whenever the viewer resizes. Returns an
   * unsubscribe function. */
  onResize(listener: (size: ViewerSize) => void): () => void;
  /**
   * Takes over pointer/keyboard input. While held: picking is suspended, any
   * selection and transform gizmo are cleared, built-in shortcuts don't fire,
   * and events go to `handlers`. Orbiting (right drag) keeps working. At most
   * one session exists; beginning another interrupts the current one.
   */
  beginInteraction(handlers: InteractionHandlers): InteractionSession;
  /** Asks for a redraw after changing overlay objects. */
  requestRender(): void;
  /** Called when the viewer is disposed, before its renderer is torn down.
   * Returns an unsubscribe function. */
  onDispose(listener: () => void): () => void;
}

export interface InteractionHandlers {
  onPointerDown?(event: MouseEvent): void;
  onPointerMove?(event: MouseEvent): void;
  onKeyDown?(event: KeyboardEvent): void;
  /** The viewer ended the session (another `beginInteraction`, or dispose),
   * not the add-on's own `release()`. */
  onInterrupt?(): void;
}

export interface InteractionSession {
  /** False once released or interrupted. */
  readonly active: boolean;
  /** Restores normal picking/shortcuts. Idempotent. */
  release(): void;
}
