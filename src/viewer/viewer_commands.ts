import { CompasViewerError } from "../library/errors";

export type CommandRecord = Record<string, unknown>;

export type SceneCommandType =
  | "background_color"
  | "controls_damping"
  | "world_axis"
  | "picker"
  | "camera_fov"
  | "camera_zoom"
  | "camera_position"
  | "camera_target"
  | "camera_view"
  | "show_edges";

export type UiCommandType =
  | "button"
  | "load_json_button"
  | "slider"
  | "number_field"
  | "checkbox"
  | "select";

export type HandleGeometryCommandType =
  "remove" | "set_visibility" | "toggle_visibility";

interface MaterialCommandBase extends CommandRecord {
  dispatch: "material";
  guid: string;
  color: string;
  geometry_guid?: string;
  geometryBackendGuid?: string;
}

export interface StandardMaterialCommand extends MaterialCommandBase {
  type: "standard_material";
  metalness: number;
  roughness: number;
  emissive: string;
  emissive_intensity: number;
  flat_shading: boolean;
  wireframe: boolean;
  transparent: boolean;
  opacity: number;
}

export interface LineMaterialCommand extends MaterialCommandBase {
  type: "line_material";
}

export interface PointMaterialCommand extends MaterialCommandBase {
  type: "point_material";
  size: number;
}

export interface PhysicalMaterialCommand extends MaterialCommandBase {
  type: "physical_material";
  metalness: number;
  roughness: number;
  emissive: string;
  emissive_intensity: number;
  flat_shading: boolean;
  wireframe: boolean;
  anisotropy: number;
  anisotropy_rotation: number;
  attenuation_color: string;
  attenuation_distance?: number;
  clearcoat: number;
  clearcoat_roughness: number;
  dispersion: number;
  ior: number;
  iridescence: number;
  iridescence_ior: number;
  iridescence_thickness_start: number;
  iridescence_thickness_end: number;
  reflectivity: number;
  sheen: number;
  sheen_color: string;
  sheen_roughness: number;
  specular_color: string;
  specular_intensity: number;
  thickness: number;
  transmission: number;
}

export type MaterialCommand =
  | StandardMaterialCommand
  | LineMaterialCommand
  | PointMaterialCommand
  | PhysicalMaterialCommand;

interface LightCommandBase extends CommandRecord {
  dispatch: "light";
  guid: string;
  color: string;
  intensity: number;
}

interface PositionedLightCommand extends LightCommandBase {
  x: number;
  y: number;
  z: number;
}

export interface PointLightCommand extends PositionedLightCommand {
  type: "point_light";
  distance: number;
  decay: number;
}

export interface SpotLightCommand extends PositionedLightCommand {
  type: "spot_light";
  distance: number;
  decay: number;
  angle: number;
  penumbra: number;
  tx: number;
  ty: number;
  tz: number;
}

export interface RectLightCommand extends PositionedLightCommand {
  type: "rect_light";
  width: number;
  height: number;
  tx: number;
  ty: number;
  tz: number;
}

export interface SunlightCommand extends PositionedLightCommand {
  type: "sunlight";
  tx: number;
  ty: number;
  tz: number;
}

export interface SkyCommand extends CommandRecord {
  dispatch: "light";
  type: "sky";
  guid: string;
  turbidity: number;
  rayleigh: number;
  mie_coefficient: number;
  mie_directional_g: number;
  elevation: number;
  azimuth: number;
}

export interface AmbientLightCommand extends LightCommandBase {
  type: "ambient_light";
}

export type LightCommand =
  | PointLightCommand
  | SpotLightCommand
  | RectLightCommand
  | SunlightCommand
  | SkyCommand
  | AmbientLightCommand;

interface SceneCommandBase extends CommandRecord {
  dispatch: "scene";
}

export interface BackgroundColorCommand extends SceneCommandBase {
  type: "background_color";
  color: string;
}

export interface ControlsDampingCommand extends SceneCommandBase {
  type: "controls_damping";
  damping: boolean;
}

export interface WorldAxisCommand extends SceneCommandBase {
  type: "world_axis";
  show: boolean;
}

export interface PickerCommand extends SceneCommandBase {
  type: "picker";
  enabled: boolean;
}

export interface CameraFovCommand extends SceneCommandBase {
  type: "camera_fov";
  fov: number;
}

export interface CameraZoomCommand extends SceneCommandBase {
  type: "camera_zoom";
  zoom: number;
}

export interface CameraPositionCommand extends SceneCommandBase {
  type: "camera_position";
  x: number;
  y: number;
  z: number;
}

export interface CameraTargetCommand extends SceneCommandBase {
  type: "camera_target";
  x: number;
  y: number;
  z: number;
}

export type CameraViewPreset =
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

export interface CameraViewCommand extends SceneCommandBase {
  type: "camera_view";
  preset: CameraViewPreset;
}

export interface ShowEdgesCommand extends SceneCommandBase {
  type: "show_edges";
  show: boolean;
}

export type SceneCommand =
  | BackgroundColorCommand
  | ControlsDampingCommand
  | WorldAxisCommand
  | PickerCommand
  | CameraFovCommand
  | CameraZoomCommand
  | CameraPositionCommand
  | CameraTargetCommand
  | CameraViewCommand
  | ShowEdgesCommand;

export interface ThemeCommand extends CommandRecord {
  dispatch: "theme";
  mode: "light" | "dark";
}

interface UiCommandBase extends CommandRecord {
  dispatch: "ui";
  guid: string;
  label?: string;
}

export interface ButtonUiCommand extends UiCommandBase {
  type: "button" | "load_json_button";
  text: string;
  variant: string;
}

export interface SliderUiCommand extends UiCommandBase {
  type: "slider";
  min: number;
  max: number;
  step: number;
  default_value: number;
}

export interface NumberFieldUiCommand extends UiCommandBase {
  type: "number_field";
  min: number;
  max: number;
  step: number;
  value: number;
}

export interface CheckboxUiCommand extends UiCommandBase {
  type: "checkbox";
  text: string;
  default_value: boolean;
}

export interface SelectUiCommand extends UiCommandBase {
  type: "select";
  options: string[];
  placeholder?: string;
  default_value?: string;
}

export type UiCommand =
  | ButtonUiCommand
  | SliderUiCommand
  | NumberFieldUiCommand
  | CheckboxUiCommand
  | SelectUiCommand;

export interface TextCommand extends CommandRecord {
  dispatch: "text";
  type: "text_geometry";
  guid: string;
  text: string;
  font?: string;
  weight?: string;
  size: number;
  depth: number;
  centered: boolean;
  direction_x: number;
  direction_y: number;
  direction_z: number;
  up_x: number;
  up_y: number;
  up_z: number;
  point_x: number;
  point_y: number;
  point_z: number;
}

export interface TextTagCommand extends CommandRecord {
  dispatch: "text_tag";
  guid: string;
  text: string;
  color?: string;
  x: number;
  y: number;
  z: number;
}

export interface ObjectInfosCommand extends CommandRecord {
  dispatch: "object_infos";
}

export interface ObjectActionCommand extends CommandRecord {
  dispatch: "object_action";
  guid: string;
  type: string;
  object_guid: string;
  label?: string;
  text?: string;
  options?: string[];
  placeholder?: string;
  default_value?: unknown;
}

interface HandleGeometryCommandBase extends CommandRecord {
  dispatch: "handle_geometry";
  guid: string;
}

export interface RemoveGeometryCommand extends HandleGeometryCommandBase {
  type: "remove";
}

export interface SetGeometryVisibilityCommand extends HandleGeometryCommandBase {
  type: "set_visibility";
  visible: boolean;
}

export interface ToggleGeometryVisibilityCommand extends HandleGeometryCommandBase {
  type: "toggle_visibility";
}

export type HandleGeometryCommand =
  | RemoveGeometryCommand
  | SetGeometryVisibilityCommand
  | ToggleGeometryVisibilityCommand;

export type ViewerCommand =
  | MaterialCommand
  | LightCommand
  | SceneCommand
  | ThemeCommand
  | UiCommand
  | TextCommand
  | TextTagCommand
  | ObjectInfosCommand
  | ObjectActionCommand
  | HandleGeometryCommand;

const SCENE_TYPES = new Set<SceneCommandType>([
  "background_color",
  "controls_damping",
  "world_axis",
  "picker",
  "camera_fov",
  "camera_zoom",
  "camera_position",
  "camera_target",
  "camera_view",
  "show_edges",
]);
const UI_TYPES = new Set<UiCommandType>([
  "button",
  "load_json_button",
  "slider",
  "number_field",
  "checkbox",
  "select",
]);
const HANDLE_GEOMETRY_TYPES = new Set<HandleGeometryCommandType>([
  "remove",
  "set_visibility",
  "toggle_visibility",
]);
const MATERIAL_TYPES = new Set<MaterialCommand["type"]>([
  "standard_material",
  "line_material",
  "point_material",
  "physical_material",
]);
const LIGHT_TYPES = new Set<LightCommand["type"]>([
  "point_light",
  "spot_light",
  "rect_light",
  "sunlight",
  "sky",
  "ambient_light",
]);
const CAMERA_VIEW_PRESETS = new Set<CameraViewPreset>([
  "top",
  "bottom",
  "front",
  "back",
  "left",
  "right",
  "front_left",
  "front_right",
  "back_left",
  "back_right",
]);

export function parseViewerCommand(record: CommandRecord): ViewerCommand {
  const dispatch = readString(record, "dispatch");
  switch (dispatch) {
    case "material":
      validateMaterial(record);
      return record as MaterialCommand;
    case "light":
      validateLight(record);
      return record as LightCommand;
    case "object_action":
      validateObjectAction(record);
      return record as ObjectActionCommand;
    case "scene":
      validateScene(record);
      return record as SceneCommand;
    case "theme":
      readVariant(record, "mode", new Set(["light", "dark"]));
      return record as ThemeCommand;
    case "ui":
      validateUi(record);
      return record as UiCommand;
    case "text":
      readVariant(record, "type", new Set(["text_geometry"]));
      validateText(record);
      return record as TextCommand;
    case "text_tag":
      validateTextTag(record);
      return record as TextTagCommand;
    case "object_infos":
      return record as ObjectInfosCommand;
    case "handle_geometry":
      validateHandleGeometry(record);
      return record as HandleGeometryCommand;
    default:
      throw new CompasViewerError(
        "unsupported_message",
        `Unsupported viewer dispatch: ${dispatch}`,
        { details: { dispatch } },
      );
  }
}

export function readGeometryGuid(record: CommandRecord): string {
  const value = record.geometry_guid ?? record.geometryBackendGuid;
  if (typeof value !== "string" || value.length === 0) {
    invalidField(
      record,
      "geometry_guid",
      "a non-empty geometry GUID (geometry_guid or geometryBackendGuid)",
    );
  }
  return value;
}

export function readString(record: CommandRecord, field: string): string {
  const value = record[field];
  if (typeof value !== "string") invalidField(record, field, "a string");
  return value;
}

export function readNonEmptyString(
  record: CommandRecord,
  field: string,
): string {
  const value = readString(record, field);
  if (value.length === 0) invalidField(record, field, "a non-empty string");
  return value;
}

export function readOptionalString(
  record: CommandRecord,
  field: string,
): string | undefined {
  const value = record[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") invalidField(record, field, "a string");
  return value;
}

export function readFiniteNumber(record: CommandRecord, field: string): number {
  const value = record[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    invalidField(record, field, "a finite number");
  }
  return value;
}

export function readBoolean(record: CommandRecord, field: string): boolean {
  const value = record[field];
  if (typeof value !== "boolean") invalidField(record, field, "a boolean");
  return value;
}

export function readStringArray(
  record: CommandRecord,
  field: string,
): string[] {
  const value = record[field];
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    invalidField(record, field, "an array of strings");
  }
  return value;
}

function readVariant<T extends string>(
  record: CommandRecord,
  field: string,
  supported: ReadonlySet<T>,
): T {
  const value = readString(record, field);
  if (!supported.has(value as T)) {
    throw new CompasViewerError(
      "unsupported_message",
      `Unsupported ${readDispatchForDetails(record)} ${field}: ${value}`,
      {
        details: {
          dispatch: record.dispatch,
          field,
          value,
        },
      },
    );
  }
  return value as T;
}

function validateMaterial(record: CommandRecord): void {
  const type = readVariant(record, "type", MATERIAL_TYPES);
  readNonEmptyString(record, "guid");
  readGeometryGuid(record);
  readString(record, "color");

  if (type === "line_material") return;
  if (type === "point_material") {
    readFiniteNumber(record, "size");
    return;
  }

  readNumberFields(record, ["metalness", "roughness", "emissive_intensity"]);
  readString(record, "emissive");
  readBooleanFields(record, ["flat_shading", "wireframe"]);

  if (type === "standard_material") {
    readBoolean(record, "transparent");
    readFiniteNumber(record, "opacity");
    return;
  }

  readNumberFields(record, [
    "anisotropy",
    "anisotropy_rotation",
    "clearcoat",
    "clearcoat_roughness",
    "dispersion",
    "ior",
    "iridescence",
    "iridescence_ior",
    "iridescence_thickness_start",
    "iridescence_thickness_end",
    "reflectivity",
    "sheen",
    "sheen_roughness",
    "specular_intensity",
    "thickness",
    "transmission",
  ]);
  if (record.attenuation_distance !== undefined) {
    readFiniteNumber(record, "attenuation_distance");
  }
  for (const field of ["attenuation_color", "sheen_color", "specular_color"]) {
    readString(record, field);
  }
}

function validateLight(record: CommandRecord): void {
  const type = readVariant(record, "type", LIGHT_TYPES);
  readNonEmptyString(record, "guid");
  if (type === "sky") {
    readNumberFields(record, [
      "turbidity",
      "rayleigh",
      "mie_coefficient",
      "mie_directional_g",
      "elevation",
      "azimuth",
    ]);
    return;
  }

  readString(record, "color");
  readFiniteNumber(record, "intensity");
  if (type === "ambient_light") return;

  readNumberFields(record, ["x", "y", "z"]);
  if (type === "point_light") {
    readNumberFields(record, ["distance", "decay"]);
  } else if (type === "spot_light") {
    readNumberFields(record, [
      "distance",
      "decay",
      "angle",
      "penumbra",
      "tx",
      "ty",
      "tz",
    ]);
  } else {
    readNumberFields(record, ["tx", "ty", "tz"]);
    if (type === "rect_light") {
      readNumberFields(record, ["width", "height"]);
    }
  }
}

function validateScene(record: CommandRecord): void {
  const type = readVariant(record, "type", SCENE_TYPES);
  switch (type) {
    case "background_color":
      readString(record, "color");
      break;
    case "controls_damping":
      readBoolean(record, "damping");
      break;
    case "world_axis":
    case "show_edges":
      readBoolean(record, "show");
      break;
    case "picker":
      readBoolean(record, "enabled");
      break;
    case "camera_fov":
      readFiniteNumber(record, "fov");
      break;
    case "camera_zoom":
      readFiniteNumber(record, "zoom");
      break;
    case "camera_position":
    case "camera_target":
      readNumberFields(record, ["x", "y", "z"]);
      break;
    case "camera_view":
      readVariant(record, "preset", CAMERA_VIEW_PRESETS);
      break;
  }
}

function validateUi(record: CommandRecord): void {
  const type = readVariant(record, "type", UI_TYPES);
  readNonEmptyString(record, "guid");
  readOptionalString(record, "label");
  switch (type) {
    case "button":
    case "load_json_button":
      readString(record, "text");
      readString(record, "variant");
      break;
    case "slider":
      readNumberFields(record, ["min", "max", "step", "default_value"]);
      break;
    case "number_field":
      readNumberFields(record, ["min", "max", "step", "value"]);
      break;
    case "checkbox":
      readString(record, "text");
      readBoolean(record, "default_value");
      break;
    case "select":
      readStringArray(record, "options");
      readOptionalString(record, "placeholder");
      readOptionalString(record, "default_value");
      break;
  }
}

function validateText(record: CommandRecord): void {
  readNonEmptyString(record, "guid");
  readString(record, "text");
  readOptionalString(record, "font");
  readOptionalString(record, "weight");
  readNumberFields(record, [
    "size",
    "depth",
    "direction_x",
    "direction_y",
    "direction_z",
    "up_x",
    "up_y",
    "up_z",
    "point_x",
    "point_y",
    "point_z",
  ]);
  readBoolean(record, "centered");
}

function validateTextTag(record: CommandRecord): void {
  readNonEmptyString(record, "guid");
  readString(record, "text");
  readOptionalString(record, "color");
  readNumberFields(record, ["x", "y", "z"]);
}

function validateObjectAction(record: CommandRecord): void {
  readNonEmptyString(record, "guid");
  readString(record, "type");
  readNonEmptyString(record, "object_guid");
  readOptionalString(record, "label");
  readOptionalString(record, "text");
  readOptionalString(record, "placeholder");
  if (record.options !== undefined) readStringArray(record, "options");
}

function validateHandleGeometry(record: CommandRecord): void {
  const type = readVariant(record, "type", HANDLE_GEOMETRY_TYPES);
  readNonEmptyString(record, "guid");
  if (type === "set_visibility") readBoolean(record, "visible");
}

function readNumberFields(record: CommandRecord, fields: string[]): void {
  for (const field of fields) readFiniteNumber(record, field);
}

function readBooleanFields(record: CommandRecord, fields: string[]): void {
  for (const field of fields) readBoolean(record, field);
}

function invalidField(
  record: CommandRecord,
  field: string,
  expectation: string,
): never {
  throw new CompasViewerError(
    "invalid_message",
    `Invalid ${readDispatchForDetails(record)} command: ${field} must be ${expectation}`,
    {
      details: {
        dispatch: record.dispatch,
        field,
        value: record[field],
      },
    },
  );
}

function readDispatchForDetails(record: CommandRecord): string {
  return typeof record.dispatch === "string" ? record.dispatch : "viewer";
}
