/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ViewerConnection } from "../src/communications/viewer_connection";

class MockWebSocket {
  static readonly OPEN = 1;
  readyState = 1;
  binaryType = "";
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {}

  send(): void {}
  close(): void {}
}

function bytes(value: number): Uint8Array {
  return new Uint8Array([value]);
}

/**
 * Covers ViewerConnection's own message-batching (see its FRAME_BUDGET_MS docstring):
 * a burst of messages arriving in one synchronous tick - the shape a large model's
 * load produces, one WebSocket message per element with no batching on the send side
 * either - must drain across several animation frames rather than being dispatched
 * (protobuf-decode-plus-scene-mutation, real work per message) all in the same
 * onmessage callback, which is what used to pin the main thread for the whole burst.
 */
describe("ViewerConnection message batching", () => {
  let sockets: MockWebSocket[];
  let rafCallbacks: FrameRequestCallback[];
  let nowValue: number;

  beforeEach(() => {
    sockets = [];
    rafCallbacks = [];
    nowValue = 0;
    vi.stubGlobal(
      "WebSocket",
      class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          sockets.push(this);
        }
      },
    );
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.spyOn(performance, "now").mockImplementation(() => nowValue);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Runs exactly the callbacks scheduled so far, as one animation frame would. */
  function flushOneFrame(): void {
    const callbacks = rafCallbacks;
    rafCallbacks = [];
    for (const callback of callbacks) callback(nowValue);
  }

  it("drains a burst of messages across multiple frames, in order, not all at once", () => {
    const dispatched: Uint8Array[] = [];
    const connection = new ViewerConnection({
      dispatch: (message) => {
        dispatched.push(message);
        // Each dispatch "costs" 5ms of simulated time - with an 8ms frame budget,
        // at most two fit per frame, forcing this test's burst across several frames.
        nowValue += 5;
      },
      onError: () => {},
    });
    connection.start();
    const socket = sockets[0]!;

    for (let i = 0; i < 5; i++) {
      socket.onmessage?.({ data: bytes(i).buffer } as MessageEvent);
    }

    // Nothing dispatched synchronously from onmessage, and only one frame scheduled
    // for the whole burst - not one dispatch (or one rAF) per message.
    expect(dispatched).toHaveLength(0);
    expect(rafCallbacks).toHaveLength(1);

    flushOneFrame();
    expect(dispatched.length).toBeGreaterThan(0);
    expect(dispatched.length).toBeLessThan(5);

    let guard = 0;
    while (dispatched.length < 5 && guard < 10) {
      flushOneFrame();
      guard += 1;
    }

    expect(dispatched).toHaveLength(5);
    expect(dispatched.map((message) => message[0])).toEqual([0, 1, 2, 3, 4]);
  });

  it("dispose() cancels a pending drain and drops whatever was still queued", () => {
    const dispatched: Uint8Array[] = [];
    const connection = new ViewerConnection({
      dispatch: (message) => dispatched.push(message),
      onError: () => {},
    });
    connection.start();
    const socket = sockets[0]!;
    socket.onmessage?.({ data: bytes(0).buffer } as MessageEvent);
    expect(rafCallbacks).toHaveLength(1);

    connection.dispose();
    flushOneFrame();

    expect(dispatched).toHaveLength(0);
  });
});
