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
          buttons: [button("a1"), button("a2")],
        }),
        definePlugin({ name: "empty" }),
        definePlugin({ name: "b", buttons: [button("b1")] }),
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
            calls.push(`setup ${typeof context.setCameraView}`);
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
          buttons: [
            [button("a1"), button("a2")],
            button("a3"),
            button("a4"),
            [],
            [button("a5")],
          ],
        }),
      ],
    });
    const rows = [...root.querySelectorAll(".toolbar-section .toolbar-group")];
    expect(rows.map((row) => row.textContent)).toEqual(["a1a2", "a3a4", "a5"]);
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
          buttons: [
            defineComponent(() => {
              channel = useChannel("camera");
              channel.on("views", (data) => received.push(data));
              return () => h("button");
            }),
          ],
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
