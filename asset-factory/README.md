# Hearthglen asset factory

Assets are code: each asset family is a Blender Python generator (`generate(seed, params)`)
that emits palette-colored, flat-shaded glTF with a convex collision mesh and LOD1. One
command rebuilds the whole library from source.

**Blender version (pinned):** 4.5.11 LTS — headless, no GUI required.
Set `BLENDER_BIN` to your Blender binary (e.g. `~/tools/blender-4.5/blender`).

## Usage

```sh
BLENDER_BIN=~/tools/blender-4.5/blender \
  "$BLENDER_BIN" --background --python build.py -- params/<recipe>.json
```

Outputs:

- `exports/<name>.glb` — render mesh + `<name>_col` convex collider + LOD1
- `review/<name>_turntable_*.png` — 4-angle QA renders
- `review/<name>_stats.json` — tris, bounds, palette conformance

`exports/` and `review/` are gitignored; generators + params are the source of truth.

## Layout

```
palette.py      32-color palette — single source of truth (exported to app as JSON)
build.py        CLI entry: recipe JSON → .glb + review renders + stats
generators/     one file per asset family (rock.py, tree_pine.py, …)
params/         JSON recipes: seed + knobs per variant
```
