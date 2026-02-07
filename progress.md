Original prompt: Implement v2 polish + performance for the existing tiny voxel sandbox in-place (chunk meshing, 10 block types, FPS HUD, procedural audio, movement tuning, README updates, static-server runnable).

- Initialized progress log.

- Replaced per-block mesh pipeline with chunked face-culling mesh generation and chunk-local rebuild logic in main.js.
- Added expanded 10-block catalog, selection mapping 1-0, FPS HUD hookups, and Web Audio scaffolding.

- Updated README controls and added Performance Notes documenting chunk meshing, chunk raycasts, and selective rebuild behavior.

- Fixed strafing orientation after forward-vector correction (D now strafes right as expected).
- Ran local static-server smoke test via python http.server + urllib fetch (HTTP 200).

- Added AudioContext constructor fallback guard for broader browser compatibility.

