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
- Left click: break targeted block
- Right click: place selected block on targeted face
- 1-6: select block type
- H: toggle help overlay

## Implemented

- Finite world size: 64 x 32 x 64
- Deterministic terrain from sin/cos and ramp terms
- 6 block types with flat colors (no textures)
- Ground layering (stone/dirt/grass), sand patches, wood pillars
- Pointer lock look + crosshair
- Break/place using center-screen raycast with reach limit
- Number-key block selection HUD
- Basic but stable AABB-style player collision and gravity/jump
- Spawn above terrain

## Explicitly Out Of Scope

- Infinite/chunked terrain
- Procedural noise libraries
- Texture assets
- Inventory/crafting UI
- Multiplayer
- Advanced optimization (instancing/greedy meshing/occlusion culling)
