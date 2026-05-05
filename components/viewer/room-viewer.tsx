"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls as DreiOrbitControls, useGLTF } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import {
  Box3,
  DoubleSide,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  DemoObjectType,
  PlacedDemoObject,
  RoomOpening,
  RoomTemplate,
  Tile,
  WallSurfaceId,
} from "@/types/tile";

type CameraActionType = "zoom-in" | "zoom-out" | "reset";

type PhotoProjectionConfig = {
  photoUrl: string;
  opacity: number;
  enabled: boolean;
};

type ViewerProps = {
  room: RoomTemplate;
  floorTile?: Tile;
  wallTile?: Tile;
  wallSurfaceTiles?: Partial<Record<WallSurfaceId, Tile | undefined>>;
  openings?: RoomOpening[];
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  referencePhotoUrl?: string;
  showReferencePhoto?: boolean;
  referencePhotoOpacity?: number;
  motionTrigger?: number;
  showCameraButtons?: boolean;
  photoProjection?: PhotoProjectionConfig;
  hideDecor?: boolean;
  helperText?: string;
  placedObjects?: PlacedDemoObject[];
  selectedObjectId?: string | null;
  onSelectObject?: (objectId: string) => void;
  onObjectRenderStateChange?: (objectId: string, state: "gltf" | "placeholder") => void;
};

type SurfaceMeshProps = {
  tile?: Tile;
  fallbackColor: string;
  size: [number, number];
  rotation?: [number, number, number];
  position: [number, number, number];
};

type CameraRigProps = {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  cameraPosition: [number, number, number];
  motionTrigger?: number;
  command?: { type: CameraActionType; tick: number } | null;
};

type ProjectionSurfaceUrls = {
  floor: string;
  backWall: string;
  leftWall: string;
  rightWall: string;
};

type ProjectionPlaneProps = {
  textureUrl: string;
  opacity: number;
  size: [number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  tint?: string;
};

const DEFAULT_CAMERA_POSITION = new Vector3(4, 3, 5);
const DEFAULT_CAMERA_TARGET = new Vector3(0, 0.8, 0);
const OBJECT_MODEL_PATHS: Record<DemoObjectType, string> = {
  sink: "/models/sink.glb",
  toilet: "/models/toilet.glb",
  shower: "/models/shower.glb",
  vanity: "/models/vanity.glb",
  mirror: "/models/mirror.glb",
  counter: "/models/counter.glb",
  sofa: "/models/sofa.glb",
  bed: "/models/bed.glb",
  tv: "/models/TV.glb",
  refrigerator: "/models/refrigerator.glb",
  microwave: "/models/microwave.glb",
  table: "/models/table.glb",
  wardrobe: "/models/wardrobe.glb",
  chair: "/models/chair.glb",
};

const OBJECT_BASE_SCALES: Record<DemoObjectType, number> = {
  sink: 0.9,
  toilet: 0.94,
  shower: 1,
  vanity: 1,
  mirror: 0.92,
  counter: 1,
  sofa: 1,
  bed: 1,
  tv: 1,
  refrigerator: 1,
  microwave: 1,
  table: 1.14,
  wardrobe: 1,
  chair: 0.98,
};

const OBJECT_TINTS: Record<DemoObjectType, { primary: string; accent: string; metal?: string }> = {
  sink: { primary: "#edf2f6", accent: "#c4d3dc", metal: "#90a4b8" },
  toilet: { primary: "#f1f4f7", accent: "#d3dee8", metal: "#8da2b4" },
  shower: { primary: "#d9e7ee", accent: "#9fb4c1", metal: "#7f95a8" },
  vanity: { primary: "#d7c2a6", accent: "#b48456", metal: "#8d96a3" },
  mirror: { primary: "#dce6ef", accent: "#8da3b8", metal: "#9ba8b5" },
  counter: { primary: "#d6c8b8", accent: "#907355", metal: "#7f8d99" },
  sofa: { primary: "#c9b39c", accent: "#9d7d62", metal: "#7b8894" },
  bed: { primary: "#d8d0c8", accent: "#b18f73", metal: "#7f8b97" },
  tv: { primary: "#111827", accent: "#4b5563", metal: "#8592a0" },
  refrigerator: { primary: "#e7edf2", accent: "#bac7d1", metal: "#8796a4" },
  microwave: { primary: "#cfd7df", accent: "#6f7c88", metal: "#8a97a4" },
  table: { primary: "#d9e1e5", accent: "#8b6f55", metal: "#81909d" },
  wardrobe: { primary: "#cdb79f", accent: "#916f4d", metal: "#8b95a1" },
  chair: { primary: "#c6b39d", accent: "#7f6450", metal: "#8793a0" },
};

const OBJECT_TARGET_DIMENSIONS: Record<DemoObjectType, { height: number; maxFootprint: number }> = {
  sink: { height: 0.95, maxFootprint: 0.95 },
  toilet: { height: 0.95, maxFootprint: 0.9 },
  shower: { height: 2.05, maxFootprint: 1.2 },
  vanity: { height: 1.05, maxFootprint: 1.3 },
  mirror: { height: 1.3, maxFootprint: 1.1 },
  counter: { height: 1.0, maxFootprint: 1.8 },
  sofa: { height: 1.02, maxFootprint: 2.2 },
  bed: { height: 1.1, maxFootprint: 2.35 },
  tv: { height: 1.1, maxFootprint: 1.35 },
  refrigerator: { height: 2.0, maxFootprint: 0.95 },
  microwave: { height: 0.5, maxFootprint: 0.7 },
  table: { height: 0.9, maxFootprint: 1.55 },
  wardrobe: { height: 2.2, maxFootprint: 1.3 },
  chair: { height: 0.95, maxFootprint: 0.72 },
};

const KNOWN_GLB_OBJECT_TYPES = new Set<DemoObjectType>([
  "sink",
  "toilet",
  "shower",
  "vanity",
  "mirror",
  "counter",
  "sofa",
  "bed",
  "tv",
  "refrigerator",
  "microwave",
  "table",
  "wardrobe",
]);

useGLTF.preload(OBJECT_MODEL_PATHS.sink);
useGLTF.preload(OBJECT_MODEL_PATHS.toilet);
useGLTF.preload(OBJECT_MODEL_PATHS.shower);
useGLTF.preload(OBJECT_MODEL_PATHS.vanity);
useGLTF.preload(OBJECT_MODEL_PATHS.mirror);
useGLTF.preload(OBJECT_MODEL_PATHS.counter);
useGLTF.preload(OBJECT_MODEL_PATHS.sofa);
useGLTF.preload(OBJECT_MODEL_PATHS.bed);
useGLTF.preload(OBJECT_MODEL_PATHS.tv);
useGLTF.preload(OBJECT_MODEL_PATHS.refrigerator);
useGLTF.preload(OBJECT_MODEL_PATHS.microwave);
useGLTF.preload(OBJECT_MODEL_PATHS.table);
useGLTF.preload(OBJECT_MODEL_PATHS.wardrobe);

type ModelBoundaryProps = {
  fallback: ReactNode;
  modelPath: string;
  onFailed?: () => void;
  children: ReactNode;
};

type ModelBoundaryState = {
  hasError: boolean;
};

function useResolvedTextureUrl(tile: Tile | undefined) {
  const imageUrl = tile?.image?.trim() || null;
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(imageUrl);

  useEffect(() => {
    if (!imageUrl) {
      return;
    }

    let cancelled = false;
    const probeImage = new window.Image();

    probeImage.onload = () => {
      if (!cancelled) {
        setResolvedUrl(imageUrl);
      }
    };

    probeImage.onerror = () => {
      if (!cancelled) {
        setResolvedUrl("/tiles/placeholder.svg");
      }
    };

    probeImage.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return imageUrl ? resolvedUrl : null;
}

function useTiledMaterial(tile: Tile | undefined, fallbackColor: string, size: [number, number]) {
  const resolvedUrl = useResolvedTextureUrl(tile);
  const textureUrl = resolvedUrl ?? "/tiles/placeholder.svg";
  const texture = useLoader(TextureLoader, textureUrl);

  const configuredTexture = useMemo(() => {
    if (!tile || !resolvedUrl || !texture) {
      return null;
    }

    const nextTexture = texture.clone();
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.wrapS = RepeatWrapping;
    nextTexture.wrapT = RepeatWrapping;
    nextTexture.repeat.set((size[0] * 100) / tile.widthCm, (size[1] * 100) / tile.heightCm);
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [resolvedUrl, size, texture, tile]);

  useEffect(() => {
    return () => {
      configuredTexture?.dispose();
    };
  }, [configuredTexture]);

  return {
    color: tile ? undefined : fallbackColor,
    map: configuredTexture ?? undefined,
    resolvedUrl,
  };
}

function useProjectionSurfaceUrls(photoUrl: string | undefined) {
  const [surfaceUrls, setSurfaceUrls] = useState<ProjectionSurfaceUrls | null>(null);

  useEffect(() => {
    if (!photoUrl) {
      return;
    }

    let cancelled = false;
    const image = new window.Image();

    const makeCrop = (
      img: HTMLImageElement,
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      width: number,
      height: number,
      darken = 0.12,
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return "";
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
      ctx.fillStyle = `rgba(8, 14, 24, ${darken})`;
      ctx.fillRect(0, 0, width, height);
      return canvas.toDataURL("image/jpeg", 0.92);
    };

    image.onload = () => {
      if (cancelled) {
        return;
      }

      const width = image.naturalWidth;
      const height = image.naturalHeight;

      setSurfaceUrls({
        floor: makeCrop(image, 0, height * 0.65, width, height * 0.35, 1200, 900, 0.2),
        backWall: makeCrop(image, 0, 0, width, height * 0.65, 1200, 900, 0.1),
        leftWall: makeCrop(image, 0, 0, width * 0.35, height, 900, 1200, 0.16),
        rightWall: makeCrop(image, width * 0.65, 0, width * 0.35, height, 900, 1200, 0.16),
      });
    };

    image.onerror = () => {
      if (!cancelled) {
        setSurfaceUrls(null);
      }
    };

    image.src = photoUrl;

    return () => {
      cancelled = true;
    };
  }, [photoUrl]);

  return surfaceUrls;
}

function useProjectionTexture(textureUrl: string) {
  const texture = useLoader(TextureLoader, textureUrl);

  const configuredTexture = useMemo(() => {
    const nextTexture = texture.clone();
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [texture]);

  useEffect(() => {
    return () => {
      configuredTexture.dispose();
    };
  }, [configuredTexture]);

  return configuredTexture;
}

function SurfaceMesh({
  tile,
  fallbackColor,
  size,
  rotation = [0, 0, 0],
  position,
}: SurfaceMeshProps) {
  const { resolvedUrl, ...materialProps } = useTiledMaterial(tile, fallbackColor, size);
  const surfaceKey = `${tile?.id ?? "fallback"}-${resolvedUrl ?? "color"}-${size.join("x")}-${position.join("x")}`;

  return (
    <mesh key={surfaceKey} rotation={rotation} position={position} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial key={surfaceKey} {...materialProps} />
    </mesh>
  );
}

function ProjectionPlane({
  textureUrl,
  opacity,
  size,
  position,
  rotation = [0, 0, 0],
  tint = "#eef4fa",
}: ProjectionPlaneProps) {
  const texture = useProjectionTexture(textureUrl);

  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow>
        <planeGeometry args={size} />
        <meshStandardMaterial
          map={texture}
          color={tint}
          transparent
          opacity={opacity}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={size} />
        <meshStandardMaterial
          color="#05070c"
          transparent
          opacity={Math.min(0.18, opacity * 0.18)}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

class ModelErrorBoundary extends Component<ModelBoundaryProps, ModelBoundaryState> {
  state: ModelBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Failed to load GLB model", this.props.modelPath, error);
    this.props.onFailed?.();
  }

  componentDidUpdate(prevProps: ModelBoundaryProps) {
    if (prevProps.modelPath !== this.props.modelPath && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function useModelAvailability(modelPath: string) {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(modelPath, { method: "HEAD" })
      .then((response) => {
        if (!cancelled) {
          setIsAvailable(response.ok);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAvailable(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [modelPath]);

  return isAvailable;
}

function normalizeModel(model: Object3D, type: DemoObjectType) {
  const normalized = model.clone(true);
  normalized.updateMatrixWorld(true);

  const initialBox = new Box3().setFromObject(normalized);
  const size = initialBox.getSize(new Vector3());
  const targets = OBJECT_TARGET_DIMENSIONS[type];
  const footprint = Math.max(size.x, size.z) || 1;
  const height = size.y || 1;
  const scaleFactor = Math.min(targets.height / height, targets.maxFootprint / footprint);
  normalized.scale.multiplyScalar(scaleFactor);
  normalized.updateMatrixWorld(true);

  const scaledBox = new Box3().setFromObject(normalized);
  const center = scaledBox.getCenter(new Vector3());
  const minY = scaledBox.min.y;

  normalized.position.x -= center.x;
  normalized.position.z -= center.z;
  normalized.position.y -= minY;
  normalized.updateMatrixWorld(true);

  const wrapper = new Object3D();
  wrapper.add(normalized);
  wrapper.updateMatrixWorld(true);

  wrapper.traverse((child) => {
    if ("castShadow" in child) {
      child.castShadow = true;
    }

    if ("receiveShadow" in child) {
      child.receiveShadow = true;
    }
  });

  return wrapper;
}

function SelectionRing({ selected }: { selected: boolean }) {
  if (!selected) {
    return null;
  }

  return (
    <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.32, 0.42, 48]} />
      <meshStandardMaterial color="#58c6ff" emissive="#1e90ff" emissiveIntensity={0.65} transparent opacity={0.92} />
    </mesh>
  );
}

function RealGLBObject({
  type,
  modelPath,
  onLoaded,
}: {
  type: DemoObjectType;
  modelPath: string;
  onLoaded?: () => void;
}) {
  useEffect(() => {
    console.info("Loading GLB model:", modelPath);
  }, [modelPath]);

  const { scene } = useGLTF(modelPath);

  const preparedModel = useMemo(() => {
    return normalizeModel(scene, type);
  }, [scene, type]);

  useEffect(() => {
    console.info("Loaded GLB model successfully", modelPath);
    onLoaded?.();
  }, [modelPath, onLoaded]);

  return <primitive object={preparedModel} />;
}

function PlaceholderObject({
  type,
  selected,
}: {
  type: DemoObjectType;
  selected: boolean;
}) {
  const colors = OBJECT_TINTS[type];
  const materialProps = selected
    ? { emissive: "#2a9fff", emissiveIntensity: 0.18 }
    : undefined;

  switch (type) {
    case "sink":
      return (
        <>
          <mesh position={[0, 0.38, -0.04]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.76, 0.36]} />
            <meshStandardMaterial color={colors.accent} {...materialProps} />
          </mesh>
          <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.1, 0.56]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          <mesh position={[0.18, 0.92, -0.06]} castShadow receiveShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.18, 18]} />
            <meshStandardMaterial color={colors.metal ?? "#90a4b8"} metalness={0.55} roughness={0.28} />
          </mesh>
        </>
      );
    case "toilet":
      return (
        <>
          <mesh position={[0, 0.24, 0.04]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.48, 0.66]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          <mesh position={[0, 0.58, -0.12]} castShadow receiveShadow>
            <boxGeometry args={[0.48, 0.62, 0.18]} />
            <meshStandardMaterial color={colors.accent} {...materialProps} />
          </mesh>
          <mesh position={[0, 0.42, 0.18]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.18, 0.16, 24]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
        </>
      );
    case "shower":
      return (
        <>
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <boxGeometry args={[1.05, 0.08, 1.05]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          <mesh position={[-0.48, 0.92, -0.48]} castShadow receiveShadow>
            <boxGeometry args={[0.06, 1.84, 0.98]} />
            <meshStandardMaterial color={colors.metal ?? "#7f95a8"} metalness={0.48} roughness={0.32} />
          </mesh>
          <mesh position={[0, 0.92, -0.48]} receiveShadow>
            <boxGeometry args={[0.98, 1.84, 0.04]} />
            <meshStandardMaterial color={colors.accent} transparent opacity={0.3} />
          </mesh>
        </>
      );
    case "vanity":
      return (
        <>
          <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 0.88, 0.54]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          <mesh position={[0, 0.93, 0.02]} castShadow receiveShadow>
            <boxGeometry args={[1.18, 0.08, 0.6]} />
            <meshStandardMaterial color={colors.accent} {...materialProps} />
          </mesh>
          <mesh position={[-0.28, 0.98, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.08, 24]} />
            <meshStandardMaterial color="#eef4f8" {...materialProps} />
          </mesh>
          <mesh position={[0.28, 0.98, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.08, 24]} />
            <meshStandardMaterial color="#eef4f8" {...materialProps} />
          </mesh>
        </>
      );
    case "mirror":
      return (
        <>
          <mesh position={[0, 1.18, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.84, 1.12, 0.08]} />
            <meshStandardMaterial color={colors.accent} metalness={0.2} roughness={0.35} {...materialProps} />
          </mesh>
          <mesh position={[0, 1.18, 0.045]} castShadow receiveShadow>
            <boxGeometry args={[0.7, 0.98, 0.02]} />
            <meshStandardMaterial color={colors.primary} metalness={0.4} roughness={0.08} {...materialProps} />
          </mesh>
        </>
      );
    case "counter":
      return (
        <>
          <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.78, 0.88, 0.68]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          <mesh position={[0, 0.91, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.9, 0.06, 0.74]} />
            <meshStandardMaterial color={colors.accent} {...materialProps} />
          </mesh>
        </>
      );
    case "sofa":
      return (
        <>
          <mesh position={[0, 0.3, 0.1]} castShadow receiveShadow>
            <boxGeometry args={[2.1, 0.6, 0.9]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          <mesh position={[0, 0.68, -0.24]} castShadow receiveShadow>
            <boxGeometry args={[2.1, 0.56, 0.18]} />
            <meshStandardMaterial color={colors.accent} {...materialProps} />
          </mesh>
          <mesh position={[-0.92, 0.5, 0.1]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 0.42, 0.88]} />
            <meshStandardMaterial color={colors.accent} {...materialProps} />
          </mesh>
          <mesh position={[0.92, 0.5, 0.1]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 0.42, 0.88]} />
            <meshStandardMaterial color={colors.accent} {...materialProps} />
          </mesh>
        </>
      );
    case "bed":
      return (
        <>
          <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 0.44, 1.75]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.08, 0.16, 1.62]} />
            <meshStandardMaterial color="#f2eee8" {...materialProps} />
          </mesh>
          <mesh position={[0, 0.72, -0.77]} castShadow receiveShadow>
            <boxGeometry args={[2.22, 0.72, 0.14]} />
            <meshStandardMaterial color={colors.accent} {...materialProps} />
          </mesh>
        </>
      );
    case "tv":
      return (
        <>
          <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.3, 0.74, 0.08]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.12, 0.56, 0.12]} />
            <meshStandardMaterial color={colors.metal ?? "#8592a0"} {...materialProps} />
          </mesh>
          <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.6, 0.08, 0.34]} />
            <meshStandardMaterial color={colors.accent} {...materialProps} />
          </mesh>
        </>
      );
    case "refrigerator":
      return (
        <>
          <mesh position={[0, 0.96, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.86, 1.92, 0.82]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          <mesh position={[0, 1.28, 0.42]} castShadow receiveShadow>
            <boxGeometry args={[0.04, 0.62, 0.06]} />
            <meshStandardMaterial color={colors.metal ?? "#8796a4"} {...materialProps} />
          </mesh>
          <mesh position={[0, 0.62, 0.42]} castShadow receiveShadow>
            <boxGeometry args={[0.04, 0.62, 0.06]} />
            <meshStandardMaterial color={colors.metal ?? "#8796a4"} {...materialProps} />
          </mesh>
        </>
      );
    case "microwave":
      return (
        <>
          <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.44, 0.44]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          <mesh position={[0.1, 0.22, 0.225]} castShadow receiveShadow>
            <boxGeometry args={[0.34, 0.26, 0.02]} />
            <meshStandardMaterial color="#111827" {...materialProps} />
          </mesh>
          <mesh position={[0.23, 0.22, 0.225]} castShadow receiveShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 18]} />
            <meshStandardMaterial color={colors.metal ?? "#8a97a4"} {...materialProps} />
          </mesh>
        </>
      );
    case "table":
      return (
        <>
          <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.16, 0.08, 0.8]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          {[
            [-0.42, 0.36, -0.28],
            [0.42, 0.36, -0.28],
            [-0.42, 0.36, 0.28],
            [0.42, 0.36, 0.28],
          ].map((position, index) => (
            <mesh key={index} position={position as [number, number, number]} castShadow receiveShadow>
              <boxGeometry args={[0.08, 0.72, 0.08]} />
              <meshStandardMaterial color={colors.accent} {...materialProps} />
            </mesh>
          ))}
        </>
      );
    case "wardrobe":
      return (
        <>
          <mesh position={[0, 1.02, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.18, 2.04, 0.62]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          <mesh position={[-0.26, 1.02, 0.32]} castShadow receiveShadow>
            <boxGeometry args={[0.04, 1.54, 0.05]} />
            <meshStandardMaterial color={colors.metal ?? "#8b95a1"} {...materialProps} />
          </mesh>
          <mesh position={[0.26, 1.02, 0.32]} castShadow receiveShadow>
            <boxGeometry args={[0.04, 1.54, 0.05]} />
            <meshStandardMaterial color={colors.metal ?? "#8b95a1"} {...materialProps} />
          </mesh>
        </>
      );
    case "chair":
      return (
        <>
          <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.56, 0.08, 0.56]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
          <mesh position={[0, 0.82, -0.22]} castShadow receiveShadow>
            <boxGeometry args={[0.56, 0.68, 0.08]} />
            <meshStandardMaterial color={colors.accent} {...materialProps} />
          </mesh>
          {[
            [-0.2, 0.22, -0.2],
            [0.2, 0.22, -0.2],
            [-0.2, 0.22, 0.2],
            [0.2, 0.22, 0.2],
          ].map((position, index) => (
            <mesh key={index} position={position as [number, number, number]} castShadow receiveShadow>
              <boxGeometry args={[0.06, 0.44, 0.06]} />
              <meshStandardMaterial color={colors.metal ?? "#8793a0"} {...materialProps} />
            </mesh>
          ))}
        </>
      );
    default:
      return null;
  }
}

function SceneObject({
  object,
  selected,
  onSelect,
  onRenderStateChange,
}: {
  object: PlacedDemoObject;
  selected: boolean;
  onSelect?: (objectId: string) => void;
  onRenderStateChange?: (objectId: string, state: "gltf" | "placeholder") => void;
}) {
  const modelPath = OBJECT_MODEL_PATHS[object.type];
  const hasModel = useModelAvailability(modelPath);
  const shouldTryRealModel = KNOWN_GLB_OBJECT_TYPES.has(object.type) || hasModel;

  useEffect(() => {
    if (!shouldTryRealModel) {
      onRenderStateChange?.(object.id, "placeholder");
    }
  }, [object.id, onRenderStateChange, shouldTryRealModel]);

  return (
    <group
      position={[object.x, object.y ?? 0, object.z]}
      rotation={[0, (object.rotationDeg * Math.PI) / 180, 0]}
      scale={OBJECT_BASE_SCALES[object.type] * object.scale}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect?.(object.id);
      }}
    >
      <SelectionRing selected={selected} />
      <group position={[0, object.modelYOffset ?? 0, 0]}>
        {shouldTryRealModel ? (
          <ModelErrorBoundary
            modelPath={modelPath}
            fallback={<PlaceholderObject type={object.type} selected={selected} />}
            onFailed={() => {
              if (object.type === "table") {
                console.warn("Failed to load table.glb");
              }
              onRenderStateChange?.(object.id, "placeholder");
            }}
          >
            <Suspense fallback={null}>
              <RealGLBObject
                type={object.type}
                modelPath={modelPath}
                onLoaded={() => onRenderStateChange?.(object.id, "gltf")}
              />
            </Suspense>
          </ModelErrorBoundary>
        ) : (
          <PlaceholderObject type={object.type} selected={selected} />
        )}
      </group>
    </group>
  );
}

function PlacedObjectsLayer({
  objects,
  selectedObjectId,
  onSelectObject,
  onRenderStateChange,
}: {
  objects: PlacedDemoObject[];
  selectedObjectId?: string | null;
  onSelectObject?: (objectId: string) => void;
  onRenderStateChange?: (objectId: string, state: "gltf" | "placeholder") => void;
}) {
  return (
    <>
      {objects.map((object) => (
        <SceneObject
          key={object.id}
          object={object}
          selected={selectedObjectId === object.id}
          onSelect={onSelectObject}
          onRenderStateChange={onRenderStateChange}
        />
      ))}
    </>
  );
}

function DecorBlocks({ room }: { room: RoomTemplate }) {
  return room.decor.map((block, index) => (
    <mesh key={`${room.id}-decor-${index}`} position={block.position} castShadow receiveShadow>
      <boxGeometry args={block.size} />
      <meshStandardMaterial color={block.color} />
    </mesh>
  ));
}

function OpeningMarkers({ openings, room }: { openings: RoomOpening[]; room: RoomTemplate }) {
  return openings.map((opening) => {
    const centerY = opening.bottom + opening.height / 2;
    const offset = opening.offset;

    let position: [number, number, number];
    let rotation: [number, number, number];

    if (opening.wall === "back") {
      position = [offset, centerY, -room.depthM / 2 + 0.01];
      rotation = [0, 0, 0];
    } else if (opening.wall === "left") {
      position = [-room.widthM / 2 + 0.01, centerY, offset];
      rotation = [0, Math.PI / 2, 0];
    } else {
      position = [room.widthM / 2 - 0.01, centerY, offset];
      rotation = [0, -Math.PI / 2, 0];
    }

    return (
      <mesh key={opening.id} position={position} rotation={rotation}>
        <planeGeometry args={[opening.width, opening.height]} />
        <meshStandardMaterial
          color={opening.kind === "door" ? "#111827" : "#e8f4ff"}
          transparent
          opacity={opening.kind === "door" ? 0.88 : 0.72}
          side={DoubleSide}
        />
      </mesh>
    );
  });
}

function CaptureCanvas({ onCanvasReady }: { onCanvasReady?: (canvas: HTMLCanvasElement) => void }) {
  const { gl } = useThree();

  useEffect(() => {
    onCanvasReady?.(gl.domElement);
  }, [gl, onCanvasReady]);

  return null;
}

function GroundShadow({ room }: { room: RoomTemplate }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[room.widthM + 6, room.depthM + 6]} />
      <meshStandardMaterial color="#d8d3ca" />
    </mesh>
  );
}

function CameraRig({ controlsRef, cameraPosition, motionTrigger = 0, command }: CameraRigProps) {
  const { camera } = useThree();
  const baseCameraPosition = useMemo(() => new Vector3(...cameraPosition), [cameraPosition]);
  const desiredPosition = useRef(baseCameraPosition.clone());
  const desiredTarget = useRef(DEFAULT_CAMERA_TARGET.clone());
  const animateRef = useRef(false);
  const motionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    camera.position.copy(baseCameraPosition);
    camera.lookAt(DEFAULT_CAMERA_TARGET);
    desiredPosition.current.copy(baseCameraPosition);
    desiredTarget.current.copy(DEFAULT_CAMERA_TARGET);

    if (controlsRef.current) {
      controlsRef.current.target.copy(DEFAULT_CAMERA_TARGET);
      controlsRef.current.update();
    }
  }, [baseCameraPosition, camera, controlsRef]);

  useEffect(() => {
    if (!motionTrigger) {
      return;
    }

    desiredTarget.current.copy(DEFAULT_CAMERA_TARGET);
    desiredPosition.current.set(3.6, 2.7, 4.4);
    animateRef.current = true;

    if (motionTimeoutRef.current) {
      window.clearTimeout(motionTimeoutRef.current);
    }

    motionTimeoutRef.current = window.setTimeout(() => {
      desiredPosition.current.copy(baseCameraPosition);
      desiredTarget.current.copy(DEFAULT_CAMERA_TARGET);
      animateRef.current = true;
    }, 320);

    return () => {
      if (motionTimeoutRef.current) {
        window.clearTimeout(motionTimeoutRef.current);
      }
    };
  }, [baseCameraPosition, motionTrigger]);

  useEffect(() => {
    if (!command) {
      return;
    }

    const controls = controlsRef.current;
    const currentTarget = controls?.target.clone() ?? DEFAULT_CAMERA_TARGET.clone();
    const currentPosition = camera.position.clone();

    if (command.type === "reset") {
      desiredTarget.current.copy(DEFAULT_CAMERA_TARGET);
      desiredPosition.current.copy(baseCameraPosition);
      animateRef.current = true;
      return;
    }

    const direction = currentPosition.sub(currentTarget).normalize();
    const distance = camera.position.distanceTo(currentTarget);
    const factor = command.type === "zoom-in" ? 0.76 : 1.28;
    const nextDistance = Math.min(30, Math.max(0.8, distance * factor));

    desiredTarget.current.copy(currentTarget);
    desiredPosition.current.copy(currentTarget.clone().add(direction.multiplyScalar(nextDistance)));
    animateRef.current = true;
  }, [baseCameraPosition, camera, command, controlsRef]);

  useFrame(() => {
    if (!animateRef.current) {
      return;
    }

    const controls = controlsRef.current;

    camera.position.lerp(desiredPosition.current, 0.16);

    if (controls) {
      controls.target.lerp(desiredTarget.current, 0.16);
      controls.update();
    } else {
      camera.lookAt(desiredTarget.current);
    }

    const positionSettled = camera.position.distanceTo(desiredPosition.current) < 0.02;
    const targetSettled = controls
      ? controls.target.distanceTo(desiredTarget.current) < 0.02
      : true;

    if (positionSettled && targetSettled) {
      animateRef.current = false;
    }
  });

  return null;
}

function PhotoProjectionRoom({
  room,
  photoProjection,
  floorTile,
  wallTile,
  wallSurfaceTiles,
}: {
  room: RoomTemplate;
  photoProjection: PhotoProjectionConfig;
  floorTile?: Tile;
  wallTile?: Tile;
  wallSurfaceTiles?: Partial<Record<WallSurfaceId, Tile | undefined>>;
}) {
  const surfaces = useProjectionSurfaceUrls(photoProjection.photoUrl);
  const wallHeight = room.heightM;
  const backWallWidth = room.widthM;
  const sideWallWidth = room.depthM;
  const opacity = photoProjection.opacity;
  const backWallTile = wallSurfaceTiles?.back ?? wallTile;
  const leftWallTile = wallSurfaceTiles?.left ?? wallTile;
  const rightWallTile = wallSurfaceTiles?.right ?? wallTile;

  if (!surfaces) {
    return null;
  }

  return (
    <>
      {backWallTile ? (
        <SurfaceMesh
          tile={backWallTile}
          fallbackColor={room.wallColor}
          size={[backWallWidth, wallHeight]}
          position={[0, wallHeight / 2, -room.depthM / 2]}
        />
      ) : (
        <ProjectionPlane
          textureUrl={surfaces.backWall}
          opacity={Math.max(0.34, opacity)}
          size={[backWallWidth, wallHeight]}
          position={[0, wallHeight / 2, -room.depthM / 2]}
          tint="#eef3f8"
        />
      )}

      {leftWallTile ? (
        <SurfaceMesh
          tile={leftWallTile}
          fallbackColor={room.wallColor}
          size={[sideWallWidth, wallHeight]}
          rotation={[0, Math.PI / 2, 0]}
          position={[-room.widthM / 2, wallHeight / 2, 0]}
        />
      ) : (
        <ProjectionPlane
          textureUrl={surfaces.leftWall}
          opacity={Math.max(0.28, opacity * 0.9)}
          size={[sideWallWidth, wallHeight]}
          rotation={[0, Math.PI / 2, 0]}
          position={[-room.widthM / 2, wallHeight / 2, 0]}
          tint="#dde6ef"
        />
      )}

      {rightWallTile ? (
        <SurfaceMesh
          tile={rightWallTile}
          fallbackColor={room.wallColor}
          size={[sideWallWidth, wallHeight]}
          rotation={[0, -Math.PI / 2, 0]}
          position={[room.widthM / 2, wallHeight / 2, 0]}
        />
      ) : (
        <ProjectionPlane
          textureUrl={surfaces.rightWall}
          opacity={Math.max(0.28, opacity * 0.9)}
          size={[sideWallWidth, wallHeight]}
          rotation={[0, -Math.PI / 2, 0]}
          position={[room.widthM / 2, wallHeight / 2, 0]}
          tint="#dde6ef"
        />
      )}

      {floorTile ? (
        <SurfaceMesh
          tile={floorTile}
          fallbackColor={room.floorColor}
          size={[room.widthM, room.depthM]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
        />
      ) : (
        <ProjectionPlane
          textureUrl={surfaces.floor}
          opacity={Math.max(0.34, opacity * 0.92)}
          size={[room.widthM, room.depthM]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.004, 0]}
          tint="#e7edf3"
        />
      )}
    </>
  );
}

function RoomScene({
  room,
  floorTile,
  wallTile,
  wallSurfaceTiles,
  openings,
  placedObjects,
  selectedObjectId,
  onSelectObject,
  onObjectRenderStateChange,
  referencePhotoUrl,
  showReferencePhoto,
  referencePhotoOpacity,
  photoProjection,
  hideDecor,
}: Omit<ViewerProps, "onCanvasReady" | "motionTrigger" | "showCameraButtons" | "helperText">) {
  const leftWallWidth = room.depthM;
  const backWallWidth = room.widthM;
  const wallHeight = room.heightM;
  const showReferencePlane = Boolean(referencePhotoUrl && showReferencePhoto && !photoProjection?.enabled);
  const backWallTile = wallSurfaceTiles?.back ?? wallTile;
  const leftWallTile = wallSurfaceTiles?.left ?? wallTile;
  const rightWallTile = wallSurfaceTiles?.right ?? wallTile;

  return (
    <>
      <ambientLight intensity={0.95} />
      <directionalLight
        position={[3.5, 5.5, 2.5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {showReferencePlane ? (
        <ProjectionPlane
          textureUrl={referencePhotoUrl as string}
          opacity={referencePhotoOpacity ?? 0.4}
          size={[backWallWidth * 0.92, wallHeight * 0.9]}
          position={[0, wallHeight / 2, -room.depthM / 2 + 0.01]}
          tint="#f4f1eb"
        />
      ) : null}

      <GroundShadow room={room} />

      {photoProjection?.enabled ? (
        <PhotoProjectionRoom
          room={room}
          photoProjection={photoProjection}
          floorTile={floorTile}
          wallTile={wallTile}
          wallSurfaceTiles={wallSurfaceTiles}
        />
      ) : (
        <>
          <SurfaceMesh
            tile={floorTile}
            fallbackColor={room.floorColor}
            size={[room.widthM, room.depthM]}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
          />
          <SurfaceMesh
            tile={backWallTile}
            fallbackColor={room.wallColor}
            size={[backWallWidth, wallHeight]}
            position={[0, wallHeight / 2, -room.depthM / 2]}
          />
          <SurfaceMesh
            tile={leftWallTile}
            fallbackColor={room.wallColor}
            size={[leftWallWidth, wallHeight]}
            rotation={[0, Math.PI / 2, 0]}
            position={[-room.widthM / 2, wallHeight / 2, 0]}
          />
          <SurfaceMesh
            tile={rightWallTile}
            fallbackColor={room.wallColor}
            size={[leftWallWidth, wallHeight]}
            rotation={[0, -Math.PI / 2, 0]}
            position={[room.widthM / 2, wallHeight / 2, 0]}
          />
        </>
      )}

      {openings?.length ? <OpeningMarkers openings={openings} room={room} /> : null}
      {placedObjects?.length ? (
        <PlacedObjectsLayer
          objects={placedObjects}
          selectedObjectId={selectedObjectId}
          onSelectObject={onSelectObject}
          onRenderStateChange={onObjectRenderStateChange}
        />
      ) : null}
      {!hideDecor ? <DecorBlocks room={room} /> : null}
    </>
  );
}

export function RoomViewer({
  room,
  floorTile,
  wallTile,
  wallSurfaceTiles,
  openings,
  placedObjects,
  selectedObjectId,
  onSelectObject,
  onObjectRenderStateChange,
  onCanvasReady,
  referencePhotoUrl,
  showReferencePhoto,
  referencePhotoOpacity,
  motionTrigger,
  showCameraButtons = false,
  photoProjection,
  hideDecor = false,
  helperText = "Left drag: rotate · Wheel: zoom · Right drag: pan",
}: ViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [cameraCommand, setCameraCommand] = useState<{ type: CameraActionType; tick: number } | null>(
    null,
  );

  const issueCameraCommand = (type: CameraActionType) => {
    setCameraCommand({ type, tick: Date.now() });
  };

  return (
    <div className="viewer-frame relative h-[380px] rounded-[30px] sm:h-[460px] lg:h-[600px] xl:h-[640px]">
      <Canvas
        shadows
        camera={{ position: room.cameraPosition, fov: 42 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <CaptureCanvas onCanvasReady={onCanvasReady} />
        <CameraRig
          controlsRef={controlsRef}
          cameraPosition={room.cameraPosition}
          motionTrigger={motionTrigger}
          command={cameraCommand}
        />
        <RoomScene
          room={room}
          floorTile={floorTile}
          wallTile={wallTile}
          wallSurfaceTiles={wallSurfaceTiles}
          openings={openings}
          placedObjects={placedObjects}
          selectedObjectId={selectedObjectId}
          onSelectObject={onSelectObject}
          onObjectRenderStateChange={onObjectRenderStateChange}
          referencePhotoUrl={referencePhotoUrl}
          showReferencePhoto={showReferencePhoto}
          referencePhotoOpacity={referencePhotoOpacity}
          photoProjection={photoProjection}
          hideDecor={hideDecor}
        />
        <DreiOrbitControls
          ref={controlsRef}
          makeDefault
          enableZoom={true}
          enableRotate={true}
          enablePan={true}
          enableDamping={true}
          dampingFactor={0.08}
          zoomSpeed={2}
          rotateSpeed={1}
          panSpeed={1}
          minDistance={0.8}
          maxDistance={30}
          target={[0, 0.8, 0]}
        />
      </Canvas>

      {showCameraButtons ? (
        <div className="absolute right-4 top-4 z-10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => issueCameraCommand("zoom-in")}
            className="secondary-btn px-3 py-2 text-xs"
          >
            Zoom In
          </button>
          <button
            type="button"
            onClick={() => issueCameraCommand("zoom-out")}
            className="secondary-btn px-3 py-2 text-xs"
          >
            Zoom Out
          </button>
          <button
            type="button"
            onClick={() => issueCameraCommand("reset")}
            className="secondary-btn px-3 py-2 text-xs"
          >
            Reset View
          </button>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/8 to-transparent" />
      <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-full border border-white/12 bg-slate-950/62 px-4 py-2 text-xs font-medium text-slate-100 backdrop-blur">
        {helperText}
      </div>
    </div>
  );
}
