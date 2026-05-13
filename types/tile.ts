export type SurfaceTarget = "floor" | "wall";
export type WallSurfaceId = "back" | "left" | "right";
export type SceneSurfaceSelection = "floor" | "left-wall" | "right-wall" | "back-wall" | "all-walls";
export type MaterialCategory = "tile" | "wallpaper" | "laminate";
export type DemoObjectType =
  | "sink"
  | "toilet"
  | "shower"
  | "vanity"
  | "mirror"
  | "counter"
  | "table"
  | "chair"
  | "sofa"
  | "bed"
  | "tv"
  | "refrigerator"
  | "microwave"
  | "wardrobe";

export const ALL_OBJECT_TYPES = [
  "sink",
  "toilet",
  "shower",
  "vanity",
  "mirror",
  "counter",
  "table",
  "chair",
  "sofa",
  "bed",
  "tv",
  "refrigerator",
  "microwave",
  "wardrobe",
] as const satisfies readonly DemoObjectType[];

export type Tile = {
  id: string;
  name: string;
  image: string;
  widthCm: number;
  heightCm: number;
  finish: string;
  tone: string;
  category?: MaterialCategory;
  applicableSurfaces?: SurfaceTarget[];
  recommendedRooms?: RoomTemplateId[];
};

export type RoomTemplateId = "bathroom" | "kitchen" | "living-room" | "bedroom" | "empty-room";

export type RoomTemplate = {
  id: RoomTemplateId;
  label: string;
  description: string;
  widthM: number;
  depthM: number;
  heightM: number;
  cameraPosition: [number, number, number];
  wallColor: string;
  floorColor: string;
  decor: Array<{
    position: [number, number, number];
    size: [number, number, number];
    color: string;
  }>;
};

export type RoomOpening = {
  id: string;
  wall: WallSurfaceId;
  kind: "door" | "window";
  offset: number;
  width: number;
  height: number;
  bottom: number;
};

export type PlacedDemoObject = {
  id: string;
  type: DemoObjectType;
  x: number;
  y?: number;
  z: number;
  rotationDeg: number;
  scale: number;
  modelYOffset?: number;
  isVisible?: boolean;
};

export type SavedSceneObject = {
  id: string;
  type: DemoObjectType;
  x: number;
  y: number;
  z: number;
  rotationDeg: number;
  scale: number;
  modelYOffset?: number;
  isVisible?: boolean;
};

export type SavedSceneData = {
  name: string;
  roomType: RoomTemplateId;
  activeSurface: SceneSurfaceSelection;
  floorTileId: string;
  leftWallTileId: string;
  rightWallTileId: string;
  backWallTileId: string;
  objects: SavedSceneObject[];
};
