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
