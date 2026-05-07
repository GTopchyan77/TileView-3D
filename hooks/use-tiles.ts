"use client";

import { useMemo, useSyncExternalStore } from "react";
import seedTiles from "@/data/tiles.json";
import { CUSTOM_TILES_STORAGE_KEY } from "@/lib/storage";
import { Tile } from "@/types/tile";

const DEFAULT_TILES = seedTiles as Tile[];
const EMPTY_CUSTOM_TILES: Tile[] = [];
const CUSTOM_TILES_UPDATED_EVENT = "custom-tiles-updated";
let cachedStoredTilesRaw: string | null | undefined;
let cachedStoredTilesParsed: Tile[] = EMPTY_CUSTOM_TILES;

function parseStoredTiles(value: string | null): Tile[] {
  if (!value) {
    return EMPTY_CUSTOM_TILES;
  }

  try {
    const parsed = JSON.parse(value) as Tile[];
    return Array.isArray(parsed) ? parsed : EMPTY_CUSTOM_TILES;
  } catch {
    return EMPTY_CUSTOM_TILES;
  }
}

function getCustomTilesSnapshot() {
  if (typeof window === "undefined") {
    return EMPTY_CUSTOM_TILES;
  }

  const rawValue = window.localStorage.getItem(CUSTOM_TILES_STORAGE_KEY);

  if (rawValue === cachedStoredTilesRaw) {
    return cachedStoredTilesParsed;
  }

  cachedStoredTilesRaw = rawValue;
  cachedStoredTilesParsed = parseStoredTiles(rawValue);
  return cachedStoredTilesParsed;
}

function getServerSnapshot() {
  return EMPTY_CUSTOM_TILES;
}

function notifyCustomTilesChanged() {
  window.dispatchEvent(new Event(CUSTOM_TILES_UPDATED_EVENT));
}

function subscribeToCustomTiles(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CUSTOM_TILES_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleCustomUpdate = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CUSTOM_TILES_UPDATED_EVENT, handleCustomUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CUSTOM_TILES_UPDATED_EVENT, handleCustomUpdate);
  };
}

export function useTiles() {
  const customTiles = useSyncExternalStore(
    subscribeToCustomTiles,
    getCustomTilesSnapshot,
    getServerSnapshot,
  );

  const tiles = useMemo(() => {
    return customTiles.length ? [...DEFAULT_TILES, ...customTiles] : DEFAULT_TILES;
  }, [customTiles]);

  const addTile = (tile: Tile) => {
    const next = [...customTiles, tile];
    window.localStorage.setItem(CUSTOM_TILES_STORAGE_KEY, JSON.stringify(next));
    notifyCustomTilesChanged();
  };

  const deleteCustomTile = (tileId: string) => {
    const next = customTiles.filter((tile) => tile.id !== tileId);
    window.localStorage.setItem(CUSTOM_TILES_STORAGE_KEY, JSON.stringify(next));
    notifyCustomTilesChanged();
  };

  const resetCustomTiles = () => {
    window.localStorage.setItem(CUSTOM_TILES_STORAGE_KEY, JSON.stringify([]));
    notifyCustomTilesChanged();
  };

  return {
    tiles,
    defaultTiles: DEFAULT_TILES,
    customTiles,
    addTile,
    deleteCustomTile,
    resetCustomTiles,
  };
}
