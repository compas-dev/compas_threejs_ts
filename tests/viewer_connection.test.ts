/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  unpackBatch,
  ViewerConnection,
} from "../src/communications/viewer_connection";

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

/** A one-byte message - never 0, which starts a batch frame (see unpackBatch). */
function bytes(value: number): Uint8Array {
  return new Uint8Array([value + 1]);
}

/** A batch frame of `messages`, as compas_threejs's `pack_batch` makes it. */
function batch(...messages: Uint8Array[]): Uint8Array {
  const frame = new Uint8Array(
    1 + messages.reduce((total, message) => total + 4 + message.length, 0),
  );
  const view = new DataView(frame.buffer);
  let offset = 1;
  for (const message of messages) {
    view.setUint32(offset, message.length, true);
    frame.set(message, offset + 4);
    offset += 4 + message.length;
  }
  return frame;
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
    expect(dispatched.map((message) => message[0])).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps draining on the next frame if onError throws while reporting a failed dispatch", () => {
    const dispatched: Uint8Array[] = [];
    const connection = new ViewerConnection({
      dispatch: (message) => {
        if (message[0] === 1) throw new Error("bad message");
        dispatched.push(message);
      },
      onError: () => {
        throw new Error("onError failed too");
      },
    });
    connection.start();
    const socket = sockets[0]!;
    for (let i = 0; i < 3; i++) {
      socket.onmessage?.({ data: bytes(i).buffer } as MessageEvent);
    }

    expect(() => flushOneFrame()).toThrow("onError failed too");
    // The throw ended the slice early, but a follow-up frame is still scheduled.
    expect(rafCallbacks).toHaveLength(1);

    flushOneFrame();
    expect(dispatched.map((message) => message[0])).toEqual([2, 3]);
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

  it("dispatches each message of a batch frame, in order, with the single ones around it", () => {
    const dispatched: Uint8Array[] = [];
    const connection = new ViewerConnection({
      dispatch: (message) => dispatched.push(message),
      onError: () => {},
    });
    connection.start();
    const socket = sockets[0]!;
    socket.onmessage?.({ data: bytes(0).buffer } as MessageEvent);
    const frame = batch(bytes(1), new Uint8Array([9, 9, 9]), bytes(2));
    socket.onmessage?.({ data: frame.buffer } as MessageEvent);
    socket.onmessage?.({ data: bytes(3).buffer } as MessageEvent);

    flushOneFrame();
    expect(dispatched.map((message) => Array.from(message))).toEqual([
      [1],
      [2],
      [9, 9, 9],
      [3],
      [4],
    ]);
  });

  it("reports a batch frame cut short, and goes on with the next frames", () => {
    const errors: Error[] = [];
    const dispatched: Uint8Array[] = [];
    const connection = new ViewerConnection({
      dispatch: (message) => dispatched.push(message),
      onError: (error) => errors.push(error),
    });
    connection.start();
    const socket = sockets[0]!;
    const cut = batch(new Uint8Array([7, 7, 7])).subarray(0, 6);
    socket.onmessage?.({ data: cut.slice().buffer } as MessageEvent);
    socket.onmessage?.({ data: bytes(0).buffer } as MessageEvent);

    flushOneFrame();
    expect(errors).toHaveLength(1);
    expect(dispatched.map((message) => message[0])).toEqual([1]);
  });
});

describe("unpackBatch", () => {
  it("leaves a frame that isn't a batch as one message", () => {
    const frame = new Uint8Array([8, 1, 2]);
    expect(unpackBatch(frame)).toEqual([frame]);
  });

  it("reads Python's pack_batch format", () => {
    // pack_batch([b"a", b"bc"]) in compas_threejs.
    const frame = new Uint8Array([0, 1, 0, 0, 0, 97, 2, 0, 0, 0, 98, 99]);
    expect(unpackBatch(frame).map((message) => Array.from(message))).toEqual([
      [97],
      [98, 99],
    ]);
  });
});
