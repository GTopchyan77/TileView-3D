import { roomTemplates } from "@/lib/room-templates";
import { RoomTemplate, RoomTemplateId } from "@/types/tile";

export type PhotoRoomType = "bathroom" | "kitchen" | "living-room" | "empty-room";
export type RoomSizePreset = "small" | "medium" | "large";

const emptyRoomTemplate: RoomTemplate = {
  id: "empty-room",
  label: "Empty Room",
  description: "Neutral room shell for broad floor and wall preview demos.",
  widthM: 4.4,
  depthM: 3.6,
  heightM: 2.7,
  cameraPosition: [5, 2.6, 5.3],
  wallColor: "#f1ede6",
  floorColor: "#ddd6cb",
  decor: [],
};

const roomTypeTemplates: Record<PhotoRoomType, RoomTemplate> = {
  bathroom: roomTemplates.find((room) => room.id === "bathroom") ?? roomTemplates[0],
  kitchen: roomTemplates.find((room) => room.id === "kitchen") ?? roomTemplates[0],
  "living-room": roomTemplates.find((room) => room.id === "living-room") ?? roomTemplates[0],
  "empty-room": emptyRoomTemplate,
};

const sizeMultipliers: Record<RoomSizePreset, number> = {
  small: 0.72,
  medium: 1,
  large: 1.42,
};

const decorByRoomType: Record<PhotoRoomType, RoomTemplate["decor"]> = {
  bathroom: [
    { position: [-0.95, 0.42, -0.88], size: [0.8, 0.84, 0.56], color: "#f3efe8" },
    { position: [0.15, 0.34, -0.94], size: [0.56, 0.68, 0.76], color: "#d7e2ea" },
    { position: [1.02, 0.56, -0.86], size: [0.78, 1.12, 0.42], color: "#b9c6d2" },
  ],
  kitchen: [
    { position: [-1.45, 0.46, -1.18], size: [2.2, 0.92, 0.68], color: "#d4c0a6" },
    { position: [0.98, 0.62, -1.24], size: [1.02, 1.24, 0.42], color: "#e4ddd1" },
    { position: [1.92, 0.52, -0.72], size: [0.74, 1.04, 0.98], color: "#b8c6cf" },
  ],
  "living-room": [
    { position: [-1.68, 0.38, -1.02], size: [2.28, 0.76, 0.96], color: "#c7b49b" },
    { position: [1.02, 0.2, -0.92], size: [1.08, 0.4, 0.76], color: "#d7e0e5" },
    { position: [1.02, 0.44, -0.92], size: [0.42, 0.08, 0.42], color: "#8f745a" },
  ],
  "empty-room": [],
};

export function buildApproximateRoom(
  roomType: PhotoRoomType,
  sizePreset: RoomSizePreset,
): RoomTemplate {
  const baseTemplate = roomTypeTemplates[roomType];
  const multiplier = sizeMultipliers[sizePreset];

  return {
    ...baseTemplate,
    id: baseTemplate.id as RoomTemplateId,
    label: `${baseTemplate.label} (${sizePreset[0].toUpperCase()}${sizePreset.slice(1)})`,
    description: `Approximate demo reconstruction based on ${baseTemplate.label.toLowerCase()} proportions.`,
    widthM: Number((baseTemplate.widthM * multiplier).toFixed(2)),
    depthM: Number((baseTemplate.depthM * multiplier).toFixed(2)),
    heightM: Number((baseTemplate.heightM * (sizePreset === "large" ? 1.05 : 1)).toFixed(2)),
    cameraPosition: [
      Number((baseTemplate.cameraPosition[0] * multiplier).toFixed(2)),
      Number((baseTemplate.cameraPosition[1] * (sizePreset === "large" ? 1.05 : 1)).toFixed(2)),
      Number((baseTemplate.cameraPosition[2] * multiplier).toFixed(2)),
    ],
    decor: decorByRoomType[roomType].map((item) => ({
      ...item,
      position: [
        Number((item.position[0] * multiplier).toFixed(2)),
        Number((item.position[1] * (sizePreset === "large" ? 1.06 : 1)).toFixed(2)),
        Number((item.position[2] * multiplier).toFixed(2)),
      ],
      size: [
        Number((item.size[0] * multiplier).toFixed(2)),
        Number((item.size[1] * (sizePreset === "large" ? 1.06 : 1)).toFixed(2)),
        Number((item.size[2] * multiplier).toFixed(2)),
      ],
    })),
  };
}
