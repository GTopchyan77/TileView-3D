"use client";

import Image from "next/image";
import { ChangeEvent, CSSProperties, useMemo, useRef, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { RoomViewer } from "@/components/viewer/room-viewer";
import { useTiles } from "@/hooks/use-tiles";
import { RoomOpening, RoomTemplate, Tile, WallSurfaceId } from "@/types/tile";

type SurfaceSelection = "floor" | WallSurfaceId;
type WallApplyMode = "selected" | "all";
type OpeningKind = RoomOpening["kind"];
type RoomDimensions = {
  widthM: number;
  depthM: number;
  heightM: number;
};

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
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 px-3 text-center text-xs font-medium text-slate-300">
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
  style,
}: {
  tile: Tile;
  selected: boolean;
  targetLabel: string;
  onClick: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`tile-card panel panel-hover group p-3 ${selected ? "glow-selected selection-pop" : ""}`}
    >
      <TileThumbnail
        src={tile.image}
        alt={tile.name}
        className="h-28 w-full rounded-[22px] border border-white/10"
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

function clampRoomValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readUploadedImage(event: ChangeEvent<HTMLInputElement>, onLoaded: (dataUrl: string, fileName: string) => void) {
  const file = event.target.files?.[0];

  if (!file) {
    onLoaded("", "");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    onLoaded(typeof reader.result === "string" ? reader.result : "", file.name);
  };
  reader.readAsDataURL(file);
}

function getTargetLabel(surface: SurfaceSelection, wallApplyMode: WallApplyMode) {
  if (surface === "floor") {
    return "floor";
  }

  if (wallApplyMode === "all") {
    return "all walls";
  }

  return `${surface} wall`;
}

function buildOpening(
  kind: OpeningKind,
  wall: WallSurfaceId,
  dimensions: RoomDimensions,
  existingCount: number,
): RoomOpening {
  const isBackWall = wall === "back";
  const span = isBackWall ? dimensions.widthM : dimensions.depthM;
  const spacingStart = Math.max(-span / 3, -span / 2 + 0.8);
  const spacingStep = Math.max(0.8, span / 4);
  const safeOffset = clampRoomValue(
    spacingStart + existingCount * spacingStep,
    -span / 2 + 0.7,
    span / 2 - 0.7,
  );

  if (kind === "door") {
    return {
      id: `${wall}-door-${Date.now()}-${existingCount}`,
      wall,
      kind,
      offset: safeOffset,
      width: 0.9,
      height: Math.min(2.1, dimensions.heightM - 0.2),
      bottom: 0,
    };
  }

  return {
    id: `${wall}-window-${Date.now()}-${existingCount}`,
    wall,
    kind,
    offset: safeOffset,
    width: 1.2,
    height: Math.min(0.9, Math.max(0.6, dimensions.heightM * 0.34)),
    bottom: Math.min(1.05, Math.max(0.7, dimensions.heightM * 0.38)),
  };
}

export default function FloorPlanTo3DDemoPage() {
  const { tiles } = useTiles();
  const viewerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [widthInput, setWidthInput] = useState("4.8");
  const [depthInput, setDepthInput] = useState("3.8");
  const [heightInput, setHeightInput] = useState("2.7");
  const [generatedRoom, setGeneratedRoom] = useState<RoomDimensions>({
    widthM: 4.8,
    depthM: 3.8,
    heightM: 2.7,
  });
  const [referencePlanUrl, setReferencePlanUrl] = useState("");
  const [referencePlanName, setReferencePlanName] = useState("");
  const [selectedSurface, setSelectedSurface] = useState<SurfaceSelection>("floor");
  const [wallApplyMode, setWallApplyMode] = useState<WallApplyMode>("selected");
  const [floorTileId, setFloorTileId] = useState("travertine-sand");
  const [wallTileIds, setWallTileIds] = useState<Record<WallSurfaceId, string>>({
    back: "marble-ivory",
    left: "marble-ivory",
    right: "marble-ivory",
  });
  const [openings, setOpenings] = useState<RoomOpening[]>([]);
  const [motionTrigger, setMotionTrigger] = useState(0);

  const floorTile = tiles.find((tile) => tile.id === floorTileId);
  const wallSurfaceTiles = useMemo(() => {
    return {
      back: tiles.find((tile) => tile.id === wallTileIds.back),
      left: tiles.find((tile) => tile.id === wallTileIds.left),
      right: tiles.find((tile) => tile.id === wallTileIds.right),
    };
  }, [tiles, wallTileIds]);

  const room = useMemo<RoomTemplate>(() => {
    return {
      id: "empty-room",
      label: "Floor Plan Room",
      description: "Dimension-driven room shell for floor plan preview.",
      widthM: generatedRoom.widthM,
      depthM: generatedRoom.depthM,
      heightM: generatedRoom.heightM,
      cameraPosition: [4, 3, 5],
      wallColor: "#f2efe9",
      floorColor: "#ddd6cc",
      decor: [],
    };
  }, [generatedRoom]);

  const activeTileId =
    selectedSurface === "floor" ? floorTileId : wallTileIds[selectedSurface];
  const targetLabel = getTargetLabel(selectedSurface, wallApplyMode);

  const generateRoom = () => {
    const widthM = clampRoomValue(Number(widthInput) || 4.8, 2, 12);
    const depthM = clampRoomValue(Number(depthInput) || 3.8, 2, 12);
    const heightM = clampRoomValue(Number(heightInput) || 2.7, 2.1, 4.5);

    setGeneratedRoom({ widthM, depthM, heightM });
    setOpenings([]);
    setMotionTrigger((current) => current + 1);
  };

  const applyTile = (tileId: string) => {
    if (selectedSurface === "floor") {
      setFloorTileId(tileId);
      return;
    }

    if (wallApplyMode === "all") {
      setWallTileIds({
        back: tileId,
        left: tileId,
        right: tileId,
      });
      return;
    }

    setWallTileIds((current) => ({
      ...current,
      [selectedSurface]: tileId,
    }));
  };

  const addOpening = (kind: OpeningKind) => {
    if (selectedSurface === "floor") {
      return;
    }

    const wall = selectedSurface;
    const countOnWall = openings.filter((opening) => opening.wall === wall).length;
    const nextOpening = buildOpening(kind, wall, generatedRoom, countOnWall);
    setOpenings((current) => [...current, nextOpening]);
  };

  const exportPreview = () => {
    const canvas = viewerCanvasRef.current;

    if (!canvas) {
      return;
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "floor-plan-room-preview.png";
    link.click();
  };

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 md:px-6">
        <SiteNav />
      </div>

      <main className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
        <section className="panel fade-in-up rounded-[36px] p-6 md:p-8 xl:p-10">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_420px] xl:items-end">
            <div className="max-w-4xl">
              <p className="section-kicker">Floor Plan to 3D Demo</p>
              <h1 className="display-title mt-4 text-4xl font-semibold text-white md:text-6xl">
                Generate a simple 3D room from entered dimensions
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 md:text-lg">
                This demo creates a 3D room from entered dimensions. Uploaded floor plan is used as a visual reference.
              </p>
              <div className="subtle-note mt-6 rounded-[24px] px-5 py-4 text-sm leading-6">
                Automatic AI floor plan recognition can be added in production.
              </div>
            </div>
            <div className="panel panel-hover rounded-[30px] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
                Demo flow
              </p>
              <div className="mt-4 grid gap-3 text-sm text-slate-200">
                {[
                  "1. Enter room dimensions",
                  "2. Upload a floor plan sketch if you have one",
                  "3. Generate the room shell",
                  "4. Select a surface and apply tiles",
                ].map((step) => (
                  <div key={step} className="glass-chip rounded-[18px] px-4 py-3">
                    {step}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Manual dimensions drive the room size. The optional uploaded floor plan is reference-only in this MVP.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-6">
            <div className="panel rounded-[30px] p-5">
              <p className="section-kicker">Manual dimensions</p>
              <p className="mt-3 text-xl font-semibold text-slate-50">Define the room shell</p>
              <div className="mt-5 grid gap-4">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-200">Width meters</span>
                  <input
                    value={widthInput}
                    onChange={(event) => setWidthInput(event.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/50"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-200">Depth meters</span>
                  <input
                    value={depthInput}
                    onChange={(event) => setDepthInput(event.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/50"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-200">Height meters</span>
                  <input
                    value={heightInput}
                    onChange={(event) => setHeightInput(event.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/50"
                  />
                </label>
                <button
                  type="button"
                  onClick={generateRoom}
                  className="primary-btn generate-pulse px-5 py-3 text-sm"
                >
                  Generate Room
                </button>
              </div>
            </div>

            <div className="panel rounded-[30px] p-5">
              <p className="section-kicker">Floor plan upload</p>
              <p className="mt-3 text-xl font-semibold text-slate-50">Optional sketch reference</p>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  readUploadedImage(event, (dataUrl, fileName) => {
                    setReferencePlanUrl(dataUrl);
                    setReferencePlanName(fileName);
                  })
                }
                className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-900"
              />
              <p className="mt-3 text-xs leading-6 text-slate-300/90">
                This demo creates a 3D room from entered dimensions. Uploaded floor plan is used as a visual reference.
              </p>
              {referencePlanUrl ? (
                <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/50">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={referencePlanUrl}
                      alt={referencePlanName || "Uploaded floor plan reference"}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="border-t border-white/10 px-4 py-3 text-xs font-medium text-sky-200">
                    {referencePlanName || "Floor plan reference uploaded"}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="panel rounded-[30px] p-5">
              <p className="section-kicker">Surface selection</p>
              <div className="mt-4 grid gap-3">
                {[
                  { id: "floor", label: "Floor", copy: "Apply floor tile to the room base." },
                  { id: "back", label: "Back wall", copy: "Target the back wall only." },
                  { id: "left", label: "Left wall", copy: "Target the left wall only." },
                  { id: "right", label: "Right wall", copy: "Target the right wall only." },
                ].map((surface) => {
                  const isActive = selectedSurface === surface.id;

                  return (
                    <button
                      key={surface.id}
                      type="button"
                      onClick={() => setSelectedSurface(surface.id as SurfaceSelection)}
                      className={`toggle-pill rounded-[24px] px-4 py-4 text-left transition ${
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

              <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Wall tile mode
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setWallApplyMode("selected")}
                    className={`secondary-btn px-4 py-2 text-sm ${
                      wallApplyMode === "selected" ? "border-sky-400/50 bg-sky-500/15 text-sky-100" : ""
                    }`}
                  >
                    Selected wall
                  </button>
                  <button
                    type="button"
                    onClick={() => setWallApplyMode("all")}
                    className={`secondary-btn px-4 py-2 text-sm ${
                      wallApplyMode === "all" ? "border-sky-400/50 bg-sky-500/15 text-sky-100" : ""
                    }`}
                  >
                    All walls
                  </button>
                </div>
              </div>
            </div>

            <div className="panel rounded-[30px] p-5">
              <p className="section-kicker">Openings</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Add simple demo door or window markers to the currently selected wall.
              </p>
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={() => addOpening("door")}
                  disabled={selectedSurface === "floor"}
                  className={`secondary-btn px-5 py-3 text-sm ${
                    selectedSurface === "floor" ? "cursor-not-allowed opacity-55" : ""
                  }`}
                >
                  Add Door
                </button>
                <button
                  type="button"
                  onClick={() => addOpening("window")}
                  disabled={selectedSurface === "floor"}
                  className={`secondary-btn px-5 py-3 text-sm ${
                    selectedSurface === "floor" ? "cursor-not-allowed opacity-55" : ""
                  }`}
                >
                  Add Window
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-300/85">
                Openings are simple visual markers for the demo and do not cut geometry out of the wall.
              </p>
            </div>
          </aside>

          <section className="flex flex-col gap-6">
            <div className="panel rounded-[32px] p-6 lg:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="section-kicker">3D room preview</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-50">
                    Generated room shell from manual dimensions
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    This demo creates a 3D room from entered dimensions. Uploaded floor plan is used as a visual reference.
                  </p>
                </div>
                <div className="glass-chip rounded-[22px] px-4 py-3 text-sm text-slate-200">
                  <p className="font-semibold text-slate-50">
                    {generatedRoom.widthM.toFixed(1)}m x {generatedRoom.depthM.toFixed(1)}m x {generatedRoom.heightM.toFixed(1)}m
                  </p>
                  <p className="mt-1">Front wall is left open for camera access.</p>
                </div>
              </div>

              <div className="mt-5">
                <RoomViewer
                  room={room}
                  floorTile={floorTile}
                  wallSurfaceTiles={wallSurfaceTiles}
                  openings={openings}
                  onCanvasReady={(canvas) => {
                    viewerCanvasRef.current = canvas;
                  }}
                  motionTrigger={motionTrigger}
                  showCameraButtons
                  helperText="Left drag: rotate / Wheel: zoom / Right drag: pan"
                />
              </div>

              <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="glass-chip rounded-[20px] px-4 py-3 text-sm text-slate-200">
                    <p className="font-semibold text-slate-50">Selected surface</p>
                    <p className="mt-1 capitalize">{selectedSurface === "floor" ? "Floor" : `${selectedSurface} wall`}</p>
                  </div>
                  <div className="glass-chip rounded-[20px] px-4 py-3 text-sm text-slate-200">
                    <p className="font-semibold text-slate-50">Wall tile mode</p>
                    <p className="mt-1 capitalize">{wallApplyMode === "all" ? "All walls" : "Selected wall"}</p>
                  </div>
                  <div className="glass-chip rounded-[20px] px-4 py-3 text-sm text-slate-200">
                    <p className="font-semibold text-slate-50">Openings</p>
                    <p className="mt-1">{openings.length} markers placed</p>
                  </div>
                  <div className="glass-chip rounded-[20px] px-4 py-3 text-sm text-slate-200">
                    <p className="font-semibold text-slate-50">Reference plan</p>
                    <p className="mt-1">{referencePlanUrl ? "Uploaded" : "Not uploaded"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={exportPreview}
                  className="primary-btn px-5 py-3 text-sm"
                >
                  Export Preview Image
                </button>
              </div>
            </div>

            <section className="panel rounded-[34px] p-5 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="section-kicker">Demo catalog</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-50">
                    Apply tile to the selected room surface
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Current target: <span className="font-semibold capitalize text-slate-100">{targetLabel}</span>.
                  </p>
                </div>
                <div className="glass-chip rounded-[22px] px-4 py-3 text-sm text-slate-200">
                  <p className="font-semibold text-slate-50">{tiles.length} demo tiles</p>
                  <p className="mt-1">Wall selections can target one wall or all walls.</p>
                </div>
              </div>

              <div className="catalog-entrance mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                {tiles.map((tile, index) => (
                  <TileCard
                    key={tile.id}
                    tile={tile}
                    selected={activeTileId === tile.id}
                    targetLabel={targetLabel}
                    onClick={() => applyTile(tile.id)}
                    style={{ animationDelay: `${index * 45}ms` }}
                  />
                ))}
              </div>
            </section>
          </section>
        </section>
      </main>
    </div>
  );
}
