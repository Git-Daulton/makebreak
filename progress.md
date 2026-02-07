Original prompt: Implement v2 polish + performance for the existing tiny voxel sandbox in-place (chunk meshing, 10 block types, FPS HUD, procedural audio, movement tuning, README updates, static-server runnable).

- Initialized progress log.

- Replaced per-block mesh pipeline with chunked face-culling mesh generation and chunk-local rebuild logic in main.js.
- Added expanded 10-block catalog, selection mapping 1-0, FPS HUD hookups, and Web Audio scaffolding.

- Updated README controls and added Performance Notes documenting chunk meshing, chunk raycasts, and selective rebuild behavior.

- Fixed strafing orientation after forward-vector correction (D now strafes right as expected).
- Ran local static-server smoke test via python http.server + urllib fetch (HTTP 200).

- Added AudioContext constructor fallback guard for broader browser compatibility.

- Implemented hold-to-break mining state machine in `main.js`:
  - Added per-block break times via `BREAK_TIME_BY_ID` + `getBreakTime`.
  - Added one active mining target state (`lmbDown`, `isMining`, `miningBlock`, `miningBlockId`, `miningProgressSec`, `miningLastContactTimeMs`).
  - Mining now advances only while holding LMB on the same valid targeted block.
  - Progress decays/reset behavior added: stored progress is forgotten after 2000 ms without contact.
  - Block break now occurs only when progress reaches block break time; chunk rebuild still only happens on actual block change.
- Added procedural mining visual feedback:
  - Single reusable wireframe overlay cube (`MeshBasicMaterial`, transparent, no depth test) created once and reused.
  - Overlay updates position/opacity/scale by mining progress and hides when not actively hitting.
- Updated controls text:
  - `index.html` help panel now says "Left click: hold to break block".
  - `README.md` control list now says "Left click: hold to break targeted block".
- Validation:
  - Static-server smoke test passed (`python -m http.server` + HTTP fetch returned 200 for `/index.html`).
  - Playwright automation not run in this environment because `node`/`npx` are unavailable.
- TODO/Suggestion for next agent:
  - Install Node + Playwright client prerequisites and run the `develop-web-game` Playwright loop for full interaction/screenshot verification.

