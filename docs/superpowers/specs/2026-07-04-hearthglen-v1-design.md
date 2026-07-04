# Hearthglen — v1.0 Design Spec

Approved 2026-07-04. Extends [PLAN.md](../../../PLAN.md) with the road to a complete game:
v1.0 scope, HUD/menu design, cozy systems, content, audio, onboarding, and input.

## 1. v1.0 definition

**In:** Valley + Autumnwood biomes · bosses Elderhorn + Bramble Sow · survival/build/craft loop
per PLAN.md · farming, fishing, hearth-fox pet, photo mode · full HUD + menu suite · audio ·
onboarding · gamepad + KB/M · save management · ~6–8 hours of play.

**Post-1.0:** Mistfen/Frostpeaks/Sundered biomes, co-op, NPCs/visitors, portals/carts, magic,
character customization, localization, WebGL2 fallback (1.0 is WebGPU-only).

## 2. HUD — quiet-contextual

Rule: **the screen is clean unless something needs you.** Every element has an appear-reason
and a leave-timeout. HUD chrome uses the storybook language (parchment chips, soft shadows,
serif numerals).

| Element | Position | Appears | Leaves |
|---|---|---|---|
| Health + stamina arcs | bottom-left | damaged / draining / weapon drawn / combat | full + safe 4s |
| Food/buff icons (radial timers) | beside vitals | eating, buff expiring, vitals visible | with vitals |
| Hotbar (8 slots) | bottom-center | scroll, 1–8, combat, tool swap | 4s idle |
| Interact prompt ("E — Gather sticks") | lower-center | looking at interactable | look away |
| Reticle | center | always (tiny dot); ring when aiming | — |
| Compass ribbon | top-center | moving >2s, compass crafted | standing still |
| Enemy health | above enemy | first hit | dead / left combat |
| Boss banner | bottom, illustrated nameplate | boss summoned | boss dead |
| Toasts | top-right parchment slips | recipe unlock, events, objectives | 5s |
| Day/weather dial | top-left sun/moon arc | dawn/dusk, weather change, hold V | 3s |
| Build mode | bottom piece palette + cost chips + snap ghost | hammer equipped | hammer away |

**Combat guarantee:** weapon drawn ⇒ vitals + hotbar pinned visible. Photo mode hides all HUD.

## 3. Menus — storybook warmth

Warm parchment panels, rounded corners, hand-drawn icons, serif display + readable sans body.
All UI is React DOM layered over the canvas.

- **Title:** live 3D hearth-at-dusk diorama; Continue / New Journey / Load / Settings / Credits.
- **The Journal (pause container, game pauses):** a book with edge tabs —
  **Inventory | Crafting | Map | Almanac | Settings**; LB/RB flips tabs on gamepad.
  - Inventory: grid + equipment doll + weight + comfort/rested summary.
  - Crafting: recipe list, category filters, craftable-now toggle, pin recipe → HUD cost chips.
  - Map: hand-illustrated parchment painting itself in as explored (fog = unpainted paper);
    pins/waypoints surface on the compass ribbon.
  - Almanac: discovered creatures/plants/fish/recipes + active events; soft quest log +
    onboarding reference pages.
  - Settings: graphics presets/FOV/motion · audio sliders · full rebinding (KB/M + pad) ·
    accessibility (subtitles, colorblind-safe palette swap via the 32-color system, reduce
    shake, hold-vs-toggle).
- **Saves:** world slots with screenshot thumbnails; autosave (day change + sleep) + manual;
  export/import save file.
- **Death:** storybook page turn — "You wake by your hearth…"

## 4. Cozy systems

- **Farming:** hoe tills plots; seeds from foraging; rain waters automatically, else watering
  can; growth stages via the asset-factory stage parameter; crops → best cooking recipes.
  No pests in v1.0.
- **Fishing:** craftable rod; cast → bobber → bite cue → timed hook → hold/release tension
  minigame; fish vary by biome/time/weather; rare fish fill the Almanac.
- **Hearth-fox pet:** Valley wandering event; feed 3× to tame; lives in a craftable basket,
  follows in the Valley, **cannot die** (hides from danger), dawn gift when base comfort is
  high. No combat role.
- **Photo mode:** world freeze, free cam, FOV/DoF/palette-shift filters, time-of-day slider,
  HUD hidden, PNG download.

## 5. Content

- **Boss 1 — Elderhorn** (Valley): great stag guardian, altar-summoned; defeat is a rite — it
  kneels, grants antler + heartwood → tier-2 tools + the Autumnwood threshold.
- **Autumnwood:** perpetual autumn; amberwood + copper materials; 4 new enemy types; ruins,
  night wisps, mushroom circles. Weapon roster completes: **hammer**, **sword+board** join
  axe/spear/bow.
- **Boss 2 — Bramble Sow:** bramble-crowned great boar in a thorn clearing; drops → v1.0
  endgame gear + a hearthstone trophy centerpiece.
- **Wandering events (2):** corrupted grove cleanse; beast migration harvest. Never
  base-threatening.

## 6. Audio

Web Audio API manager + three.js `PositionalAudio`; no extra library. Ambience-first:
biome/time beds with dawn/dusk crossfades; rain + fire mixed prominently; music = sparse
motifs at moments (dawn, biome entry, boss, taming); tactile SFX on every interaction.
Sourcing: licensed packs (curated during M8). Captioned cues for accessibility.

## 7. Onboarding

Arrive at a **cold ruined hearth**; restoring it is the tutorial. Objectives arrive as
parchment toasts ("The hearth is cold. Gather wood."); controls teach via first-use prompts;
the Almanac holds reference pages. "I've been here before" skip on New Journey.

## 8. Input

Action-map abstraction (actions, not keys); KB/M + gamepad profiles; last-used device
detection swaps prompt icons live; focus-navigable menus; hold-RB hotbar radial on pad.
Built in from M5, never retrofitted.

## 9. Milestone ladder → releases

Milestone merge → release-please minor → tag → production deploy.

| Ver | Milestone |
|---|---|
| 0.1.0 | M0 pipeline spike (factory → glb → instanced R3F + palette shader → Rapier-walkable, 60fps/5k) |
| 0.2.0 | M1 combat/movement feel |
| 0.3.0 | M2 minute loop + save/load |
| 0.4.0 | M3 slice-0 content complete |
| 0.5.0 | M4 hardening → public demo |
| 0.6.0 | M5 UI/UX: HUD, Journal, title, saves, gamepad |
| 0.7.0 | M6 cozy systems: farm, fish, fox, photo |
| 0.8.0 | M7 Autumnwood + both bosses + weapon tier 2 |
| 0.9.0 | M8 audio + onboarding |
| 1.0.0 | M9 balance/perf/a11y hardening → complete game |
