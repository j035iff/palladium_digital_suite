# Character Creation — Documentation Map

The Palladium Digital Suite splits **session entry**, **in-forge assembly**, and **spawn commit** into separate specifications. This file is the index; it does not duplicate those specs.

---

## Pipeline (read order)

```
App Launch
  └─ app_viewport_launcher.md     Open Character | Create Character
        └─ forge-character_creation.md   (Create only) 7-tab Forge
              └─ universal_forge_navigation_engine.md   Continue, colors, yellow/red
                    └─ character_spawn_handoff.md   Tab 7 confirm → live sheet
```

**Runtime after any load:** [master_flow.md](./master_flow.md) — ingest, `hostGenreId`, `genreTransformer`, save/mutation loop.

---

## Specifications

| Document | Scope |
|----------|--------|
| [app_viewport_launcher.md](./app_viewport_launcher.md) | Gate Check: launcher viewport, open vs create, genre manifest, `creationGenreId` / `hostGenreId` |
| [forge-character_creation.md](./forge-character_creation.md) | Seven-tab Forge sequence, alignment Tab 1 vs 7, conflict/yellow rules |
| [universal_forge_navigation_engine.md](./universal_forge_navigation_engine.md) | Generic Forge engine: tab colors, Continue, Sub-Forges |
| [character_spawn_handoff.md](./character_spawn_handoff.md) | Spawn modal, `applySpawnSheetHandoff`, `isFinalized`, persistence |
| [master_flow.md](./master_flow.md) | Cross-cutting runtime pipeline and saves |

---

## Tab 1 deep dive: Tri-Directional Configurator

The Forge Tab 1 UI implements the **Race / O.C.C. / Alignment** matrix. Rules not repeated in the Forge tab spec:

### Persistent attribute header

- Eight primary attributes always visible; dice notation updates with Race.
- O.C.C. minimums shown as high-contrast thresholds on attributes.
- O.C.C. bonuses shown as green indicators (flat or dice notation, e.g. +1D4).

### Tri-directional filtering

Selecting Race, O.C.C., or Alignment constrains the other two in real time (species codes, profession codes, moral restrictions).

### Three-tier list rendering (Pillar 8)

Options are never hidden; they are sorted and color-coded:

| Tier | Name | Behavior |
|------|------|----------|
| **1** | Active Match | Valid for all active filters; top of list |
| **2** | Tri-Directional Conflict | Disabled red + tooltip (e.g. “Requires Nightbane Race”) |
| **3** | Tag Mismatch | Disabled grey + tag tooltip (e.g. “Not a magic OCC”) |

**Code:** `src/lib/configuratorMatrix.ts`, `src/components/creation/ConfiguratorPanel.tsx`

---

## Supplemental rule docs (Forge tab content)

| Topic | Doc |
|-------|-----|
| Attribute pool & Live Ledger | `docs/attribute_and_stat.md` |
| Psychic Gate | `docs/psychic_gate.md` |
| Morphus (future Sub-Forge) | Separate Morphus spec; `src/data/content/morphus/` |
| Combat / vitals scaling | `docs/combat_logic.md` |

---

## Catalog references

| Concern | Location |
|---------|----------|
| Genre manifest | `src/data/genres.ts` — `GENRE_MANIFEST` |
| Player races | `src/data/content/races/player.json` |
| O.C.C. pool | `src/data/content/occs/*.json` |
| Skills | `src/data/content/palladiumSkills.json` |

**Psychic Gate bypass:** Genre forbids supernatural play; race `psionics.capabilityType` is `none` or `innate`; or O.C.C. `progression.psychicGateBypassed`. Standard humans in supernatural-allowed genres still get the gate for optional minor psionics.
