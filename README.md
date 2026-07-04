# Hearthglen

> A cozy fantasy open-world survival-crafting game — Valheim's loop with Breath of the Wild's
> warmth, playable in a browser tab.

**Stack:** React 19 · Vite · React Three Fiber (three.js WebGPU) · TypeGPU · Rapier (WASM) ·
Blender bpy asset factory → glTF

- Game design: [PLAN.md](./PLAN.md)
- v1.0 design spec: [docs/superpowers/specs/2026-07-04-hearthglen-v1-design.md](./docs/superpowers/specs/2026-07-04-hearthglen-v1-design.md)

## Development

```sh
pnpm install
pnpm dev        # Vite dev server (app/)
pnpm test       # vitest
pnpm typecheck  # tsc
pnpm build      # production build
```

Requires a WebGPU-capable browser (Chrome/Edge, Safari 26+).

## Asset factory

Assets are code: Blender (4.5 LTS, headless) runs `generate(seed, params)` scripts that emit
palette-colored, flat-shaded glTF meshes. See [asset-factory/](./asset-factory/).

## Releases

Versioning is automated with release-please; merging a release PR tags `vX.Y.Z` and deploys
production to Vercel. Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
