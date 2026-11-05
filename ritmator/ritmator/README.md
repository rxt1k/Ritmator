# Ritmator

Browser tool to auto-rig / manually rig a humanoid .glb, animate it, and export it for a web game.

## Run it
- **Easiest:** open `index.html` with VS Code *Live Server* (or any local server, e.g. `npx serve` / `python -m http.server`). Double-clicking `index.html` also works.
- **One file:** `node build.mjs` writes `dist/Ritmator-standalone.html` (everything inlined, works offline, easy to share).

## Files
| File | What it holds |
|---|---|
| `index.html` | Page layout (panels, buttons). Loads everything below. |
| `css/style.css` | All styling, light + dark theme. |
| `lib/` | Three.js r147 (classic builds) - no internet needed. |
| `js/core.js` | Shared state, viewport, lighting, undo/redo, model loading, **Placement** (rotate/move/scale, FRONT arrow). |
| `js/rig.js` | Joint estimation, **voxel skinning**, Auto rig, mesh-only re-fit, skin tools, **Manual rig**. |
| `js/anim.js` | Animation presets, keyframe sampling, pose, clip building. |
| `js/demo.js` | The built-in test mannequin. |
| `js/export.js` | Export `.glb`, copy code, player `.html`. |
| `js/ui.js` | Button / slider wiring and keyboard shortcuts. Must load last-but-one. |
| `js/main.js` | Startup (loads the demo mannequin and rigs it). |

The `js/` files are classic scripts that share one global scope, so **keep the `<script>` order in `index.html`**.

## Workflow
1. Load GLB (or pick a Test model). 2. Make it face the green FRONT arrow (Placement). 3. Auto rig (or Manual rig).
4. After rigging, Placement moves only the mesh; the rig stays. 5. Add / edit animations. 6. Download .glb.
