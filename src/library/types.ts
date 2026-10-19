import type { CompasViewerError } from "./errors";
import type { ViewerPlugin } from "./plugins";

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
