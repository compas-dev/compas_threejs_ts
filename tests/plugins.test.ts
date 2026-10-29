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
  CompasViewerError,
  createViewer,
  definePlugin,
  useChannel,
  useShortcuts,
  type CompasViewerOptions,
  type PluginChannel,
  type PluginViewer,
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

// {"dispatch": "notice", "message": "Saved", "kind": "success"}
const NOTICE_SAVED =
  "CkUyQwoTCgRraW5kEgsSCRoHc3VjY2VzcwoUCgdtZXNzYWdlEgkSBxoFU2F2ZWQKFgoIZGlzcGF0Y2gSChIIGgZub3RpY2USBTEuMi4w";
// {"dispatch": "plugin_buttons", "plugin": "a", "hidden": ["tree"], "disabled": ["table"]}
const HIDE_TREE_DISABLE_TABLE =
  "CmYyZAoZCghkaXNhYmxlZBINOgsKCRIHGgV0YWJsZQoWCgZoaWRkZW4SDDoKCggSBhoEdHJlZQoPCgZwbHVnaW4SBRIDGgFhCh4KCGRpc3BhdGNoEhISEBoOcGx1Z2luX2J1dHRvbnMSBTEuMi4w";

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

  it("knows its workspace and gives the URL of another", () => {
    window.history.replaceState(null, "", "/?ws_port=9001&workspace=beam");
    let seen: PluginViewer | undefined;
    mount({
      plugins: [
        definePlugin({ name: "a", setup: (viewer) => void (seen = viewer) }),
      ],
    });
    expect(seen?.workspace).toBe("beam");
    const url = new URL(seen?.workspaceUrl("column 2") ?? "");
    expect(url.searchParams.get("workspace")).toBe("column 2");
    expect(url.searchParams.get("ws_port")).toBe("9001");
    window.history.replaceState(null, "", "/");
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
  it("docks panels on their side, folds titled ones, and hides them as Python says", async () => {
    const { root, viewer } = mount({
      plugins: [
        definePlugin({
          name: "a",
          panels: {
            tree: button("tree"),
            table: { component: button("table"), title: "Table", side: "left" },
            graph: { component: button("graph"), title: "Graph", folded: true },
            timeline: { component: button("timeline"), side: "bottom" },
            search: { component: button("search"), side: "top" },
          },
        }),
      ],
    });
    await nextTick();
    const panelsOn = (side: string) =>
      [
        ...root.querySelectorAll(
          `.plugin-panels[data-side="${side}"] .plugin-panel`,
        ),
      ].map((panel) => panel.getAttribute("data-panel"));
    expect(panelsOn("right")).toEqual(["tree", "graph"]);
    expect(panelsOn("left")).toEqual(["table"]);
    expect(panelsOn("top")).toEqual(["search"]);
    expect(panelsOn("bottom")).toEqual(["timeline"]);

    // A titled panel folds from its title bar; "graph" starts folded.
    const body = (id: string) =>
      root.querySelector<HTMLElement>(
        `[data-panel="${id}"] .plugin-panel-body`,
      )!;
    expect(body("graph").style.display).toBe("none");
    expect(body("table").style.display).toBe("");
    root
      .querySelector<HTMLButtonElement>(
        '[data-panel="table"] .plugin-panel-title',
      )!
      .click();
    await nextTick();
    expect(body("table").style.display).toBe("none");

    // hidden: ["tree"], disabled: ["table"]
    viewer.dispatch(fromBase64(HIDE_TREE_DISABLE_TABLE));
    await nextTick();
    expect(panelsOn("right")).toEqual(["graph"]);
    expect(
      root
        .querySelector('[data-panel="table"] .toolbar-slot')!
        .hasAttribute("inert"),
    ).toBe(true);
  });

  it("gives a plugin what another one offers", () => {
    let viewerOfB: PluginViewer | undefined;
    mount({
      plugins: [
        definePlugin({
          name: "b",
          setup: (viewer) => {
            viewerOfB = viewer;
          },
        }),
        definePlugin({ name: "a", api: { answer: 42 } }),
      ],
    });
    // Plugins set up in order, so B asks once A is there too.
    expect(viewerOfB!.plugin<{ answer: number }>("a")?.answer).toBe(42);
    expect(viewerOfB!.plugin("missing")).toBeUndefined();
  });

  it("shows notices from plugins and from Python, for a moment", async () => {
    vi.useFakeTimers();
    try {
      let pluginViewer: PluginViewer | undefined;
      const { root, viewer } = mount({
        plugins: [
          definePlugin({ name: "a", setup: (v) => void (pluginViewer = v) }),
        ],
      });
      pluginViewer!.notify("Drawn", { duration: 1000 });
      viewer.dispatch(fromBase64(NOTICE_SAVED));
      await nextTick();
      const notices = () =>
        // Leaving ones fade out first.
        [...root.querySelectorAll(".notice:not(.notice-leave-active)")].map(
          (notice) =>
            `${notice.getAttribute("data-kind")}: ${notice.textContent?.trim()}`,
        );
      expect(notices()).toEqual(["info: Drawn", "success: Saved"]);
      vi.advanceTimersByTime(1500);
      await nextTick();
      expect(notices()).not.toContain("info: Drawn");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("a failing plugin", () => {
  function sections(root: HTMLElement) {
    return [...root.querySelectorAll(".toolbar-section")].map((section) =>
      section.getAttribute("data-plugin"),
    );
  }

  function notices(root: HTMLElement) {
    return [...root.querySelectorAll(".notice")].map(
      (notice) =>
        `${notice.getAttribute("data-kind")}: ${notice.textContent?.trim()}`,
    );
  }

  function failing(errors: CompasViewerError[]): CompasViewerOptions {
    return { onError: (error) => errors.push(error) };
  }

  const ok = definePlugin({ name: "ok", groups: { g: { b: button("b") } } });

  it("is left out when it uses an id twice; the others still mount", async () => {
    const errors: CompasViewerError[] = [];
    const { root } = mount({
      ...failing(errors),
      plugins: [
        definePlugin({
          name: "a",
          groups: { g1: { x: button("x") }, x: { y: button("y") } },
        }),
        definePlugin({
          name: "p",
          groups: { g: { tree: button("tree") } },
          panels: { tree: button("tree") },
        }),
        ok,
      ],
    });
    await nextTick();
    expect(sections(root)).toEqual(["ok"]);
    expect(errors.map((error) => [error.code, error.details?.plugin])).toEqual([
      ["plugin_error", "a"],
      ["plugin_error", "p"],
    ]);
    expect(errors[0]!.message).toMatch(/"a" plugin uses the id "x" twice/);
    expect(errors[1]!.message).toMatch(/"tree" twice/);
    expect(notices(root)).toHaveLength(2);
  });

  it("is left out when its name is taken", async () => {
    const errors: CompasViewerError[] = [];
    const { root } = mount({
      ...failing(errors),
      plugins: [
        ok,
        definePlugin({ name: "ok", groups: { h: { c: button("c") } } }),
      ],
    });
    await nextTick();
    expect(root.querySelector(".toolbar-group")?.textContent).toBe("b");
    expect(errors[0]!.message).toMatch(/Two plugins are named "ok"/);
  });

  it("is left out when its setup throws", async () => {
    const errors: CompasViewerError[] = [];
    const { root } = mount({
      ...failing(errors),
      plugins: [
        definePlugin({
          name: "broken",
          groups: { g: { b: button("x") } },
          setup() {
            throw new Error("no scene");
          },
        }),
        ok,
      ],
    });
    await nextTick();
    expect(sections(root)).toEqual(["ok"]);
    expect(errors[0]!.cause).toEqual(new Error("no scene"));
    expect(notices(root)).toEqual([
      'error: The "broken" plugin was not loaded: its setup failed: no scene',
    ]);
  });

  it("does not keep a message from its other handlers", async () => {
    const errors: CompasViewerError[] = [];
    const received: unknown[] = [];
    const { root, viewer } = mount({
      ...failing(errors),
      plugins: [
        definePlugin({
          name: "camera",
          setup(v) {
            const channel = v.channel("camera");
            channel.on("views", () => {
              throw new Error("bad data");
            });
            channel.on("views", (data) => received.push(data));
          },
        }),
      ],
    });
    viewer.dispatch(fromBase64(CAMERA_VIEWS));
    await nextTick();
    expect(received).toEqual([{ names: ["View 1"] }]);
    expect(errors[0]!.message).toBe('The "camera" plugin failed on "views"');
    expect(notices(root)).toEqual([
      'error: The "camera" plugin failed on "views": bad data',
    ]);
  });

  it("component that throws is marked, and the rest still draws", async () => {
    const errors: CompasViewerError[] = [];
    const { root } = mount({
      ...failing(errors),
      plugins: [
        definePlugin({
          name: "a",
          groups: {
            g: {
              broken: defineComponent(() => {
                throw new Error("render");
              }),
              fine: button("fine"),
            },
          },
          panels: {
            panel: defineComponent(() => () => {
              throw new Error("panel");
            }),
          },
        }),
        ok,
      ],
    });
    await nextTick();
    expect(sections(root)).toEqual(["a", "ok"]);
    expect(
      [...root.querySelectorAll(".probe")].map((probe) => probe.textContent),
    ).toEqual(["fine", "b"]);
    expect(root.querySelectorAll(".toolbar-slot-failed")).toHaveLength(2);
    expect(errors.map((error) => error.message)).toEqual([
      `The "a" plugin's "broken" failed`,
      `The "a" plugin's "panel" failed`,
    ]);
  });
});
