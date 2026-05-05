"use client";

import { useMemo, useState } from "react";
import seedTiles from "@/data/tiles.json";
import { CUSTOM_TILES_STORAGE_KEY } from "@/lib/storage";
import { Tile } from "@/types/tile";

function parseStoredTiles(value: string | null): Tile[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Tile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useTiles() {
  const defaultTiles = seedTiles as Tile[];
  const [customTiles, setCustomTiles] = useState<Tile[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    return parseStoredTiles(window.localStorage.getItem(CUSTOM_TILES_STORAGE_KEY));
  });

  const tiles = useMemo(() => {
    return [...defaultTiles, ...customTiles];
  }, [customTiles, defaultTiles]);

  const addTile = (tile: Tile) => {
    setCustomTiles((current) => {
      const next = [...current, tile];
      window.localStorage.setItem(CUSTOM_TILES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const deleteCustomTile = (tileId: string) => {
    setCustomTiles((current) => {
      const next = current.filter((tile) => tile.id !== tileId);
      window.localStorage.setItem(CUSTOM_TILES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetCustomTiles = () => {
    setCustomTiles([]);
    window.localStorage.setItem(CUSTOM_TILES_STORAGE_KEY, JSON.stringify([]));
  };

  return { tiles, defaultTiles, customTiles, addTile, deleteCustomTile, resetCustomTiles };
}
