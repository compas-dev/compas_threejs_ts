import type { ViewerWebSocketOptions } from "../library/types";

interface ViewerConnectionOptions extends ViewerWebSocketOptions {
  send?: (message: unknown) => boolean | void;
  dispatch: (message: Uint8Array) => void;
  onError: (error: Error) => void;
}

export class ViewerConnection {
  private socket: WebSocket | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;

  constructor(private readonly options: ViewerConnectionOptions) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.connect();
  }

  send(message: unknown): boolean {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(
        message instanceof ArrayBuffer ||
          ArrayBuffer.isView(message) ||
          typeof message === "string"
          ? message
          : JSON.stringify(message),
      );
      return true;
    }
    return (
      this.options.send?.(message) !== false && this.options.send !== undefined
    );
  }

  dispose(): void {
    this.stopped = true;
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = null;
      socket.close();
    }
  }

  private connect(): void {
    if (this.stopped) return;

    const socket = new WebSocket(this.buildUrl());
    this.socket = socket;
    socket.binaryType = "arraybuffer";
    socket.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        this.options.dispatch(new Uint8Array(event.data));
      }
    };
    socket.onerror = () => {
      this.options.onError(
        new Error(`WebSocket connection failed: ${this.buildUrl()}`),
      );
    };
    socket.onclose = () => {
      if (this.stopped) return;
      this.retryTimer = setTimeout(() => this.connect(), 1000);
    };
  }

  private buildUrl(): string {
    const query = new URLSearchParams(window.location.search);
    const host = this.options.host ?? query.get("ws_host") ?? "127.0.0.1";
    const port = this.options.port ?? Number(query.get("ws_port") ?? 9001);
    const workspace =
      this.options.workspace ?? query.get("workspace") ?? "main";
    const secure = this.options.secure ?? window.location.protocol === "https:";
    return `${secure ? "wss" : "ws"}://${host}:${port}/ws?workspace=${encodeURIComponent(workspace)}`;
  }
}
