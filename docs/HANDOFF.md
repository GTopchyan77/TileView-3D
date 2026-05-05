# Handoff

## Current State
- Main showroom experience is implemented at `/`
- Admin mock is implemented at `/admin`
- 3D room rendering uses React Three Fiber with simple template geometry
- Screenshot export uses the browser canvas data URL

## Important Files
- `app/page.tsx`
- `app/admin/page.tsx`
- `components/viewer/visualizer-shell.tsx`
- `components/viewer/room-viewer.tsx`
- `hooks/use-tiles.ts`
- `data/tiles.json`

## Follow-Up Advice
- Add actual product photography or seamless texture files next
- Replace local storage with backend persistence once API work starts
- Separate wall surfaces if users need more granular design control
