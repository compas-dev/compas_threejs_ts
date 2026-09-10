import type { Component } from "vue";
import type { CompasViewerError } from "./errors";
import type { PanelPlacement } from "../viewer/viewer_context";

export type { PanelPlacement };

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
  /** Browser tab title to apply for this viewer instance. Leaves `document.title` untouched if omitted. */
  title?: string;
  /**
   * Extra toolbar modules to mount after the built-in groups - e.g. a `.vue` group
   * installed from an npm package. Each module owns its own icons/behavior/ids the
   * same way a built-in button does; the backend can only toggle an id's
   * visible/enabled state, never define what it renders.
   */
  extraToolbarModules?: Component[];
  /**
   * Which edge of the viewer each panel docks to. Panels sharing an edge stack along
   * it, in a fixed priority order (toolbar, openbar, metadata, objectActions).
   * Defaults preserve the original floating-corner layout: toolbar/openbar on the
   * left, metadata/objectActions on the right.
   */
  toolbarPlacement?: PanelPlacement;
  openbarPlacement?: PanelPlacement;
  metadataPlacement?: PanelPlacement;
  objectActionsPlacement?: PanelPlacement;
  send?: (message: unknown) => boolean | void;
  onError?: (error: CompasViewerError) => void;
}

export interface CompasViewer {
  dispatch(message: Uint8Array): void;
  reset(): void;
  resize(): void;
  dispose(): void;
}
