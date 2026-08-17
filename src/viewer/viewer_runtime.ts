import { decodeMessage } from "../communications/decode";
import { ViewerConnection } from "../communications/viewer_connection";
import {
  convertToThreeJSGeometry,
  UnsupportedCompasObjectError,
} from "../conversions";
import { lightToThree } from "../conversions/lights";
import { materialToThree } from "../conversions/material";
import { asCompasViewerError, CompasViewerError } from "../library/errors";
import type { CompasViewerOptions } from "../library/types";
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
  type TextCommand,
  type TextTagCommand,
  type UiCommand,
  type ViewerCommand,
} from "./viewer_commands";
import {
  createViewerStore,
  type DynamicComponent,
  type ViewerStore,
} from "./viewer_store";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
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

export interface SavedView {
  id: string;
  name: string;
  cameraPosition: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
  fov: number;
}

export type ScreenshotFormat = "png" | "jpg" | "webp";

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  format?: ScreenshotFormat;
  fileName?: string;
  quality?: number;
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
  private readonly transformControls: TransformControls;
  private readonly transformHelper: THREE.Object3D;
  private readonly onResize = () => this.resize();
  private readonly onPointerDown = (event: MouseEvent) =>
    this.pickFromPointer(event);
  private readonly onKeyDown = (event: KeyboardEvent) =>
    this.handleKeyDown(event);
  private animationFrame: number | null = null;
  private attachedContainer: HTMLElement | null = null;
  private componentId = 0;
  private disposed = false;
  private pickedObject: THREE.Object3D | null = null;
  private pickedMaterial: THREE.Material | THREE.Material[] | null = null;
  private readonly highlightMaterial = new THREE.MeshStandardMaterial({
    color: "orange",
    emissive: "yellow",
    emissiveIntensity: 0.1,
  });

  constructor(
    readonly root: HTMLElement,
    private readonly options: CompasViewerOptions,
  ) {
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
    this.transformControls = new TransformControls(
      this.camera,
      this.renderer.domElement,
    );
    this.transformHelper = this.transformControls.getHelper();
    this.transformControls.addEventListener("dragging-changed", (event) => {
      this.controls.enabled = !event.value;
    });
    this.scene.add(this.transformHelper);

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

  handleObjectAction(action: Record<string, unknown>, value?: unknown): void {
    this.sendData({
      dispatch: "object_action_callback",
      action_guid: action.guid,
      object_guid: action.objectGuid,
      value: value ?? null,
    });
  }

  hideObjectInfo(): void {
    this.store.objectBarData.isVisible = false;
  }

  setTransformMode(mode: "translate" | "rotate" | "scale"): void {
    this.store.pickerMode.value = mode;
    this.transformControls.setMode(mode);
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

  captureCurrentView(name: string): SavedView {
    return {
      id: `view-${Date.now()}`,
      name,
      cameraPosition: this.vectorData(this.camera.position),
      target: this.vectorData(this.controls.target),
      zoom: this.camera.zoom,
      fov: this.camera.fov,
    };
  }

  applySavedView(view: SavedView): void {
    this.camera.position.set(
      view.cameraPosition.x,
      view.cameraPosition.y,
      view.cameraPosition.z,
    );
    this.controls.target.set(view.target.x, view.target.y, view.target.z);
    this.camera.zoom = view.zoom;
    this.camera.fov = view.fov;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  saveCurrentCanvasImage(options: ScreenshotOptions = {}): void {
    const format = options.format ?? "png";
    const mimeType = format === "jpg" ? "image/jpeg" : `image/${format}`;
    const extension = format;
    const width = Math.max(
      16,
      Math.round(options.width ?? this.renderer.domElement.width),
    );
    const height = Math.max(
      16,
      Math.round(options.height ?? this.renderer.domElement.height),
    );
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create screenshot canvas context");
    if (format === "jpg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(this.renderer.domElement, 0, 0, width, height);
    const link = document.createElement("a");
    link.download =
      options.fileName ?? `compas-view-${Date.now()}.${extension}`;
    link.href = canvas.toDataURL(mimeType, options.quality);
    link.click();
  }

  reset(): void {
    this.clearPickedObject();
    for (const object of this.geometries.values()) {
      this.scene.remove(object);
      this.disposeObject(object);
    }
    this.geometries.clear();
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
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.connection.dispose();
    window.removeEventListener("resize", this.onResize);
    this.root.removeEventListener("keydown", this.onKeyDown);
    this.renderer.domElement.removeEventListener(
      "mousedown",
      this.onPointerDown,
    );
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.clearPickedObject();
    this.resetAfterDispose();
    this.controls.dispose();
    this.transformControls.detach();
    this.transformControls.dispose();
    this.scene.remove(this.transformHelper);
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
        this.store.objectBarData.data = this.withoutDispatch(data);
        break;
      case "object_action":
        this.manageObjectAction(data);
        break;
      case "handle_geometry":
        this.handleGeometry(data);
        break;
    }
  }

  private manageGeometry(object: CommandRecord): void {
    const converted = convertToThreeJSGeometry(object);
    const externalGuid = resolveExternalGeometryGuid(object);
    const sceneKey = externalGuid ?? converted.uuid;
    const existing = this.geometries.get(sceneKey);
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
    if (this.store.showEdges.value && converted instanceof THREE.Mesh) {
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(converted.geometry),
        new THREE.LineBasicMaterial({ color: 0x000000 }),
      );
      edges.layers.set(1);
      converted.add(edges);
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
      if (object) this.assignMaterial(object, material);
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

  private pickFromPointer(event: MouseEvent): void {
    this.renderer.domElement.focus({ preventScroll: true });
    if (
      event.button !== 0 ||
      !this.store.pickerEnabled.value ||
      this.store.blockPicker.value ||
      this.transformControls.dragging
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
    const visible = Array.from(this.geometries.values()).filter(
      (object) => object.visible,
    );
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
    this.transformControls.attach(picked);
    const guid = this.findGeometryGuid(picked);
    if (guid) this.sendData({ dispatch: "object_picked", guid });
  }

  private clearPickedObject(): void {
    if (
      this.pickedObject &&
      this.pickedMaterial &&
      "material" in this.pickedObject
    ) {
      (this.pickedObject as RenderableObject).material = this.pickedMaterial;
    }
    this.pickedObject = null;
    this.pickedMaterial = null;
    this.transformControls.detach();
    this.store.objectBarData.data = null;
    this.store.objectActionsState.splice(0);
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
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Escape") {
      this.clearPickedObject();
    } else if (event.key.toLowerCase() === "p") {
      this.store.pickerEnabled.value = !this.store.pickerEnabled.value;
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
    if (data.type === "remove") {
      this.scene.remove(object);
      this.disposeObject(object);
      this.geometries.delete(guid);
      this.geometryMaterials.delete(guid);
    } else if (data.type === "set_visibility") {
      object.visible = data.visible;
    } else if (data.type === "toggle_visibility") {
      object.visible = !object.visible;
    }
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
    if (object instanceof THREE.Mesh) this.replaceMaterial(object, material);
    else if (object instanceof THREE.Line) {
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
