import type { Component } from "vue";
import type { CompasViewerError } from "./errors";

export type ViewerMode = "embedded" | "websocket";

export interface ViewerWebSocketOptions {
  host?: string;
  port?: number;
  workspace?: string;
  secure?: boolean;
}

export interface ToolDefinition {
  id: string;
  component: Component;
  order?: number;
}

/**
 * `"corner"` (default): the built-in floating toolbar/sidebar panel, docked to the
 * top-left corner - unchanged from previous versions.
 * `"docked-top"`: the toolbar renders as a full-width bar docked to the top of the
 * viewer, with its tool groups laid out in a row instead of stacked in a column.
 */
export type ToolbarPlacement = "corner" | "docked-top";

/**
 * `"corner"` (default): nested in the same floating panel as the toolbar, next to it -
 * unchanged from previous versions. Only applies when `toolbarPlacement` is also
 * `"corner"`; otherwise Openbar renders standalone regardless of this setting.
 * `"docked-left"`: a standalone panel docked to the left edge, spanning the full height
 * below the toolbar (independent of the toolbar's own placement).
 */
export type OpenbarPlacement = "corner" | "docked-left";

/**
 * `"corner"` (default): nested in the same floating panel as the object-info/metadata
 * panel, top-right - unchanged from previous versions.
 * `"docked-top"`: a standalone, always-mounted bar docked directly under the toolbar
 * (or at the top of the viewer if the toolbar isn't also docked-top).
 */
export type ObjectActionsPlacement = "corner" | "docked-top";

export interface ViewerMessaging {
  send(message: unknown): boolean;
  sendData(message: Record<string, unknown>): boolean;
}

export interface CompasViewerOptions {
  mode?: ViewerMode;
  websocket?: ViewerWebSocketOptions;
  defaultLighting?: boolean;
  showToolbar?: boolean;
  toolbarTools?: ToolDefinition[];
  toolbarPlacement?: ToolbarPlacement;
  openbarPlacement?: OpenbarPlacement;
  objectActionsPlacement?: ObjectActionsPlacement;
  send?: (message: unknown) => boolean | void;
  onError?: (error: CompasViewerError) => void;
}

export interface CompasViewer {
  dispatch(message: Uint8Array): void;
  reset(): void;
  resize(): void;
  dispose(): void;
}
