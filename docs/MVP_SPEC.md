# MVP Spec

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- React Three Fiber / Three.js

## User Flows
1. Open the main page.
2. Choose a room template.
3. Choose whether to update floor or wall.
4. Select a tile from the catalog.
5. Inspect the updated room in 3D.
6. Export a screenshot.

## Admin Mock Flow
1. Open `/admin`.
2. Fill in tile metadata.
3. Pick an existing local texture path.
4. Save tile to browser local storage.
5. Return to the visualizer and use the new tile.

## Functional Scope
- Base catalog seeded from `data/tiles.json`
- Local custom tile entries merged in the browser
- Shared wall application across visible room walls
- Shared floor application across the room floor
- Basic orbit camera controls

## Acceptance Notes
- The app must build and run locally without any backend services.
- The catalog should still work even if local storage is empty.
- The viewer should remain usable on desktop and mobile widths.
