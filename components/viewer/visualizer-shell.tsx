"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";
import { useTiles } from "@/hooks/use-tiles";
import { roomTemplates } from "@/lib/room-templates";
import {
  DemoObjectType,
  PlacedDemoObject,
  RoomTemplateId,
  Tile,
  WallSurfaceId,
} from "@/types/tile";
import { RoomViewer } from "./room-viewer";

type SurfaceSelection = "floor" | "left-wall" | "right-wall" | "back-wall" | "all-walls";

const objectOptions: Array<{ value: DemoObjectType; label: string }> = [
  { value: "sink", label: "Sink" },
  { value: "toilet", label: "Toilet" },
  { value: "shower", label: "Shower" },
  { value: "vanity", label: "Vanity" },
  { value: "mirror", label: "Mirror" },
  { value: "counter", label: "Counter" },
  { value: "sofa", label: "Sofa" },
  { value: "bed", label: "Bed" },
  { value: "tv", label: "TV" },
  { value: "refrigerator", label: "Fridge" },
  { value: "microwave", label: "Microwave" },
  { value: "table", label: "Table" },
  { value: "wardrobe", label: "Wardrobe" },
];

const objectIcons: Record<DemoObjectType, string> = {
  sink: "🚰",
  toilet: "🚽",
  shower: "🚿",
  vanity: "🪞",
  mirror: "🪞",
  counter: "🧱",
  table: "🪑",
  chair: "🪑",
  sofa: "🛋",
  bed: "🛏",
  tv: "📺",
  refrigerator: "🧊",
  microwave: "📦",
  wardrobe: "🚪",
};

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

function getObjectLabel(type: DemoObjectType) {
  return objectOptions.find((option) => option.value === type)?.label ?? type;
}

function TileThumbnail({ src, alt, className }: { src: string; alt: string; className?: string }) {
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
          Image unavailable
        </div>
      ) : null}
    </div>
  );
}

function TileCard({
  tile,
  selected,
  targetLabel,
  onClick,
}: {
  tile: Tile;
  selected: boolean;
  targetLabel: string;
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
        className="h-32 w-full rounded-[22px] border border-white/10"
      />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-50">{tile.name}</p>
          <p className="mt-1 text-sm text-slate-300">
            {tile.widthCm}x{tile.heightCm} cm
          </p>
        </div>
        {selected ? (
          <span className="rounded-full border border-sky-400/25 bg-sky-400/12 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-sky-200">
            Active
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
        <span className="glass-chip rounded-full px-3 py-1">{tile.finish}</span>
        <span className="glass-chip rounded-full px-3 py-1">{tile.tone}</span>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-300/80">Tap to apply to {targetLabel}</p>
    </button>
  );
}

function AccordionSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
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
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Open</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export function VisualizerShell() {
  const { tiles } = useTiles();
  const [roomId, setRoomId] = useState<RoomTemplateId>("bathroom");
  const [surfaceTarget, setSurfaceTarget] = useState<SurfaceSelection>("floor");
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
      return "floor";
    }

    if (surfaceTarget === "left-wall") {
      return "left wall";
    }

    if (surfaceTarget === "right-wall") {
      return "right wall";
    }

    if (surfaceTarget === "back-wall") {
      return "back wall";
    }

    return "all walls";
  }, [surfaceTarget]);
  const selectedObject = placedObjects.find((object) => object.id === selectedObjectId) ?? null;

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
    window.alert("Demo action: quote requests will be connected in production.");
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
          <p className="font-semibold text-current">{template.label}</p>
          <p className="mt-1 text-sm text-slate-300">{template.description}</p>
        </button>
      ))}
    </div>
  );

  const surfaceSelectorContent = (
    <div className="grid gap-3">
      {[
        {
          id: "floor" as SurfaceSelection,
          label: "Floor",
          copy: "Apply the active tile only to the floor.",
        },
        {
          id: "left-wall" as SurfaceSelection,
          label: "Left Wall",
          copy: "Apply the active tile only to the left wall.",
        },
        {
          id: "right-wall" as SurfaceSelection,
          label: "Right Wall",
          copy: "Apply the active tile only to the right wall.",
        },
        {
          id: "back-wall" as SurfaceSelection,
          label: "Back Wall",
          copy: "Apply the active tile only to the back wall.",
        },
        {
          id: "all-walls" as SurfaceSelection,
          label: "All Walls",
          copy: "Apply the active tile across every wall surface.",
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
        Scene objects
      </p>
      {placedObjects.length ? (
        <div className="mt-3 grid gap-2">
          {placedObjects.map((object, index) => {
            const isSelected = object.id === selectedObjectId;

            return (
              <button
                key={object.id}
                type="button"
                onClick={() => setSelectedObjectId(object.id)}
                className={`min-h-11 rounded-[18px] border px-4 py-3 text-left text-sm transition ${
                  isSelected
                    ? "border-sky-400/40 bg-sky-500/12 text-sky-100"
                    : "border-white/10 bg-slate-950/45 text-slate-200 hover:border-white/20"
                }`}
              >
                <p className="font-semibold">
                  {index + 1}. {getObjectLabel(object.type)}
                </p>
                <div className="mt-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] ${
                      objectRenderStates[object.id] === "gltf"
                        ? "border border-emerald-400/30 bg-emerald-500/12 text-emerald-200"
                        : "border border-amber-400/30 bg-amber-500/12 text-amber-200"
                    }`}
                  >
                    {objectRenderStates[object.id] === "gltf" ? "Real model" : "Placeholder"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  X {object.x.toFixed(2)} m / Z {object.z.toFixed(2)} m
                </p>
                {objectRenderStates[object.id] === "placeholder" && object.type !== "table" ? (
                  <p className="mt-2 text-xs font-medium text-amber-300">
                    Model missing or failed to load
                  </p>
                ) : null}
                {object.type === "table" && objectRenderStates[object.id] === "placeholder" ? (
                  <p className="mt-2 text-xs font-medium text-rose-300">
                    Failed to load table.glb
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-300">
          Empty Room starts without objects. Add any object manually if needed.
        </p>
      )}
    </div>
  );

  const selectedObjectControls = selectedObject ? (
    <div className="rounded-[22px] border border-white/10 bg-white/5 p-3.5 md:sticky md:top-20">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
        Selected object
      </p>
      <p className="mt-1.5 text-base font-semibold text-slate-50">
        {getObjectLabel(selectedObject.type)}
      </p>
      <div className="mt-2.5">
        <span
          className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${
            objectRenderStates[selectedObject.id] === "gltf"
              ? "border border-emerald-400/30 bg-emerald-500/12 text-emerald-200"
              : "border border-amber-400/30 bg-amber-500/12 text-amber-200"
          }`}
        >
          {objectRenderStates[selectedObject.id] === "gltf" ? "Real model" : "Placeholder"}
        </span>
      </div>
      {selectedObject.type === "table" && objectRenderStates[selectedObject.id] === "placeholder" ? (
        <p className="mt-2.5 text-sm font-medium text-rose-300">
          Failed to load table.glb
        </p>
      ) : null}
      {objectRenderStates[selectedObject.id] === "placeholder" && selectedObject.type !== "table" ? (
        <p className="mt-2.5 text-sm font-medium text-amber-300">
          Model missing or failed to load.
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => updateSelectedObject({ y: 0 })}
          className="secondary-btn min-h-10 rounded-[14px] px-3 py-2 text-xs"
        >
          Floor
        </button>
        <button
          type="button"
          onClick={() =>
            updateSelectedObject({ y: Math.min(3, (selectedObject.y ?? 0) + 0.1) })
          }
          className="secondary-btn min-h-10 rounded-[14px] px-3 py-2 text-xs"
        >
          Raise
        </button>
        <button
          type="button"
          onClick={() =>
            updateSelectedObject({ y: Math.max(-0.2, (selectedObject.y ?? 0) - 0.1) })
          }
          className="secondary-btn min-h-10 rounded-[14px] px-3 py-2 text-xs"
        >
          Lower
        </button>
      </div>

      <label className="mt-3 block">
        <span className="mb-2 block text-sm font-medium text-slate-200">
          X position {selectedObject.x.toFixed(2)} m
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
          Height / Y Position {(selectedObject.y ?? 0).toFixed(2)} m
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
          Z position {selectedObject.z.toFixed(2)} m
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
          Rotation {Math.round(selectedObject.rotationDeg)} deg
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
          Scale {selectedObject.scale.toFixed(2)}x
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
        Delete Object
      </button>
    </div>
  ) : (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-slate-300">Select an object from the scene list to edit placement.</p>
    </div>
  );

  const addObjectButtons = (
    <div className="rounded-[22px] border border-white/10 bg-white/5 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Add objects</p>
        <span className="text-xs text-slate-400">Manual placement</span>
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
            <span className="whitespace-nowrap leading-none">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 md:px-6">
        <SiteNav />
      </div>

      <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
        <section className="panel fade-in-up overflow-hidden rounded-[32px] p-5 md:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="max-w-3xl">
              <p className="section-kicker">3D Showroom Demo</p>
              <h1 className="display-title mt-3 text-3xl font-semibold text-white md:text-5xl">
                3D Tile Room Visualizer
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
                Preview floor and wall tiles in staged 3D room types with automatic object placement before buying.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 xl:justify-end">
                <button type="button" onClick={requestQuote} className="primary-btn px-5 py-3 text-sm">
                  Request Quote
                </button>
                <button type="button" onClick={exportScreenshot} className="secondary-btn px-5 py-3 text-sm">
                  Export Preview Image
                </button>
            </div>
          </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="panel panel-hover rounded-[24px] bg-slate-950/60 p-4 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-200">Demo catalog</p>
                <p className="mt-2 text-2xl font-semibold">{tiles.length}</p>
                <p className="mt-1 text-xs text-slate-300">Local tile options ready for comparison.</p>
              </div>
              <div className="panel panel-hover rounded-[24px] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-200">Room template</p>
                <p className="mt-2 text-lg font-semibold text-slate-50">{room.label}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {room.widthM}m x {room.depthM}m x {room.heightM}m
                </p>
              </div>
              <div className="panel panel-hover rounded-[24px] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-200">Active surface</p>
                <p className="mt-2 text-lg font-semibold capitalize text-slate-50">{targetLabel}</p>
                <p className="mt-1 text-xs text-slate-300">Choose exact surfaces before selecting a tile.</p>
              </div>
            </div>
        </section>

        <section className="fade-in-up-delayed grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Choose a room",
              body: "Start with Bathroom, Kitchen, Living Room, Bedroom, or Empty Room to load a relevant staged scene.",
            },
            {
              title: "Pick a tile",
              body: "Choose Floor, Left Wall, Right Wall, Back Wall, or All Walls before tapping a tile card.",
            },
            {
              title: "Place objects and export",
              body: "Adjust object placement, orbit the scene, compare finishes, and export a preview image.",
            },
          ].map((step, index) => (
            <div key={step.title} className="panel panel-hover rounded-[24px] p-4">
              <p className="section-kicker">Step {index + 1}</p>
              <p className="mt-2 text-lg font-semibold text-slate-50">{step.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{step.body}</p>
            </div>
          ))}
        </section>

        <section
          id="visualizer"
          className="grid items-start gap-4 xl:grid-cols-[270px_minmax(0,1fr)]"
        >
          <aside className="hidden md:flex md:flex-col md:gap-6">
            <div className="panel rounded-[28px] p-5">
              <p className="section-kicker">Room template</p>
              <p className="mt-3 text-xl font-semibold text-slate-50">Choose the customer room scene</p>
              <div className="mt-5">{roomSelectorContent}</div>
            </div>

            <div className="panel rounded-[28px] p-5">
              <p className="section-kicker">Surface actions</p>
              <p className="mt-3 text-xl font-semibold text-slate-50">Choose the exact tile target surface</p>
              <div className="mt-5">{surfaceSelectorContent}</div>
            </div>

            <div className="panel rounded-[28px] p-5">
              <p className="section-kicker">Selection summary</p>
              <div className="mt-4 grid gap-3">
                <div className="glass-chip rounded-[22px] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Floor</p>
                  <p className="mt-2 text-sm font-semibold text-slate-50">{floorTile?.name ?? "None"}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {floorTile ? `${floorTile.widthCm}x${floorTile.heightCm} cm` : "No tile applied yet"}
                  </p>
                </div>
                <div className="glass-chip rounded-[22px] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Left wall</p>
                  <p className="mt-2 text-sm font-semibold text-slate-50">{leftWallTile?.name ?? "None"}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {leftWallTile ? `${leftWallTile.widthCm}x${leftWallTile.heightCm} cm` : "No tile applied yet"}
                  </p>
                </div>
                <div className="glass-chip rounded-[22px] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Right wall</p>
                  <p className="mt-2 text-sm font-semibold text-slate-50">{rightWallTile?.name ?? "None"}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {rightWallTile ? `${rightWallTile.widthCm}x${rightWallTile.heightCm} cm` : "No tile applied yet"}
                  </p>
                </div>
                <div className="glass-chip rounded-[22px] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Back wall</p>
                  <p className="mt-2 text-sm font-semibold text-slate-50">{backWallTile?.name ?? "None"}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {backWallTile ? `${backWallTile.widthCm}x${backWallTile.heightCm} cm` : "No tile applied yet"}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex flex-col gap-5">
            <div className="panel rounded-[26px] p-3 md:p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="section-kicker">3D preview</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-50">
                    Live room preview for the {room.label}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Rotate the room, compare tile finishes, and fine-tune the automatically placed room objects.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportScreenshot}
                  className="secondary-btn px-5 py-3 text-sm"
                >
                  Export Preview Image
                </button>
              </div>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-w-0 flex-col gap-4">
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
                  helperText="Drag to rotate · Pinch/Wheel to zoom · Right drag to pan"
                />

                <div className="panel rounded-[22px] p-4 md:hidden">
                  <p className="text-sm font-medium text-slate-100">Drag to rotate · Pinch to zoom</p>
                </div>

                <div className="grid gap-3 md:hidden">
                  <AccordionSection
                    title="Room selector"
                    subtitle={`${room.label} · ${room.widthM}m x ${room.depthM}m x ${room.heightM}m`}
                    defaultOpen
                  >
                    {roomSelectorContent}
                  </AccordionSection>

                  <AccordionSection
                    title="Surface selector"
                    subtitle={`Active target: ${targetLabel}`}
                    defaultOpen
                  >
                    {surfaceSelectorContent}
                  </AccordionSection>

                  <AccordionSection
                    title="Tile catalog"
                    subtitle={`${tiles.length} demo tiles`}
                    defaultOpen
                  >
                    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                      {tiles.map((tile) => (
                        <div key={tile.id} className="min-w-[220px] flex-none">
                          <TileCard
                            tile={tile}
                            selected={selectedTileId === tile.id}
                            targetLabel={targetLabel}
                            onClick={() => applyTile(tile.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionSection>

                  <AccordionSection
                    title="Objects"
                    subtitle={`${placedObjects.length} staged objects`}
                  >
                    <div className="space-y-4">
                      {sceneObjectsContent}
                      {selectedObjectControls}
                      {addObjectButtons}
                    </div>
                  </AccordionSection>
                </div>

                <div className="hidden gap-4 md:grid md:grid-cols-3">
                  <div className="panel panel-hover rounded-[26px] p-5">
                    <p className="section-kicker">Floor tile</p>
                    <p className="mt-3 text-xl font-semibold text-slate-50">{floorTile?.name ?? "None selected"}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {floorTile?.finish ?? "Choose from the catalog below."}
                    </p>
                  </div>
                  <div className="panel panel-hover rounded-[26px] p-5">
                    <p className="section-kicker">Wall tile</p>
                    <p className="mt-3 text-xl font-semibold text-slate-50">{targetLabel}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Active wall target updates independently, or all walls together.
                    </p>
                  </div>
                  <div className="panel panel-hover rounded-[26px] p-5">
                    <p className="section-kicker">Model status</p>
                    <p className="mt-3 text-xl font-semibold text-slate-50">
                      {placedObjects.filter((object) => objectRenderStates[object.id] === "gltf").length} real models
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Missing assets fall back to shaped placeholders, while valid GLBs show a visible Real model badge.
                    </p>
                  </div>
                </div>

                <section className="hidden rounded-[34px] p-5 md:block md:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="section-kicker">Demo catalog</p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-50">
                        Browse tiles for the active surface
                      </h2>
                      <p className="mt-2 text-sm text-slate-300">
                        The currently active target is <span className="font-semibold capitalize text-slate-100">{targetLabel}</span>.
                      </p>
                    </div>
                    <div className="glass-chip rounded-[22px] px-4 py-3 text-sm text-slate-300">
                      <p className="font-semibold text-slate-50">{tiles.length} demo tiles</p>
                      <p className="mt-1">Select any tile card to update the preview instantly.</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {tiles.map((tile) => (
                      <TileCard
                        key={tile.id}
                        tile={tile}
                        selected={selectedTileId === tile.id}
                        targetLabel={targetLabel}
                        onClick={() => applyTile(tile.id)}
                      />
                    ))}
                  </div>
                </section>
              </div>

              <aside className="panel hidden min-w-[320px] self-start rounded-[26px] p-4 md:block">
                <p className="section-kicker">Objects</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-50">
                  Automatic room objects
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Room type selection auto-loads relevant objects. You can still add, move, rotate, scale, delete, or reset them manually.
                </p>

                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={resetRoomObjects} className="secondary-btn px-4 py-3 text-sm">
                    Reset Room Objects
                  </button>
                </div>

                <div className="mt-4">{sceneObjectsContent}</div>
                <div className="mt-3">{selectedObjectControls}</div>
                <div className="mt-3">{addObjectButtons}</div>
              </aside>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
