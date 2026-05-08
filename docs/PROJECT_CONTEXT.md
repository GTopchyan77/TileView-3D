# Project Context

## 1. Project Overview

- Project name: TileView 3D
- Purpose: web-based 3D tile visualizer for client and showroom demos
- Main value: preview tiles on floors and walls inside staged 3D rooms with room objects

TileView 3D is currently positioned as a demo-first MVP. The strongest experience is the 3D showroom flow, where a user selects a room type, chooses exact surfaces, applies tiles, and adjusts room objects for presentation.

## 2. Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- React Three Fiber / Three.js
- GLB models loaded from `public/models`
- `localStorage` for demo imports and lightweight client-side persistence

## 3. Current Features

- 3D room viewer
- Room templates:
  - Bathroom
  - Kitchen
  - Living Room
  - Bedroom
  - Empty Room
- Per-surface tile selection:
  - Floor
  - Left Wall
  - Right Wall
  - Back Wall
  - All Walls
- Tile catalog
- Admin tile import with JPG / PNG / WEBP validation
- GLB object placement
- Object controls:
  - X
  - Y
  - Z
  - rotation
  - scale
  - delete
- Automatic room objects by room type
- Deploy-ready demo UI

## 4. Hidden / Deprecated Features

- Photo-to-3D and photo overlay experiments were attempted earlier
- Those flows were hidden because the quality was not strong enough for the main client demo
- Do not make photo reconstruction a primary feature again unless real AI / depth / segmentation is added later

## 5. Important Files

- [E:\Planer\app\page.tsx](</E:/Planer/app/page.tsx>)
  - Home page entry for the main showroom demo
- [E:\Planer\components\viewer\visualizer-shell.tsx](</E:/Planer/components/viewer/visualizer-shell.tsx>)
  - Main showroom UI, room selection, surface selection, tile catalog, object controls, and layout
- [E:\Planer\components\viewer\room-viewer.tsx](</E:/Planer/components/viewer/room-viewer.tsx>)
  - 3D rendering, GLB loading, placeholder geometry, camera controls, and tile material application
- [E:\Planer\hooks\use-tiles.ts](</E:/Planer/hooks/use-tiles.ts>)
  - Tile catalog source logic, default tiles, local custom tiles, and client-side tile storage handling
- [E:\Planer\app\admin\page.tsx](</E:/Planer/app/admin/page.tsx>)
  - Admin mock for importing custom tiles and viewing default/demo tiles
- [E:\Planer\data\tiles.json](</E:/Planer/data/tiles.json>)
  - Default bundled tile catalog
- [E:\Planer\public\models](</E:/Planer/public/models>)
  - Static GLB assets used by the 3D viewer
- [E:\Planer\public\tiles](</E:/Planer/public/tiles>)
  - Bundled demo tile texture assets

## 6. GLB Asset Rules

- Models must be placed in `public/models`
- Current expected files:
  - `sink.glb`
  - `toilet.glb`
  - `shower.glb`
  - `vanity.glb`
  - `mirror.glb`
  - `refrigerator.glb`
  - `microwave.glb`
  - `counter.glb`
  - `table.glb`
  - `sofa.glb`
  - `TV.glb`
  - `bed.glb`
  - `wardrobe.glb`
- Some GLB files may have bad pivot/origin or inconsistent scale
- The viewer already uses bounding-box normalization to help center models and place them on the floor
- Some objects may still need manual Y-position adjustment or model-specific tuning

## 7. Current Known Issues

- Some object placement still needs manual tuning
- Some GLB scale / pivot behavior may still be inconsistent
- Save / load scene persistence is not fully implemented yet
- Database / backend is not added yet
- Mobile layout may still need more polish
- Photo-to-3D remains hidden / experimental

## 8. Demo Strategy

- Main demo: 3D Tile Room Visualizer
- Show room type selection
- Show tile application to exact surfaces
- Show objects spawning by room type
- Show object movement, rotation, and scale controls
- Show admin tile import
- Do not present the product as exact photo-to-3D reconstruction

## 9. Next Roadmap

### Immediate

- Add localStorage scene save / load
- Polish object default placement
- Fix remaining GLB scale / pivot issues
- Improve README and GitHub presentation

### Later

- Supabase / database persistence
- Saved projects
- Share links
- Quote request form
- Real AI floor plan / photo reconstruction

## 10. Rules for Future Agents

- Do not rewrite architecture
- Do not re-enable the bad photo overlay as the main demo
- Do not add backend before the demo UI is stable
- Keep lint and build passing
- Make small, focused changes
- Preserve the existing working tile and object flow
