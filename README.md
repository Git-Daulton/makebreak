# Tiny Voxel Sandbox Prototype

Original tiny browser voxel sandbox built with Three.js (CDN) and plain HTML/JS.

## Run

1. From this folder, start a local server:
   python -m http.server
2. Open:
   http://localhost:8000

## Controls

- Click canvas: lock pointer
- Esc: unlock pointer
- Mouse: look
- WASD: move
- Space: jump
- Left click: hold to break targeted block
- Right click: place selected block on targeted face
- 1-0: select block type (0 selects slot 10)
- M: mute/unmute audio
- Volume slider: in help panel
- H: toggle help overlay
- FPS is shown in the HUD

## Implemented

- Finite world size: 64 x 32 x 64
- Deterministic terrain from sin/cos and ramp terms
- 10 block types with flat colors (no textures)
- Ground layering (stone/dirt/grass), sand patches, wood pillars
- Pointer lock look + crosshair
- Break/place using center-screen raycast with reach limit
- Number-key block selection HUD (1-0)
- Procedural Web Audio block break/place sounds (no external files)
- Basic but stable AABB-style player collision with tuned acceleration/friction
- Spawn above terrain

## Performance Notes

- World rendering uses chunk meshes (`16 x 16 x 16` blocks per chunk; `4 x 2 x 4` chunks total).
- Chunk geometry is built from visible faces only (face-culling), not one mesh per block.
- Raycasting is performed against chunk meshes, not thousands of individual block meshes.
- Block edits update world data first, then rebuild only affected chunk meshes.
- If a changed block is on a chunk boundary, adjacent chunk mesh(es) are also rebuilt so shared faces stay correct.

## Explicitly Out Of Scope

- Infinite terrain streaming
- Procedural noise libraries
- Texture assets
- Inventory/crafting UI
- Multiplayer
