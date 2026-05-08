import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SavedSceneData, Tile } from "@/types/tile";

export const SUPABASE_TILE_BUCKET = "tile-images";
export const CLOUD_TILES_UPDATED_EVENT = "tileview-3d-cloud-tiles-updated";

type CloudTileRow = {
  id: string;
  name: string;
  image_url: string;
  width_cm: number;
  height_cm: number;
  finish: string | null;
  tone: string | null;
  created_at: string;
};

type CloudSceneRow = {
  id: string;
  name: string;
  room_type: string;
  active_surface: string | null;
  floor_tile_id: string | null;
  left_wall_tile_id: string | null;
  right_wall_tile_id: string | null;
  back_wall_tile_id: string | null;
  objects: unknown;
  created_at: string;
  updated_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
let browserClient: SupabaseClient | null | undefined;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

export function toCloudTileId(id: string) {
  return `cloud-tile-${id}`;
}

export function mapCloudTile(row: CloudTileRow): Tile {
  return {
    id: toCloudTileId(row.id),
    name: row.name,
    image: row.image_url,
    widthCm: Number(row.width_cm),
    heightCm: Number(row.height_cm),
    finish: row.finish ?? "",
    tone: row.tone ?? "",
  };
}

export function mapCloudScene(row: CloudSceneRow): SavedSceneData {
  return {
    name: row.name,
    roomType: row.room_type as SavedSceneData["roomType"],
    activeSurface: (row.active_surface ?? "floor") as SavedSceneData["activeSurface"],
    floorTileId: row.floor_tile_id ?? "",
    leftWallTileId: row.left_wall_tile_id ?? "",
    rightWallTileId: row.right_wall_tile_id ?? "",
    backWallTileId: row.back_wall_tile_id ?? "",
    objects: Array.isArray(row.objects) ? (row.objects as SavedSceneData["objects"]) : [],
  };
}

export async function fetchCloudTiles() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return [] as Tile[];
  }

  const { data, error } = await client
    .from("tiles")
    .select("id,name,image_url,width_cm,height_cm,finish,tone,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapCloudTile(row as CloudTileRow));
}

export function notifyCloudTilesChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CLOUD_TILES_UPDATED_EVENT));
  }
}
