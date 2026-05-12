import type {
  MaterialCategory,
  RoomTemplateId,
  SceneSurfaceSelection,
  SurfaceTarget,
  Tile,
} from "@/types/tile";

export type CatalogMode = "recommended" | "all";

const BATHROOM_LIKE_ROOMS = new Set<RoomTemplateId>(["bathroom"]);
const SHOWROOM_ROOMS = new Set<RoomTemplateId>(["kitchen", "bedroom", "living-room"]);

export function getTileCategory(tile: Tile): MaterialCategory {
  return tile.category ?? "tile";
}

export function getSurfaceTarget(surface: SceneSurfaceSelection): SurfaceTarget {
  return surface === "floor" ? "floor" : "wall";
}

export function getRecommendedCategories(
  roomId: RoomTemplateId,
  surface: SceneSurfaceSelection,
): MaterialCategory[] {
  const surfaceTarget = getSurfaceTarget(surface);

  if (BATHROOM_LIKE_ROOMS.has(roomId)) {
    return ["tile"];
  }

  if (SHOWROOM_ROOMS.has(roomId)) {
    return surfaceTarget === "floor" ? ["laminate"] : ["wallpaper"];
  }

  return surfaceTarget === "floor" ? ["tile", "laminate"] : ["tile", "wallpaper"];
}

export function isSurfaceCompatible(tile: Tile, surface: SceneSurfaceSelection) {
  return !tile.applicableSurfaces?.length || tile.applicableSurfaces.includes(getSurfaceTarget(surface));
}

export function isRecommendedMaterial(tile: Tile, roomId: RoomTemplateId, surface: SceneSurfaceSelection) {
  const recommendedCategories = getRecommendedCategories(roomId, surface);
  const roomMatches = !tile.recommendedRooms?.length || tile.recommendedRooms.includes(roomId);

  return (
    roomMatches &&
    isSurfaceCompatible(tile, surface) &&
    recommendedCategories.includes(getTileCategory(tile))
  );
}

export function getCatalogTiles(
  tiles: Tile[],
  roomId: RoomTemplateId,
  surface: SceneSurfaceSelection,
  mode: CatalogMode,
) {
  const categoryPriority: Record<MaterialCategory, number> = {
    laminate: getSurfaceTarget(surface) === "floor" ? 0 : 2,
    wallpaper: getSurfaceTarget(surface) === "wall" ? 0 : 2,
    tile: 1,
  };

  return tiles
    .map((tile, index) => ({
      tile,
      index,
      recommended: isRecommendedMaterial(tile, roomId, surface),
    }))
    .filter((item) => mode === "all" || item.recommended)
    .sort((a, b) => {
      if (a.recommended !== b.recommended) {
        return a.recommended ? -1 : 1;
      }

      const categoryDelta =
        categoryPriority[getTileCategory(a.tile)] - categoryPriority[getTileCategory(b.tile)];

      return categoryDelta || a.index - b.index;
    })
    .map((item) => item.tile);
}
