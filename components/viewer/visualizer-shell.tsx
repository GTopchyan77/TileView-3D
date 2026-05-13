"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";
import { useTiles } from "@/hooks/use-tiles";
import { translateObjectLabel, translateRoomDescription, translateRoomLabel, useLanguage } from "@/lib/i18n";
import {
  CatalogMode,
  getCatalogTiles,
  getTileCategory,
} from "@/lib/material-recommendations";
import { roomTemplates } from "@/lib/room-templates";
import { SAVED_SCENE_STORAGE_KEY } from "@/lib/storage";
import { getSupabaseBrowserClient, isSupabaseConfigured, mapCloudScene } from "@/lib/supabase/client";
import {
  ALL_OBJECT_TYPES,
  DemoObjectType,
  MaterialCategory,
  PlacedDemoObject,
  RoomTemplateId,
  SavedSceneData,
  SceneSurfaceSelection,
  Tile,
  WallSurfaceId,
} from "@/types/tile";
import { RoomViewer } from "./room-viewer";

type SurfaceSelection = SceneSurfaceSelection;
type MaterialCategoryFilter = "all" | MaterialCategory;

const materialCategoryLabelKeys = {
  tile: "tiles",
  wallpaper: "wallpapers",
  laminate: "laminates",
} as const;

const objectOptions: Array<{ value: DemoObjectType }> = [
  { value: "sink" },
  { value: "toilet" },
  { value: "shower" },
  { value: "vanity" },
  { value: "mirror" },
  { value: "counter" },
  { value: "sofa" },
  { value: "bed" },
  { value: "tv" },
  { value: "refrigerator" },
  { value: "microwave" },
  { value: "table" },
  { value: "wardrobe" },
];

const objectIcons: Record<DemoObjectType, string> = {
  sink: "🚰",
  toilet: "🚽",
  shower: "🚿",
  vanity: "🗄️",
  mirror: "🪞",
  counter: "🧱",
  table: "▭",
  chair: "🪑",
  sofa: "🛋",
  bed: "🛏",
  tv: "📺",
  refrigerator: "🧊",
  microwave: "🔌",
  wardrobe: "🚪",
};

const VALID_ROOM_TYPES = new Set<RoomTemplateId>(roomTemplates.map((template) => template.id));
const VALID_SURFACE_TARGETS = new Set<SurfaceSelection>([
  "floor",
  "left-wall",
  "right-wall",
  "back-wall",
  "all-walls",
]);
const VALID_OBJECT_TYPES = new Set<DemoObjectType>(ALL_OBJECT_TYPES);

function VisibilityIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A13 13 0 0 1 12 5c6.5 0 10 7 10 7a16.8 16.8 0 0 1-4 4.8" />
      <path d="M6.7 6.8A16.8 16.8 0 0 0 2 12s3.5 7 10 7c1.5 0 2.9-.3 4.1-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function isRoomTemplateId(value: string): value is RoomTemplateId {
  return VALID_ROOM_TYPES.has(value as RoomTemplateId);
}

function isSurfaceSelection(value: string): value is SurfaceSelection {
  return VALID_SURFACE_TARGETS.has(value as SurfaceSelection);
}

function parseSavedSceneData(value: string | null): SavedSceneData | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<SavedSceneData> | null;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.name !== "string" ||
      !isRoomTemplateId(String(parsed.roomType)) ||
      !isSurfaceSelection(String(parsed.activeSurface)) ||
      typeof parsed.floorTileId !== "string" ||
      typeof parsed.leftWallTileId !== "string" ||
      typeof parsed.rightWallTileId !== "string" ||
      typeof parsed.backWallTileId !== "string" ||
      !Array.isArray(parsed.objects)
    ) {
      return null;
    }

    const objects = parsed.objects
      .map((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          typeof item.id !== "string" ||
          !VALID_OBJECT_TYPES.has(item.type as DemoObjectType) ||
          typeof item.x !== "number" ||
          typeof item.z !== "number" ||
          typeof item.rotationDeg !== "number" ||
          typeof item.scale !== "number"
        ) {
          return null;
        }

          return {
            id: item.id,
            type: item.type as DemoObjectType,
            x: item.x,
            y: typeof item.y === "number" ? item.y : 0,
            z: item.z,
            rotationDeg: item.rotationDeg,
            scale: item.scale,
            modelYOffset: typeof item.modelYOffset === "number" ? item.modelYOffset : undefined,
            isVisible: item.isVisible !== false,
          };
        })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      name: parsed.name,
      roomType: parsed.roomType as RoomTemplateId,
      activeSurface: parsed.activeSurface as SurfaceSelection,
      floorTileId: parsed.floorTileId,
      leftWallTileId: parsed.leftWallTileId,
      rightWallTileId: parsed.rightWallTileId,
      backWallTileId: parsed.backWallTileId,
      objects,
    };
  } catch {
    return null;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createRoomObjects(roomId: RoomTemplateId, widthM: number, depthM: number) {
  const xLimit = widthM / 2 - 0.55;
  const zLimit = depthM / 2 - 0.55;
  const defaultModelYOffset = (type: DemoObjectType) => {
    if (type === "microwave") {
      return 0.92;
    }

    return 0;
  };
  const createObject = (
    id: string,
    type: DemoObjectType,
    x: number,
    z: number,
    rotationDeg: number,
    scale = 1,
    y = 0,
    modelYOffset = defaultModelYOffset(type),
    ): PlacedDemoObject => ({
      id,
      type,
      x: clamp(x, -xLimit, xLimit),
      y,
      z: clamp(z, -zLimit, zLimit),
      rotationDeg,
      scale,
      modelYOffset,
      isVisible: true,
    });

  if (roomId === "bathroom") {
    return [
      createObject("bathroom-shower-1", "shower", widthM / 2 - 0.72, -depthM / 2 + 0.72, 0, 0.96),
      createObject("bathroom-toilet-1", "toilet", -widthM / 2 + 0.56, -depthM * 0.08, 90, 0.96),
      createObject("bathroom-sink-1", "sink", widthM * 0.08, -depthM / 2 + 0.5, 0, 0.9),
    ];
  }

  if (roomId === "kitchen") {
    return [
      createObject("kitchen-refrigerator-1", "refrigerator", -widthM / 2 + 0.62, -depthM / 2 + 0.52, 0, 1),
      createObject("kitchen-counter-1", "counter", 0.3, -depthM / 2 + 0.56, 0, 1.02),
      createObject("kitchen-microwave-1", "microwave", widthM / 2 - 0.72, -depthM / 2 + 0.5, 0, 1.08, 0.92),
      createObject("kitchen-table-1", "table", 0, depthM * 0.16, 0, 0.98),
    ];
  }

  if (roomId === "living-room") {
    return [
      createObject("living-sofa-1", "sofa", 0, -depthM / 2 + 0.82, 0, 1.05),
      createObject("living-tv-1", "tv", 0, depthM / 2 - 0.09, 180, 0.96, 1.24, 0),
      createObject("living-table-1", "table", 0, -0.08, 0, 0.98),
    ];
  }

  if (roomId === "bedroom") {
    return [
      createObject("bedroom-bed-1", "bed", 0, -depthM / 2 + 1.02, 0, 1.04),
      createObject("bedroom-wardrobe-1", "wardrobe", widthM / 2 - 0.72, -depthM / 2 + 0.7, 0, 1),
      createObject("bedroom-table-1", "table", -widthM * 0.24, 0.44, 16, 0.88),
    ];
  }

  return [];
}

function TileThumbnail({
  src,
  alt,
  className,
  errorLabel,
}: {
  src: string;
  alt: string;
  className?: string;
  errorLabel: string;
}) {
  const [hasError, setHasError] = useState(false);
  const imageSrc = hasError || !src ? "/tiles/placeholder.svg" : src;

  return (
    <div className={`soft-grid relative overflow-hidden bg-slate-900 ${className ?? ""}`}>
      <Image
        src={imageSrc}
        alt={alt}
        fill
        unoptimized
        onError={() => setHasError(true)}
        className="object-cover transition duration-300 group-hover:scale-[1.04]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/28 to-transparent" />
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-center text-xs font-medium text-slate-300">
          {errorLabel}
        </div>
      ) : null}
    </div>
  );
}

function TileCard({
  tile,
  selected,
  targetLabel,
  categoryLabel,
  activeLabel,
  imageUnavailableLabel,
  tapToApplyLabel,
  onClick,
}: {
  tile: Tile;
  selected: boolean;
  targetLabel: string;
  categoryLabel: string;
  activeLabel: string;
  imageUnavailableLabel: string;
  tapToApplyLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tile-card panel panel-hover group p-3 ${selected ? "glow-selected selection-pop" : ""}`}
    >
      <TileThumbnail
        src={tile.image}
        alt={tile.name}
        errorLabel={imageUnavailableLabel}
        className="h-24 w-full rounded-[18px] border border-white/10"
      />
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-50">{tile.name}</p>
          <p className="mt-1 text-xs text-slate-300">
            {tile.widthCm}x{tile.heightCm} cm
          </p>
        </div>
        {selected ? (
          <span className="rounded-full border border-sky-400/25 bg-sky-400/12 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-sky-200">
            {activeLabel}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[0.7rem] text-slate-300">
        <span className="glass-chip rounded-full px-2.5 py-1">{categoryLabel}</span>
        <span className="glass-chip rounded-full px-2.5 py-1">{tile.finish}</span>
        <span className="glass-chip rounded-full px-2.5 py-1">{tile.tone}</span>
      </div>
      <p className="mt-2 text-[0.72rem] font-medium text-slate-300/80">{tapToApplyLabel}</p>
    </button>
  );
}

function AccordionSection({
  title,
  subtitle,
  openLabel,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  openLabel: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="panel rounded-[24px] p-4 md:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-left [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-base font-semibold text-slate-50">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-slate-300">{subtitle}</p> : null}
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">{openLabel}</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export function VisualizerShell() {
  const { tiles, cloudConfigured, cloudError } = useTiles();
  const { t } = useLanguage();
  const [roomId, setRoomId] = useState<RoomTemplateId>("bathroom");
  const [surfaceTarget, setSurfaceTarget] = useState<SurfaceSelection>("floor");
  const [catalogMode, setCatalogMode] = useState<CatalogMode>("recommended");
  const [categoryFilter, setCategoryFilter] = useState<MaterialCategoryFilter>("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [floorTileId, setFloorTileId] = useState<string>("travertine-sand");
  const [wallTileIds, setWallTileIds] = useState<Record<WallSurfaceId, string>>({
    left: "marble-ivory",
    right: "marble-ivory",
    back: "marble-ivory",
  });
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const initialRoom = roomTemplates.find((item) => item.id === "bathroom") ?? roomTemplates[0];
  const [placedObjects, setPlacedObjects] = useState<PlacedDemoObject[]>(() =>
    createRoomObjects(initialRoom.id, initialRoom.widthM, initialRoom.depthM),
  );
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(() =>
    createRoomObjects(initialRoom.id, initialRoom.widthM, initialRoom.depthM)[0]?.id ?? null,
  );
  const [objectRenderStates, setObjectRenderStates] = useState<Record<string, "gltf" | "placeholder">>(() =>
    Object.fromEntries(
      createRoomObjects(initialRoom.id, initialRoom.widthM, initialRoom.depthM).map((object) => [
        object.id,
        "placeholder" as const,
      ]),
    ),
  );
  const nextObjectIdRef = useRef(0);
  const [sceneStatus, setSceneStatus] = useState<string>("");
  const [isSavingSceneToCloud, setIsSavingSceneToCloud] = useState(false);
  const [isLoadingCloudScene, setIsLoadingCloudScene] = useState(false);

  const room = useMemo(
    () => roomTemplates.find((item) => item.id === roomId) ?? roomTemplates[0],
    [roomId],
  );
  const floorTile = tiles.find((tile) => tile.id === floorTileId);
  const leftWallTile = tiles.find((tile) => tile.id === wallTileIds.left);
  const rightWallTile = tiles.find((tile) => tile.id === wallTileIds.right);
  const backWallTile = tiles.find((tile) => tile.id === wallTileIds.back);
  const wallSurfaceTiles = {
    left: leftWallTile,
    right: rightWallTile,
    back: backWallTile,
  };

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    console.info("TileView selected surface tiles", {
      floor: { name: floorTile?.name, image: floorTile?.image },
      leftWall: { name: leftWallTile?.name, image: leftWallTile?.image },
      rightWall: { name: rightWallTile?.name, image: rightWallTile?.image },
      backWall: { name: backWallTile?.name, image: backWallTile?.image },
    });
  }, [backWallTile, floorTile, leftWallTile, rightWallTile]);

  const selectedTileId = useMemo(() => {
    if (surfaceTarget === "floor") {
      return floorTileId;
    }

    if (surfaceTarget === "left-wall") {
      return wallTileIds.left;
    }

    if (surfaceTarget === "right-wall") {
      return wallTileIds.right;
    }

    if (surfaceTarget === "back-wall") {
      return wallTileIds.back;
    }

    const uniqueWallIds = new Set(Object.values(wallTileIds));
    return uniqueWallIds.size === 1 ? [...uniqueWallIds][0] : "";
  }, [floorTileId, surfaceTarget, wallTileIds]);
  const targetLabel = useMemo(() => {
    if (surfaceTarget === "floor") {
      return t("floor");
    }

    if (surfaceTarget === "left-wall") {
      return t("leftWall");
    }

    if (surfaceTarget === "right-wall") {
      return t("rightWall");
    }

    if (surfaceTarget === "back-wall") {
      return t("backWall");
    }

    return t("allWalls");
  }, [surfaceTarget, t]);
  const recommendedTiles = useMemo(
    () => getCatalogTiles(tiles, room.id, surfaceTarget, "recommended"),
    [room.id, surfaceTarget, tiles],
  );
  const baseCatalogTiles = useMemo(
    () => getCatalogTiles(tiles, room.id, surfaceTarget, catalogMode),
    [catalogMode, room.id, surfaceTarget, tiles],
  );
  const catalogTiles = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();

    return baseCatalogTiles.filter((tile) => {
      const categoryMatches = categoryFilter === "all" || getTileCategory(tile) === categoryFilter;
      const queryMatches =
        !query ||
        [tile.name, tile.finish, tile.tone, getTileCategory(tile)]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return categoryMatches && queryMatches;
    });
  }, [baseCatalogTiles, catalogSearch, categoryFilter]);
  const materialCategoryLabel = (tile: Tile) => t(materialCategoryLabelKeys[getTileCategory(tile)]);
  const selectedObject = placedObjects.find((object) => object.id === selectedObjectId) ?? null;
  const getObjectLabel = (type: DemoObjectType) => translateObjectLabel(type, t);

  const buildScenePayload = (): SavedSceneData => ({
    name: `${translateRoomLabel(room.id, t)} Scene`,
    roomType: room.id,
    activeSurface: surfaceTarget,
    floorTileId,
    leftWallTileId: wallTileIds.left,
    rightWallTileId: wallTileIds.right,
    backWallTileId: wallTileIds.back,
      objects: placedObjects.map((object) => ({
        id: object.id,
        type: object.type,
        x: object.x,
        y: object.y ?? 0,
        z: object.z,
        rotationDeg: object.rotationDeg,
        scale: object.scale,
        modelYOffset: object.modelYOffset,
        isVisible: object.isVisible !== false,
      })),
    });

  const applyScenePayload = (scene: SavedSceneData) => {
    setRoomId(scene.roomType);
    setSurfaceTarget(scene.activeSurface);
    setFloorTileId(scene.floorTileId);
    setWallTileIds({
      left: scene.leftWallTileId,
      right: scene.rightWallTileId,
      back: scene.backWallTileId,
    });
    setPlacedObjects(scene.objects.map((object) => ({ ...object, isVisible: object.isVisible !== false })));
    setSelectedObjectId(scene.objects[0]?.id ?? null);
    setObjectRenderStates(
      Object.fromEntries(scene.objects.map((object) => [object.id, "placeholder" as const])),
    );
    nextObjectIdRef.current = Date.now();
  };

  const saveSceneLocally = () => {
    try {
      window.localStorage.setItem(SAVED_SCENE_STORAGE_KEY, JSON.stringify(buildScenePayload()));
      setSceneStatus(t("savedLocally"));
    } catch {
      setSceneStatus(t("sceneCouldNotSave"));
    }
  };

  const loadSavedScene = () => {
    const saved = parseSavedSceneData(window.localStorage.getItem(SAVED_SCENE_STORAGE_KEY));

    if (!saved) {
      setSceneStatus(t("noSavedSceneFound"));
      return;
    }

    applyScenePayload(saved);
    setSceneStatus(t("loadedSavedScene"));
  };

  const resetSavedScene = () => {
    window.localStorage.removeItem(SAVED_SCENE_STORAGE_KEY);
    setSceneStatus(t("savedSceneCleared"));
  };

  const saveSceneToCloud = async () => {
    if (!cloudConfigured || !isSupabaseConfigured()) {
      setSceneStatus(t("cloudNotConfigured"));
      return;
    }

    setIsSavingSceneToCloud(true);

    try {
      const client = getSupabaseBrowserClient();

      if (!client) {
        throw new Error(t("cloudNotConfigured"));
      }

      const scene = buildScenePayload();
      const { error } = await client.from("scenes").insert({
        name: `${scene.name} ${new Date().toLocaleString()}`,
        room_type: scene.roomType,
        active_surface: scene.activeSurface,
        floor_tile_id: scene.floorTileId || null,
        left_wall_tile_id: scene.leftWallTileId || null,
        right_wall_tile_id: scene.rightWallTileId || null,
        back_wall_tile_id: scene.backWallTileId || null,
        objects: scene.objects,
      });

      if (error) {
        throw error;
      }

      setSceneStatus(t("savedSceneToCloud"));
    } catch (error) {
      setSceneStatus(error instanceof Error ? error.message : t("cloudSceneSaveFailed"));
    } finally {
      setIsSavingSceneToCloud(false);
    }
  };

  const loadLatestCloudScene = async () => {
    if (!cloudConfigured || !isSupabaseConfigured()) {
      setSceneStatus(t("cloudNotConfigured"));
      return;
    }

    setIsLoadingCloudScene(true);

    try {
      const client = getSupabaseBrowserClient();

      if (!client) {
        throw new Error(t("cloudNotConfigured"));
      }

      const { data, error } = await client
        .from("scenes")
        .select(
          "id,name,room_type,active_surface,floor_tile_id,left_wall_tile_id,right_wall_tile_id,back_wall_tile_id,objects,created_at,updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setSceneStatus(t("noSavedSceneFound"));
        return;
      }

      const parsedScene = parseSavedSceneData(JSON.stringify(mapCloudScene(data)));

      if (!parsedScene) {
        setSceneStatus(t("noSavedSceneFound"));
        return;
      }

      applyScenePayload(parsedScene);
      setSceneStatus(t("loadedSavedScene"));
    } catch (error) {
      setSceneStatus(error instanceof Error ? error.message : t("cloudSceneLoadFailed"));
    } finally {
      setIsLoadingCloudScene(false);
    }
  };

  const syncRoomObjects = (nextRoomId: RoomTemplateId) => {
    const nextRoom = roomTemplates.find((item) => item.id === nextRoomId) ?? roomTemplates[0];
    const nextObjects = createRoomObjects(nextRoom.id, nextRoom.widthM, nextRoom.depthM);
    setPlacedObjects(nextObjects);
    setSelectedObjectId(nextObjects[0]?.id ?? null);
    setObjectRenderStates(
      Object.fromEntries(nextObjects.map((object) => [object.id, "placeholder" as const])),
    );
  };

  const handleRoomChange = (nextRoomId: RoomTemplateId) => {
    setRoomId(nextRoomId);
    syncRoomObjects(nextRoomId);
  };

  const applyTile = (tileId: string) => {
    if (surfaceTarget === "floor") {
      setFloorTileId(tileId);
      return;
    }

    if (surfaceTarget === "all-walls") {
      setWallTileIds({
        left: tileId,
        right: tileId,
        back: tileId,
      });
      return;
    }

    const wallKey: WallSurfaceId =
      surfaceTarget === "left-wall" ? "left" : surfaceTarget === "right-wall" ? "right" : "back";

    setWallTileIds((current) => ({
      ...current,
      [wallKey]: tileId,
    }));
  };

  const exportScreenshot = () => {
    if (!canvasElement) {
      return;
    }

    const link = document.createElement("a");
    link.href = canvasElement.toDataURL("image/png");
    link.download = `tile-visualizer-${room.id}.png`;
    link.click();
  };

  const requestQuote = () => {
    window.alert(t("quoteDemoAction"));
  };

  const addObject = (type: DemoObjectType) => {
    const count = placedObjects.filter((object) => object.type === type).length;
    const xLimit = room.widthM / 2 - 0.55;
    const zLimit = room.depthM / 2 - 0.55;
    const isWallMounted = type === "mirror" || type === "tv";
    nextObjectIdRef.current += 1;
      const nextObject: PlacedDemoObject = {
        id: `${room.id}-${type}-${nextObjectIdRef.current}-${count}`,
        type,
      x: isWallMounted
        ? clamp(count === 0 ? 0 : (count % 2 === 0 ? -0.55 : 0.55), -xLimit, xLimit)
        : clamp((count % 2 === 0 ? -0.3 : 0.3) + count * 0.18, -xLimit, xLimit),
      y: type === "mirror" ? 1.62 : type === "tv" ? 1.48 : 0,
      z:
        isWallMounted
          ? -zLimit
          : clamp(0.18 + count * 0.16, -zLimit, zLimit),
        rotationDeg:
          type === "counter" || type === "wardrobe"
            ? -90
            : type === "tv" || type === "mirror"
              ? 0
              : 0,
        scale: type === "mirror" ? 0.78 : type === "tv" ? 0.9 : 1,
        modelYOffset: type === "microwave" ? 0.92 : 0,
        isVisible: true,
      };

    setPlacedObjects((current) => [...current, nextObject]);
    setObjectRenderStates((current) => ({ ...current, [nextObject.id]: "placeholder" }));
    setSelectedObjectId(nextObject.id);
  };

  const updateSelectedObject = (updates: Partial<PlacedDemoObject>) => {
    if (!selectedObjectId) {
      return;
    }

    setPlacedObjects((current) =>
      current.map((object) =>
        object.id === selectedObjectId
          ? {
              ...object,
              ...updates,
            }
          : object,
      ),
    );
  };

  const toggleObjectVisibility = (objectId: string) => {
    setPlacedObjects((current) =>
      current.map((object) =>
        object.id === objectId
          ? {
              ...object,
              isVisible: object.isVisible === false,
            }
          : object,
      ),
    );
  };

  const deleteSelectedObject = () => {
    if (!selectedObjectId) {
      return;
    }

    setPlacedObjects((current) => current.filter((object) => object.id !== selectedObjectId));
    setObjectRenderStates((current) => {
      const next = { ...current };
      delete next[selectedObjectId];
      return next;
    });
    setSelectedObjectId(null);
  };

  const resetRoomObjects = () => {
    syncRoomObjects(room.id);
  };

  const roomSelectorContent = (
    <div className="grid gap-3">
      {roomTemplates.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => handleRoomChange(template.id)}
          data-active={room.id === template.id}
          className={`toggle-pill min-h-11 rounded-[24px] border px-4 py-4 text-left transition ${
            room.id === template.id
              ? "border-sky-400/50 bg-sky-400/10 text-white shadow-[0_0_24px_rgba(56,189,248,0.12)]"
              : "border-white/10 bg-white/4 text-slate-200 hover:bg-white/8"
          }`}
        >
          <p className="font-semibold text-current">{translateRoomLabel(template.id, t)}</p>
          <p className="mt-1 text-sm text-slate-300">{translateRoomDescription(template.id, t)}</p>
        </button>
      ))}
    </div>
  );

  const surfaceSelectorContent = (
    <div className="grid gap-3">
      {[
        {
          id: "floor" as SurfaceSelection,
          label: t("floor"),
          copy: t("applyFloorCopy"),
        },
        {
          id: "left-wall" as SurfaceSelection,
          label: t("leftWall"),
          copy: t("targetLeftWallCopy"),
        },
        {
          id: "right-wall" as SurfaceSelection,
          label: t("rightWall"),
          copy: t("targetRightWallCopy"),
        },
        {
          id: "back-wall" as SurfaceSelection,
          label: t("backWall"),
          copy: t("targetBackWallCopy"),
        },
        {
          id: "all-walls" as SurfaceSelection,
          label: t("allWalls"),
          copy: t("wallSelectionsHelp"),
        },
      ].map((surface) => {
        const isActive = surfaceTarget === surface.id;

        return (
          <button
            key={surface.id}
            type="button"
            onClick={() => setSurfaceTarget(surface.id)}
            data-active={isActive}
            className={`toggle-pill min-h-11 rounded-[24px] px-4 py-4 text-left transition ${
              isActive
                ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]"
                : "bg-white/5 text-slate-200 hover:bg-white/8"
            }`}
          >
            <p className="text-sm font-semibold">{surface.label}</p>
            <p className={`mt-1 text-sm ${isActive ? "text-slate-100/90" : "text-slate-300"}`}>
              {surface.copy}
            </p>
          </button>
        );
      })}
    </div>
  );

    const sceneObjectsContent = (
      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
          {t("addObjects")}
        </p>
        {placedObjects.length ? (
          <div className="mt-3 grid gap-2">
            {placedObjects.map((object, index) => {
              const isSelected = object.id === selectedObjectId;
              const isVisible = object.isVisible !== false;

              return (
                <div
                  key={object.id}
                  className={`flex items-center gap-2 rounded-[18px] border px-3 py-2.5 transition ${
                    isSelected
                      ? "border-sky-400/40 bg-sky-500/12"
                      : "border-white/10 bg-slate-950/45 hover:border-white/20"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedObjectId(object.id)}
                    className="min-h-11 min-w-0 flex-1 rounded-[14px] px-1 py-1 text-left text-sm"
                  >
                    <p className={`font-semibold ${isSelected ? "text-sky-100" : "text-slate-100"}`}>
                      {index + 1}. {getObjectLabel(object.type)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {isVisible ? t("visible") : t("hidden")}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleObjectVisibility(object.id)}
                    aria-label={isVisible ? t("hideObject") : t("showObject")}
                    title={isVisible ? t("hideObject") : t("showObject")}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                  >
                    <VisibilityIcon visible={isVisible} />
                  </button>
                </div>
              );
            })}
          </div>
      ) : (
        <p className="mt-3 text-sm text-slate-300">
          {t("emptyRoomObjectHelp", { roomName: t("emptyRoom") })}
        </p>
      )}
    </div>
  );

  const selectedObjectControls = selectedObject ? (
    <div className="rounded-[22px] border border-white/10 bg-white/5 p-3.5 md:sticky md:top-20">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
        {t("selectedObject")}
      </p>
      <p className="mt-1.5 text-base font-semibold text-slate-50">
        {getObjectLabel(selectedObject.type)}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {selectedObject.isVisible === false ? t("hidden") : t("visible")}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => updateSelectedObject({ y: 0 })}
          className="secondary-btn min-h-10 rounded-[14px] px-3 py-2 text-xs"
        >
          {t("floorButton")}
        </button>
        <button
          type="button"
          onClick={() =>
            updateSelectedObject({ y: Math.min(3, (selectedObject.y ?? 0) + 0.1) })
          }
          className="secondary-btn min-h-10 rounded-[14px] px-3 py-2 text-xs"
        >
          {t("raise")}
        </button>
        <button
          type="button"
          onClick={() =>
            updateSelectedObject({ y: Math.max(-0.2, (selectedObject.y ?? 0) - 0.1) })
          }
          className="secondary-btn min-h-10 rounded-[14px] px-3 py-2 text-xs"
        >
          {t("lower")}
        </button>
      </div>

      <label className="mt-3 block">
        <span className="mb-2 block text-sm font-medium text-slate-200">
          {t("xPosition", { value: selectedObject.x.toFixed(2) })}
        </span>
        <input
          type="range"
          min={-room.widthM / 2 + 0.45}
          max={room.widthM / 2 - 0.45}
          step="0.05"
          value={selectedObject.x}
          onChange={(event) => updateSelectedObject({ x: Number(event.target.value) })}
          className="w-full accent-sky-400"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-2 block text-sm font-medium text-slate-200">
          {t("yPosition", { value: (selectedObject.y ?? 0).toFixed(2) })}
        </span>
        <input
          type="range"
          min="-0.2"
          max="3"
          step="0.01"
          value={selectedObject.y ?? 0}
          onChange={(event) => updateSelectedObject({ y: Number(event.target.value) })}
          className="w-full accent-sky-400"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-2 block text-sm font-medium text-slate-200">
          {t("zPosition", { value: selectedObject.z.toFixed(2) })}
        </span>
        <input
          type="range"
          min={-room.depthM / 2 + 0.45}
          max={room.depthM / 2 - 0.45}
          step="0.05"
          value={selectedObject.z}
          onChange={(event) => updateSelectedObject({ z: Number(event.target.value) })}
          className="w-full accent-sky-400"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-2 block text-sm font-medium text-slate-200">
          {t("rotation", { value: Math.round(selectedObject.rotationDeg) })}
        </span>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={selectedObject.rotationDeg}
          onChange={(event) => updateSelectedObject({ rotationDeg: Number(event.target.value) })}
          className="w-full accent-sky-400"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-2 block text-sm font-medium text-slate-200">
          {t("scale", { value: selectedObject.scale.toFixed(2) })}
        </span>
        <input
          type="range"
          min="0.6"
          max="1.8"
          step="0.05"
          value={selectedObject.scale}
          onChange={(event) => updateSelectedObject({ scale: Number(event.target.value) })}
          className="w-full accent-sky-400"
        />
      </label>

      <button
        type="button"
        onClick={deleteSelectedObject}
        className="secondary-btn mt-4 min-h-10 w-full rounded-[14px] px-4 py-2.5 text-sm"
      >
        {t("deleteObject")}
      </button>
    </div>
  ) : (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-slate-300">{t("selectObjectHelp")}</p>
    </div>
  );

  const addObjectButtons = (
    <div className="rounded-[22px] border border-white/10 bg-white/5 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{t("addObjects")}</p>
        <span className="text-xs text-slate-400">{t("manualPlacement")}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {objectOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => addObject(option.value)}
            className="flex min-h-10 items-center justify-start gap-2 rounded-[14px] border border-white/10 bg-slate-950/45 px-3 py-2 text-left text-[13px] font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/8 hover:text-white active:translate-y-[1px]"
          >
            <span className="text-base leading-none">{objectIcons[option.value]}</span>
            <span className="whitespace-nowrap leading-none">{translateObjectLabel(option.value, t)}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const advancedSceneControls = (
    <details className="panel rounded-[24px] p-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-left [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-base font-semibold text-slate-50">{t("advanced")}</p>
          <p className="mt-1 text-sm text-slate-300">
            {t("advancedSceneHelp")}
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">{t("open")}</span>
      </summary>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={saveSceneLocally} className="secondary-btn px-4 py-2.5 text-sm">
          {t("saveScene")}
        </button>
        <button type="button" onClick={loadSavedScene} className="secondary-btn px-4 py-2.5 text-sm">
          {t("loadSavedScene")}
        </button>
        <button type="button" onClick={resetSavedScene} className="secondary-btn px-4 py-2.5 text-sm">
          {t("resetSavedScene")}
        </button>
        <button
          type="button"
          onClick={saveSceneToCloud}
          disabled={isSavingSceneToCloud || !cloudConfigured}
          className="secondary-btn px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isSavingSceneToCloud ? t("saving") : t("saveSceneToCloud")}
        </button>
        <button
          type="button"
          onClick={loadLatestCloudScene}
          disabled={isLoadingCloudScene || !cloudConfigured}
          className="secondary-btn px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isLoadingCloudScene ? t("loading") : t("loadLatestCloudScene")}
        </button>
      </div>

      <p className="mt-3 text-sm text-slate-300">
        {sceneStatus ||
          cloudError ||
          (!cloudConfigured ? t("cloudNotConfigured") : "")}
      </p>
    </details>
  );

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 md:px-6">
        <SiteNav />
      </div>

      <main className="mx-auto flex min-h-screen w-full max-w-[1660px] flex-col gap-2 px-3 py-3 md:px-4 md:py-3">
        <section className="fade-in-up py-0.5">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="display-title text-[1.75rem] font-semibold text-white md:text-[2.15rem]">
                {t("appTitle")}
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-300 md:text-[0.9rem]">
                {t("appSubtitle")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 xl:justify-end">
              <button type="button" onClick={exportScreenshot} className="secondary-btn px-4 py-2.5 text-sm">
                {t("exportPreviewImage")}
              </button>
              <button type="button" onClick={requestQuote} className="primary-btn px-4 py-2.5 text-sm">
                {t("requestQuote")}
              </button>
            </div>
          </div>
        </section>

        <section
          id="visualizer"
          className="grid items-start gap-2 xl:grid-cols-[236px_minmax(0,1fr)]"
        >
          <aside className="hidden md:flex md:flex-col md:gap-3">
            <div className="panel rounded-[24px] p-3.5">
              <p className="section-kicker">{t("chooseRoom")}</p>
              <div className="mt-3">{roomSelectorContent}</div>
            </div>

            <div className="panel rounded-[24px] p-3.5">
              <p className="section-kicker">{t("chooseSurface")}</p>
              <div className="mt-3">{surfaceSelectorContent}</div>
            </div>
          </aside>

          <section className="flex flex-col gap-2">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="rounded-full bg-sky-400/12 px-3 py-1.5 font-semibold text-sky-100">
                    {translateRoomLabel(room.id, t)}
                  </span>
                  <span className="rounded-full bg-white/8 px-3 py-1.5">
                    {t("activeTarget", { target: targetLabel })}
                  </span>
                  <span className="rounded-full bg-white/8 px-3 py-1.5">
                    {t("floor")}: {floorTile?.name ?? t("none")}
                  </span>
                  <span className="rounded-full bg-white/8 px-3 py-1.5">
                    {t("leftWall")}: {leftWallTile?.name ?? t("none")}
                  </span>
                  <span className="rounded-full bg-white/8 px-3 py-1.5">
                    {t("rightWall")}: {rightWallTile?.name ?? t("none")}
                  </span>
                  <span className="rounded-full bg-white/8 px-3 py-1.5">
                    {t("backWall")}: {backWallTile?.name ?? t("none")}
                  </span>
                </div>
                <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
                  <span>{t("recommendedMaterialsCount", { count: recommendedTiles.length })}</span>
                </div>
              </div>
            </div>

            <div className="grid items-start gap-2 xl:grid-cols-[minmax(0,1fr)_296px]">
              <div className="flex min-w-0 flex-col gap-2">
                <RoomViewer
                  room={room}
                  floorTile={floorTile}
                  wallTile={backWallTile}
                  wallSurfaceTiles={wallSurfaceTiles}
                  placedObjects={placedObjects}
                  selectedObjectId={selectedObjectId}
                  onSelectObject={setSelectedObjectId}
                  onObjectRenderStateChange={(objectId, state) =>
                    setObjectRenderStates((current) =>
                      current[objectId] === state ? current : { ...current, [objectId]: state },
                    )
                  }
                  onCanvasReady={setCanvasElement}
                  showCameraButtons
                  hideDecor
                  helperText={t("viewerHelp")}
                  frameClassName="h-[62vh] min-h-[400px] max-h-[76vh] md:h-[590px] lg:h-[660px] xl:h-[720px]"
                />

                <div className="panel rounded-[22px] p-4 md:hidden">
                  <p className="text-sm font-medium text-slate-100">{t("mobileViewerHelp")}</p>
                </div>

                <div className="grid gap-3 md:hidden">
                  <AccordionSection
                    title={t("chooseRoom")}
                    subtitle={`${translateRoomLabel(room.id, t)} · ${room.widthM}m x ${room.depthM}m x ${room.heightM}m`}
                    openLabel={t("open")}
                    defaultOpen
                  >
                    {roomSelectorContent}
                  </AccordionSection>

                  <AccordionSection
                    title={t("chooseSurface")}
                    subtitle={t("activeTarget", { target: targetLabel })}
                    openLabel={t("open")}
                    defaultOpen
                  >
                    {surfaceSelectorContent}
                  </AccordionSection>

                  <AccordionSection
                    title={t("tileCatalog")}
                    subtitle={t("demoTilesCount", { count: catalogTiles.length })}
                    openLabel={t("open")}
                    defaultOpen
                  >
                    <div className="mb-3 flex gap-2">
                      {(["recommended", "all"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setCatalogMode(mode)}
                          className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                            catalogMode === mode
                              ? "bg-sky-400 text-slate-950"
                              : "bg-white/8 text-slate-200 hover:bg-white/12"
                          }`}
                        >
                          {mode === "recommended" ? t("recommended") : t("all")}
                        </button>
                      ))}
                    </div>
                    <div className="mb-3">
                      <input
                        type="search"
                        value={catalogSearch}
                        onChange={(event) => setCatalogSearch(event.target.value)}
                        placeholder={t("searchMaterials")}
                        className="min-h-11 w-full rounded-full border border-white/10 bg-slate-950/55 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300/50"
                      />
                    </div>
                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                      {[
                        { value: "all" as const, label: t("all") },
                        { value: "tile" as const, label: t("tiles") },
                        { value: "wallpaper" as const, label: t("wallpapers") },
                        { value: "laminate" as const, label: t("laminates") },
                      ].map((category) => (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() => setCategoryFilter(category.value)}
                          className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
                            categoryFilter === category.value
                              ? "bg-white text-slate-950"
                              : "bg-white/8 text-slate-200 hover:bg-white/12"
                          }`}
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>
                    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                      {catalogTiles.map((tile) => (
                        <div key={tile.id} className="min-w-[190px] flex-none">
                          <TileCard
                            tile={tile}
                            selected={selectedTileId === tile.id}
                            targetLabel={targetLabel}
                            categoryLabel={materialCategoryLabel(tile)}
                            activeLabel={t("active")}
                            imageUnavailableLabel={t("imageUnavailable")}
                            tapToApplyLabel={t("tapToApply", { target: targetLabel })}
                            onClick={() => applyTile(tile.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionSection>

                  <AccordionSection
                    title={t("addObjects")}
                    subtitle={t("stagedObjectsCount", { count: placedObjects.length })}
                    openLabel={t("open")}
                  >
                    <div className="space-y-4">
                      {sceneObjectsContent}
                      {selectedObjectControls}
                      {addObjectButtons}
                    </div>
                  </AccordionSection>
                </div>

                <section className="hidden rounded-[28px] p-4 md:block md:p-5">
                  <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="section-kicker">{t("tileCatalog")}</p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-50">
                        {t("tileCatalog")}
                      </h2>
                      <p className="mt-1 text-sm text-slate-300">
                        {t("activeCatalogTarget", { target: targetLabel })}
                      </p>
                    </div>
                    <div className="glass-chip rounded-[18px] px-4 py-2.5 text-sm text-slate-300">
                      <p className="font-semibold text-slate-50">
                        {t("recommendedMaterialsCount", { count: recommendedTiles.length })}
                      </p>
                      <p className="mt-1">{t("selectTileInstantly")}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["recommended", "all"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCatalogMode(mode)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          catalogMode === mode
                            ? "bg-sky-400 text-slate-950 shadow-[0_0_22px_rgba(56,189,248,0.24)]"
                            : "bg-white/8 text-slate-200 hover:bg-white/12"
                        }`}
                      >
                        {mode === "recommended" ? t("recommended") : t("all")}
                      </button>
                      ))}
                  </div>

                  <div className="mt-2.5 grid gap-2.5 lg:grid-cols-[minmax(240px,320px)_1fr] lg:items-center">
                    <input
                      type="search"
                      value={catalogSearch}
                      onChange={(event) => setCatalogSearch(event.target.value)}
                      placeholder={t("searchMaterials")}
                      className="min-h-11 rounded-full border border-white/10 bg-slate-950/55 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300/50"
                    />
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "all" as const, label: t("all") },
                        { value: "tile" as const, label: t("tiles") },
                        { value: "wallpaper" as const, label: t("wallpapers") },
                        { value: "laminate" as const, label: t("laminates") },
                      ].map((category) => (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() => setCategoryFilter(category.value)}
                          className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                            categoryFilter === category.value
                              ? "bg-white text-slate-950"
                              : "bg-white/8 text-slate-200 hover:bg-white/12"
                          }`}
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {catalogTiles.map((tile) => (
                      <TileCard
                        key={tile.id}
                        tile={tile}
                        selected={selectedTileId === tile.id}
                        targetLabel={targetLabel}
                        categoryLabel={materialCategoryLabel(tile)}
                        activeLabel={t("active")}
                        imageUnavailableLabel={t("imageUnavailable")}
                        tapToApplyLabel={t("tapToApply", { target: targetLabel })}
                        onClick={() => applyTile(tile.id)}
                      />
                    ))}
                  </div>
                </section>

                <div className="pt-1">{advancedSceneControls}</div>
              </div>

              <aside className="panel hidden min-w-[280px] self-start rounded-[22px] p-3.5 md:block">
                <p className="section-kicker">{t("addObjects")}</p>
                <h3 className="mt-1.5 text-lg font-semibold text-slate-50">
                  {t("automaticRoomObjects")}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {t("roomObjectsHelp")}
                </p>

                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={resetRoomObjects} className="secondary-btn px-4 py-2.5 text-sm">
                    {t("resetRoomObjects")}
                  </button>
                </div>

                <div className="mt-3">{sceneObjectsContent}</div>
                <div className="mt-2.5">{selectedObjectControls}</div>
                <div className="mt-2.5">{addObjectButtons}</div>
              </aside>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
