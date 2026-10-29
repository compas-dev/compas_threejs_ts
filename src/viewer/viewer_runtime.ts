import { decodeMessage } from "../communications/decode";
import {
  ViewerConnection,
  workspaceId,
} from "../communications/viewer_connection";
import {
  convertToThreeJSGeometry,
  matrix4FromRowMajor,
  UnsupportedCompasObjectError,
} from "../conversions";
import { lightToThree } from "../conversions/lights";
import { materialToThree } from "../conversions/material";
import { asCompasViewerError, CompasViewerError } from "../library/errors";
import type { CompasViewerOptions } from "../library/types";
import type { ViewerPlugin } from "../library/plugins";
import {
  parseViewerCommand,
  readGeometryGuid,
  readNonEmptyString,
  type CameraViewPreset,
  type CommandRecord,
  type HandleGeometryCommand,
  type LightCommand,
  type MaterialCommand,
  type ObjectActionCommand,
  type ObjectInfosCommand,
  type SceneCommand,
  type SpinnerCommand,
  type TextCommand,
  type TextTagCommand,
  type UiCommand,
  type ViewerCommand,
} from "./viewer_commands";
import {
  createViewerStore,
  type DynamicComponent,
  type NoticeKind,
  type ViewerStore,
} from "./viewer_store";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import {
  FontLoader,
  type Font,
} from "three/examples/jsm/loaders/FontLoader.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";

export type ViewPreset = CameraViewPreset;

/** Pointer handlers for a plugin that takes over input - see `beginInteraction`. */
export interface InteractionHandlers {
  onPointerDown?(event: MouseEvent): void;
  onPointerMove?(event: MouseEvent): void;
  onKeyDown?(event: KeyboardEvent): void;
  /** The viewer ended the session (another `beginInteraction`, or dispose). */
  onInterrupt?(): void;
}

export interface InteractionSession {
  /** False once released or interrupted. */
  readonly active: boolean;
  /** Gives input back to picking and shortcuts. Idempotent. */
  release(): void;
}

/** Where the camera is and what it looks at. */
export interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
  fov: number;
}

interface MaterialEntry {
  material: THREE.Material;
  materialType: string;
}

interface LightEntry {
  objects: THREE.Object3D[];
}

type RenderableObject = THREE.Object3D & {
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
};

const VIEW_PRESETS: Record<ViewPreset, THREE.Vector3> = {
  top: new THREE.Vector3(0, 0, 1),
  bottom: new THREE.Vector3(0, 0, -1),
  front: new THREE.Vector3(0, -1, 0),
  back: new THREE.Vector3(0, 1, 0),
  left: new THREE.Vector3(-1, 0, 0),
  right: new THREE.Vector3(1, 0, 0),
  front_left: new THREE.Vector3(-1, -1, 1),
  front_right: new THREE.Vector3(1, -1, 1),
  back_left: new THREE.Vector3(-1, 1, 1),
  back_right: new THREE.Vector3(1, 1, 1),
};

export class ViewerRuntime {
  readonly store: ViewerStore = createViewerStore();
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly labelRenderer = new CSS2DRenderer();
  readonly controls: OrbitControls;
  readonly geometries = new Map<string, THREE.Object3D>();
  /** The plugins it shows: those given, minus any that failed to set up. */
  readonly plugins: ViewerPlugin[];
  /** The workspace this viewer shows. */
  readonly workspace: string;

  private readonly materials = new Map<string, MaterialEntry>();
  private readonly geometryMaterials = new Map<string, string>();
  private readonly externalGeometryGuids = new WeakMap<
    THREE.Object3D,
    string
  >();
  private readonly lights = new Map<string, LightEntry>();
  private readonly fonts = new Map<string, Font>();
  private readonly axesHelper = new THREE.AxesHelper(5);
  private readonly defaultLights: THREE.Light[] = [];
  private readonly connection: ViewerConnection;
  private readonly raycaster = new THREE.Raycaster();
  private readonly onResize = () => this.resize();
  private readonly onPointerMove = (event: MouseEvent) =>
    this.interaction?.handlers.onPointerMove?.(event);
  private readonly onPointerDown = (event: MouseEvent) =>
    this.handlePointerDown(event);
  private readonly onKeyDown = (event: KeyboardEvent) =>
    this.handleKeyDown(event);
  private animationFrame: number | null = null;
  private attachedContainer: HTMLElement | null = null;
  private componentId = 0;
  private disposed = false;
  private pickedObject: THREE.Object3D | null = null;
  private pickedMaterial: THREE.Material | THREE.Material[] | null = null;
  private readonly hiddenGuids = new Set<string>();
  private readonly pluginHandlers = new Map<
    string,
    Set<(data: unknown) => void>
  >();
  // Plugin hooks: objects that can't be picked (e.g. locked), objects whose backend
  // updates wait (e.g. while a gizmo drags them), vetoes on picking, selection listeners,
  // plugin-owned scene objects, and how many plugins paused navigation.
  private noticeCount = 0;
  private readonly noticeTimers = new Set<ReturnType<typeof setTimeout>>();
  private readonly unpickableGuids = new Set<string>();
  /** Guids of objects outlined with their edges (`set_edges`), kept by guid so the
   * outline survives the backend re-sending the object. */
  private readonly edgedGuids = new Set<string>();
  private readonly heldGuids = new Map<string, number>();
  private readonly pickGuards = new Set<(event: MouseEvent) => boolean>();
  private readonly selectionListeners = new Set<
    (guid: string | null) => void
  >();
  private readonly overlays = new Set<THREE.Object3D>();
  private navigationPauses = 0;
  // The plugin session holding pointer/keyboard input, if any (beginInteraction).
  private interaction: {
    handlers: InteractionHandlers;
    active: boolean;
  } | null = null;
  private readonly resizeListeners = new Set<
    (size: { width: number; height: number }) => void
  >();
  private readonly highlightMaterial = new THREE.MeshStandardMaterial({
    color: "orange",
    emissive: "yellow",
    emissiveIntensity: 0.1,
  });

  constructor(
    readonly root: HTMLElement,
    private readonly options: CompasViewerOptions,
  ) {
    this.plugins = [...(options.plugins ?? [])];
    this.workspace = workspaceId(options.websocket);
    const { width, height } = this.getDimensions();
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(8, -15, 15);
    this.camera.layers.enable(1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.domElement.tabIndex = 0;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMappingExposure = 2.5;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.mouseButtons = {
      LEFT: null,
      MIDDLE: null,
      RIGHT: THREE.MOUSE.ROTATE,
    };

    this.labelRenderer.domElement.style.position = "absolute";
    this.labelRenderer.domElement.style.inset = "0";
    this.labelRenderer.domElement.style.pointerEvents = "none";
    this.scene.add(this.axesHelper);
    this.applyTheme("light");
    this.resize();

    this.connection = new ViewerConnection({
      ...options.websocket,
      ...(options.send === undefined ? {} : { send: options.send }),
      dispatch: (message) => this.dispatch(message),
      onError: (error) =>
        this.reportAsyncError(
          asCompasViewerError(
            error,
            "connection_error",
            "The viewer WebSocket connection failed",
          ),
        ),
    });
  }

  attach(container: HTMLElement): void {
    this.assertUsable();
    if (this.attachedContainer === container) return;
    this.attachedContainer = container;
    container.append(this.renderer.domElement, this.labelRenderer.domElement);
    window.addEventListener("resize", this.onResize);
    this.renderer.domElement.addEventListener("mousedown", this.onPointerDown);
    this.renderer.domElement.addEventListener("mousemove", this.onPointerMove);
    this.root.addEventListener("keydown", this.onKeyDown);
    if (this.options.defaultLighting) this.addDefaultLighting();
    if ((this.options.mode ?? "embedded") === "websocket") {
      try {
        this.connection.start();
      } catch (error) {
        this.reportOrThrow(
          asCompasViewerError(
            error,
            "connection_error",
            "Unable to start the viewer WebSocket connection",
          ),
        );
      }
    }
    this.startAnimation();
    this.resize();
  }

  dispatch(message: Uint8Array): void {
    this.assertUsable();
    let decoded: unknown;
    try {
      decoded = decodeMessage(message);
    } catch (error) {
      this.reportOrThrow(
        asCompasViewerError(
          error,
          "decode_error",
          "Unable to decode the COMPAS Protobuf message",
        ),
      );
      return;
    }

    try {
      this.dispatchObject(decoded);
    } catch (error) {
      const normalized =
        error instanceof UnsupportedCompasObjectError
          ? new CompasViewerError("unsupported_message", error.message, {
              cause: error,
              details: { objectType: error.objectType },
            })
          : asCompasViewerError(
              error,
              "render_error",
              "Unable to apply the viewer message",
            );
      this.reportOrThrow(normalized);
    }
  }

  send(message: unknown): boolean {
    return this.connection.send(message);
  }

  sendData(message: Record<string, unknown>): boolean {
    return this.send(message);
  }

  handleUiAction(action: string, value?: unknown): void {
    this.sendData({
      dispatch: "ui_callback",
      action,
      value: value ?? null,
    });
  }

  /** Sends `data` to the backend half of `plugin`, as its `action`. */
  sendToPlugin(plugin: string, action: string, data?: unknown): boolean {
    return this.sendData({
      dispatch: "plugin",
      plugin,
      action,
      data: data ?? null,
    });
  }

  /**
   * Shows `message` to the user for `duration` ms (by default longer for warnings
   * and errors); returns a function that takes it away sooner.
   */
  notify(
    message: string,
    options: { kind?: NoticeKind; duration?: number } = {},
  ): () => void {
    const kind = options.kind ?? "info";
    const duration =
      options.duration ??
      (kind === "warning" || kind === "error" ? 8000 : 4000);
    const id = ++this.noticeCount;
    this.store.notices.push({ id, message, kind });
    // At most a handful on screen: a flood of them drops the oldest.
    while (this.store.notices.length > 5) this.store.notices.shift();
    const dismiss = () => {
      clearTimeout(timer);
      this.noticeTimers.delete(timer);
      const index = this.store.notices.findIndex((notice) => notice.id === id);
      if (index >= 0) this.store.notices.splice(index, 1);
    };
    const timer = setTimeout(dismiss, duration);
    this.noticeTimers.add(timer);
    return dismiss;
  }

  /**
   * A plugin failed (to load, to set up, to draw, in a handler): reported like an
   * asynchronous error - to `onError`, else the console - and shown to the user. Never
   * throws, so the rest of the viewer carries on.
   */
  pluginFailed(plugin: string, message: string, cause?: unknown): void {
    this.reportAsyncError(
      new CompasViewerError("plugin_error", message, {
        cause,
        details: { plugin },
      }),
    );
    const reason = cause instanceof Error ? `: ${cause.message}` : "";
    this.notify(`${message}${reason}`, { kind: "error" });
  }

  /** Takes a plugin that failed to set up out of the viewer, before it mounts. */
  dropPlugin(plugin: ViewerPlugin): void {
    const index = this.plugins.indexOf(plugin);
    if (index >= 0) this.plugins.splice(index, 1);
  }

  /** Calls `handler` with the data of every `action` the backend sends to `plugin`. */
  onPluginMessage(
    plugin: string,
    action: string,
    handler: (data: unknown) => void,
  ): () => void {
    const key = `${plugin}/${action}`;
    let handlers = this.pluginHandlers.get(key);
    if (!handlers) {
      handlers = new Set();
      this.pluginHandlers.set(key, handlers);
    }
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }

  handleObjectAction(action: Record<string, unknown>, value?: unknown): void {
    this.sendData({
      dispatch: "object_action_callback",
      action_guid: action.guid,
      object_guid: action.objectGuid,
      value: value ?? null,
    });
  }

  /**
   * Asks the backend to create a new geometry object of `type` (e.g. "box", "sphere",
   * "point") with the given numeric `params`, spawned at the camera's current orbit
   * target so it appears in view. The backend constructs the real COMPAS object and
   * broadcasts it back via the existing add_geometry path - it arrives here exactly
   * like any object added by a running script, so no new receive-side handling is
   * needed. Pick it up with the transform gizmo afterwards to position it precisely.
   */
  createGeometry(type: string, params: Record<string, number>): void {
    const point = this.vectorData(this.controls.target);
    this.sendData({
      dispatch: "create_geometry",
      type,
      point: [point.x, point.y, point.z],
      params,
    });
  }

  /**
   * Reads the current color/metalness/roughness of the object at `guid`, for
   * pre-filling the material editor when it opens. Returns null if the object has no
   * material yet, or its material isn't a "standard_material" (e.g. a Point's
   * PointMaterial has an entirely different property set) - editing those is out of
   * scope for this control.
   */
  getMaterialSnapshot(
    guid: string,
  ): { color: string; metalness: number; roughness: number } | null {
    const materialGuid = this.geometryMaterials.get(guid);
    if (!materialGuid) return null;
    const entry = this.materials.get(materialGuid);
    if (!entry || entry.materialType !== "standard_material") return null;
    const material = entry.material as THREE.MeshStandardMaterial;
    return {
      color: `#${material.color.getHexString()}`,
      metalness: material.metalness,
      roughness: material.roughness,
    };
  }

  /**
   * Applies a material edit both locally (instant visual feedback on the live
   * THREE.Material - no need to wait for the backend round trip) and sends it to the
   * backend so the corresponding live Material Python instance is updated the same way,
   * e.g. via `examples/objects_action.py`'s "Make it blue" action.
   */
  setMaterial(
    guid: string,
    fields: { color?: string; metalness?: number; roughness?: number },
  ): void {
    const materialGuid = this.geometryMaterials.get(guid);
    const entry = materialGuid ? this.materials.get(materialGuid) : undefined;
    if (entry && entry.materialType === "standard_material") {
      const material = entry.material as THREE.MeshStandardMaterial;
      if (fields.color !== undefined) material.color.set(fields.color);
      if (fields.metalness !== undefined) material.metalness = fields.metalness;
      if (fields.roughness !== undefined) material.roughness = fields.roughness;
      // Show the edit right away instead of leaving it under the highlight.
      if (this.geometries.get(guid) === this.pickedObject) {
        this.revealPickedMaterial();
      }
    }
    this.sendData({ dispatch: "material_edit", guid, ...fields });
  }

  hideObjectInfo(): void {
    this.store.objectBarData.isVisible = false;
  }

  hideObjectByGuid(guid: string): void {
    const object = this.geometries.get(guid);
    if (!object) return;
    object.visible = false;
    this.hiddenGuids.add(guid);
  }

  showAllObjects(): void {
    for (const guid of this.hiddenGuids) {
      const object = this.geometries.get(guid);
      if (object) object.visible = true;
    }
    this.hiddenGuids.clear();
  }

  deselectObject(): void {
    this.clearPickedObject();
  }

  toggleTheme(): void {
    this.applyTheme(this.store.theme.value === "dark" ? "light" : "dark");
  }

  setCameraViewPreset(preset: ViewPreset): void {
    const direction = VIEW_PRESETS[preset].clone().normalize();
    const distance = this.camera.position.distanceTo(this.controls.target);
    this.camera.position.copy(
      this.controls.target.clone().add(direction.multiplyScalar(distance)),
    );
    this.controls.update();
  }

  getCamera(): CameraState {
    return {
      position: this.vectorData(this.camera.position),
      target: this.vectorData(this.controls.target),
      zoom: this.camera.zoom,
      fov: this.camera.fov,
    };
  }

  setCamera(state: Partial<CameraState>): void {
    const { position, target } = state;
    if (position) this.camera.position.set(position.x, position.y, position.z);
    if (target) this.controls.target.set(target.x, target.y, target.z);
    if (state.zoom !== undefined) this.camera.zoom = state.zoom;
    if (state.fov !== undefined) this.camera.fov = state.fov;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  /** Renders the current view into a new canvas of this size (default: the viewport's). */
  captureImage(
    options: { width?: number; height?: number } = {},
  ): HTMLCanvasElement {
    const source = this.renderer.domElement;
    const width = Math.max(16, Math.round(options.width ?? source.width));
    const height = Math.max(16, Math.round(options.height ?? source.height));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create an image canvas context");
    context.drawImage(source, 0, 0, width, height);
    return canvas;
  }

  setTheme(mode: "light" | "dark"): void {
    this.applyTheme(mode);
  }

  /** The scene object of a backend geometry, by guid. */
  object(guid: string): THREE.Object3D | undefined {
    return this.geometries.get(guid);
  }

  /** Whether clicking can pick this object (false while locked, say); unpicking a picked one deselects it. */
  setObjectPickable(guid: string, pickable: boolean): void {
    if (pickable) {
      this.unpickableGuids.delete(guid);
      return;
    }
    this.unpickableGuids.add(guid);
    if (this.store.pickedObjectGuid.value === guid) this.clearPickedObject();
  }

  /**
   * Tells the backend that the object moved by `matrix`: a row-major 4x4 delta from where
   * it was, as `compas.geometry.Transformation.from_matrix` expects.
   */
  commitObjectTransform(guid: string, matrix: number[][]): void {
    this.sendData({ dispatch: "object_transform", guid, matrix });
  }

  /**
   * Keeps backend updates of this object from rebuilding or moving it until released -
   * e.g. while a gizmo drags it, so an App.loop updating it doesn't fight the drag.
   */
  holdObjectUpdates(guid: string): () => void {
    this.heldGuids.set(guid, (this.heldGuids.get(guid) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const count = (this.heldGuids.get(guid) ?? 1) - 1;
      if (count > 0) this.heldGuids.set(guid, count);
      else this.heldGuids.delete(guid);
    };
  }

  /** Calls `listener` with the picked guid (or null) when it changes, or its object is rebuilt. */
  onSelectionChange(listener: (guid: string | null) => void): () => void {
    this.selectionListeners.add(listener);
    return () => {
      this.selectionListeners.delete(listener);
    };
  }

  /** A click picks nothing while `guard` returns true (e.g. with a gizmo handle under the pointer). */
  addPickGuard(guard: (event: MouseEvent) => boolean): () => void {
    this.pickGuards.add(guard);
    return () => {
      this.pickGuards.delete(guard);
    };
  }

  /** Adds a plugin-owned object to the scene; it is never picked, nor cleared by reset. */
  addOverlay(object: THREE.Object3D): () => void {
    this.overlays.add(object);
    this.scene.add(object);
    return () => {
      this.overlays.delete(object);
      this.scene.remove(object);
    };
  }

  /** The world-space ray under the pointer, or null while the canvas has no size. */
  pointerRay(event: { clientX: number; clientY: number }): THREE.Ray | null {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    const pointer = new THREE.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    return this.raycaster.ray.clone();
  }

  /** The visible backend objects, with their guids. */
  visibleObjects(): { guid: string; object: THREE.Object3D }[] {
    return Array.from(this.geometries)
      .filter(([, object]) => object.visible)
      .map(([guid, object]) => ({ guid, object }));
  }

  viewportSize(): { width: number; height: number } {
    return this.getDimensions();
  }

  addResizeListener(
    listener: (size: { width: number; height: number }) => void,
  ): () => void {
    this.resizeListeners.add(listener);
    return () => {
      this.resizeListeners.delete(listener);
    };
  }

  /**
   * Hands pointer and keyboard input to a plugin until the session is released: picking,
   * the viewer's own keys and every plugin's `useShortcuts` stand down, and events go to
   * `handlers`. Orbiting keeps working. Clears the selection and focuses the canvas (a
   * session is often started from a toolbar button, which would keep the keys). One
   * session at a time: beginning another interrupts the current one.
   */
  beginInteraction(handlers: InteractionHandlers): InteractionSession {
    this.interruptInteraction();
    this.clearPickedObject();
    this.renderer.domElement.focus({ preventScroll: true });
    const entry = { handlers, active: true };
    this.interaction = entry;
    this.store.interacting.value = true;
    return {
      get active() {
        return entry.active;
      },
      release: () => {
        if (!entry.active) return;
        entry.active = false;
        if (this.interaction === entry) {
          this.interaction = null;
          this.store.interacting.value = false;
        }
      },
    };
  }

  private interruptInteraction(): void {
    const current = this.interaction;
    if (!current) return;
    current.active = false;
    this.interaction = null;
    this.store.interacting.value = false;
    current.handlers.onInterrupt?.();
  }

  /** Stops camera navigation until every pause is released (e.g. during a gizmo drag). */
  pauseNavigation(): () => void {
    this.navigationPauses += 1;
    this.controls.enabled = false;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.navigationPauses -= 1;
      this.controls.enabled = this.navigationPauses === 0;
    };
  }

  reset(): void {
    this.clearPickedObject();
    for (const object of this.geometries.values()) {
      this.scene.remove(object);
      this.disposeObject(object);
    }
    this.geometries.clear();
    this.hiddenGuids.clear();
    this.edgedGuids.clear();
    this.clearLights();
    for (const entry of this.materials.values()) entry.material.dispose();
    this.materials.clear();
    this.geometryMaterials.clear();
    this.store.sidebarComponents.splice(0);
    this.store.objectActionsState.splice(0);
    this.store.objectBarData.data = null;
    this.store.objectBarData.isVisible = false;
    this.store.sideBarInfoState.data = null;
    this.store.sideBarInfoState.isVisible = false;
  }

  resize(): void {
    if (this.disposed) return;
    const { width, height } = this.getDimensions();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
    this.resizeListeners.forEach((listener) => listener({ width, height }));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.noticeTimers.forEach((timer) => clearTimeout(timer));
    this.noticeTimers.clear();
    this.connection.dispose();
    window.removeEventListener("resize", this.onResize);
    this.root.removeEventListener("keydown", this.onKeyDown);
    this.renderer.domElement.removeEventListener(
      "mousemove",
      this.onPointerMove,
    );
    this.interruptInteraction();
    this.resizeListeners.clear();
    this.renderer.domElement.removeEventListener(
      "mousedown",
      this.onPointerDown,
    );
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.clearPickedObject();
    this.resetAfterDispose();
    this.controls.dispose();
    this.overlays.forEach((object) => this.scene.remove(object));
    this.overlays.clear();
    this.scene.remove(this.axesHelper);
    this.disposeObject(this.axesHelper);
    this.clearDefaultLighting();
    this.highlightMaterial.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
    this.attachedContainer = null;
  }

  private dispatchObject(object: unknown): void {
    if (Array.isArray(object)) {
      object.forEach((item) => this.dispatchObject(item));
      return;
    }
    if (!object || typeof object !== "object") return;
    const record = object as CommandRecord;
    if (typeof record.dispatch === "string") {
      this.dispatchCommand(parseViewerCommand(record));
    } else if (record.bytes instanceof Uint8Array) {
      this.manageGeometry(record);
    } else {
      Object.values(record).forEach((item) => this.dispatchObject(item));
    }
  }

  private dispatchCommand(data: ViewerCommand): void {
    switch (data.dispatch) {
      case "material":
        this.manageMaterial(data);
        break;
      case "light":
        this.manageLight(data);
        break;
      case "scene":
        this.manageScene(data);
        break;
      case "theme":
        this.applyTheme(data.mode);
        break;
      case "ui":
        this.manageUi(data);
        break;
      case "text":
        void this.manageText(data).catch((error) =>
          this.reportAsyncError(
            asCompasViewerError(
              error,
              "render_error",
              "Unable to create text geometry",
              { dispatch: data.dispatch, guid: data.guid },
            ),
          ),
        );
        break;
      case "text_tag":
        this.manageTextTag(data);
        break;
      case "object_infos":
        this.store.objectBarData.data = this.orderedInfos(
          this.withoutDispatch(data),
        );
        break;
      case "object_action":
        this.manageObjectAction(data);
        break;
      case "handle_geometry":
        this.handleGeometry(data);
        break;
      case "spinner":
        this.manageSpinner(data);
        break;
      case "plugin_buttons":
        this.store.pluginButtons[data.plugin] = {
          hidden: data.hidden,
          disabled: data.disabled,
        };
        break;
      case "notice":
        this.notify(data.message, data.kind ? { kind: data.kind } : {});
        break;
      case "plugin":
        this.pluginHandlers
          .get(`${data.plugin}/${data.action}`)
          ?.forEach((handler) => {
            // One failing handler must not keep the message from the others.
            try {
              handler(data.data ?? null);
            } catch (error) {
              this.pluginFailed(
                data.plugin,
                `The "${data.plugin}" plugin failed on "${data.action}"`,
                error,
              );
            }
          });
        break;
    }
  }

  private manageGeometry(object: CommandRecord): void {
    const externalGuid = resolveExternalGeometryGuid(object);
    if (externalGuid) {
      if (this.heldGuids.has(externalGuid)) {
        // A plugin holds this object, e.g. the user is dragging it with a gizmo - drop this
        // incoming update instead of rebuilding it out from under them. This matters a lot
        // for a continuously self-animating object (e.g. a spinning torus with an `App.loop`
        // callback): its backend loop keeps calling update_geometry many times a second,
        // and every one of those would otherwise swap in a freshly-converted mesh sitting at
        // the backend's last-known (not-yet-moved) position, fighting the drag to a
        // standstill so it looks like the object "snaps back" on release. The next update
        // after the drag ends - the echo of our own object_transform, or the animation's
        // next tick - resyncs to the real backend state.
        return;
      }
    }
    const converted = convertToThreeJSGeometry(object);
    const sceneKey = externalGuid ?? converted.uuid;
    const existing = this.geometries.get(sceneKey);
    const wasSelected =
      existing !== undefined && existing === this.pickedObject;
    if (existing) {
      this.scene.remove(existing);
      this.disposeObject(existing);
    }
    if (externalGuid) {
      this.externalGeometryGuids.set(converted, externalGuid);
    }
    this.applyGeometryMaterial(sceneKey, converted);
    this.scene.add(converted);
    this.geometries.set(sceneKey, converted);
    if (this.store.showEdges.value || this.edgedGuids.has(sceneKey)) {
      this.setEdges(converted, true);
    }
    // If the replaced object was selected (e.g. this update is the echo of a gizmo edit
    // the user just made), carry the selection - its highlight - over to the newly-built
    // object, and tell the selection listeners (a gizmo re-attaches to it).
    if (wasSelected) {
      this.pickedObject = converted;
      if ("material" in converted) {
        const renderable = converted as RenderableObject;
        this.pickedMaterial = renderable.material ?? null;
        renderable.material = this.highlightMaterial;
      }
      this.notifySelection();
    }
  }

  private manageMaterial(data: MaterialCommand): void {
    const guid = data.guid;
    const geometryGuid = readGeometryGuid(data);
    const material = materialToThree(data);
    const previous = this.materials.get(guid)?.material;
    this.geometryMaterials.set(geometryGuid, guid);
    for (const [objectGuid, materialGuid] of this.geometryMaterials) {
      if (materialGuid !== guid) continue;
      const object = this.geometries.get(objectGuid);
      if (!object) continue;
      // A picked object wears the highlight, with its own material parked in
      // `pickedMaterial`. Swap the new material in for the parked one - not for
      // the highlight - so deselecting restores it rather than a stale one.
      const picked = object === this.pickedObject;
      if (picked) this.revealPickedMaterial();
      this.assignMaterial(object, material);
      if (picked) {
        this.pickedMaterial = (object as RenderableObject).material ?? null;
      }
    }
    this.materials.set(guid, {
      material,
      materialType: data.type,
    });
    previous?.dispose();
  }

  private manageLight(data: LightCommand): void {
    const guid = data.guid;
    const light = lightToThree(data);
    this.removeLight(guid);
    const objects: THREE.Object3D[] = [light];
    if (light instanceof Sky) {
      objects.push(
        new THREE.DirectionalLight(0xffffff, 1),
        new THREE.AmbientLight(0xffffff, 0.6),
      );
    } else if (light instanceof THREE.SpotLight) {
      objects.push(light.target);
    }
    objects.forEach((object) => this.scene.add(object));
    this.lights.set(guid, { objects });
  }

  private manageScene(data: SceneCommand): void {
    switch (data.type) {
      case "background_color":
        this.scene.background = new THREE.Color(data.color);
        break;
      case "controls_damping":
        this.controls.enableDamping = data.damping;
        break;
      case "world_axis":
        this.axesHelper.visible = data.show;
        break;
      case "picker":
        this.store.pickerEnabled.value = data.enabled;
        break;
      case "camera_fov":
        this.camera.fov = data.fov;
        this.camera.updateProjectionMatrix();
        break;
      case "camera_zoom":
        this.camera.zoom = data.zoom;
        this.camera.updateProjectionMatrix();
        break;
      case "camera_position":
        this.camera.position.set(data.x, data.y, data.z);
        this.controls.update();
        break;
      case "camera_target":
        this.controls.target.set(data.x, data.y, data.z);
        this.controls.update();
        break;
      case "camera_view":
        this.setCameraViewPreset(data.preset);
        break;
      case "show_edges":
        this.store.showEdges.value = data.show;
        break;
    }
  }

  private manageUi(data: UiCommand): void {
    const common = {
      id: ++this.componentId,
      action: data.guid,
      ...(data.label === undefined ? {} : { label: data.label }),
    };
    let component: DynamicComponent;
    switch (data.type) {
      case "button":
      case "load_json_button":
        component = {
          ...common,
          component: data.type === "button" ? "Button" : "LoadJsonButton",
          props: {
            text: data.text,
            variant: data.variant,
          },
        };
        break;
      case "slider":
        component = {
          ...common,
          component: "Slider",
          props: {
            min: data.min,
            max: data.max,
            step: data.step,
            defaultValue: [data.default_value],
          },
        };
        break;
      case "number_field":
        component = {
          ...common,
          component: "NumberField",
          props: {
            min: data.min,
            max: data.max,
            step: data.step,
            value: data.value,
          },
        };
        break;
      case "checkbox":
        component = {
          ...common,
          component: "Checkbox",
          props: {
            text: data.text,
            defaultValue: data.default_value,
          },
        };
        break;
      case "select":
        component = {
          ...common,
          component: "Select",
          props: {
            options: data.options,
            ...(data.placeholder === undefined
              ? {}
              : { placeholder: data.placeholder }),
            ...(data.default_value === undefined
              ? {}
              : { defaultValue: data.default_value }),
          },
        };
        break;
    }
    this.store.sidebarComponents.push(component);
    this.store.sideBarInfoState.isVisible = true;
  }

  private manageObjectAction(data: ObjectActionCommand): void {
    this.store.objectActionsState.push({
      guid: data.guid,
      type: data.type,
      objectGuid: data.object_guid,
      ...(data.label === undefined ? {} : { label: data.label }),
      ...(data.text === undefined ? {} : { text: data.text }),
      ...(data.options === undefined ? {} : { options: data.options }),
      ...(data.placeholder === undefined
        ? {}
        : { placeholder: data.placeholder }),
      ...(data.default_value === undefined
        ? {}
        : { defaultValue: data.default_value }),
    });
  }

  private manageSpinner(data: SpinnerCommand): void {
    this.store.spinnerState.visible = data.visible;
    this.store.spinnerState.message = data.visible
      ? (data.message ?? null)
      : null;
  }

  private handlePointerDown(event: MouseEvent): void {
    const interaction = this.interaction;
    if (!interaction) {
      this.pickFromPointer(event);
      return;
    }
    this.renderer.domElement.focus({ preventScroll: true });
    interaction.handlers.onPointerDown?.(event);
  }

  private pickFromPointer(event: MouseEvent): void {
    this.renderer.domElement.focus({ preventScroll: true });
    if (
      event.button !== 0 ||
      !this.store.pickerEnabled.value ||
      this.store.blockPicker.value ||
      [...this.pickGuards].some((guard) => guard(event))
    ) {
      return;
    }
    const bounds = this.renderer.domElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const pointer = new THREE.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.layers.set(0);
    this.raycaster.setFromCamera(pointer, this.camera);
    const visible = Array.from(this.geometries)
      .filter(
        ([guid, object]) => object.visible && !this.unpickableGuids.has(guid),
      )
      .map(([, object]) => object);
    const picked =
      this.raycaster.intersectObjects(visible, true)[0]?.object ?? null;
    if (!picked) {
      this.clearPickedObject();
      return;
    }

    this.clearPickedObject();
    this.pickedObject = picked;
    if ("material" in picked) {
      const renderable = picked as RenderableObject;
      this.pickedMaterial = renderable.material ?? null;
      renderable.material = this.highlightMaterial;
    }
    const guid = this.findGeometryGuid(picked);
    if (guid) {
      this.store.selectedObjectGuid.value = guid;
      this.sendData({ dispatch: "object_picked", guid });
    }
    this.store.pickedObjectGuid.value = guid ?? null;
    this.notifySelection();
  }

  private notifySelection(): void {
    const guid = this.store.pickedObjectGuid.value;
    this.selectionListeners.forEach((listener) => listener(guid));
  }

  /**
   * Shows the picked object's own material instead of the pick highlight, for
   * while that material is being edited. The object stays picked, and
   * `clearPickedObject` restores the same material.
   */
  private revealPickedMaterial(): void {
    if (
      this.pickedObject &&
      this.pickedMaterial &&
      "material" in this.pickedObject
    ) {
      (this.pickedObject as RenderableObject).material = this.pickedMaterial;
    }
  }

  private clearPickedObject(): void {
    if (
      this.pickedObject &&
      this.pickedMaterial &&
      "material" in this.pickedObject
    ) {
      (this.pickedObject as RenderableObject).material = this.pickedMaterial;
    }
    const hadSelection = this.pickedObject !== null;
    this.pickedObject = null;
    this.pickedMaterial = null;
    this.store.pickedObjectGuid.value = null;
    this.store.objectBarData.data = null;
    this.store.objectActionsState.splice(0);
    this.store.selectedObjectGuid.value = null;
    if (hadSelection) this.notifySelection();
  }

  private findGeometryGuid(object: THREE.Object3D): string | undefined {
    let current: THREE.Object3D | null = object;
    while (current) {
      for (const candidate of this.geometries.values()) {
        if (candidate === current) {
          return this.externalGeometryGuids.get(candidate);
        }
      }
      current = current.parent;
    }
    return undefined;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // A plugin session gets every key, so e.g. Escape ends its tool rather than
    // clearing a stale pick.
    if (this.interaction) {
      this.interaction.handlers.onKeyDown?.(event);
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Escape") {
      this.clearPickedObject();
    } else if (event.key.toLowerCase() === "i") {
      this.store.objectBarData.isVisible = !this.store.objectBarData.isVisible;
    }
  }

  private manageTextTag(data: TextTagCommand): void {
    const guid = data.guid;
    const element = document.createElement("div");
    element.className = "text-tag";
    element.textContent = data.text;
    if (data.color) element.style.color = data.color;
    const tag = new CSS2DObject(element);
    tag.position.set(data.x, data.y, data.z);
    const existing = this.geometries.get(guid);
    if (existing) this.scene.remove(existing);
    this.scene.add(tag);
    this.geometries.set(guid, tag);
  }

  private async manageText(data: TextCommand): Promise<void> {
    const fontName = data.font ?? "helvetiker";
    const fontWeight = data.weight ?? "regular";
    const cacheKey = `${fontName}_${fontWeight}`;
    let font = this.fonts.get(cacheKey);
    if (!font) {
      font = await new FontLoader().loadAsync(
        `/fonts/${cacheKey}.typeface.json`,
      );
      this.fonts.set(cacheKey, font);
    }

    const geometry = new TextGeometry(data.text, {
      font,
      size: data.size,
      depth: data.depth,
    });
    if (data.centered) {
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox;
      if (bounds)
        geometry.translate(-0.5 * (bounds.max.x - bounds.min.x), 0, 0);
    }

    const direction = new THREE.Vector3(
      data.direction_x,
      data.direction_y,
      data.direction_z,
    ).normalize();
    const up = new THREE.Vector3(data.up_x, data.up_y, data.up_z).normalize();
    const normal = new THREE.Vector3().crossVectors(direction, up).normalize();
    const transform = new THREE.Matrix4().makeBasis(direction, up, normal);
    transform.setPosition(data.point_x, data.point_y, data.point_z);

    const guid = data.guid;
    const materialGuid = this.geometryMaterials.get(guid);
    const material = materialGuid
      ? this.materials.get(materialGuid)?.material
      : new THREE.MeshStandardMaterial({
          color: 0x00ffff,
          side: THREE.DoubleSide,
        });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.applyMatrix4(transform);
    const existing = this.geometries.get(guid);
    if (existing) {
      this.scene.remove(existing);
      this.disposeObject(existing);
    }
    this.scene.add(mesh);
    this.geometries.set(guid, mesh);
  }

  private handleGeometry(data: HandleGeometryCommand): void {
    const guid = data.guid;
    const object = this.geometries.get(guid);
    if (!object) return;
    // A picked object that goes away (or out of sight) is deselected first, so the
    // selection's listeners (e.g. a gizmo) let go of it.
    const hides =
      data.type === "remove" ||
      (data.type === "set_visibility" && !data.visible) ||
      (data.type === "toggle_visibility" && object.visible);
    if (hides && object === this.pickedObject) this.clearPickedObject();
    if (data.type === "remove") {
      this.scene.remove(object);
      this.disposeObject(object);
      this.geometries.delete(guid);
      this.geometryMaterials.delete(guid);
      this.hiddenGuids.delete(guid);
      this.edgedGuids.delete(guid);
    } else if (data.type === "set_visibility") {
      object.visible = data.visible;
    } else if (data.type === "toggle_visibility") {
      object.visible = !object.visible;
    } else if (data.type === "apply_transform") {
      if (this.heldGuids.has(guid)) {
        // Same reasoning as manageGeometry's guard above: don't fight a live gizmo
        // drag with a backend-driven transform arriving mid-drag (e.g. an App.loop
        // callback transforming this same object every frame).
        return;
      }
      object.applyMatrix4(matrix4FromRowMajor(data.matrix));
    } else if (data.type === "set_edges") {
      if (data.show) this.edgedGuids.add(guid);
      else this.edgedGuids.delete(guid);
      this.setEdges(object, data.show || this.store.showEdges.value);
    }
  }

  /** Adds (or removes) `object`'s edge outline: a non-pickable overlay child
   * (layer 1), as see-through as the object itself. */
  private setEdges(object: THREE.Object3D, show: boolean): void {
    const existing = object.children.find((child) => child.userData.edges);
    if (!show) {
      if (existing) {
        object.remove(existing);
        this.disposeObject(existing);
      }
      return;
    }
    if (existing || !(object instanceof THREE.Mesh)) return;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(object.geometry),
      new THREE.LineBasicMaterial({ color: 0x000000 }),
    );
    edges.userData.edges = true;
    edges.layers.set(1);
    object.add(edges);
    this.syncEdges(object);
  }

  /** Keeps an edge outline as see-through as its object's material. */
  private syncEdges(object: THREE.Object3D): void {
    const edges = object.children.find((child) => child.userData.edges);
    const material = (object as THREE.Mesh).material;
    if (
      !(edges instanceof THREE.LineSegments) ||
      !material ||
      Array.isArray(material)
    )
      return;
    const line = edges.material as THREE.LineBasicMaterial;
    line.transparent = material.transparent;
    line.opacity = material.transparent ? material.opacity : 1;
    line.needsUpdate = true;
  }

  private applyGeometryMaterial(guid: string, object: THREE.Object3D): void {
    const materialGuid = this.geometryMaterials.get(guid);
    const material = materialGuid
      ? this.materials.get(materialGuid)?.material
      : undefined;
    if (material) {
      this.assignMaterial(object, material);
    } else if (object instanceof THREE.AxesHelper) {
      // Preserve the helper's per-axis vertex colors.
      return;
    } else if (object instanceof THREE.Mesh) {
      this.replaceMaterial(
        object,
        new THREE.MeshStandardMaterial({
          color: 0x0092d2,
          roughness: 0.7,
          metalness: 0.05,
        }),
      );
    } else if (object instanceof THREE.Line) {
      this.replaceMaterial(
        object,
        new THREE.LineBasicMaterial({ color: 0x0092d2 }),
      );
    } else if (object instanceof THREE.Points) {
      this.replaceMaterial(
        object,
        new THREE.PointsMaterial({
          color: 0x0092d2,
          size: 0.5,
        }),
      );
    } else if (object instanceof THREE.ArrowHelper) {
      object.setColor(0x0092d2);
    }
  }

  private assignMaterial(
    object: THREE.Object3D,
    material: THREE.Material,
  ): void {
    if (object instanceof THREE.AxesHelper) return;
    if (object instanceof THREE.Mesh) {
      this.replaceMaterial(object, material);
      this.syncEdges(object);
    } else if (object instanceof THREE.Line) {
      this.replaceMaterial(
        object,
        material instanceof THREE.LineBasicMaterial
          ? material
          : new THREE.LineBasicMaterial({
              color: this.materialColor(material),
            }),
      );
    } else if (object instanceof THREE.Points) {
      this.replaceMaterial(
        object,
        material instanceof THREE.PointsMaterial
          ? material
          : new THREE.PointsMaterial({
              color: this.materialColor(material),
              size: 0.5,
            }),
      );
    } else if (object instanceof THREE.ArrowHelper) {
      object.setColor(this.materialColor(material));
    }
  }

  private replaceMaterial(
    object: RenderableObject,
    material: THREE.Material | THREE.Material[],
  ): void {
    const previous = object.material;
    object.material = material;
    const materials = Array.isArray(previous) ? previous : [previous];
    for (const replaced of materials) {
      if (replaced && !this.includesMaterial(material, replaced)) {
        this.disposeUnregisteredMaterial(replaced);
      }
    }
  }

  private includesMaterial(
    material: THREE.Material | THREE.Material[],
    candidate: THREE.Material,
  ): boolean {
    return Array.isArray(material)
      ? material.includes(candidate)
      : material === candidate;
  }

  private materialColor(material: THREE.Material): THREE.Color {
    return "color" in material && material.color instanceof THREE.Color
      ? material.color
      : new THREE.Color(0x0092d2);
  }

  private applyTheme(mode: "light" | "dark"): void {
    this.store.theme.value = mode;
    this.scene.background = new THREE.Color(
      mode === "dark" ? 0x000000 : 0xe6e6e6,
    );
  }

  private addDefaultLighting(): void {
    if (this.defaultLights.length) return;
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(30, -10, 30);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-30, -20, 30);
    const rim = new THREE.DirectionalLight(0xffffff, 0.5);
    rim.position.set(-30, 20, 10);
    const lights: THREE.Light[] = [
      key,
      fill,
      rim,
      new THREE.AmbientLight(0xffffff, 0.5),
    ];
    lights.forEach((light) => this.scene.add(light));
    this.defaultLights.push(...lights);
  }

  private removeLight(guid: string): void {
    const entry = this.lights.get(guid);
    if (!entry) return;
    entry.objects.forEach((object) => {
      this.scene.remove(object);
      this.disposeObject(object);
    });
    this.lights.delete(guid);
  }

  private clearLights(): void {
    for (const guid of this.lights.keys()) this.removeLight(guid);
  }

  private clearDefaultLighting(): void {
    for (const light of this.defaultLights) {
      this.scene.remove(light);
      this.disposeObject(light);
    }
    this.defaultLights.splice(0);
  }

  private startAnimation(): void {
    if (this.animationFrame !== null) return;
    const render = () => {
      if (this.disposed) return;
      this.animationFrame = requestAnimationFrame(render);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);
    };
    render();
  }

  private getDimensions(): { width: number; height: number } {
    const bounds = this.root.getBoundingClientRect();
    return {
      width: Math.max(
        1,
        Math.round(bounds.width || this.root.clientWidth || window.innerWidth),
      ),
      height: Math.max(
        1,
        Math.round(
          bounds.height || this.root.clientHeight || window.innerHeight,
        ),
      ),
    };
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Light) child.dispose();
      const renderable = child as RenderableObject;
      renderable.geometry?.dispose();
      if (Array.isArray(renderable.material)) {
        renderable.material.forEach((material) =>
          this.disposeUnregisteredMaterial(material),
        );
      } else {
        this.disposeUnregisteredMaterial(renderable.material);
      }
    });
  }

  private disposeUnregisteredMaterial(
    material: THREE.Material | undefined,
  ): void {
    if (!material) return;
    const registered = Array.from(this.materials.values()).some(
      (entry) => entry.material === material,
    );
    if (!registered && material !== this.highlightMaterial) {
      material.dispose();
    }
  }

  private resetAfterDispose(): void {
    for (const object of this.geometries.values()) this.disposeObject(object);
    this.geometries.clear();
    this.hiddenGuids.clear();
    this.edgedGuids.clear();
    this.clearLights();
    for (const entry of this.materials.values()) entry.material.dispose();
    this.materials.clear();
    this.geometryMaterials.clear();
  }

  private vectorData(vector: THREE.Vector3): {
    x: number;
    y: number;
    z: number;
  } {
    return { x: vector.x, y: vector.y, z: vector.z };
  }

  private withoutDispatch(data: ObjectInfosCommand): Record<string, unknown> {
    const { dispatch: _dispatch, ...rest } = data;
    return rest;
  }

  /**
   * The metadata fields in the order the backend gave them: they arrive as a protobuf
   * map, which doesn't keep it, so the backend sends it along as `__order__`. Fields it
   * doesn't list follow, as they came.
   */
  private orderedInfos(data: Record<string, unknown>): Record<string, unknown> {
    const { __order__: order, ...fields } = data;
    if (!Array.isArray(order)) return fields;
    const ordered: Record<string, unknown> = {};
    for (const key of order) {
      if (typeof key === "string" && key in fields) ordered[key] = fields[key];
    }
    return { ...ordered, ...fields };
  }

  private reportOrThrow(error: CompasViewerError): void {
    if (this.options.onError) this.options.onError(error);
    else throw error;
  }

  private reportAsyncError(error: CompasViewerError): void {
    if (this.options.onError) this.options.onError(error);
    else console.error(error);
  }

  private assertUsable(): void {
    if (this.disposed) {
      throw new CompasViewerError(
        "lifecycle_error",
        "The COMPAS viewer has been disposed",
      );
    }
  }
}

function resolveExternalGeometryGuid(
  object: CommandRecord,
): string | undefined {
  if (object.guid === undefined || object.guid === "") return undefined;
  return readNonEmptyString(object, "guid");
}
