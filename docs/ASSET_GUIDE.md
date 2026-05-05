# Asset Guide

## Model Location

Place GLB assets in:

`public/models`

## Supported Filenames

Use these exact filenames for the current object mappings:

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

## Recommended File Size

- Prefer optimized GLB assets under 5-15 MB each when possible
- Keep geometry lightweight for smooth browser performance
- Compress textures before exporting models

## How To Replace Models

1. Export or download a replacement GLB model.
2. Rename it to the required filename above.
3. Put it in `public/models`.
4. Refresh the local app.
5. Add the object in the visualizer and confirm the `Real model` badge appears.

## How To Test A Model Path In The Browser

Open the model URL directly in the browser, for example:

- `http://localhost:3000/models/sink.glb`
- `http://localhost:3000/models/table.glb`

If the file downloads or opens successfully, the path is valid.

## Notes

- Placeholder geometry appears only when the GLB file is missing or fails to load.
- Model pivot and scale may still need tuning depending on the asset source.
