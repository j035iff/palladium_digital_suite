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
  └─ Create Character → pick genre → Forge (docs/forge/character_creation.md) → spawn (docs/character_spawn_handoff.md)

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

See `docs/forge/character_creation.md` and `docs/universal_forge_navigation_engine.md`.

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
| Player races | 6 | `races/<genre>/{player,npc,gm_approval}.json` (3 genres) |
| Hand-to-Hand | 5 | `skills/hand_to_hand.json` |
| W.P. catalog | 16 | `skills/weapon_proficiencies.json` |
| Encounter archetypes | 5 | `encounters/nightbane/nightbane_core.json` |

**Layout contract:** ancillary/registry JSON → `<catalog-dir>/utils/` (see [`docs/content-catalog-layout.md`](content-catalog-layout.md)).

Schemas: 19 Palladium content schemas + example JSON under `src/data/schemas/examples/`.

---

## Data model & schemas

Content is **JSON-first**, validated by Ajv:

| Schema | Content file(s) |
|--------|-----------------|
| `palladium-skill.schema.json` | `skills/*.json` (14 category files; loader: `skillsCatalogLoader.ts`) — ingest: [`docs/ingest/skills.md`](ingest/skills.md) |
| `palladium-occ.schema.json` | `occs/<genre>/*.json` — ingest: [`docs/ingest/occs.md`](ingest/occs.md) |
| `palladium-race.schema.json` | `races/<genre>/{player,npc,gm_approval}.json` — ingest: [`docs/ingest/races.md`](ingest/races.md) |
| `palladium-talent.schema.json` | `talents/common.json`, `talents/elite.json` — ingest: [`docs/ingest/talents.md`](ingest/talents.md) |
| `palladium-psionic.schema.json` | `psionics/*.json` (category files); registries in `psionics/utils/` — ingest: [`docs/ingest/psionics.md`](ingest/psionics.md) |
| `palladium-magic.schema.json` | `magic/*.json` (school files); registries in `magic/utils/` — ingest: [`docs/ingest/magic.md`](ingest/magic.md) |
| `palladium-hth.schema.json` | `skills/hand_to_hand.json` — ingest: [`docs/ingest/hth.md`](ingest/hth.md) |
| `palladium-weapon-proficiency.schema.json` | `skills/weapon_proficiencies.json`; modern ladder in `skills/utils/` — ingest: [`docs/ingest/weapon_proficiencies.md`](ingest/weapon_proficiencies.md) |
| `palladium-morphus-table.schema.json` | Each morphus **table** wrapper (`id`, `entries[]`) |
| `palladium-morphus.schema.json` | Each characteristic **entry** inside morphus tables — ingest: [`docs/ingest/morphus.md`](ingest/morphus.md) |
| `palladium-morphus-forge-routing.schema.json` | `morphus/forge/*.json` — ingest: [`docs/ingest/morphus.md`](ingest/morphus.md) § Sub-Forge routing |
| `palladium-xp-table.schema.json` | `progression/xp_tables/<genre>/*.json` — ingest: [`docs/ingest/xp_tables.md`](ingest/xp_tables.md) |
| `palladium-encounter-archetype.schema.json` | `encounters/<genre>/*.json` — ingest: [`docs/ingest/encounters.md`](ingest/encounters.md) |

Morphus characteristic entries support structured fields such as:

- `statModifiers` (flat or dice via polymorphic `{ flat: N }` / `{ dice: "2D6" }`)
- `skillModifiers.specificSkillOverrides` (percent, impossible-in-Morphus, skill traits)
- `damageAffinities` (0, 0.5, 2.0 multipliers for fire, holyWeapons, kinetic, etc.)
- `naturalWeapons`, `mobility.flightEngine`, `limbDurability`, `saveModifiers`
- `appearanceConstraints`, `combatContextModifiers`, `customOneOffs` (narrative edge cases)

Authoring guides: `docs/morphus_authoring.md`, `docs/ingest/morphus.md`, `docs/ingest/talents.md`, `docs/ingest/skills.md`, `docs/ingest/magic.md`, `docs/ingest/psionics.md`, `docs/ingest/occs.md`, `docs/ingest/races.md`, `docs/ingest/encounters.md`.

### Saving throws (catalog + sheet)

- Canonical slugs: `src/data/saveKinds.ts` — includes attribute-only kinds `base_pe`, `base_me`, `vs_becoming`.
- Sheet display is **additive**: GM calls target **vs N**; player rolls d20 + displayed bonus (`saveRollDisplay.ts`).
- **Saver wins ties** globally (`opposedRollRules.ts`) unless a specific ability overrides.
- Save vs Becoming uses **Facade M.E.** (`nightbaneBecomingSave.ts`).
- Book “roll under N” failure wording (e.g. Darksong) encodes as `saveKind: base_pe`, `targetNumber: N`.

---

## Nightbane talent catalog ingest

**Status:** Pass A (chargen-only) is **complete** for all 151 talents — `npm run audit:talents` reports 151/151 Tier 1 complete, 0 critical.

Two-pass model (`docs/ingest/talents.md`):

| Pass | Scope | Status |
|------|-------|--------|
| **A — Chargen** | Picker, gates, P.P.E., sources, `formUsage`, prerequisites | Complete |
| **B — Play** | Combat blocks, ranges, damage, runtime consumption | Tier 2 stubs exist on rows; play wiring is future work |

Workflow: Pass A/B per batch → `npm run validate:schemas` → `npm run audit:talents`. Engine contract: `scripts/talent-engine-contract.mjs`. Flag ambiguous book mechanics and ask the user before encoding.

**Source note:** `WB3-Through_the_Glass_Darkly.pdf` p. 133–134 is adventure/NPC content, not talents. Between the Shadows talents cite `"Between the Shadows"` as secondary source.

---

## Palladium skill catalog ingest (all genres)

**Status:** Pass A catalog rows exist for **160** skills — `npm run audit:skills` reports 160/160 Pass A complete, **0 critical**.

Genre-agnostic workflow (`docs/ingest/skills.md`):

| Pass | Scope | Status |
|------|-------|--------|
| **A — Catalog** | Picker, %, prerequisites, synergies, sources, `gameSystems`, categories | Complete |
| **B — Play** | Physical bonuses, sub-tasks, attacks, advanced roll rules | Partial on rows; play wiring is future work |

Workflow: Pass A/B per batch → `npm run validate:schemas` → `npm run audit:skills`. Engine contract: `scripts/skill-engine-contract.mjs`. Tag `gameSystems` for the source line (Nightbane, Rifts, Fantasy, etc.); flag ambiguous book mechanics and ask the user before encoding.

---

## Morphus content pipeline

56 morphus table JSON files under `src/data/content/morphus/tables/`. Genre-agnostic ingest workflow (`docs/ingest/morphus.md`):

| Pass | Scope | Status |
|------|-------|--------|
| **A — Morphus Forge** | Identity, sources, description, core `statModifiers`, Tab 6 picker | Most tables ingested; ongoing touch-ups |
| **B — Mechanical depth** | `skillModifiers`, capability fields, aggregation-verified hooks | Partial; use `finalize` report to find gaps |

Workflow: Pass A/B per trait batch (or full-table PDF pipeline) → `npm run validate:schemas` → `npm run validate:morphus`. PDF pipeline: `npm run morphus:ingest`. Flag ambiguous book mechanics and ask the user before encoding.

Most tables were ingested from Palladium PDFs via:

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

Tab 6 hosts the nested **Morphus Sub-Forge** (`docs/forge/morphus_creation.md`) — slot resolution engine and 3-step shell are shipped; **guided/basic flow** is the active UX focus; **Expert Mode** (master index + trait cart) has not had an implementation pass.

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
| `docs/forge/character_creation.md` | Character Creation Forge — **8-tab** sequence & state |
| `docs/forge/morphus_creation.md` | Morphus Sub-Forge (Tab 6) |
| `docs/character_spawn_handoff.md` | Spawn modal, sheet handoff, `isFinalized`, saves |
| `docs/character_creation.md` | Documentation map (links above + configurator tiers) |
| `docs/universal_forge_navigation_engine.md` | Universal Forge Navigation Engine (tabs, Continue, colors) |
| `docs/stat_engine_spec.md` | **Stat formulas** — attributes, vitals, saves, combat stacking (Live Ledger SoT) |
| `docs/live_ledger.md` | Formula cheat sheet (defers to stat engine spec) |
| `docs/movement_engine_spec.md` | Ground / swim / fly / leap from Spd |
| `docs/content-catalog-layout.md` | Catalog folder layout — primary pools vs `utils/` ancillary JSON |
| `docs/ingest/morphus.md` | Morphus trait Pass A/B ingest + PDF pipeline workflow |
| `docs/ingest/talents.md` | Talent Pass A/B ingest workflow and encoding rules |
| `docs/ingest/skills.md` | Skill catalog Pass A/B ingest (genre-agnostic) |
| `docs/ingest/magic.md` | Magic spell catalog Pass A/B ingest |
| `docs/ingest/psionics.md` | Psionic power catalog Pass A/B ingest (category-split target) |
| `docs/ingest/occs.md` | O.C.C. composition ingest |
| `docs/ingest/xp_tables.md` | XP progression table ingest (O.C.C. bidirectional links) |
| `docs/ingest/hth.md` | Hand-to-Hand progression ingest |
| `docs/ingest/weapon_proficiencies.md` | Weapon Proficiency (W.P.) catalog ingest |
| `docs/combat_logic.md` | S.D.C./M.D.C., P.S. tiers, damage, APM tracker UX |
| `docs/morphus_authoring.md` | How to encode Morphus traits for the engine |
| `docs/attribute_and_stat.md` | Attribute Forge mechanics |
| `docs/psychic_gate.md` | Psionic tiers |
| `src/data/source/morphus-ingest/_README.md` | PDF ingest CLI |

---

## Development workflow

Use this checklist **in the same PR/session** as code changes. Skipping doc updates is how agents and future-you lose track of layout and behavior.

### Always (any substantive change)

| Step | Action |
|------|--------|
| 1 | Run the right validators — at minimum `npm run validate:schemas` after content/schema edits |
| 2 | Run targeted tests if you touched loaders, creation flow, or engine math (`npm test` or focused vitest paths) |
| 3 | **Update documentation** — see table below |

### What to update when

| You changed… | Update these docs |
|--------------|-------------------|
| Content JSON paths, folder layout, `utils/` placement | [`docs/content-catalog-layout.md`](content-catalog-layout.md), [`docs/gemini-project-context.md`](gemini-project-context.md) content tables, relevant ingest playbook path tables, `palladiumSchemaPaths.ts` comments if needed |
| Ingest batch rules, Pass A/B scope, validation commands | Matching ingest playbook under `docs/ingest/`, `.cursorrules` if agent routing changes |
| JSON schema shape | `src/data/schemas/examples/*.json`, schema `$description` fields, ingest playbook if authoring rules change |
| Character Creation Forge tabs, creation phases, spawn handoff | [`docs/forge/character_creation.md`](forge/character_creation.md), [`docs/character_creation.md`](character_creation.md), [`docs/character_spawn_handoff.md`](character_spawn_handoff.md) |
| Morphus forge / trait encoding | [`docs/morphus_authoring.md`](morphus_authoring.md), [`docs/ingest/morphus.md`](ingest/morphus.md), [`docs/forge/morphus_creation.md`](forge/morphus_creation.md) |
| Stat formulas, saves, live ledger | [`docs/stat_engine_spec.md`](stat_engine_spec.md), [`docs/live_ledger.md`](live_ledger.md) |
| Launcher, genres, viewports | [`docs/app_viewport_launcher.md`](app_viewport_launcher.md) |
| Product pillars or AI protocol | [`docs/vision.md`](vision.md) |
| New catalog type or major content scale shift | [`docs/gemini-project-context.md`](gemini-project-context.md) — counts, paths, related doc index |

When unsure, add a short note to the most specific doc (ingest playbook or feature doc) and cross-link from `gemini-project-context.md` if it affects agents broadly.

---

## Conventions for AI assistants

1. **Do not guess Palladium rules** — derive behavior from JSON schemas, `docs/`, and book-accurate content files.
2. **Prefer structured Morphus/talent fields** over stuffing mechanics into `description` or `customOneOffs` when the schema supports them.
3. **Keep UI dumb** — business logic belongs in `src/lib/`, not React components.
4. **Validate after content changes:** `npm run validate:schemas`, `npm run audit:talents` (talents), `npm run audit:skills` (skills), and/or `npm run validate:morphus`.
5. **Documentation sync** — when behavior, layout, or workflow changes, update docs in the same session (see **Development workflow** above). Ingest playbooks are living documents.
6. **Content catalog layout** — follow `docs/content-catalog-layout.md`; ancillary JSON → `<catalog-dir>/utils/` unless documented root exception.
7. **Talent ingest** — follow `docs/ingest/talents.md`; flag ambiguous mechanics and ask the user before encoding.
8. **Skill ingest** — follow `docs/ingest/skills.md`; same flag-and-ask rule (any Palladium genre).
9. **Magic / psionic / O.C.C. / race ingest** — follow `docs/ingest/magic.md`, `docs/ingest/psionics.md`, `docs/ingest/occs.md`, `docs/ingest/races.md` respectively.
10. **Encounter archetype ingest** — follow `docs/ingest/encounters.md`; GM-only templates, not player creation rows.
11. **XP tables / HtH / W.P. ingest** — follow `docs/ingest/xp_tables.md`, `docs/ingest/hth.md`, `docs/ingest/weapon_proficiencies.md` respectively.
12. **Morphus trait ingest** — follow `docs/ingest/morphus.md` (+ `docs/morphus_authoring.md` for field encoding); flag ambiguous mechanics and ask the user before encoding.
13. **Minimize diff scope** — match existing naming, import style, and polymorphic modifier patterns.
14. **Genre gating** — never show Nightbane-only mechanics as universal without checking `gameSystems` / genre manifests.
15. **Schema examples** — when a content schema changes, update the matching file under `src/data/schemas/examples/` (do not create duplicate example files).
16. **Commits** — only when the user explicitly asks.

---

## One-sentence summary

We are building a schema-driven Palladium Megaverse character companion that automates Nightbane’s Facade/Morphus dual-form sheet, hosts a validated content library (skills, talents, morphus tables, magic, psionics), and exposes an 8-tab creation forge with live ledger preview, additive saves, abilities, inventory, and a fast combat HUD — with genre middleware so the same engine can eventually host Rifts and Fantasy.
