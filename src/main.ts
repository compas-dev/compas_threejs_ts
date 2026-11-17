import { workspaceId } from "./communications/viewer_connection";
import { createViewer, type ViewerPlugin } from "./library";

interface PluginEntry {
  name: string;
  module: string;
  style?: string;
}

// The Python App lists this workspace's plugins in plugins.json; each module's default export is a
// ViewerPlugin. Plugins import "vue", "three" and "@compas-dev/compas-threejs-ts"
// through index.html's import map, so they share this page's copies.
async function loadPlugins(): Promise<ViewerPlugin[]> {
  let entries: PluginEntry[] = [];
  try {
    const workspace = encodeURIComponent(workspaceId());
    const response = await fetch(`plugins.json?workspace=${workspace}`);
    if (response.ok) entries = (await response.json()) as PluginEntry[];
  } catch {
    return [];
  }
  const plugins: ViewerPlugin[] = [];
  for (const entry of entries) {
    if (entry.style) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = entry.style;
      document.head.append(link);
    }
    try {
      const url = new URL(entry.module, document.baseURI).href;
      const module = (await import(/* @vite-ignore */ url)) as {
        default: ViewerPlugin;
      };
      plugins.push(module.default);
    } catch (error) {
      console.error(`Unable to load the "${entry.name}" plugin`, error);
    }
  }
  return plugins;
}

const container = document.querySelector<HTMLElement>("#app");
if (!container) throw new Error("Standalone viewer requires an #app container");

void loadPlugins().then((plugins) =>
  createViewer(container, { mode: "websocket", plugins }),
);
