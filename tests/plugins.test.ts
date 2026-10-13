/** @vitest-environment happy-dom */

import { defineComponent, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");

  class WebGLRenderer {
    readonly domElement = document.createElement("canvas");
    readonly shadowMap = { enabled: false, type: 0 };
    toneMapping = 0;
    toneMappingExposure = 1;
    outputColorSpace = "";

    setPixelRatio(): void {}
    setSize(): void {}
    render(): void {}
    dispose(): void {}
  }

  return { ...actual, WebGLRenderer };
});

import {
  createViewer,
  definePlugin,
  useChannel,
  useShortcuts,
  type CompasViewerOptions,
  type PluginChannel,
} from "../src/library";

const viewers: Array<{ dispose(): void }> = [];

// {"dispatch": "plugin", "plugin": "camera", "action": "views", "data": {"names": ["View 1"]}}
const CAMERA_VIEWS =
  "CmoyaAoUCgZwbHVnaW4SChIIGgZjYW1lcmEKFgoIZGlzcGF0Y2gSChIIGgZwbHVnaW4KIwoEZGF0YRIbMhkKFwoFbmFtZXMSDjoMCgoSCBoGVmlldyAxChMKBmFjdGlvbhIJEgcaBXZpZXdzEgUxLjIuMA==";
// {"dispatch": "plugin", "plugin": "other", "action": "views", "data": None}
const OTHER_VIEWS =
  "ClIyUAoTCgZwbHVnaW4SCRIHGgVvdGhlcgoWCghkaXNwYXRjaBIKEggaBnBsdWdpbgoMCgRkYXRhEgQSAggAChMKBmFjdGlvbhIJEgcaBXZpZXdzEgUxLjIuMA==";

// {"dispatch": "plugin_buttons", "plugin": "a", "hidden": ["g2", "a2"], "disabled": ["a3"]}
const HIDE_G2_A2_DISABLE_A3 =
  "CmkyZwoWCghkaXNhYmxlZBIKOggKBhIEGgJhMwocCgZoaWRkZW4SEjoQCgYSBBoCZzIKBhIEGgJhMgoeCghkaXNwYXRjaBISEhAaDnBsdWdpbl9idXR0b25zCg8KBnBsdWdpbhIFEgMaAWESBTEuMi4w";
// {"dispatch": "plugin_buttons", "plugin": "a", "hidden": [], "disabled": ["g1"]}
const DISABLE_G1 =
  "ClkyVwoWCghkaXNhYmxlZBIKOggKBhIEGgJnMQoMCgZoaWRkZW4SAjoACh4KCGRpc3BhdGNoEhISEBoOcGx1Z2luX2J1dHRvbnMKDwoGcGx1Z2luEgUSAxoBYRIFMS4yLjA=";

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

function mount(options: CompasViewerOptions) {
  const root = document.createElement("div");
  document.body.append(root);
  const viewer = createViewer(root, { mode: "embedded", ...options });
  viewers.push(viewer);
  return { root, viewer };
}

function button(label: string) {
  return defineComponent(() => () => h("button", { class: "probe" }, label));
}

afterEach(() => {
  viewers.splice(0).forEach((viewer) => viewer.dispose());
  document.body.replaceChildren();
});

describe("plugins", () => {
  it("shows no toolbar without plugins", () => {
    const { root } = mount({});
    expect(root.querySelector("#toolbar")).toBeNull();
  });

  it("gives each plugin its own toolbar section, buttons in order", () => {
    const { root } = mount({
      plugins: [
        definePlugin({
          name: "a",
          title: "First",
          groups: { main: { a1: button("a1"), a2: button("a2") } },
        }),
        definePlugin({ name: "empty", groups: { none: {} } }),
        definePlugin({ name: "b", groups: { main: { b1: button("b1") } } }),
      ],
    });
    const sections = [...root.querySelectorAll(".toolbar-section")];
    expect(
      sections.map((section) => section.getAttribute("data-plugin")),
    ).toEqual(["a", "b"]);
    expect(
      sections.map((section) =>
        section.querySelector("h2")?.textContent?.trim(),
      ),
    ).toEqual(["First", undefined]);
    expect(
      sections.map(
        (section) => section.querySelector(".toolbar-group")?.textContent,
      ),
    ).toEqual(["a1a2", "b1"]);
  });

  it("runs setup before mounting and its cleanup on dispose", () => {
    const calls: string[] = [];
    const { viewer } = mount({
      plugins: [
        definePlugin({
          name: "a",
          setup(context) {
            calls.push(`setup ${typeof context.camera.setView}`);
            return () => calls.push("cleanup");
          },
        }),
      ],
    });
    expect(calls).toEqual(["setup function"]);
    viewer.dispose();
    expect(calls).toEqual(["setup function", "cleanup"]);
  });

  it("shows each button group of a plugin as a segment of its own", () => {
    const { root } = mount({
      plugins: [
        definePlugin({
          name: "a",
          groups: {
            g1: { a1: button("a1"), a2: button("a2") },
            empty: {},
            g2: { a3: button("a3") },
          },
        }),
      ],
    });
    const groups = [...root.querySelectorAll(".toolbar-group")];
    expect(groups.map((group) => group.getAttribute("data-group"))).toEqual([
      "g1",
      "g2",
    ]);
    expect(groups.map((group) => group.textContent)).toEqual(["a1a2", "a3"]);
  });

  it("shows object actions for the selected object, minus those Python hid", async () => {
    let viewerSelected: { value: string | null } | undefined;
    const { root, viewer } = mount({
      plugins: [
        definePlugin({
          name: "a",
          objectActions: { a1: button("a1"), a2: button("a2") },
          setup(context) {
            viewerSelected = context.state.selectedGuid as {
              value: string | null;
            };
          },
        }),
      ],
    });
    const actions = () =>
      [...root.querySelectorAll(".plugin-actions .toolbar-slot")].map((slot) =>
        slot.getAttribute("data-button"),
      );
    expect(actions()).toEqual([]);

    viewerSelected!.value = "some-object";
    await nextTick();
    expect(actions()).toEqual(["a1", "a2"]);

    // {"dispatch": "plugin_buttons", "plugin": "a", "hidden": ["g2", "a2"], ...}
    viewer.dispatch(fromBase64(HIDE_G2_A2_DISABLE_A3));
    await nextTick();
    expect(actions()).toEqual(["a1"]);
  });

  it("rejects an id used twice in a plugin", () => {
    expect(() =>
      mount({
        plugins: [
          definePlugin({
            name: "a",
            groups: { g1: { x: button("x") }, x: { y: button("y") } },
          }),
        ],
      }),
    ).toThrowError(/"a" plugin uses the id "x" twice/);
  });

  it("hides and disables groups and buttons as Python says", async () => {
    let pressed = 0;
    const shortcut = defineComponent(() => {
      useShortcuts({ k: () => (pressed += 1) });
      return () => h("button", { class: "probe" }, "a3");
    });
    const { root, viewer } = mount({
      plugins: [
        definePlugin({
          name: "a",
          groups: {
            g1: { a1: button("a1"), a2: button("a2"), a3: shortcut },
            g2: { a4: button("a4") },
          },
        }),
      ],
    });
    const press = () =>
      root.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", bubbles: true }),
      );
    const visible = () =>
      [...root.querySelectorAll(".toolbar-slot")].map(
        (slot) =>
          slot.getAttribute("data-button") +
          (slot.hasAttribute("inert") ? " (disabled)" : ""),
      );

    // hidden: ["g2", "a2"], disabled: ["a3"]
    viewer.dispatch(fromBase64(HIDE_G2_A2_DISABLE_A3));
    await nextTick();
    expect(visible()).toEqual(["a1", "a3 (disabled)"]);
    press();
    expect(pressed).toBe(0);

    // hidden: [], disabled: ["g1"]
    viewer.dispatch(fromBase64(DISABLE_G1));
    await nextTick();
    expect(visible()).toEqual([
      "a1 (disabled)",
      "a2 (disabled)",
      "a3 (disabled)",
      "a4",
    ]);
    press();
    expect(pressed).toBe(0);
  });

  it("stands plugin shortcuts down while a plugin holds input", () => {
    let pressed = 0;
    let begin: (() => { release(): void }) | undefined;
    const { root } = mount({
      plugins: [
        definePlugin({
          name: "a",
          groups: {
            g1: {
              a1: defineComponent(() => {
                useShortcuts({ k: () => (pressed += 1) });
                return () => h("button");
              }),
            },
          },
          setup(viewer) {
            begin = () => viewer.three.beginInteraction({});
          },
        }),
      ],
    });
    const press = () =>
      root.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", bubbles: true }),
      );
    const session = begin!();
    press();
    expect(pressed).toBe(0);
    session.release();
    press();
    expect(pressed).toBe(1);
  });

  it("shares snap steps between plugins", () => {
    const seen: (number | null)[] = [];
    let setGrid: ((grid: number) => void) | undefined;
    mount({
      plugins: [
        definePlugin({
          name: "setter",
          setup(viewer) {
            setGrid = (grid) => (viewer.state.snap.grid = grid);
          },
        }),
        definePlugin({
          name: "follower",
          setup(viewer) {
            seen.push(viewer.state.snap.grid);
            setGrid!(0.5);
            seen.push(viewer.state.snap.grid);
          },
        }),
      ],
    });
    expect(seen).toEqual([null, 0.5]);
  });

  it("enables a button again", async () => {
    let pressed = 0;
    const { root } = mount({
      plugins: [
        definePlugin({
          name: "a",
          groups: {
            g1: {
              a1: defineComponent(() => {
                useShortcuts({ k: () => (pressed += 1) });
                return () => h("button");
              }),
            },
          },
        }),
      ],
    });
    root.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", bubbles: true }),
    );
    expect(pressed).toBe(1);
  });

  it("rejects two plugins with the same name", () => {
    expect(() =>
      mount({ plugins: [{ name: "a" }, { name: "a" }] }),
    ).toThrowError(/Two plugins are named "a"/);
  });

  it("sends and receives plugin messages through the channel", async () => {
    const sent: unknown[] = [];
    let channel: PluginChannel | undefined;
    const received: unknown[] = [];
    const { viewer } = mount({
      send: (message) => {
        sent.push(message);
        return true;
      },
      plugins: [
        definePlugin({
          name: "camera",
          groups: {
            views: {
              saved: defineComponent(() => {
                channel = useChannel("camera");
                channel.on("views", (data) => received.push(data));
                return () => h("button");
              }),
            },
          },
        }),
      ],
    });
    await nextTick();

    channel?.send("save", { name: "View 1" });
    expect(sent).toEqual([
      {
        dispatch: "plugin",
        plugin: "camera",
        action: "save",
        data: { name: "View 1" },
      },
    ]);

    // Encoded by Python's compas_pb.pb_dump_bts, as Plugin.send does.
    viewer.dispatch(fromBase64(CAMERA_VIEWS));
    viewer.dispatch(fromBase64(OTHER_VIEWS));
    expect(received).toEqual([{ names: ["View 1"] }]);
  });
});
