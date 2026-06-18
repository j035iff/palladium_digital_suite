# Palladium Digital Suite — AI Project Context

> **Purpose of this document:** Give external AI assistants (e.g. Gemini) enough context to reason about this codebase without reading the entire repo. Treat `docs/vision.md` and `docs/srs.md` as authoritative for product rules; this file is a practical map.

---

## What we are building

**Palladium Digital Suite** (working name; also referred to as **Character Nexus** in vision docs) is a **multi-genre, data-driven tabletop RPG character manager and rules automation engine** for the **Palladium Megaverse** — starting with **Nightbane**, with architecture for **Rifts** and **Palladium Fantasy**.

Goals:

- Enforce Palladium percentile, attribute, combat, and progression rules accurately.
- Hide print-book complexity behind a fast, mobile-friendly UI.
- Support **Nightbane’s dual-form model** (Facade vs Morphus) where stats, skills, and vitals swap entirely between forms.
- Keep character save files **genre-native and immutable**; host-setting conversions happen at runtime via middleware.
- Prefer **physical dice**: the app calculates bonuses and accepts manual roll entry; it does not replace the table’s randomness unless the user enters results.

This is **not** a VTT map/token tool. It is a **character sheet + creation wizard + combat HUD** with deep rules data behind it.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Validation | Ajv JSON Schema (content + character payloads) |
| Tests | Vitest (71 test files, 433 tests) |
| PDF ingest (Morphus) | Python 3 + PyMuPDF, Node orchestration |
| Persistence | Local JSON character files (browser/local storage patterns) |

Key npm scripts:

```bash
npm run dev                  # Vite dev server (http://localhost:5173)
npm run build                # tsc -b && vite build (see Build health below)
npm run preview              # Serve production build (http://localhost:4173)
npm test                     # Vitest — full suite
npm run validate:schemas     # All Palladium content schemas + catalogs
npm run audit:talents        # Tier 1 chargen completeness report (talents)
npm run audit:skills         # Pass A catalog completeness report (skills, all genres)
npm run validate:morphus     # Morphus table JSON only
npm run morphus:ingest -- <cmd> <tableId>   # PDF → JSON pipeline
```

**Build health (June 2026):** `npm run build` is currently blocked by TypeScript errors in creation/configurator layers (e.g. `talentSelectionGates.ts`). `npx vite build` succeeds for UI preview; fix `tsc` before treating production builds as clean.

---

## Architectural pillars (non-negotiable)

From `docs/vision.md`:

1. **Setting-first orchestration** — Selecting a genre (`nightbane`, `rifts`, `palladium_fantasy`) loads a scoped rules manifest. Illegal options are hidden at creation and greyed out (not removed) during play.
2. **Centralized middleware** — UI components never compute cross-genre conversions. `genreTransformer.ts` produces a derived view model from raw save JSON + `hostGenreId`.
3. **Radical visibility** — Restricted options stay visible but locked with tooltips (“Not available in …”).
4. **Physical dice priority** — Frictionless manual entry for real rolls.
5. **GM agency** — Values remain overrideable.
6. **Two-tap combat** — Primary strike/parry/damage reachable quickly (Combat HUD / “Destiny HUD”).

Character root state always tracks:

- `creationGenreId` — stamped at creation; defines native rules.
- `hostGenreId` — active environment (launcher choice or future GM room).

---

## Nightbane: the “Total Reconfiguration” model

From `docs/srs.md`:

Nightbane characters use **two complete mechanical profiles** toggled by `activeForm`:

| Shared across forms | Swaps with form |
|---------------------|-----------------|
| XP, P.P.E. | All 8 attributes (I.Q., M.E., M.A., P.S., P.P., P.E., P.B., Spd.) |
| | H.P., S.D.C., alignment |
| | Skills (percentiles re-resolve per form) |
| | Morphus-only traits, Horror Factor, supernatural P.S. tier |

The UI theme shifts when Morphus is active (dark violet gradient vs light Facade sheet).

**Morphus** is the Nightbane’s supernatural shape. Players roll on category tables (Athlete, Stigmata, Undead, etc.); each table entry is a structured JSON characteristic with stat modifiers, skill overrides, natural weapons, damage affinities, mobility, and narrative `customOneOffs`.

---

## Application flow

```
App Launch (AppLauncher) — docs/app_viewport_launcher.md
  ├─ Open Character → load JSON → genreTransformer → CharacterContext → MainLayout
  └─ Create Character → pick genre → Forge (docs/forge-character_creation.md) → spawn (docs/character_spawn_handoff.md)

MainLayout (live sheet)
  ├─ Identity / XP / form toggle
  ├─ Attributes & vitals (Facade | Morphus)
  ├─ Skills (SkillEngine)
  ├─ Abilities (magic / psionics / talents via FeatureCard)
  ├─ Morphus capabilities digest
  ├─ Saving throws (additive roll display: vs target + bonus to d20)
  ├─ Inventory / Armory
  └─ Combat HUD (APM, weapon slots, strikes, reload)
```

### Character Creation Forge (8 tabs)

See `docs/forge-character_creation.md` and `docs/universal_forge_navigation_engine.md`.

| Tab | Purpose |
|-----|---------|
| 1 | Race, O.C.C., alignment — **Tri-Directional Configurator** (`ConfiguratorPanel`, `configuratorMatrix.ts`) |
| 2 | Attribute allocation (Attribute Forge) |
| 3 | Psychic Gate — explicit tier choice |
| 4 | Skill selection (`SkillEngine`) |
| 5 | Roll Pending — Facade / single-form physical dice |
| 6 | Morphus Sub-Forge (Nightbane only) — traits + Morphus vitality dice |
| 7 | Supernatural abilities — magic, psionics, talents forge panels |
| 8 | Review & Spawn — alignment required here; spawn handoff |

**Continue** never changes the viewport; user picks the next tab manually. Yellow/red conflict flags cascade top-down when Race or O.C.C. changes upstream.

**Creation ledger:** `buildCreationLiveLedgerSnapshot()` in `creationLiveLedger.ts` drives the read-only Live Ledger during Tabs 1–6. Authoritative formulas: `docs/stat_engine_spec.md` (cheat sheet: `docs/live_ledger.md`).

Creation highlights:

- **Attribute Forge** — pool-and-assign, N+1 keep N dice, optional bonus die prompts (`docs/attribute_and_stat.md`).
- **Psychic Gate** — tier from test potential; save targets 15/12/10; Major tier costs 50% O.C.C. skill slots (`docs/psychic_gate.md`).
- **Ability Selection** — unified picker with source attribution (Race, O.C.C., psychic tier); separate forge panels per lane.

---

## Code layout (where to look)

```
src/
  App.tsx                    # Launcher vs MainLayout; form theme
  context/CharacterContext.tsx   # Central state, derived stats, morphus aggregation
  components/
    dashboard/AppLauncher.tsx
    creation/                  # ConfiguratorPanel, AttributeForge, SkillEngine, MorphusForge,
                               # LiveLedger, PendingDiceResolutionPanel, ability forge panels
    forge/                     # ForgeNavigationBar, tab shells, Continue gate
    live/                      # CombatHUD, SavingThrowsPanel, Inventory, LevelUpModal
    features/FeatureCard.tsx   # Unified ability/feature presentation
  lib/                         # ~273 modules — rules engines (combat, skills, morphus, forge nav, saves)
  utils/genreTransformer.ts    # Host-genre derivation middleware
  data/
    genres.ts                  # Genre manifest (playable settings)
    saveKinds.ts               # Canonical saveKind slugs for catalog rows
    content/                   # JSON catalogs (see Content scale below)
    library/                   # Catalog loaders (skillsCatalogLoader, morphusTableCatalogLoader, …)
    schemas/                   # Ajv JSON schemas + examples/
    source/morphus-ingest/     # Per-table PDF ingest manifests + staging artifacts
    reference/nightbane/       # Source PDFs (gitignored)
docs/                          # SRS, vision, combat, creation, morphus/talent authoring specs
scripts/                       # validate-*, audit-palladium-talents.mjs, morphus-ingest.mjs, talent-engine-contract.mjs
```

Important engines:

| Module | Role |
|--------|------|
| `creationLiveLedger.ts` | Forge-phase stat/vital preview snapshot (Phase A in stat engine spec) |
| `configuratorMatrix.ts` | Tab 1 Race/O.C.C./alignment tri-directional filtering and packages |
| `forgeNavigation/engine.ts` | Tab colors, Continue, yellow/red conflict, top-down repair |
| `morphusCharacteristicAggregation.ts` | Stack Morphus stat/skill/damage modifiers |
| `morphusPassiveBridge.ts` | Bridge aggregated Morphus into CharacterContext |
| `morphusCreationLedger.ts` | Morphus Sub-Forge ledger during Tab 6 |
| `featureEngine.ts` | Race/O.C.C./talent feature budgets and passive modifiers |
| `attributeSaves.ts` / `saveProfile.ts` | Save target resolution and bonus stacking |
| `saveRollDisplay.ts` | Additive UI: **vs N** target + **+bonus** to d20 |
| `opposedRollRules.ts` | Global tie rule — **defender/saver wins ties** |
| `nightbaneBecomingSave.ts` | Save vs Becoming uses Facade M.E. + level progression |
| `handToHandPipeline.ts` / `strikeEngine.ts` | Melee combat resolution |
| `psychicGate.ts` | Psionic tier logic |
| `skillEquation.ts` / `skillModifiers.ts` | Percentile skill math |
| `sheetBonuses.ts` / `characterDerived.ts` | Live sheet derived values |
| `talentSelectionGates.ts` | Talent pick gates (morphus table prerequisites, form usage) |

Types live in `src/types.ts` (~2,300 lines) and must stay aligned with `src/data/schemas/*.schema.json`.

---

## Content scale (June 2026)

Validated catalogs under `src/data/content/`:

| Catalog | Count | Location |
|---------|-------|----------|
| Skills | 160 | `skills/*.json` (14 category files; loader: `library/skillsCatalogLoader.ts`) |
| Talents | 151 | `talents/common.json` (94) + `talents/elite.json` (57) |
| Morphus tables | 56 | `morphus/tables/*.json` |
| Psionics | 78 | `psionics/*.json` (4 category files) |
| Magic spells | 156 | `magic/wizard.json`, `magic/mirror.json`, `magic/fleshsculptor.json` |
| O.C.C.s | 17 | `occs/nightbane/` — `nightbane_core.json` (11) + `between_the_shadows.json` (6) |
| Player races | 4 | `races/player.json` |
| Hand-to-Hand | 5 | `palladiumHandToHand.json` |

Schemas: 18 Palladium content schemas + example JSON under `src/data/schemas/examples/`.

---

## Data model & schemas

Content is **JSON-first**, validated by Ajv:

| Schema | Content file(s) |
|--------|-----------------|
| `palladium-skill.schema.json` | `skills/*.json` (14 category files; loader: `skillsCatalogLoader.ts`) — ingest: [`docs/palladium-skill-ingest.md`](palladium-skill-ingest.md) |
| `palladium-occ.schema.json` | `occs/<genre>/*.json` — ingest: [`docs/palladium-occ-ingest.md`](palladium-occ-ingest.md) |
| `palladium-race.schema.json` | `races/player.json`, `races/npc.json`, `races/gm_approval.json` — ingest: [`docs/palladium-race-ingest.md`](palladium-race-ingest.md) |
| `palladium-talent.schema.json` | `talents/common.json`, `talents/elite.json` — ingest: [`docs/nightbane-talent-ingest.md`](nightbane-talent-ingest.md) |
| `palladium-psionic.schema.json` | `psionics/*.json` (category files) — ingest: [`docs/palladium-psionic-ingest.md`](palladium-psionic-ingest.md) |
| `palladium-magic.schema.json` | `magic/*.json` — ingest: [`docs/palladium-magic-ingest.md`](palladium-magic-ingest.md) |
| `palladium-hth.schema.json` | `palladiumHandToHand.json` |
| `palladium-morphus.schema.json` | Each characteristic **entry** inside morphus tables |
| `palladium-morphus-table.schema.json` | Each morphus **table** wrapper (`id`, `entries[]`) |
| `palladium-xp-table.schema.json` | `progression/xp_tables/<genre>/*.json` |

Morphus characteristic entries support structured fields such as:

- `statModifiers` (flat or dice via polymorphic `{ flat: N }` / `{ dice: "2D6" }`)
- `skillModifiers.specificSkillOverrides` (percent, impossible-in-Morphus, skill traits)
- `damageAffinities` (0, 0.5, 2.0 multipliers for fire, holyWeapons, kinetic, etc.)
- `naturalWeapons`, `mobility.flightEngine`, `limbDurability`, `saveModifiers`
- `appearanceConstraints`, `combatContextModifiers`, `customOneOffs` (narrative edge cases)

Authoring guides: `docs/morphus_authoring.md`, `docs/nightbane-talent-ingest.md`, `docs/palladium-skill-ingest.md`, `docs/palladium-magic-ingest.md`, `docs/palladium-psionic-ingest.md`, `docs/palladium-occ-ingest.md`, `docs/palladium-race-ingest.md`.

### Saving throws (catalog + sheet)

- Canonical slugs: `src/data/saveKinds.ts` — includes attribute-only kinds `base_pe`, `base_me`, `vs_becoming`.
- Sheet display is **additive**: GM calls target **vs N**; player rolls d20 + displayed bonus (`saveRollDisplay.ts`).
- **Saver wins ties** globally (`opposedRollRules.ts`) unless a specific ability overrides.
- Save vs Becoming uses **Facade M.E.** (`nightbaneBecomingSave.ts`).
- Book “roll under N” failure wording (e.g. Darksong) encodes as `saveKind: base_pe`, `targetNumber: N`.

---

## Nightbane talent catalog ingest

**Status:** Pass A (chargen-only) is **complete** for all 151 talents — `npm run audit:talents` reports 151/151 Tier 1 complete, 0 critical.

Two-pass model (`docs/nightbane-talent-ingest.md`):

| Pass | Scope | Status |
|------|-------|--------|
| **A — Chargen** | Picker, gates, P.P.E., sources, `formUsage`, prerequisites | Complete |
| **B — Play** | Combat blocks, ranges, damage, runtime consumption | Tier 2 stubs exist on rows; play wiring is future work |

Workflow: Pass A/B per batch → `npm run validate:schemas` → `npm run audit:talents`. Engine contract: `scripts/talent-engine-contract.mjs`. Flag ambiguous book mechanics and ask the user before encoding.

**Source note:** `WB3-Through_the_Glass_Darkly.pdf` p. 133–134 is adventure/NPC content, not talents. Between the Shadows talents cite `"Between the Shadows"` as secondary source.

---

## Palladium skill catalog ingest (all genres)

**Status:** Pass A catalog rows exist for **160** skills — `npm run audit:skills` reports 160/160 Pass A complete, **0 critical**.

Genre-agnostic workflow (`docs/palladium-skill-ingest.md`):

| Pass | Scope | Status |
|------|-------|--------|
| **A — Catalog** | Picker, %, prerequisites, synergies, sources, `gameSystems`, categories | Complete |
| **B — Play** | Physical bonuses, sub-tasks, attacks, advanced roll rules | Partial on rows; play wiring is future work |

Workflow: Pass A/B per batch → `npm run validate:schemas` → `npm run audit:skills`. Engine contract: `scripts/skill-engine-contract.mjs`. Tag `gameSystems` for the source line (Nightbane, Rifts, Fantasy, etc.); flag ambiguous book mechanics and ask the user before encoding.

---

## Morphus content pipeline

56 morphus table JSON files under `src/data/content/morphus/tables/`. Most were ingested from Palladium PDFs via:

```
prepare → extract PDF + schema-loop → scaffold → structure-entries
build   → merge → validate
finalize → aggregation-coverage.json (which fields wire to runtime)
```

Manifests: `src/data/source/morphus-ingest/*.manifest.json`

Rules:

- **Dark Designs (WB6)** is authoritative for prose when core + supplement differ.
- Cross-table router rows (Other, Combination of Two, Biomechanical redirects) are excluded.
- Multi-book tables merge `sources[]` per trait; `tableCategory` distinguishes Table I / II / III where applicable.

Reference PDFs live in `src/data/reference/nightbane/` (not committed).

Tab 6 hosts the nested **Morphus Sub-Forge** (`docs/forge-morphus_creation.md`) — slot resolution engine and 3-step shell are shipped; **guided/basic flow** is the active UX focus; **Expert Mode** (master index + trait cart) has not had an implementation pass.

---

## Current development focus

**Primary:** Nightbane **Character Creation Forge** (8-tab flow), **Live Ledger / stat engine** alignment, live sheet, Morphus automation, combat HUD.

**Recently stable / complete:**

- Morphus category tables (56 JSON files) ingested and schema-validated.
- Nightbane talent Pass A ingest (151 talents, audit clean).
- Skills catalog split into 14 category JSON files with `skillsCatalogLoader`.
- Universal Forge Navigation Engine — tab colors, Continue, yellow/red snapshots.
- Tab 1 Tri-Directional Configurator (Race/O.C.C./alignment matrix).
- Creation Live Ledger + pending dice pipeline (Tabs 5–6).
- Additive save display and attribute-only save kinds on sheet and in catalogs.
- Feature engine + `FeatureCard` unifying talents, racial traits, and O.C.C. abilities.

**Active / in progress:**

- TypeScript cleanup so `npm run build` passes (`tsc -b`).
- Live play (Phase E in `stat_engine_spec.md`) still catching up to creation ledger in places.
- **Morphus Sub-Forge guided/basic flow** (Tab 6) — slot engine shipped; UX polish and validation still in progress. Expert Mode not started.
- Talent Pass B — runtime consumption of Tier 2 combat/play blocks.
- Supernatural ability forge panels (magic / psionics / talents) polish and spawn handoff edge cases.

**Roadmap genres** (visible in launcher, not all wired): Rifts Aftermath, generic Fantasy/Sci-Fi stubs.

---

## Related documentation (read order for deep dives)

| Doc | Topic |
|-----|--------|
| `docs/vision.md` | Product philosophy, pillars, AI interaction protocol |
| `docs/srs.md` | Master requirements (Nightbane dual-form, Attribute Forge, Psychic Gate, Combat HUD) |
| `docs/master_flow.md` | Runtime pipeline, save/mutation loop |
| `docs/app_viewport_launcher.md` | Gate Check — Open vs Create, genre manifest, viewports |
| `docs/forge-character_creation.md` | Character Creation Forge — **8-tab** sequence & state |
| `docs/forge-morphus_creation.md` | Morphus Sub-Forge (Tab 6) |
| `docs/character_spawn_handoff.md` | Spawn modal, sheet handoff, `isFinalized`, saves |
| `docs/character_creation.md` | Documentation map (links above + configurator tiers) |
| `docs/universal_forge_navigation_engine.md` | Universal Forge Navigation Engine (tabs, Continue, colors) |
| `docs/stat_engine_spec.md` | **Stat formulas** — attributes, vitals, saves, combat stacking (Live Ledger SoT) |
| `docs/live_ledger.md` | Formula cheat sheet (defers to stat engine spec) |
| `docs/movement_engine_spec.md` | Ground / swim / fly / leap from Spd |
| `docs/nightbane-talent-ingest.md` | Talent Pass A/B ingest workflow and encoding rules |
| `docs/palladium-skill-ingest.md` | Skill catalog Pass A/B ingest (genre-agnostic) |
| `docs/palladium-magic-ingest.md` | Magic spell catalog Pass A/B ingest |
| `docs/palladium-psionic-ingest.md` | Psionic power catalog Pass A/B ingest (category-split target) |
| `docs/palladium-occ-ingest.md` | O.C.C. composition ingest |
| `docs/palladium-race-ingest.md` | Race / R.C.C. ingest (audience pools) |
| `docs/combat_logic.md` | S.D.C./M.D.C., P.S. tiers, damage, APM tracker UX |
| `docs/morphus_authoring.md` | How to encode Morphus traits for the engine |
| `docs/attribute_and_stat.md` | Attribute Forge mechanics |
| `docs/psychic_gate.md` | Psionic tiers |
| `src/data/source/morphus-ingest/README.md` | PDF ingest CLI |

---

## Conventions for AI assistants

1. **Do not guess Palladium rules** — derive behavior from JSON schemas, `docs/`, and book-accurate content files.
2. **Prefer structured Morphus/talent fields** over stuffing mechanics into `description` or `customOneOffs` when the schema supports them.
3. **Keep UI dumb** — business logic belongs in `src/lib/`, not React components.
4. **Validate after content changes:** `npm run validate:schemas`, `npm run audit:talents` (talents), `npm run audit:skills` (skills), and/or `npm run validate:morphus`.
5. **Talent ingest** — follow `docs/nightbane-talent-ingest.md`; flag ambiguous mechanics and ask the user before encoding.
6. **Skill ingest** — follow `docs/palladium-skill-ingest.md`; same flag-and-ask rule (any Palladium genre).
7. **Magic / psionic / O.C.C. / race ingest** — follow `docs/palladium-magic-ingest.md`, `docs/palladium-psionic-ingest.md`, `docs/palladium-occ-ingest.md`, `docs/palladium-race-ingest.md` respectively.
8. **Minimize diff scope** — match existing naming, import style, and polymorphic modifier patterns.
9. **Genre gating** — never show Nightbane-only mechanics as universal without checking `gameSystems` / genre manifests.
10. **Schema examples** — when a content schema changes, update the matching file under `src/data/schemas/examples/` (do not create duplicate example files).
11. **Commits** — only when the user explicitly asks.

---

## One-sentence summary

We are building a schema-driven Palladium Megaverse character companion that automates Nightbane’s Facade/Morphus dual-form sheet, hosts a validated content library (skills, talents, morphus tables, magic, psionics), and exposes an 8-tab creation forge with live ledger preview, additive saves, abilities, inventory, and a fast combat HUD — with genre middleware so the same engine can eventually host Rifts and Fantasy.
