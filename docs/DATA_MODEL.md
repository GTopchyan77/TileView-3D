# Data Model

## Tile
```ts
type Tile = {
  id: string;
  name: string;
  image: string;
  widthCm: number;
  heightCm: number;
  finish: string;
  tone: string;
}
```

## RoomTemplate
```ts
type RoomTemplate = {
  id: "bathroom" | "kitchen" | "living-room";
  label: string;
  description: string;
  widthM: number;
  depthM: number;
  heightM: number;
  cameraPosition: [number, number, number];
  wallColor: string;
  floorColor: string;
}
```

## Local Persistence
- Base catalog: `data/tiles.json`
- Custom tile additions: browser local storage key `tile-visualizer.custom-tiles`
