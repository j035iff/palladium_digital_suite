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
| PDF ingest (Morphus) | Python 3 + PyMuPDF, Node orchestration |
| Persistence | Local JSON character files (browser/local storage patterns) |

Key npm scripts:

```bash
npm run dev                  # Vite dev server
npm run build                # Typecheck + production build
npm run validate:schemas     # All Palladium content schemas + catalogs
npm run validate:morphus     # Morphus table JSON only
npm run morphus:ingest -- <cmd> <tableId>   # PDF → JSON pipeline
```

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
  ├─ Inventory / Armory
  └─ Combat HUD (APM, weapon slots, strikes, reload)
```

Creation highlights:

- **Attribute Forge** — pool-and-assign, N+1 keep N dice, optional bonus die prompts (`docs/attribute_and_stat.md`).
- **Psychic Gate** — tier from test potential; save targets 15/12/10; Major tier costs 50% O.C.C. skill slots (`docs/psychic_gate.md`).
- **Ability Selection** — unified picker with source attribution (Race, O.C.C., psychic tier).

---

## Code layout (where to look)

```
src/
  App.tsx                    # Launcher vs MainLayout; form theme
  context/CharacterContext.tsx   # Central state, derived stats, morphus aggregation
  components/
    dashboard/AppLauncher.tsx
    creation/                  # AttributeForge, OccSelector, SkillEngine, AbilitySelection, PsychicGate
    live/                      # CombatHUD, Inventory, MorphusCapabilitiesPanel, LevelUpModal
    features/FeatureCard.tsx   # Unified ability/feature presentation
  lib/                         # Rules engines (combat, skills, morphus, features, saves, inventory)
  utils/genreTransformer.ts    # Host-genre derivation middleware
  data/
    genres.ts                  # Genre manifest (playable settings)
    content/                   # JSON catalogs (skills, O.C.C.s, talents, morphus tables, XP tables)
    schemas/                   # Ajv JSON schemas for all content types
    source/morphus-ingest/     # Per-table PDF ingest manifests + staging artifacts
    reference/nightbane/       # Source PDFs (gitignored)
docs/                          # SRS, vision, combat, creation, morphus authoring specs
scripts/                       # validate-*, morphus-ingest.mjs, schema apply loop
```

Important engines:

| Module | Role |
|--------|------|
| `morphusCharacteristicAggregation.ts` | Stack Morphus stat/skill/damage modifiers |
| `morphusPassiveBridge.ts` | Bridge aggregated Morphus into CharacterContext |
| `featureEngine.ts` | Race/O.C.C./talent feature budgets and passive modifiers |
| `handToHandPipeline.ts` / `strikeEngine.ts` | Melee combat resolution |
| `psychicGate.ts` | Psionic tier logic |
| `skillEquation.ts` / `skillModifiers.ts` | Percentile skill math |
| `sheetBonuses.ts` / `characterDerived.ts` | Live sheet derived values |

Types live in `src/types.ts` (~1,700+ lines) and must stay aligned with `src/data/schemas/*.schema.json`.

---

## Data model & schemas

Content is **JSON-first**, validated by Ajv:

| Schema | Content file(s) |
|--------|-----------------|
| `palladium-skill.schema.json` | `palladiumSkills.json` |
| `palladium-occ.schema.json` | `occs/*.json` |
| `palladium-race.schema.json` | `races/player.json`, `races/npc.json`, `races/gm_approval.json` |
| `palladium-talent.schema.json` | `talents/common.json`, `talents/elite.json` — ingest guide: [`docs/nightbane-talent-ingest.md`](nightbane-talent-ingest.md) |
| `palladium-hth.schema.json` | `palladiumHandToHand.json` |
| `palladium-morphus.schema.json` | Each characteristic **entry** inside morphus tables |
| `palladium-morphus-table.schema.json` | Each morphus **table** wrapper (`id`, `entries[]`) |
| `palladium-xp-table.schema.json` | `progression/xp_tables/*.json` |

Morphus characteristic entries support structured fields such as:

- `statModifiers` (flat or dice via polymorphic `{ flat: N }` / `{ dice: "2D6" }`)
- `skillModifiers.specificSkillOverrides` (percent, impossible-in-Morphus, skill traits)
- `damageAffinities` (0, 0.5, 2.0 multipliers for fire, holyWeapons, kinetic, etc.)
- `naturalWeapons`, `mobility.flightEngine`, `limbDurability`, `saveModifiers`
- `appearanceConstraints`, `combatContextModifiers`, `customOneOffs` (narrative edge cases)

Authoring guide: `docs/morphus_authoring.md`.

---

## Morphus content pipeline

~55 morphus table JSON files under `src/data/content/morphus/tables/`. Many were ingested from Palladium PDFs via:

```
prepare → extract PDF + schema-loop → scaffold → structure-entries
build   → merge → validate
finalize → aggregation-coverage.json (which fields wire to runtime)
```

Manifests: `src/data/source/morphus-ingest/*.manifest.json`

Rules:

- **Dark Designs (WB6)** is authoritative for prose when core + supplement differ.
- Cross-table router rows (Other, Combination of Two, Biomechanical redirects) are excluded.
- Multi-book tables merge sources[] per trait; `tableCategory` distinguishes Table I / II / III where applicable.

Reference PDFs live in `src/data/reference/nightbane/` (not committed).

---

## Current development focus

**Primary:** Nightbane character creation, live sheet, Morphus automation, combat HUD.

**In progress / recent:**

- Ingesting Morphus category tables from Nightbane core + worldbooks (Infernal, Mineral, Stigmata, Undead, Unearthly Beauty, Unnatural Limbs, Unusual Facial Features, Victim, etc.).
- Feature engine + `FeatureCard` unifying talents, racial traits, and O.C.C. abilities.
- Morphus gating on ability/talent selection (`content/talents/*.json` references allowed morphus table IDs).
- Schema hardening (`limbDurability.quantity` polymorphic, `flySpdAttribute`, aggregation coverage reports).

**Roadmap genres** (visible in launcher, not all wired): Rifts Aftermath, generic Fantasy/Sci-Fi stubs.

---

## Related documentation (read order for deep dives)

| Doc | Topic |
|-----|--------|
| `docs/vision.md` | Product philosophy, pillars, AI interaction protocol |
| `docs/srs.md` | Master requirements (Nightbane dual-form, Attribute Forge, Psychic Gate, Combat HUD) |
| `docs/master_flow.md` | Runtime pipeline, save/mutation loop |
| `docs/app_viewport_launcher.md` | Gate Check — Open vs Create, genre manifest, viewports |
| `docs/forge-character_creation.md` | Character Creation Forge — 7-tab sequence & state |
| `docs/character_spawn_handoff.md` | Spawn modal, sheet handoff, `isFinalized`, saves |
| `docs/character_creation.md` | Documentation map (links above + configurator tiers) |
| `docs/universal_forge_navigation_engine.md` | Universal Forge Navigation Engine (tabs, Continue, colors) |
| `docs/stat_engine_spec.md` | **Stat formulas** — attributes, vitals, saves, combat stacking (Live Ledger SoT) |
| `docs/combat_logic.md` | S.D.C./M.D.C., P.S. tiers, damage, APM tracker UX |
| `docs/morphus_authoring.md` | How to encode Morphus traits for the engine |
| `docs/attribute_and_stat.md` | Attribute Forge mechanics |
| `docs/psychic_gate.md` | Psionic tiers |
| `src/data/source/morphus-ingest/README.md` | PDF ingest CLI |

---

## Conventions for AI assistants

1. **Do not guess Palladium rules** — derive behavior from JSON schemas, `docs/`, and book-accurate content files.
2. **Prefer structured Morphus fields** over stuffing mechanics into `description` or `customOneOffs` when the schema supports them.
3. **Keep UI dumb** — business logic belongs in `src/lib/`, not React components.
4. **Validate after content changes:** `npm run validate:morphus` and/or `npm run validate:schemas`.
5. **Minimize diff scope** — match existing naming, import style, and polymorphic modifier patterns.
6. **Genre gating** — never show Nightbane-only mechanics as universal without checking `gameSystems` / genre manifests.
7. **Commits** — only when the user explicitly asks.

---

## One-sentence summary

We are building a schema-driven Palladium Megaverse character companion that automates Nightbane’s Facade/Morphus dual-form sheet, ingests Morphus tables from official PDFs into structured JSON, and exposes creation, skills, abilities, inventory, and a fast combat HUD — with genre middleware so the same engine can eventually host Rifts and Fantasy.
