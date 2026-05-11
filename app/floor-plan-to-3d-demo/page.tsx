"use client";

import Image from "next/image";
import { ChangeEvent, CSSProperties, useMemo, useRef, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { RoomViewer } from "@/components/viewer/room-viewer";
import { useTiles } from "@/hooks/use-tiles";
import { useLanguage } from "@/lib/i18n";
import { RoomOpening, RoomTemplate, SceneSurfaceSelection, Tile, WallSurfaceId } from "@/types/tile";

type SurfaceSelection = SceneSurfaceSelection;
type OpeningKind = RoomOpening["kind"];
type RoomDimensions = {
  widthM: number;
  depthM: number;
  heightM: number;
};

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
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 px-3 text-center text-xs font-medium text-slate-300">
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
  activeLabel,
  imageUnavailableLabel,
  tapToApplyLabel,
  onClick,
  style,
}: {
  tile: Tile;
  selected: boolean;
  targetLabel: string;
  activeLabel: string;
  imageUnavailableLabel: string;
  tapToApplyLabel: string;
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
        errorLabel={imageUnavailableLabel}
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
            {activeLabel}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
        <span className="glass-chip rounded-full px-3 py-1">{tile.finish}</span>
        <span className="glass-chip rounded-full px-3 py-1">{tile.tone}</span>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-300/80">{tapToApplyLabel}</p>
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
  const { t } = useLanguage();
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
      label: t("floorPlanRoom"),
      description: t("floorPlanRoomDescription"),
      widthM: generatedRoom.widthM,
      depthM: generatedRoom.depthM,
      heightM: generatedRoom.heightM,
      cameraPosition: [4, 3, 5],
      wallColor: "#f2efe9",
      floorColor: "#ddd6cc",
      decor: [],
    };
  }, [generatedRoom, t]);

  const activeTileId = useMemo(() => {
    if (selectedSurface === "floor") {
      return floorTileId;
    }

    if (selectedSurface === "left-wall") {
      return wallTileIds.left;
    }

    if (selectedSurface === "right-wall") {
      return wallTileIds.right;
    }

    if (selectedSurface === "back-wall") {
      return wallTileIds.back;
    }

    const uniqueWallTileIds = new Set(Object.values(wallTileIds));
    return uniqueWallTileIds.size === 1 ? [...uniqueWallTileIds][0] : "";
  }, [floorTileId, selectedSurface, wallTileIds]);
  const targetLabel = selectedSurface === "floor"
    ? t("floor")
    : selectedSurface === "left-wall"
      ? t("leftWall")
      : selectedSurface === "right-wall"
        ? t("rightWall")
        : selectedSurface === "back-wall"
          ? t("backWall")
          : t("allWalls");

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

    if (selectedSurface === "all-walls") {
      setWallTileIds({
        back: tileId,
        left: tileId,
        right: tileId,
      });
      return;
    }

    const wallKey: WallSurfaceId =
      selectedSurface === "left-wall" ? "left" : selectedSurface === "right-wall" ? "right" : "back";

    setWallTileIds((current) => ({
      ...current,
      [wallKey]: tileId,
    }));
  };

  const addOpening = (kind: OpeningKind) => {
    if (selectedSurface === "floor" || selectedSurface === "all-walls") {
      return;
    }

    const wall: WallSurfaceId =
      selectedSurface === "left-wall" ? "left" : selectedSurface === "right-wall" ? "right" : "back";
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

      <main className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-4 md:px-6 md:py-5">
        <section className="panel fade-in-up rounded-[30px] px-4 py-4 md:px-5 md:py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 max-w-4xl">
              <p className="section-kicker">{t("floorPlanTitle")}</p>
              <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                {t("floorPlanHero")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-[0.95rem]">
                {t("floorPlanIntro")}
              </p>
            </div>
            <div className="min-w-0 xl:max-w-[720px]">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-sky-200">
                {t("demoFlow")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200 md:text-sm">
                {[
                  t("floorPlanStep1"),
                  t("floorPlanStep2"),
                  t("floorPlanStep3"),
                  t("floorPlanStep4"),
                ].map((step) => (
                  <div key={step} className="glass-chip rounded-full px-3 py-2">
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-5">
            <div className="panel rounded-[28px] p-4 md:p-5">
              <p className="section-kicker">{t("manualDimensions")}</p>
              <p className="mt-2 text-lg font-semibold text-slate-50">{t("defineRoomShell")}</p>
              <div className="mt-4 grid gap-4">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-200">{t("widthMeters")}</span>
                  <input
                    value={widthInput}
                    onChange={(event) => setWidthInput(event.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/50"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-200">{t("depthMeters")}</span>
                  <input
                    value={depthInput}
                    onChange={(event) => setDepthInput(event.target.value)}
                    inputMode="decimal"
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/50"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-200">{t("heightMeters")}</span>
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
                  {t("generateRoom")}
                </button>
              </div>
            </div>

            <div className="panel rounded-[28px] p-4 md:p-5">
              <p className="section-kicker">{t("floorPlanUpload")}</p>
              <p className="mt-2 text-lg font-semibold text-slate-50">{t("optionalSketchReference")}</p>
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
              {referencePlanUrl ? (
                <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/50">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={referencePlanUrl}
                      alt={referencePlanName || t("uploadedFloorPlanReference")}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="border-t border-white/10 px-4 py-3 text-xs font-medium text-sky-200">
                    {referencePlanName || t("floorPlanReferenceUploaded")}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="panel rounded-[28px] p-4 md:p-5">
              <p className="section-kicker">{t("chooseSurface")}</p>
              <div className="mt-4 grid gap-3">
                {[
                  { id: "floor", label: t("floor"), copy: t("applyFloorCopy") },
                  { id: "left-wall", label: t("leftWall"), copy: t("targetLeftWallCopy") },
                  { id: "right-wall", label: t("rightWall"), copy: t("targetRightWallCopy") },
                  { id: "back-wall", label: t("backWall"), copy: t("targetBackWallCopy") },
                  { id: "all-walls", label: t("allWalls"), copy: t("wallSelectionsHelp") },
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
            </div>

            <div className="panel rounded-[28px] p-4 md:p-5">
              <p className="section-kicker">{t("openings")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {t("openingsHelp")}
              </p>
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={() => addOpening("door")}
                  disabled={selectedSurface === "floor" || selectedSurface === "all-walls"}
                  className={`secondary-btn px-5 py-3 text-sm ${
                    selectedSurface === "floor" || selectedSurface === "all-walls" ? "cursor-not-allowed opacity-55" : ""
                  }`}
                >
                  {t("addDoor")}
                </button>
                <button
                  type="button"
                  onClick={() => addOpening("window")}
                  disabled={selectedSurface === "floor" || selectedSurface === "all-walls"}
                  className={`secondary-btn px-5 py-3 text-sm ${
                    selectedSurface === "floor" || selectedSurface === "all-walls" ? "cursor-not-allowed opacity-55" : ""
                  }`}
                >
                  {t("addWindow")}
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-300/85">
                {t("openingsNote")}
              </p>
            </div>
          </aside>

          <section className="flex flex-col gap-6">
            <div className="panel rounded-[30px] p-5 lg:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="section-kicker">{t("roomPreview3d")}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-50 md:text-2xl">
                    {t("generatedRoomShell")}
                  </p>
                </div>
                <div className="glass-chip rounded-[22px] px-4 py-3 text-sm text-slate-200">
                  <p className="font-semibold text-slate-50">
                    {generatedRoom.widthM.toFixed(1)}m x {generatedRoom.depthM.toFixed(1)}m x {generatedRoom.heightM.toFixed(1)}m
                  </p>
                  <p className="mt-1">{t("frontWallOpen")}</p>
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
                  helperText={t("viewerHelp")}
                  frameClassName="h-[42vh] min-h-[300px] max-h-[520px] md:h-[400px] md:max-h-none lg:h-[460px] xl:h-[520px]"
                />
              </div>

              <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="glass-chip rounded-[20px] px-4 py-3 text-sm text-slate-200">
                    <p className="font-semibold text-slate-50">{t("floor")}</p>
                    <p className="mt-1">{floorTile?.name ?? t("none")}</p>
                  </div>
                  <div className="glass-chip rounded-[20px] px-4 py-3 text-sm text-slate-200">
                    <p className="font-semibold text-slate-50">{t("leftWall")}</p>
                    <p className="mt-1">{wallSurfaceTiles.left?.name ?? t("none")}</p>
                  </div>
                  <div className="glass-chip rounded-[20px] px-4 py-3 text-sm text-slate-200">
                    <p className="font-semibold text-slate-50">{t("rightWall")}</p>
                    <p className="mt-1">{wallSurfaceTiles.right?.name ?? t("none")}</p>
                  </div>
                  <div className="glass-chip rounded-[20px] px-4 py-3 text-sm text-slate-200">
                    <p className="font-semibold text-slate-50">{t("backWall")}</p>
                    <p className="mt-1">{wallSurfaceTiles.back?.name ?? t("none")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={exportPreview}
                  className="primary-btn px-5 py-3 text-sm"
                >
                  {t("exportPreviewImage")}
                </button>
              </div>
            </div>

            <section className="panel rounded-[34px] p-5 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="section-kicker">{t("tileCatalog")}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-50">
                    {t("applyTileToSurface")}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    {t("currentTarget", { target: targetLabel })}
                  </p>
                </div>
                <div className="glass-chip rounded-[22px] px-4 py-3 text-sm text-slate-200">
                  <p className="font-semibold text-slate-50">{t("demoTilesCount", { count: tiles.length })}</p>
                  <p className="mt-1">{t("wallSelectionsHelp")}</p>
                </div>
              </div>

              <div className="catalog-entrance mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                {tiles.map((tile, index) => (
                  <TileCard
                    key={tile.id}
                    tile={tile}
                    selected={activeTileId === tile.id}
                    targetLabel={targetLabel}
                    activeLabel={t("active")}
                    imageUnavailableLabel={t("imageUnavailable")}
                    tapToApplyLabel={t("tapToApply", { target: targetLabel })}
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
