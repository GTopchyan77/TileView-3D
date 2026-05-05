"use client";

import Image from "next/image";
import { ChangeEvent, CSSProperties, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { RoomViewer } from "@/components/viewer/room-viewer";
import { useTiles } from "@/hooks/use-tiles";
import {
  buildApproximateRoom,
  PhotoRoomType,
  RoomSizePreset,
} from "@/lib/photo-room-demo";
import { DemoObjectType, PlacedDemoObject, SurfaceTarget, Tile } from "@/types/tile";

type Point = {
  x: number;
  y: number;
};

const roomTypeOptions: Array<{ value: PhotoRoomType; label: string }> = [
  { value: "bathroom", label: "Bathroom" },
  { value: "kitchen", label: "Kitchen" },
  { value: "living-room", label: "Living Room" },
  { value: "empty-room", label: "Empty Room" },
];

const roomSizeOptions: Array<{ value: RoomSizePreset; label: string }> = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

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
  { value: "refrigerator", label: "Refrigerator" },
  { value: "microwave", label: "Microwave" },
  { value: "table", label: "Table" },
  { value: "wardrobe", label: "Wardrobe" },
  { value: "chair", label: "Chair" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createPlacedObject(
  type: DemoObjectType,
  widthM: number,
  depthM: number,
  count: number,
): PlacedDemoObject {
  const xLimit = widthM / 2 - 0.55;
  const zLimit = depthM / 2 - 0.55;
  const defaultModelYOffset = () => {
    if (type === "mirror") {
      return 1.02;
    }

    if (type === "tv") {
      return 0.72;
    }

    if (type === "microwave") {
      return 0.92;
    }

    return 0;
  };
  const placements: Record<DemoObjectType, { x: number; z: number; rotationDeg: number; scale: number }> = {
    sink: { x: -widthM * 0.24, z: -depthM / 2 + 0.52, rotationDeg: 0, scale: 1 },
    toilet: { x: 0, z: -depthM / 2 + 0.58, rotationDeg: 0, scale: 1 },
    shower: { x: widthM / 2 - 0.78, z: -depthM / 2 + 0.78, rotationDeg: 0, scale: 1 },
    vanity: { x: 0.3, z: -depthM / 2 + 0.58, rotationDeg: 0, scale: 1 },
    mirror: { x: 0.3, z: -depthM / 2 + 0.46, rotationDeg: 0, scale: 1 },
    counter: { x: 0.3, z: -depthM / 2 + 0.56, rotationDeg: 0, scale: 1 },
    sofa: { x: 0, z: -depthM / 2 + 0.82, rotationDeg: 0, scale: 1 },
    bed: { x: 0, z: -depthM / 2 + 1, rotationDeg: 0, scale: 1 },
    tv: { x: 0, z: depthM / 2 - 0.48, rotationDeg: 180, scale: 1 },
    refrigerator: { x: -widthM / 2 + 0.62, z: -depthM / 2 + 0.52, rotationDeg: 0, scale: 1 },
    microwave: { x: widthM / 2 - 0.86, z: -depthM / 2 + 0.48, rotationDeg: 0, scale: 1 },
    table: { x: 0, z: 0.25, rotationDeg: 0, scale: 1 },
    wardrobe: { x: widthM / 2 - 0.7, z: -depthM / 2 + 0.72, rotationDeg: 0, scale: 1 },
    chair: { x: 0.92, z: 0.76, rotationDeg: -28, scale: 1 },
  };

  const base = placements[type];
  const spread = count * 0.32;

  return {
    id: `${type}-${Date.now()}-${count}`,
    type,
    x: clamp(base.x + (count % 2 === 0 ? spread : -spread * 0.6), -xLimit, xLimit),
    y: 0,
    z: clamp(base.z + (type === "table" || type === "chair" ? count * 0.18 : 0), -zLimit, zLimit),
    rotationDeg: base.rotationDeg,
    scale: base.scale,
    modelYOffset: defaultModelYOffset(),
  };
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/26 to-transparent" />
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

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function drawPolygonPath(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }

  if (points.length === 4) {
    ctx.closePath();
  }
}

function getPolygonBounds(points: Point[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function estimateSurfaceSizeCm(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  canvas: HTMLCanvasElement,
  target: SurfaceTarget,
) {
  const boundsWidth = Math.max(1, bounds.maxX - bounds.minX);
  const boundsHeight = Math.max(1, bounds.maxY - bounds.minY);
  const widthRatio = boundsWidth / canvas.width;
  const heightRatio = boundsHeight / canvas.height;

  const referenceRoomWidthCm = target === "floor" ? 460 : 380;
  const referenceRoomHeightCm = target === "floor" ? 320 : 280;

  return {
    widthCm: Math.max(60, widthRatio * referenceRoomWidthCm),
    heightCm: Math.max(60, heightRatio * referenceRoomHeightCm),
    boundsWidth,
    boundsHeight,
  };
}

export default function PhotoTo3DDemoPage() {
  const { tiles } = useTiles();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [photoFileName, setPhotoFileName] = useState("");
  const [surfaceTarget, setSurfaceTarget] = useState<SurfaceTarget>("floor");
  const [surfacePolygons, setSurfacePolygons] = useState<Record<SurfaceTarget, Point[]>>({
    floor: [],
    wall: [],
  });
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);
  const [floorTileId, setFloorTileId] = useState<string>("travertine-sand");
  const [wallTileId, setWallTileId] = useState<string>("marble-ivory");
  const [roomType, setRoomType] = useState<PhotoRoomType>("bathroom");
  const [roomSize, setRoomSize] = useState<RoomSizePreset>("medium");
  const [viewerMotionTick, setViewerMotionTick] = useState(0);
  const [showProjectionRoom, setShowProjectionRoom] = useState(false);
  const [projectionDepth, setProjectionDepth] = useState(3.8);
  const [projectionWallHeight, setProjectionWallHeight] = useState(2.6);
  const [projectionOpacity, setProjectionOpacity] = useState(0.72);
  const [placedObjects, setPlacedObjects] = useState<PlacedDemoObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [objectRenderStates, setObjectRenderStates] = useState<Record<string, "gltf" | "placeholder">>({});
  const [showExperimentalOverlay, setShowExperimentalOverlay] = useState(false);

  const templateRoom = useMemo(() => buildApproximateRoom(roomType, roomSize), [roomSize, roomType]);
  const projectionRoom = useMemo(
    () => ({
      ...templateRoom,
      label: "Photo Projection Room",
      description: "Approximate photo projection room shell.",
      depthM: projectionDepth,
      heightM: projectionWallHeight,
      cameraPosition: [4, 3, 5] as [number, number, number],
    }),
    [projectionDepth, projectionWallHeight, templateRoom],
  );
  const floorTile = tiles.find((tile) => tile.id === floorTileId);
  const wallTile = tiles.find((tile) => tile.id === wallTileId);
  const selectedObject = placedObjects.find((object) => object.id === selectedObjectId) ?? null;
  const selectedTileId = surfaceTarget === "floor" ? floorTileId : wallTileId;
  const targetLabel = surfaceTarget === "floor" ? "floor" : "wall";
  const activeSurfacePoints = surfacePolygons[surfaceTarget];
  const activeSurfaceComplete = activeSurfacePoints.length === 4;
  const activeInstruction =
    surfaceTarget === "floor"
      ? "Click 4 corners of the floor area in the photo"
      : "Click 4 corners of the wall area in the photo";

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setPhotoDataUrl("");
      setPhotoFileName("");
      setSurfacePolygons({ floor: [], wall: [] });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(typeof reader.result === "string" ? reader.result : "");
      setPhotoFileName(file.name);
      setSurfacePolygons({ floor: [], wall: [] });
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas || !photoDataUrl) {
      return;
    }

    const currentPoints = surfacePolygons[surfaceTarget];

    if (currentPoints.length >= 4) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const point: Point = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };

    setSurfacePolygons((current) => ({
      ...current,
      [surfaceTarget]: [...current[surfaceTarget], point],
    }));
  };

  const resetCurrentSelection = () => {
    setSurfacePolygons((current) => ({
      ...current,
      [surfaceTarget]: [],
    }));
  };

  const setSamplePolygon = (target: SurfaceTarget) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    const nextPoints: Point[] =
      target === "floor"
        ? [
            { x: width * 0.16, y: height * 0.8 },
            { x: width * 0.84, y: height * 0.8 },
            { x: width * 0.64, y: height * 0.98 },
            { x: width * 0.32, y: height * 0.98 },
          ]
        : [
            { x: width * 0.27, y: height * 0.18 },
            { x: width * 0.73, y: height * 0.18 },
            { x: width * 0.7, y: height * 0.62 },
            { x: width * 0.3, y: height * 0.62 },
          ];

    setSurfaceTarget(target);
    setSurfacePolygons((current) => ({
      ...current,
      [target]: nextPoints,
    }));
  };

  const renderOverlayCanvas = useCallback(
    async (
      targetCanvas: HTMLCanvasElement,
      options: {
        opacity: number;
        showGuides: boolean;
      },
    ) => {
      if (!photoDataUrl) {
        return;
      }

      const context = targetCanvas.getContext("2d");

      if (!context) {
        return;
      }

      const roomPhoto = await loadImage(photoDataUrl);
      targetCanvas.width = roomPhoto.naturalWidth;
      targetCanvas.height = roomPhoto.naturalHeight;
      context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      context.drawImage(roomPhoto, 0, 0, targetCanvas.width, targetCanvas.height);

      const surfaces: Array<{
        target: SurfaceTarget;
        tile?: Tile;
        stroke: string;
      }> = [
        { target: "floor", tile: floorTile, stroke: "#38bdf8" },
        { target: "wall", tile: wallTile, stroke: "#f8fafc" },
      ];

      for (const surface of surfaces) {
        const points = surfacePolygons[surface.target];

        if (points.length === 4 && surface.tile?.image) {
          try {
            const tileImage = await loadImage(surface.tile.image);
            const bounds = getPolygonBounds(points);
            const estimatedSurface = estimateSurfaceSizeCm(bounds, targetCanvas, surface.target);
            const xRepeat = Math.max(1, estimatedSurface.widthCm / surface.tile.widthCm);
            const yRepeat = Math.max(1, estimatedSurface.heightCm / surface.tile.heightCm);
            const tilePixelWidth = estimatedSurface.boundsWidth / xRepeat;
            const tilePixelHeight = estimatedSurface.boundsHeight / yRepeat;
            const pattern = context.createPattern(tileImage, "repeat");

            if (pattern) {
              const scaleX = tilePixelWidth / tileImage.naturalWidth;
              const scaleY = tilePixelHeight / tileImage.naturalHeight;

              pattern.setTransform(
                new DOMMatrix([scaleX, 0, 0, scaleY, bounds.minX, bounds.minY]),
              );

              context.save();
              drawPolygonPath(context, points);
              context.clip();
              context.globalAlpha = options.opacity;
              context.imageSmoothingEnabled = true;
              context.imageSmoothingQuality = "high";
              context.fillStyle = pattern;
              context.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
              context.restore();
            }
          } catch {
            // Keep the base photo visible even if tile texture loading fails.
          }
        }

        if (options.showGuides && points.length > 0) {
          context.save();
          drawPolygonPath(context, points);
          context.lineWidth = surface.target === surfaceTarget ? 2 : 1.5;
          context.strokeStyle = surface.stroke;
          context.setLineDash(points.length === 4 ? [] : [10, 8]);
          context.stroke();

          points.forEach((point, index) => {
            context.beginPath();
            context.fillStyle = surface.stroke;
            context.arc(point.x, point.y, 7, 0, Math.PI * 2);
            context.fill();

            context.fillStyle = "#ffffff";
            context.font = "bold 12px Segoe UI";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(String(index + 1), point.x, point.y + 0.5);
          });

          context.restore();
        }
      }
    },
    [floorTile, photoDataUrl, surfacePolygons, surfaceTarget, wallTile],
  );

  const exportOverlayPreview = async () => {
    if (!photoDataUrl) {
      return;
    }

    const exportCanvas = document.createElement("canvas");
    await renderOverlayCanvas(exportCanvas, {
      opacity: Math.max(0.9, overlayOpacity),
      showGuides: false,
    });

    const link = document.createElement("a");
    link.href = exportCanvas.toDataURL("image/png");
    link.download = `photo-tile-overlay-${surfaceTarget}.png`;
    link.click();
  };

  const applyTile = (tileId: string) => {
    if (surfaceTarget === "floor") {
      setFloorTileId(tileId);
      return;
    }

    setWallTileId(tileId);
  };

  const resetProjection = () => {
    setProjectionDepth(3.8);
    setProjectionWallHeight(2.6);
    setProjectionOpacity(0.72);
    setViewerMotionTick((current) => current + 1);
  };

  const addObject = (type: DemoObjectType) => {
    const count = placedObjects.filter((object) => object.type === type).length;
    const nextObject = createPlacedObject(type, projectionRoom.widthM, projectionRoom.depthM, count);
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

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !photoDataUrl) {
      return;
    }

    let cancelled = false;

    const drawCanvas = async () => {
      try {
        if (cancelled) {
          return;
        }
        await renderOverlayCanvas(canvas, {
          opacity: overlayOpacity,
          showGuides: true,
        });
      } catch {
        const context = canvas.getContext("2d");
        context?.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    void drawCanvas();

    return () => {
      cancelled = true;
    };
  }, [overlayOpacity, photoDataUrl, renderOverlayCanvas]);

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 md:px-6">
        <SiteNav />
      </div>

      <main className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
        <section className="panel fade-in-up rounded-[36px] p-6 md:p-8 xl:p-10">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_460px] xl:items-end">
            <div className="max-w-4xl">
              <p className="section-kicker">3D Tile Room Visualizer</p>
              <h1 className="display-title mt-4 text-4xl font-semibold text-white md:text-6xl">
                Main client demo: 3D room preview with tiles and objects
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 md:text-lg">
                Use the 3D room visualizer as the primary walkthrough, then show imported tiles and optional GLB object placement in the room preview.
              </p>
              <div className="subtle-note mt-6 rounded-[24px] px-5 py-4 text-sm leading-6">
                Experimental photo overlay is available as an internal preview only and is hidden by default for client demos.
              </div>
            </div>
            <div className="panel panel-hover rounded-[30px] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
                Main demo flow
              </p>
              <div className="mt-4 grid gap-3 text-sm text-slate-200">
                {[
                  "1. Open the 3D room visualizer",
                  "2. Choose floor or wall tile from the demo catalog",
                  "3. Place optional GLB objects in the room",
                  "4. Use Admin to import extra tiles if needed",
                ].map((step) => (
                  <div key={step} className="glass-chip rounded-[18px] px-4 py-3">
                    {step}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                This page keeps the photo tools available internally, but the client-facing demo should focus on the 3D room preview.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-6">
            <div className="panel rounded-[30px] p-5">
              <p className="section-kicker">Reference photo</p>
              <p className="mt-3 text-xl font-semibold text-slate-50">Optional uploaded room reference</p>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-900"
              />
              {photoFileName ? (
                <p className="mt-3 text-xs font-medium text-sky-200">Uploaded photo: {photoFileName}</p>
              ) : (
                <p className="mt-3 text-xs text-slate-300/85">
                  Upload a room photo only if you want to show the optional projected-room preview or internal overlay tools.
                </p>
              )}
            </div>

            <div className="panel rounded-[30px] p-5">
              <p className="section-kicker">Main demo</p>
              <p className="mt-3 text-xl font-semibold text-slate-50">
                Keep the walkthrough focused on 3D tiles and objects
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                The strongest client path is the 3D room visualizer, the demo catalog, admin tile import, and optional GLB object placement.
              </p>
            </div>

            <div className="panel rounded-[30px] p-5">
              <p className="section-kicker">Surface target</p>
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={() => setSurfaceTarget("floor")}
                  data-active={surfaceTarget === "floor"}
                  className={`toggle-pill rounded-[24px] px-4 py-4 text-left transition ${
                    surfaceTarget === "floor"
                      ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]"
                      : "bg-white/5 text-slate-200 hover:bg-white/8"
                  }`}
                >
                  <p className="text-sm font-semibold">Floor</p>
                  <p className={`mt-1 text-sm ${surfaceTarget === "floor" ? "text-slate-100/90" : "text-slate-300"}`}>
                    Draw four corners around the floor area.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSurfaceTarget("wall")}
                  data-active={surfaceTarget === "wall"}
                  className={`toggle-pill rounded-[24px] px-4 py-4 text-left transition ${
                    surfaceTarget === "wall"
                      ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]"
                      : "bg-white/5 text-slate-200 hover:bg-white/8"
                  }`}
                >
                  <p className="text-sm font-semibold">Wall</p>
                  <p className={`mt-1 text-sm ${surfaceTarget === "wall" ? "text-slate-100/90" : "text-slate-300"}`}>
                    Draw four corners around the wall area.
                  </p>
                </button>
              </div>
            </div>

            {showExperimentalOverlay ? (
              <>
                <div className="panel rounded-[30px] p-5">
                  <p className="section-kicker">Experimental controls</p>
                  <div className="mt-4 grid gap-3">
                    <button
                      type="button"
                      onClick={() => setSamplePolygon("floor")}
                      disabled={!photoDataUrl}
                      className={`secondary-btn px-5 py-3 text-sm ${photoDataUrl ? "" : "cursor-not-allowed opacity-55"}`}
                    >
                      Auto-fill sample floor area
                    </button>
                    <button
                      type="button"
                      onClick={() => setSamplePolygon("wall")}
                      disabled={!photoDataUrl}
                      className={`secondary-btn px-5 py-3 text-sm ${photoDataUrl ? "" : "cursor-not-allowed opacity-55"}`}
                    >
                      Auto-fill sample wall area
                    </button>
                  </div>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">
                      Overlay opacity {Math.round(overlayOpacity * 100)}%
                    </span>
                    <input
                      type="range"
                      min="20"
                      max="90"
                      step="5"
                      value={Math.round(overlayOpacity * 100)}
                      onChange={(event) => setOverlayOpacity(Number(event.target.value) / 100)}
                      className="w-full accent-sky-400"
                    />
                  </label>

                  <div className="mt-5 grid gap-3">
                    <button
                      type="button"
                      onClick={resetCurrentSelection}
                      className="secondary-btn px-5 py-3 text-sm"
                    >
                      Reset Selection
                    </button>
                    <button
                      type="button"
                      onClick={exportOverlayPreview}
                      className="secondary-btn px-5 py-3 text-sm"
                    >
                      Export Internal Overlay
                    </button>
                  </div>
                </div>

                <div className="panel rounded-[30px] p-5">
                  <p className="section-kicker">Experimental status</p>
                  <div className="mt-4 grid gap-3">
                    <div className="glass-chip rounded-[22px] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Floor polygon</p>
                      <p className="mt-2 text-sm font-semibold text-slate-50">
                        {surfacePolygons.floor.length}/4 corners selected
                      </p>
                    </div>
                    <div className="glass-chip rounded-[22px] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Wall polygon</p>
                      <p className="mt-2 text-sm font-semibold text-slate-50">
                        {surfacePolygons.wall.length}/4 corners selected
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </aside>

          <section className="flex flex-col gap-6">
            <section className="order-3 panel rounded-[32px] p-6 lg:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="section-kicker">Experimental photo overlay</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-50">
                    Internal preview only
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    This rough polygon overlay stays available for internal testing, but it is not part of the main client demo flow.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExperimentalOverlay((current) => !current)}
                  className="secondary-btn px-5 py-3 text-sm"
                >
                  {showExperimentalOverlay ? "Hide experimental photo overlay" : "Show experimental photo overlay"}
                </button>
              </div>
              {showExperimentalOverlay ? (
                <>
                  <div className="mt-5 rounded-[24px] border border-sky-300/16 bg-sky-500/10 px-5 py-4">
                    <p className="text-lg font-semibold text-white">{activeInstruction}</p>
                    <p className="mt-2 text-sm text-slate-200">
                      {activeSurfaceComplete
                        ? "Area selected. Now choose a tile below."
                        : `Points selected: ${activeSurfacePoints.length}/4`}
                    </p>
                  </div>

                  <div className="mt-5 rounded-[30px] border border-sky-300/14 bg-slate-950/45 p-3 sm:p-4">
                    {photoDataUrl ? (
                      <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        className="block w-full cursor-crosshair rounded-[24px] border border-white/12 bg-slate-950"
                      />
                    ) : (
                      <div className="soft-grid flex h-[460px] items-center justify-center rounded-[24px] border border-dashed border-white/12 px-6 text-center text-sm text-slate-200">
                        Upload a room photo to start drawing a floor or wall selection.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-5 subtle-note rounded-[24px] px-5 py-4 text-sm leading-6">
                  Experimental photo overlay is hidden for the client demo. Open it only if you need an internal rough preview.
                </div>
              )}
            </section>

            <section className="order-2 panel rounded-[34px] p-5 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="section-kicker">Demo catalog</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-50">
                    Apply tiles to the 3D room preview
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    The currently active target is <span className="font-semibold capitalize text-slate-100">{targetLabel}</span>.
                  </p>
                </div>
                <div className="glass-chip rounded-[22px] px-4 py-3 text-sm text-slate-200">
                  <p className="font-semibold text-slate-50">{tiles.length} demo tiles</p>
                  <p className="mt-1">
                    Selecting a tile updates the 3D room floor or wall preview directly.
                  </p>
                </div>
              </div>

              <div className="catalog-entrance mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                {tiles.map((tile, index) => (
                  <TileCard
                    key={tile.id}
                    tile={tile}
                    selected={selectedTileId === tile.id}
                    targetLabel={targetLabel}
                    onClick={() => applyTile(tile.id)}
                    style={{ animationDelay: `${index * 45}ms` }}
                  />
                ))}
              </div>
            </section>

            <section className="order-1 panel rounded-[34px] p-5 md:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="section-kicker">Main demo: 3D room visualizer</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-50">
                      Tile the 3D room and place demo objects
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                      This is the main client-facing preview: apply floor and wall tiles, add optional GLB objects, and walk through the room in 3D.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProjectionRoom((current) => !current)}
                    disabled={!photoDataUrl}
                    className={`px-5 py-3 text-sm ${photoDataUrl ? "secondary-btn" : "secondary-btn cursor-not-allowed opacity-55"}`}
                  >
                    {showProjectionRoom ? "Hide 3D room demo" : "Open 3D room demo"}
                  </button>
                </div>

                <div className="subtle-note rounded-[22px] px-4 py-3 text-sm leading-6">
                  Use the 3D visualizer for the demo. Uploaded photos are reference-only, and the experimental overlay below is intentionally not part of the main client walkthrough.
                </div>

                <div className="glass-chip rounded-[22px] px-4 py-3 text-sm text-slate-200">
                  <p className="font-semibold text-slate-50">Optional object placement</p>
                  <p className="mt-1">
                    GLB models and placeholders can be placed manually to make the room feel staged and presentation-ready.
                  </p>
                </div>

                {!photoDataUrl ? (
                  <p className="text-sm text-slate-300">
                    Upload a room photo first, then create the projection room preview.
                  </p>
                ) : null}

                {showProjectionRoom ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <select
                        value={roomType}
                        onChange={(event) => setRoomType(event.target.value as PhotoRoomType)}
                        className="dark-select rounded-full px-4 py-3 text-sm font-medium outline-none"
                      >
                        {roomTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={roomSize}
                        onChange={(event) => setRoomSize(event.target.value as RoomSizePreset)}
                        className="dark-select rounded-full px-4 py-3 text-sm font-medium outline-none"
                      >
                        {roomSizeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <label className="panel rounded-[22px] px-4 py-3">
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                          Room depth
                        </span>
                        <input
                          type="range"
                          min="2.4"
                          max="6.4"
                          step="0.1"
                          value={projectionDepth}
                          onChange={(event) => setProjectionDepth(Number(event.target.value))}
                          className="mt-3 w-full accent-sky-400"
                        />
                        <span className="mt-2 block text-sm text-slate-200">{projectionDepth.toFixed(1)} m</span>
                      </label>
                      <label className="panel rounded-[22px] px-4 py-3">
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                          Wall height
                        </span>
                        <input
                          type="range"
                          min="2"
                          max="3.6"
                          step="0.1"
                          value={projectionWallHeight}
                          onChange={(event) => setProjectionWallHeight(Number(event.target.value))}
                          className="mt-3 w-full accent-sky-400"
                        />
                        <span className="mt-2 block text-sm text-slate-200">{projectionWallHeight.toFixed(1)} m</span>
                      </label>
                      <label className="panel rounded-[22px] px-4 py-3">
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                          Photo blend
                        </span>
                        <input
                          type="range"
                          min="25"
                          max="95"
                          step="5"
                          value={Math.round(projectionOpacity * 100)}
                          onChange={(event) => setProjectionOpacity(Number(event.target.value) / 100)}
                          className="mt-3 w-full accent-sky-400"
                        />
                        <span className="mt-2 block text-sm text-slate-200">{Math.round(projectionOpacity * 100)}%</span>
                      </label>
                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={() => setViewerMotionTick((current) => current + 1)}
                          className="primary-btn generate-pulse px-5 py-3 text-sm"
                        >
                          Refresh Projection
                        </button>
                        <button
                          type="button"
                          onClick={resetProjection}
                          className="secondary-btn px-5 py-3 text-sm"
                        >
                          Reset Projection
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                      <RoomViewer
                        room={projectionRoom}
                        floorTile={floorTile}
                        wallTile={wallTile}
                        motionTrigger={viewerMotionTick}
                        showCameraButtons
                        placedObjects={placedObjects}
                        selectedObjectId={selectedObjectId}
                        onSelectObject={setSelectedObjectId}
                        onObjectRenderStateChange={(objectId, state) =>
                          setObjectRenderStates((current) =>
                            current[objectId] === state ? current : { ...current, [objectId]: state },
                          )
                        }
                        photoProjection={
                          photoDataUrl
                            ? {
                                photoUrl: photoDataUrl,
                                opacity: projectionOpacity,
                                enabled: true,
                              }
                            : undefined
                        }
                      />

                      <aside className="panel rounded-[28px] p-5">
                        <p className="section-kicker">Objects</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-50">
                          Manual object placement
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          Demo object placement is manual. Production can add AI object detection from photos.
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          {objectOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => addObject(option.value)}
                              className="secondary-btn px-4 py-3 text-sm"
                            >
                              Add {option.label}
                            </button>
                          ))}
                        </div>

                        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
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
                                    className={`rounded-[18px] border px-4 py-3 text-left text-sm transition ${
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
                                        {objectRenderStates[object.id] === "gltf"
                                          ? "Real GLB loaded"
                                          : "Placeholder fallback"}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-300">
                                      X {object.x.toFixed(2)} m · Z {object.z.toFixed(2)} m
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-slate-300">
                              Add an object to start furnishing the room preview.
                            </p>
                          )}
                        </div>

                        {selectedObject ? (
                          <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                              Selected object
                            </p>
                            <p className="mt-2 text-lg font-semibold text-slate-50">
                              {getObjectLabel(selectedObject.type)}
                            </p>
                            <div className="mt-3">
                              <span
                                className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${
                                  objectRenderStates[selectedObject.id] === "gltf"
                                    ? "border border-emerald-400/30 bg-emerald-500/12 text-emerald-200"
                                    : "border border-amber-400/30 bg-amber-500/12 text-amber-200"
                                }`}
                              >
                                {objectRenderStates[selectedObject.id] === "gltf"
                                  ? "Real GLB loaded"
                                  : "Placeholder fallback"}
                              </span>
                            </div>

                            <label className="mt-4 block">
                              <span className="mb-2 block text-sm font-medium text-slate-200">
                                X position {selectedObject.x.toFixed(2)} m
                              </span>
                              <input
                                type="range"
                                min={-projectionRoom.widthM / 2 + 0.45}
                                max={projectionRoom.widthM / 2 - 0.45}
                                step="0.05"
                                value={selectedObject.x}
                                onChange={(event) => updateSelectedObject({ x: Number(event.target.value) })}
                                className="w-full accent-sky-400"
                              />
                            </label>

                            <label className="mt-4 block">
                              <span className="mb-2 block text-sm font-medium text-slate-200">
                                Z position {selectedObject.z.toFixed(2)} m
                              </span>
                              <input
                                type="range"
                                min={-projectionRoom.depthM / 2 + 0.45}
                                max={projectionRoom.depthM / 2 - 0.45}
                                step="0.05"
                                value={selectedObject.z}
                                onChange={(event) => updateSelectedObject({ z: Number(event.target.value) })}
                                className="w-full accent-sky-400"
                              />
                            </label>

                            <label className="mt-4 block">
                              <span className="mb-2 block text-sm font-medium text-slate-200">
                                Rotation {Math.round(selectedObject.rotationDeg)}°
                              </span>
                              <input
                                type="range"
                                min="0"
                                max="360"
                                step="1"
                                value={selectedObject.rotationDeg}
                                onChange={(event) =>
                                  updateSelectedObject({ rotationDeg: Number(event.target.value) })
                                }
                                className="w-full accent-sky-400"
                              />
                            </label>

                            <label className="mt-4 block">
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
                              className="mt-5 secondary-btn w-full px-5 py-3 text-sm"
                            >
                              Delete Object
                            </button>
                          </div>
                        ) : null}
                      </aside>
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          </section>
        </section>
      </main>
    </div>
  );
}
