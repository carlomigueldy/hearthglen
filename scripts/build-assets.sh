#!/usr/bin/env bash
# Rebuild the entire asset library from source:
#   asset-factory/params/*.json -> exports/*.glb -> meshopt-optimized app/public/assets/
# Requires BLENDER_BIN (Blender 4.5 LTS) — see asset-factory/README.md.
set -euo pipefail

cd "$(dirname "$0")/.."
BLENDER_BIN="${BLENDER_BIN:-$HOME/tools/blender-4.5/blender}"

for recipe in asset-factory/params/*.json; do
  echo "== building $recipe"
  "$BLENDER_BIN" --background --python asset-factory/build.py -- "$recipe" \
    | grep -E '^\[factory\]' || { echo "factory build failed for $recipe" >&2; exit 1; }
done

mkdir -p app/public/assets
for glb in asset-factory/exports/*.glb; do
  out="app/public/assets/$(basename "$glb")"
  # --join false: render / _col / _lod1 must stay separate nodes
  # --simplify false: tri budgets are authored in the generators, not here
  pnpm exec gltf-transform optimize "$glb" "$out" \
    --compress meshopt --texture-compress false --join false --simplify false >/dev/null
  echo "== optimized $(basename "$glb") ($(stat -c%s "$glb") -> $(stat -c%s "$out") bytes)"
done
