// Scene management
export { setCameraViewPreset } from "./scene_manager";

// Transform operations
export { setTransformMode, deselectCurrentObject } from "./picker";

// Object visibility
export { hideObjectByGuid, showAllObjects } from "./object_visibility_manager";

// View capture and application
export { captureCurrentView, applySavedView, saveCurrentCanvasImage } from "./scene_view_manager";

// Theme
export { toggleTheme } from "./theme_manager";

// Types
export type { SavedView, ScreenshotFormat, ScreenshotOptions } from "./scene_view_manager";
