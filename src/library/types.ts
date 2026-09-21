import type { Component } from "vue";
import type { CompasViewerError } from "./errors";

export type ViewerMode = "embedded" | "websocket";

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
   * Extra toolbar modules to mount after the built-in groups - e.g. a `.vue` group
   * installed from an npm package. Each module owns its own icons/behavior/ids the
   * same way a built-in button does; the backend can only toggle an id's
   * visible/enabled state, never define what it renders.
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
