# Character Creation — Documentation Map

The Palladium Digital Suite splits **session entry**, **in-forge assembly**, and **spawn commit** into separate specifications. This file is the index; it does not duplicate those specs.

---

## Pipeline (read order)

```
App Launch
  └─ app_viewport_launcher.md     Open Character | Create Character
        └─ forge-character_creation.md   (Create only) 8-tab Forge
              ├─ forge-morphus_creation.md   Tab 6 Morphus Sub-Forge (Nightbane)
              └─ universal_forge_navigation_engine.md   Continue, colors, yellow/red
                    └─ character_spawn_handoff.md   Tab 8 confirm → live sheet
```

**Runtime after any load:** [master_flow.md](./master_flow.md) — ingest, `hostGenreId`, `genreTransformer`, save/mutation loop.

---

## Specifications

| Document | Scope |
|----------|--------|
| [app_viewport_launcher.md](./app_viewport_launcher.md) | Gate Check: launcher viewport, open vs create, genre manifest, `creationGenreId` / `hostGenreId` |
| [forge-character_creation.md](./forge-character_creation.md) | Eight-tab Forge sequence, alignment Tab 1 vs 8, conflict/yellow rules |
| [forge-morphus_creation.md](./forge-morphus_creation.md) | Morphus Sub-Forge nested in Tab 6 (Nightbane) |
| [universal_forge_navigation_engine.md](./universal_forge_navigation_engine.md) | Generic Forge engine: tab colors, Continue, Sub-Forges |
| [character_spawn_handoff.md](./character_spawn_handoff.md) | Spawn modal, `applySpawnSheetHandoff`, `isFinalized`, persistence |
| [master_flow.md](./master_flow.md) | Cross-cutting runtime pipeline and saves |

### Forge tab index (master sequence)

| Tab | Name | Notes |
|-----|------|--------|
| 1 | Race, O.C.C., alignment | Tri-Directional Configurator; alignment optional for Continue |
| 2 | Attribute allocation | Attribute Forge + Live Ledger + O.C.C. variable bonuses |
| 3 | Psionic determination | Psychic Gate; Black when bypassed |
| 4 | Skill selection | Core, related, vouchers |
| 5 | Roll Pending | Facade / single-form physical dice |
| 6 | Character trait forges | Morphus Sub-Forge (Nightbane); Black for non-trait races |
| 7 | Resource-based abilities | Magic, psionics, talents |
| 8 | Review & Spawn | Alignment required; spawn handoff — no Continue |

Full criteria per tab: [forge-character_creation.md](./forge-character_creation.md).

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

**Code:** `src/lib/configuratorMatrix.ts`, `src/components/creation/ConfiguratorPanel.tsx` (`OccSelector` is a deprecated re-export alias).

---

## Supplemental rule docs (Forge tab content)

| Topic | Doc |
|-------|-----|
| **Stat formulas (source of truth)** | `docs/stat_engine_spec.md` |
| Live Ledger quick reference | `docs/live_ledger.md` |
| Attribute architecture & exceptional tables | `docs/attribute_and_stat.md` |
| Psychic Gate | `docs/psychic_gate.md` |
| Morphus Sub-Forge (Tab 6) | `docs/forge-morphus_creation.md`; `src/data/content/morphus/` |
| Nightbane talent catalog ingest | `docs/nightbane-talent-ingest.md` |
| Combat / vitals scaling | `docs/combat_logic.md` |

---

## Catalog references

| Concern | Location |
|---------|----------|
| Genre manifest | `src/data/genres.ts` — `GENRE_MANIFEST` |
| Player races | `src/data/content/races/player.json` |
| O.C.C. pool | `src/data/content/occs/*.json` |
| Skills | `src/data/content/skills/*.json` (loader: `src/data/library/skillsCatalogLoader.ts`) |
| Talents | `src/data/content/talents/common.json`, `talents/elite.json` |

**Psychic Gate bypass:** Genre forbids supernatural play; race `psionics.capabilityType` is `none` or `innate`; or O.C.C. `progression.psychicGateBypassed`. Standard humans in supernatural-allowed genres still get the gate for optional minor psionics.
