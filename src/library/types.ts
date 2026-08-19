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
  send?: (message: unknown) => boolean | void;
  onError?: (error: CompasViewerError) => void;
}

export interface CompasViewer {
  dispatch(message: Uint8Array): void;
  reset(): void;
  resize(): void;
  dispose(): void;
}
