<template>
  <div class="display-tools-wrapper">
    <div class="toolbar-group">
      <SaveViewButton
        :default-name="`View ${savedViews.length + 1}`"
        @saved="handleSavedView"
      />
      <SavedViewsButton
        :views="savedViews"
        :selected-view-id="selectedSavedViewId"
        @select="selectSavedView"
        @delete="deleteSavedView"
      />
      <SaveScreenshotButton />
      <ShowAllObjectsButton />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { SavedView } from "@/viewer/viewer_runtime";
import { useViewerRuntime } from "@/viewer/viewer_context";
import { useKeyboardShortcuts } from "@/components/tools/useKeyboardShortcuts";
import {
  SaveViewButton,
  SavedViewsButton,
  SaveScreenshotButton,
  ShowAllObjectsButton,
} from "./index";

const SAVED_VIEWS_STORAGE_KEY = "compas_threejs_saved_views";
const runtime = useViewerRuntime();

const savedViews = ref<SavedView[]>([]);
const selectedSavedViewId = ref<string>("");

function persistSavedViews() {
  localStorage.setItem(
    SAVED_VIEWS_STORAGE_KEY,
    JSON.stringify(savedViews.value),
  );
}

function loadSavedViewsFromStorage() {
  const raw = localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as SavedView[];
    if (Array.isArray(parsed)) {
      savedViews.value = parsed;
    }
  } catch {
    savedViews.value = [];
  }
}

function handleSavedView(view: SavedView) {
  savedViews.value = [...savedViews.value, view];
  selectedSavedViewId.value = view.id;
  persistSavedViews();
}

function requestSaveCurrentView() {
  const defaultName = `View ${savedViews.value.length + 1}`;
  const requestedName = window.prompt("Name for saved view", defaultName);
  if (requestedName === null) {
    return;
  }

  const name = requestedName.trim() || defaultName;
  const view = runtime.captureCurrentView(name);
  handleSavedView(view);
}

function selectSavedView(id: string) {
  selectedSavedViewId.value = id;

  const selected = savedViews.value.find((view) => view.id === id);
  if (!selected) {
    return;
  }

  runtime.applySavedView(selected);
}

function deleteSavedView(id: string) {
  const nextViews = savedViews.value.filter((view) => view.id !== id);
  savedViews.value = nextViews;

  if (selectedSavedViewId.value === id) {
    selectedSavedViewId.value = nextViews[0]?.id ?? "";
  }

  persistSavedViews();
}

onMounted(() => {
  loadSavedViewsFromStorage();
});

useKeyboardShortcuts({
  s: () => {
    requestSaveCurrentView();
  },
  f: () => {
    runtime.saveCurrentCanvasImage({ format: "png" });
  },
  d: () => {
    runtime.toggleTheme();
  },
});
</script>
