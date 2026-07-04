# Hearthglen — Game Plan

> Working title. A cozy fantasy open-world survival-crafting game with immersive PvE combat
> and base building, in a stylized faceted low-poly flat-shaded art style — built for the web.

**Stack:** React + Vite + React Three Fiber (three.js) + TypeGPU (WebGPU) + Rapier.js (WASM physics)
**Asset factory:** Blender (headless, LTS) + bpy generator scripts → glTF
**Status:** In development — M0 (pipeline) ✓ · M1 (feel) ✓ · M2 (minute loop) core ✓ — see [docs/superpowers/specs/2026-07-04-hearthglen-v1-design.md](docs/superpowers/specs/2026-07-04-hearthglen-v1-design.md) for the v1.0 ladder

---

## 1. Pitch

*Valheim's loop with Breath of the Wild's warmth, playable in a browser tab.* A cozy fantasy
survival game where the world is dangerous but never cruel, and your base is a character that
grows with you.

## 2. North star: pressure without punishment

"Cozy" and "survival" pull in opposite directions. Survival games engage through *pressure*;
cozy games through *comfort*. The blend that works (Valheim, Grounded, Dinkum) keeps the
pressure but removes the punishment: **failure costs time, never progress.**

Every mechanic is tested against this rule:

- **Hunger/warmth are buffs, not death timers.** Well-fed = more health, stamina, faster
  regen. Starving means weak, not dying.
- **Death = drowsy respawn at your hearth.** Drop carried resources (never equipped gear),
  recoverable at a marked spot. A sting, not trauma.
- **No offline raids, no base destruction events.** Night and weather are mood, not menace —
  until the player *chooses* to venture into dark biomes.
- **Bosses are summoned deliberately** at altars. No ambush difficulty spikes, ever.

## 3. Design pillars

1. **The Hearth is the Heart.** The base is the emotional and mechanical center. Comfort level
   (furniture, light, warmth, decoration) feeds rested buffs, crafting speed, and visitors.
   Decorating is both pretty *and* optimal — that's the addiction engine.
2. **Danger by Invitation.** The world is ringed, not gated: a safe warm valley at the center,
   wilder biomes outward (Autumnwood → Mistfen → Frostpeaks → the Sundered). Each biome has its
   own materials, enemies, boss, and crafting tier. Players self-select intensity.
3. **Combat that respects your hands.** Stamina-based, readable, weighty. Light/heavy attacks,
   directional block/parry, dodge-roll. 4–5 weapon archetypes with distinct *feels* (spear =
   reach, hammer = stagger/AoE, sword+board = parry rhythm, bow = positioning, focus/magic =
   resource play). Depth from encounter design and enemy mixes, not combo trees. Big, clearly
   telegraphed enemy animations.
4. **Faceted, flat-shaded, and proud of it.** The art style is a strategic weapon: scope
   compression, timelessness, performance headroom — and on the web, tiny asset payloads.

## 4. The three loops

- **Minute loop:** gather → craft → eat/rest → venture → return. Every trip ends with a
  "back home, unpack, warm by the fire" beat — the *return ritual* is what makes it cozy.
- **Session loop (30–90 min):** a self-set expedition goal (new biome, rare material, boss
  attempt) bookended by base upkeep and one small base improvement. Sessions should end on a
  *completed* note.
- **Meta loop (tens of hours):** biome tier → new materials → new gear + base tier → biome boss
  → comfort/travel tech (portals, carts, greenhouses) that makes *old* biomes trivially cozy.
  The fantasy: **you domesticate the wilderness.**

**PvE beyond bosses:** wandering events, not raids — a lost merchant caravan to escort, a
corrupted grove to cleanse, a beast migration. Rewarding, never base-destroying.

## 5. Tech architecture (web stack)

### 5.1 Layer map

| Layer | Tech | Role |
|---|---|---|
| App shell + HUD/UI | React 19 + Vite | Menus, inventory, crafting, build UI as DOM overlaying the canvas — a genuine advantage over engine UI |
| Scene/render | React Three Fiber + drei | Scene graph, glTF loading, instancing, LOD, camera |
| GPU compute & shading | TypeGPU (WebGPU) | Typed buffers/pipelines for the flat-shaded palette shader, instanced grass/foliage + wind, particles (fireflies, snow, hearth embers), and future terrain/scatter compute |
| Physics | Rapier.js (`@dimforge/rapier3d-compat` via `@react-three/rapier`) | Kinematic character controller, colliders from bpy-generated collision meshes, combat hit queries (shape casts), build-piece placement checks |
| Game state | ECS (koota or miniplex) for simulation; zustand for UI state | Keep React out of the per-frame hot path — React composes the world, ECS ticks it |
| Persistence | IndexedDB (versioned save schema) | Save/load world + base + inventory; export/import save file |

### 5.2 Stack-specific decisions

- **Rendering path:** three.js `WebGPURenderer` where available; TypeGPU owns the custom
  compute + material work. **Decide early:** WebGPU-only (Chrome/Edge/Safari 26+, simpler) vs.
  WebGL2 fallback (wider reach, dual code paths). Recommendation: **WebGPU-only for slice-0**,
  revisit before public release.
- **No textures anywhere.** Vertex colors from a fixed 32-color palette. One material for the
  whole world → near-total instancing/batching freedom and trivially small downloads.
- **Instancing is the default.** Trees, rocks, grass, build pieces all render as instanced
  meshes keyed by generator variant. Target budget: < 300 draw calls, 60 fps on a mid laptop.
- **Simulation determinism:** fixed-timestep game tick (Rapier stepped manually at 60 Hz),
  seeded RNG throughout, rendering interpolated. Keeps behavior reproducible and leaves the
  door open for co-op later.
- **Co-op posture:** architect state as serializable, tick-based, and authoritative-shaped
  (ECS world = single source of truth, inputs as commands). **Ship slice-0 single-player.**
  Retrofitting multiplayer into survival-crafting state is a rewrite; this posture avoids that
  without paying the netcode cost now.
- **Asset delivery:** meshopt-compressed glTF via `gltf-transform`, lazy-loaded per biome.
  Flat-shaded vertex-color assets are tiny; a whole biome should be < 5 MB.

### 5.3 Risks (tech)

| Risk | Mitigation |
|---|---|
| WebGPU availability (Firefox partial, older Safari) | WebGPU-only slice-0; capability gate with a friendly message; fallback decision deferred to pre-release |
| TypeGPU ↔ three.js interop is young | Keep TypeGPU usage in isolated modules (grass, particles, palette shader) behind small interfaces; three.js-native fallback per module |
| Rapier WASM perf with many colliders | Simplified convex colliders from the asset factory (never render mesh = collider); sleep aggressively; static geometry as fixed bodies; collider LOD by distance |
| Browser memory limits | Per-biome asset streaming; instanced everything; no textures already removes the usual biggest cost |
| GC pressure / frame hitches | Object pooling in the ECS hot path; no per-frame allocations in systems; profile early with Chrome tracing |

## 6. Asset factory (Blender bpy)

The art style makes fully code-generated assets look intentional. Assets are *code*: each is
`generate(seed, params)` — reproducible, versionable, reviewable as PRs.

### 6.1 Pipeline

```
generators/            one Python file per asset family (tree_pine.py, boulder.py, crate.py …)
params/                JSON recipes: seed + knobs per variant
        │
  blender --background --python build.py -- <recipe>     (Blender LTS, version-pinned)
        │  builds mesh → palette vertex colors → split normals (flat shading)
        │  → decimate to budget → auto collider (convex) + LOD1 → export .glb
        ▼
exports/*.glb  ──►  gltf-transform (meshopt) ──►  game /assets, loaded via drei useGLTF
        +
review/*.png   scripted 4-angle turntable renders + stats.json
               (tris, bounds, palette conformance) — the QA gate for every asset PR
```

One command rebuilds the entire library from source. A palette change is one commit that
restyles the whole game.

### 6.2 What generates vs. what doesn't

**Generated (~80% of asset count):** flora (trees, bushes, mushrooms, crops *with growth
stages as a parameter*), rocks/cliffs/ore nodes, the **modular building kit** (grid + socket
conventions enforced by the generator — every piece guaranteed to snap), props & furniture,
weapon/tool families (one `axe.py` → all material tiers), crystals, ruins, bones.

**Hand/hybrid (~20%, carries the identity):** characters & creatures (kitbash/commission —
this is where "cozy" lives or dies), rigging & animation (purchased/hand-made sets, retargeted),
hero landmarks (generate a base, hand-finish; one memorable landmark beats fifty generated ones).

### 6.3 Design consequences

- **Growth stages everywhere, almost free** — planted saplings mature, gardens ripen, the
  valley visibly lushens as you invest. A cozy dopamine engine that costs a for-loop.
- **Seeded world dressing** — generators export scatter tables; wild variants outside your
  walls, cultivated variants inside, same generator, different params.
- **Anti-sameness gate:** every generator must pass a 10-seed contact-sheet review; generous
  parameter ranges; a few hand-finished heroes per biome.

## 7. Slice-0 — the "one biome game"

If this 2-hour experience isn't already addicting and cozy, no amount of content fixes it.

**Scope (hard cap):**
- 1 biome (the Valley — Autumnwood-adjacent, warm)
- Player controller: walk/run/jump/dodge, stamina, Rapier kinematic character controller
- Combat: 2 melee weapons (axe, spear) + bow; 4 enemy types + 1 summonable boss
- Survival: hunger-as-buff, day/night cycle, one weather effect (rain), campfire warmth
- Building: ~20 buildables (walls, floor, roof, door, hearth, bed, crafting bench, storage,
  fence, torch, furniture starter set), grid snap + socket placement, comfort score → rested buff
- Crafting: 1 material tier (wood/stone/flint/fiber), bench + hearth recipes, cooking
- World: hand-arranged terrain dressed with generated scatter; ~15 min walk across
- Persistence: save/load to IndexedDB
- Asset factory: ~12–15 generators covering 100% of slice-0 environment/prop/weapon assets

**Explicitly out of slice-0:** co-op, magic, NPCs/visitors, farming, additional biomes,
portals, WebGL fallback, gamepad (keyboard/mouse only).

## 8. Milestones

| # | Milestone | Proves | Exit criteria |
|---|---|---|---|
| M0 | **Pipeline spike** | The whole chain works end-to-end | bpy rock + pine generators → glb → rendered instanced in R3F with palette shader → walkable via Rapier controller → 60 fps with 5k instances |
| M1 | **Feel** | Movement + combat are *good* before content | Character controller + camera + axe combat vs. 1 enemy type passes a "does hitting things feel weighty?" gut check |
| M2 | **Loop** | The minute loop retains | Gather → craft → build → eat → rest cycle playable; hearth + comfort buff working; save/load |
| M3 | **Slice-0 complete** | The session loop retains | Full §7 scope; 2-hour playtest ends with "one more night" feeling |
| M4 | **Hardening** | Shippable as a demo | Perf budget met on mid laptop, save-schema versioning, capability gating, itch.io/web deploy |

Each milestone runs as an epic (branch + issues + sub-PRs) per the standard delivery workflow.

## 9. Open questions

1. **WebGL2 fallback** — decide before public release, not before slice-0. (Default: skip.)
2. **Character/creature art direction** — the one gap the asset factory doesn't cover.
   Commission vs. kitbash decision needed before M2 (enemies) — placeholder capsules for M1.
3. **Co-op** — posture is "architected-for, not built." Revisit after slice-0 retention verdict.
4. **Audio direction** — not yet discussed; cozy lives in audio as much as lighting. Needs a
   plan before M3 (ambient loops, combat feedback, UI ticks).

## 10. Repo layout (proposed)

```
game-dev/
  PLAN.md                 this file
  app/                    Vite + React + R3F game client
    src/{ecs,render,physics,ui,world,save}/
  asset-factory/          Blender bpy pipeline
    generators/  params/  build.py  palette.py  style_check.py
    exports/  review/
  docs/                   design docs as they grow (combat spec, biome map, palette)
```
