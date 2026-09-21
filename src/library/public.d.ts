import type { Component, ComputedRef } from "vue";

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
