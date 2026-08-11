import { decodeMessage } from "../communications/decode";
import { ViewerConnection } from "../communications/viewer_connection";
import { convertToThreeJSGeometry } from "../conversions";
import { ligthtToThree } from "../conversions/lights";
import { materialToThree } from "../conversions/material";
import type { CompasViewerOptions } from "../library/types";
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

export type ViewPreset =
  | "top"
  | "bottom"
  | "front"
  | "back"
  | "left"
  | "right"
  | "front_left"
  | "front_right"
  | "back_left"
  | "back_right";

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
      send: options.send,
      dispatch: (message) => this.dispatch(message),
      onError: (error) => this.reportError(error),
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
    if ((this.options.mode ?? "embedded") === "websocket")
      this.connection.start();
    this.startAnimation();
    this.resize();
  }

  dispatch(message: Uint8Array): void {
    this.assertUsable();
    try {
      this.dispatchObject(decodeMessage(message));
    } catch (error) {
      const normalized =
        error instanceof Error ? error : new Error(String(error));
      if (this.options.onError) this.options.onError(normalized);
      else throw normalized;
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
    this.scene.remove(this.transformHelper);
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
    const record = object as Record<string, unknown>;
    if (typeof record.dispatch === "string") {
      this.dispatchCommand(record);
    } else if (
      record.bytes instanceof Uint8Array &&
      typeof record.guid === "string"
    ) {
      this.manageGeometry(record);
    } else {
      Object.values(record).forEach((item) => this.dispatchObject(item));
    }
  }

  private dispatchCommand(data: Record<string, unknown>): void {
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
        this.applyTheme(data.mode === "dark" ? "dark" : "light");
        break;
      case "ui":
        this.manageUi(data);
        break;
      case "text":
        void this.manageText(data).catch((error) =>
          this.reportError(
            error instanceof Error ? error : new Error(String(error)),
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
      default:
        console.warn("Unknown dispatch value:", data.dispatch);
    }
  }

  private manageGeometry(object: Record<string, unknown>): void {
    const guid = String(object.guid);
    const converted = convertToThreeJSGeometry(object);
    const existing = this.geometries.get(guid);
    if (existing) {
      this.scene.remove(existing);
      this.disposeObject(existing);
    }
    this.applyGeometryMaterial(guid, converted);
    this.scene.add(converted);
    this.geometries.set(guid, converted);
    if (this.store.showEdges.value && converted instanceof THREE.Mesh) {
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(converted.geometry),
        new THREE.LineBasicMaterial({ color: 0x000000 }),
      );
      edges.layers.set(1);
      converted.add(edges);
    }
  }

  private manageMaterial(data: Record<string, unknown>): void {
    const guid = String(data.guid ?? "");
    const geometryGuid = String(
      data.geometry_guid ?? data.geometryBackendGuid ?? "",
    );
    const material = materialToThree(data as never);
    if (!guid || !geometryGuid || !material) return;
    this.materials.get(guid)?.material.dispose();
    this.materials.set(guid, {
      material,
      materialType: String(data.type ?? "unknown"),
    });
    this.geometryMaterials.set(geometryGuid, guid);
    const object = this.geometries.get(geometryGuid);
    if (object) this.assignMaterial(object, material);
  }

  private manageLight(data: Record<string, unknown>): void {
    const guid = String(data.guid ?? "");
    const light = ligthtToThree(data as never);
    if (!guid || !light) return;
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

  private manageScene(data: Record<string, unknown>): void {
    switch (data.type) {
      case "background_color":
        this.scene.background = new THREE.Color(String(data.color));
        break;
      case "controls_damping":
        this.controls.enableDamping = Boolean(data.damping);
        break;
      case "world_axis":
        this.axesHelper.visible = Boolean(data.show);
        break;
      case "picker":
        this.store.pickerEnabled.value = Boolean(data.enabled);
        break;
      case "camera_fov":
        this.camera.fov = Number(data.fov);
        this.camera.updateProjectionMatrix();
        break;
      case "camera_zoom":
        this.camera.zoom = Number(data.zoom);
        this.camera.updateProjectionMatrix();
        break;
      case "camera_position":
        this.camera.position.set(
          Number(data.x),
          Number(data.y),
          Number(data.z),
        );
        this.controls.update();
        break;
      case "camera_target":
        this.controls.target.set(
          Number(data.x),
          Number(data.y),
          Number(data.z),
        );
        this.controls.update();
        break;
      case "camera_view":
        this.setCameraViewPreset(data.preset as ViewPreset);
        break;
      case "show_edges":
        this.store.showEdges.value = Boolean(data.show);
        break;
      default:
        console.warn("Unknown scene update type:", data.type);
    }
  }

  private manageUi(data: Record<string, unknown>): void {
    const type = String(data.type);
    const common = {
      id: ++this.componentId,
      label: data.label as string | undefined,
      action: String(data.guid ?? ""),
    };
    let component: DynamicComponent | null = null;
    if (type === "button" || type === "load_json_button") {
      component = {
        ...common,
        component: type === "button" ? "Button" : "LoadJsonButton",
        props: {
          text: String(data.text ?? ""),
          variant: String(data.variant ?? "secondary"),
        },
      } as DynamicComponent;
    } else if (type === "slider") {
      component = {
        ...common,
        component: "Slider",
        props: {
          min: Number(data.min),
          max: Number(data.max),
          step: Number(data.step),
          defaultValue: [Number(data.default_value)],
        },
      };
    } else if (type === "number_field") {
      component = {
        ...common,
        component: "NumberField",
        props: {
          min: Number(data.min),
          max: Number(data.max),
          step: Number(data.step),
          value: [Number(data.value)],
        },
      };
    } else if (type === "checkbox") {
      component = {
        ...common,
        component: "Checkbox",
        props: {
          text: String(data.text ?? ""),
          defaultValue: Boolean(data.default_value),
        },
      };
    } else if (type === "select") {
      component = {
        ...common,
        component: "Select",
        props: {
          options: (data.options as string[]) ?? [],
          placeholder: data.placeholder as string | undefined,
          defaultValue: data.default_value as string | undefined,
        },
      };
    }
    if (component) {
      this.store.sidebarComponents.push(component);
      this.store.sideBarInfoState.isVisible = true;
    }
  }

  private manageObjectAction(data: Record<string, unknown>): void {
    this.store.objectActionsState.push({
      guid: String(data.guid ?? ""),
      label: data.label as string | undefined,
      type: String(data.type ?? ""),
      objectGuid: String(data.object_guid ?? ""),
      text: data.text as string | undefined,
      options: data.options as string[] | undefined,
      placeholder: data.placeholder as string | undefined,
      defaultValue: data.default_value,
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
      for (const [guid, candidate] of this.geometries) {
        if (candidate === current) return guid;
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

  private manageTextTag(data: Record<string, unknown>): void {
    const guid = String(data.guid ?? "");
    const element = document.createElement("div");
    element.className = "text-tag";
    element.textContent = String(data.text ?? "");
    if (data.color) element.style.color = String(data.color);
    const tag = new CSS2DObject(element);
    tag.position.set(Number(data.x), Number(data.y), Number(data.z));
    const existing = this.geometries.get(guid);
    if (existing) this.scene.remove(existing);
    this.scene.add(tag);
    this.geometries.set(guid, tag);
  }

  private async manageText(data: Record<string, unknown>): Promise<void> {
    if (data.type !== "text_geometry") return;
    const fontName = String(data.font ?? "helvetiker");
    const fontWeight = String(data.weight ?? "regular");
    const cacheKey = `${fontName}_${fontWeight}`;
    let font = this.fonts.get(cacheKey);
    if (!font) {
      font = await new FontLoader().loadAsync(
        `/fonts/${cacheKey}.typeface.json`,
      );
      this.fonts.set(cacheKey, font);
    }

    const geometry = new TextGeometry(String(data.text ?? ""), {
      font,
      size: Number(data.size),
      depth: Number(data.depth),
    });
    if (data.centered) {
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox;
      if (bounds)
        geometry.translate(-0.5 * (bounds.max.x - bounds.min.x), 0, 0);
    }

    const direction = new THREE.Vector3(
      Number(data.direction_x),
      Number(data.direction_y),
      Number(data.direction_z),
    ).normalize();
    const up = new THREE.Vector3(
      Number(data.up_x),
      Number(data.up_y),
      Number(data.up_z),
    ).normalize();
    const normal = new THREE.Vector3().crossVectors(direction, up).normalize();
    const transform = new THREE.Matrix4().makeBasis(direction, up, normal);
    transform.setPosition(
      Number(data.point_x),
      Number(data.point_y),
      Number(data.point_z),
    );

    const guid = String(data.guid ?? "");
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

  private handleGeometry(data: Record<string, unknown>): void {
    const guid = String(data.guid ?? "");
    const object = this.geometries.get(guid);
    if (!object) return;
    if (data.type === "remove") {
      this.scene.remove(object);
      this.disposeObject(object);
      this.geometries.delete(guid);
      this.geometryMaterials.delete(guid);
    } else if (data.type === "set_visibility") {
      object.visible = Boolean(data.visible);
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
    } else if (object instanceof THREE.Mesh) {
      object.material = new THREE.MeshStandardMaterial({
        color: 0x0092d2,
        roughness: 0.7,
        metalness: 0.05,
      });
    } else if (object instanceof THREE.Line) {
      object.material = new THREE.LineBasicMaterial({ color: 0x0092d2 });
    } else if (object instanceof THREE.Points) {
      object.material = new THREE.PointsMaterial({
        color: 0x0092d2,
        size: 0.5,
      });
    } else if (object instanceof THREE.ArrowHelper) {
      object.setColor(0x0092d2);
    }
  }

  private assignMaterial(
    object: THREE.Object3D,
    material: THREE.Material,
  ): void {
    if (object instanceof THREE.Mesh) object.material = material;
    else if (object instanceof THREE.Line) {
      object.material =
        material instanceof THREE.LineBasicMaterial
          ? material
          : new THREE.LineBasicMaterial({
              color: this.materialColor(material),
            });
    } else if (object instanceof THREE.Points) {
      object.material =
        material instanceof THREE.PointsMaterial
          ? material
          : new THREE.PointsMaterial({
              color: this.materialColor(material),
              size: 0.5,
            });
    } else if (object instanceof THREE.ArrowHelper) {
      object.setColor(this.materialColor(material));
    }
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
    const lights = [
      new THREE.DirectionalLight(0xffffff, 1),
      new THREE.DirectionalLight(0xffffff, 0.5),
      new THREE.DirectionalLight(0xffffff, 0.5),
      new THREE.AmbientLight(0xffffff, 0.5),
    ];
    lights[0].position.set(30, -10, 30);
    lights[1].position.set(-30, -20, 30);
    lights[2].position.set(-30, 20, 10);
    lights.forEach((light) => this.scene.add(light));
    this.defaultLights.push(...lights);
  }

  private removeLight(guid: string): void {
    const entry = this.lights.get(guid);
    if (!entry) return;
    entry.objects.forEach((object) => this.scene.remove(object));
    this.lights.delete(guid);
  }

  private clearLights(): void {
    for (const guid of this.lights.keys()) this.removeLight(guid);
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

  private withoutDispatch(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const rest = { ...data };
    delete rest.dispatch;
    return rest;
  }

  private reportError(error: Error): void {
    if (this.options.onError) this.options.onError(error);
    else console.error(error);
  }

  private assertUsable(): void {
    if (this.disposed) throw new Error("COMPAS viewer has been disposed");
  }
}
