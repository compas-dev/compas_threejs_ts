import type { ViewerWebSocketOptions } from "../library/types";

interface ViewerConnectionOptions extends ViewerWebSocketOptions {
  send?: (message: unknown) => boolean | void;
  dispatch: (message: Uint8Array) => void;
  onError: (error: Error) => void;
}

// A caller loading a large scene (e.g. one element per WebSocket message, no batching
// on the send side either - see compas_threejs's Outbox) can burst thousands of
// messages at once. options.dispatch does real work per message (protobuf decode plus
// a Three.js scene mutation) - draining the whole burst synchronously inside one
// onmessage callback pins the main thread for the entire burst, which is what used to
// make the tab look/become unresponsive (and, past the browser's own patience, drop
// the WebSocket entirely) for a large model. Spending only a slice of each animation
// frame on drained messages, and picking up where it left off next frame, keeps every
// frame responsive - the burst still finishes in roughly the same wall-clock time, it
// just no longer blocks anything else (rendering, input, the connection's own
// liveness) while doing it.
const FRAME_BUDGET_MS = 8;

export class ViewerConnection {
  private socket: WebSocket | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;
  // Queue + head index rather than Array.shift() per message - shift() is O(n), which
  // would make draining a multi-thousand-message burst O(n^2). Reset to empty once
  // fully drained (see drain()) so a long-lived connection doesn't hold onto an
  // ever-growing backing array across many bursts over its lifetime.
  private readonly inbox: Uint8Array[] = [];
  private inboxHead = 0;
  private drainHandle: number | null = null;

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
    if (this.drainHandle !== null) {
      cancelAnimationFrame(this.drainHandle);
      this.drainHandle = null;
    }
    this.inbox.length = 0;
    this.inboxHead = 0;
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
        this.inbox.push(new Uint8Array(event.data));
        this.scheduleDrain();
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

  private scheduleDrain(): void {
    if (this.drainHandle !== null) return;
    this.drainHandle = requestAnimationFrame(() => this.drain());
  }

  /**
   * Dispatches queued messages, in order, for up to FRAME_BUDGET_MS before yielding
   * back to the browser - then reschedules itself for the next frame if anything is
   * still queued. See FRAME_BUDGET_MS's own docstring for why this exists.
   */
  private drain(): void {
    this.drainHandle = null;
    const deadline = performance.now() + FRAME_BUDGET_MS;
    while (this.inboxHead < this.inbox.length && performance.now() < deadline) {
      const message = this.inbox[this.inboxHead]!;
      // Advance past this message BEFORE dispatching it, and catch a throw from
      // dispatch() itself - one malformed/unsupported message must never silently
      // strand every message queued after it (which would otherwise happen here: an
      // uncaught throw exits this loop without rescheduling, so the drain simply never
      // resumes). options.dispatch already reports most failures through its own
      // onError callback instead of throwing, but this is the difference between one
      // skipped message and the rest of a large model - including a final "stop
      // loading" message - never arriving at all.
      this.inboxHead += 1;
      try {
        this.options.dispatch(message);
      } catch (error) {
        this.options.onError(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
    if (this.inboxHead >= this.inbox.length) {
      this.inbox.length = 0;
      this.inboxHead = 0;
    } else {
      this.scheduleDrain();
    }
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
