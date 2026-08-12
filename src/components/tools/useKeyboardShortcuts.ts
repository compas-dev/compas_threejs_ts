import { onBeforeUnmount, onMounted } from "vue";
import { useViewerRuntime } from "@/viewer/viewer_context";

type ShortcutHandler = (event: KeyboardEvent) => void;

type ShortcutMap = Record<string, ShortcutHandler>;

function shouldIgnoreShortcut(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return true;
  }

  const target = event.target as HTMLElement | null;
  if (!target) {
    return false;
  }

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  return target.isContentEditable;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const { root } = useViewerRuntime();
  const handleKeyDown = (event: KeyboardEvent) => {
    if (shouldIgnoreShortcut(event)) {
      return;
    }

    const key = event.key.toLowerCase();
    const handler = shortcuts[key];
    if (!handler) {
      return;
    }

    event.preventDefault();
    handler(event);
  };

  onMounted(() => {
    root.addEventListener("keydown", handleKeyDown);
  });

  onBeforeUnmount(() => {
    root.removeEventListener("keydown", handleKeyDown);
  });
}
