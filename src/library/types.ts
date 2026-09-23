import type { Component } from "vue";
import type { Object3D, Ray } from "three";
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
  /** Add-ons installed once the viewer is mounted, in array order. */
  plugins?: ViewerPlugin[];
}

export interface CompasViewer {
  dispatch(message: Uint8Array): void;
  reset(): void;
  resize(): void;
  dispose(): void;
}

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

export interface ViewerPointerLike {
  clientX: number;
  clientY: number;
}

export interface ViewerSize {
  width: number;
  height: number;
}

export interface ViewerExtensionContext {
  readonly canvas: HTMLCanvasElement;
  addOverlay(object: Object3D): () => void;
  pointerRay(event: ViewerPointerLike): Ray | null;
  pointerOnPlane(
    event: ViewerPointerLike,
    elevation: number,
  ): ViewerPoint | null;
  pickObjects(event: ViewerPointerLike): ViewerObjectHit[];
  objectBounds(): ViewerObjectBounds[];
  viewportSize(): ViewerSize;
  onResize(listener: (size: ViewerSize) => void): () => void;
  beginInteraction(handlers: InteractionHandlers): InteractionSession;
  requestRender(): void;
  onDispose(listener: () => void): () => void;
}

export interface InteractionHandlers {
  onPointerDown?(event: MouseEvent): void;
  onPointerMove?(event: MouseEvent): void;
  onKeyDown?(event: KeyboardEvent): void;
  onInterrupt?(): void;
}

export interface InteractionSession {
  readonly active: boolean;
  release(): void;
}
