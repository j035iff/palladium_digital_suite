# Palladium O.C.C. catalog ingest

How agents should add or update **Palladium Occupational Character Classes** (and Shadow O.C.C. skill programs for R.C.C.s) so every row matches the schema, Tab 1 configurator, skill budgets, supernatural engines, and progression links.

---

## What you need to provide

Send one batch per message (or per agent session). **Default to Pass A** — a single O.C.C. is usually a full batch.

### Batch sizes

| Pass | Scope | Items per batch | Use a smaller batch when… |
|------|-------|-----------------|---------------------------|
| **Pass A** | Creation composition — skills, W.P., H2H, gates, P.P.E./I.S.P. engines, progression link | **1 O.C.C.** | Simple variant or specialization-only update |
| **Pass B** | Deep modules — `classAbilities` percentile profiles, `supernaturalRuleOverrides`, spell/psionic roadmaps, specialization branches | **1 O.C.C. or 1 specialization** | Large `specializations[]` trees or multi-engine O.C.C.s |

Pass B is optional and can follow Pass A once the baseline row is stable.

### Required in every batch request

| Field | Required | Example |
|-------|----------|---------|
| **PDF + page range** | Yes | `Nightbane RPG pp. 95–98` |
| **Genre** | Yes | `nightbane` — sets `gameSystems` |
| **Scope** | Yes | `composition-only` (Pass A) or `include deep modules` (Pass B) |
| **O.C.C. name** | Yes | Exact printed name (one per batch for Pass A) |

Optional: paired **R.C.C. race** name when ingesting a Shadow O.C.C. (`forcedOccId` on race); **XP table** pages if creating a new progression file; supplement book when not in core.

### Copy-paste template (Pass A)

```text
Batch: Nightbane RPG pp. 95–98
Genre: nightbane
Scope: composition-only (Pass A)
O.C.C.: Sorcerer
```

### Copy-paste template (Pass B — specialization)

```text
Batch: Between the Shadows pp. 12–14
Genre: nightbane
Scope: include deep modules (Pass B)
O.C.C.: Spook Squad Agent
Focus: Team Epsilon specialization branch
```

After each batch the agent runs `npm run validate:schemas` (includes **XP table ↔ O.C.C. bidirectional links**). **Flag ambiguous book text and ask for a ruling** before encoding.

---

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Schema | `src/data/schemas/palladium-occ.schema.json` |
| Example rows | `src/data/schemas/examples/palladium-occ.example.json`, `palladium-occ.example-spook-squad.json` |
| Catalog | `src/data/content/occs/<genre>/<book>.json` |
| XP tables | `src/data/content/progression/xp_tables/<genre>/<book>.json` |
| Loader | `src/data/library/occCatalogLoader.ts` |
| Composition | `src/lib/occComposition.ts`, `src/lib/occCatalogEngine.ts` |
| Runtime slim view | `src/data/occDefinitions.ts` |
| Reference PDFs | `src/data/reference/<genre>/` (gitignored) |

When the schema changes, **update the matching example JSON** under `src/data/schemas/examples/`.

### Living document (process rules)

**This file is the shared ingest playbook.** Update it when conventions change. See `.cursorrules`. **Layout:** [`../content-catalog-layout.md`](../content-catalog-layout.md). **Doc sync:** [`../gemini-project-context.md`](../gemini-project-context.md) § Development workflow.

---

## Catalog layout (genre folder → book file)

**Convention:** one JSON array per **source book**, grouped under a **genre folder** (`gameSystems` slug).

```
src/data/content/occs/
  nightbane/
    nightbane_core.json
    between_the_shadows.json
  rifts/                    # (future)
  palladium_fantasy/        # (future)
  heroes_unlimited/         # (future)
```

| Rule | Detail |
|------|--------|
| **Genre folder** | Stable slug matching `gameSystems` on rows in that book (`nightbane`, `rifts`, `palladium_fantasy`, …) |
| **Book file** | One array per supplement or core rulebook; descriptive snake_case basename |
| **No loose JSON at `occs/` root** | Book files live only inside genre subfolders |
| **Global unique `id`** | `occ_<snake_case>` across all genre folders and book files |
| **`occType`** | Open slug (`magic_user`, `psychic`, `law_enforcement`, `nightbane_rcc`, `rcc_skill_program`, …) — not a closed enum |
| **`tags`** | Background tags for race vitals conditionals and filters (`military`, `police`, …) |
| **XP link** | When `progression.xpTableId` is set, table’s `occIds[]` must list this O.C.C. and vice versa — table lives in `progression/xp_tables/<genre>/<book>.json` (genre folder mirrors O.C.C. layout) |

**XP table layout (genre folder → book file):**

```
src/data/content/progression/xp_tables/
  nightbane/
    nightbane_core.json      # tables[] bundle for core book
    between_the_shadows.json
```

Book file basenames should match the paired O.C.C. book file under `occs/<genre>/` when they share a source.

**Shadow O.C.C. / R.C.C. pairing:** R.C.C. races use `canPickOcc: false` + `forcedOccId` pointing at a hidden O.C.C. row (`occType: nightbane_rcc` or `rcc_skill_program`). Ingest race + Shadow O.C.C. in the **same session** when possible — see `docs/ingest/races.md`.

---

## Rules ambiguity — flag and ask

Flag when you see:

- **Core vs related vs secondary** — slot counts, category minimums, voucher wording
- **Skill ids** — book name vs catalog `skill_*` id; legacy aliases
- **W.P. / H2H** — upgrade paths, forbidden lists, alignment gates
- **P.P.E. / I.S.P. engines** — formulas, granted powers, spell school access
- **`spellAccessRules`** — native schools vs `magic_cross_lists.json` borrow ids
- **Psychic Gate** — bypass vs standard pick rules on `ispEngine`
- **Specializations** — merge overrides vs separate O.C.C. rows
- **Attribute requirements** — minimums vs recommendations in prose

---

## Two ingest passes

### Pass A — Creation composition (default)

**Goal:** Tab 1 O.C.C. picker, skill Tab 4 budgets, Tab 7 supernatural picks, progression.

**Batch size:** **1 O.C.C.**

**Schema-required fields (all must be present):**

- Identity: `id`, `name`, `description`, `gameSystems`, `sources`, `occType`, `tags`
- `occSkillsCore[]` — fixed grants and/or vouchers
- `occRelatedSkills` — `initialSlotsCount`, `categoryRules` (and optional `categoryMinimums`, `startingSkillIds`)
- `secondarySkills` — `initialSlotsCount`, `forbiddenCategories`
- `wpRules` — `coreWps`, `forbiddenWps`
- `handToHandRules` — `upgradePaths`

**Practically required modules (by O.C.C. type):**

| O.C.C. kind | Typical modules |
|-------------|-----------------|
| Magic user | `ppeEngine` (`magicSchools`, spell picks), `spellAccessRules` |
| Psychic | `ispEngine`, psychic gate flags |
| Combat / civilian | `staticBonuses`, gear/finances when book lists them |
| All | `progression.xpTableId` when not using default |

Use `[]` / empty objects where the book grants nothing in a block — schema still requires the top-level keys.

**Do not block Pass A on:** deep `classAbilities` percentile automation, full Tier 2 spell/psionic play blocks on granted features.

### Pass B — Deep modules (optional)

**Batch size:** **1 O.C.C. or 1 specialization branch**.

Typical keys: `specializations[]`, `classAbilities[]` with `percentileProfile`, `supernaturalRuleOverrides`, `talentEngine`, `attributeRequirements`, `alignmentRestrictions`, `raceRestrictions`, detailed `spellAccessRules` roadmaps.

---

## Skill references

Every `skillId` in `occSkillsCore`, related picks, and prerequisites must resolve in `src/data/content/skills/*.json`. Run `npm run audit:skills` after large skill-catalog changes that O.C.C. batches depend on.

W.P. ids use `wp_*` / hand-to-hand ids use `hth_*` per existing catalog conventions. Ingest new styles via [`hth.md`](hth.md) and new W.P. rows via [`weapon_proficiencies.md`](weapon_proficiencies.md). XP floor transcription: [`xp_tables.md`](xp_tables.md).

---

## Agent workflow (checklist)

1. Read cited PDF pages.
2. **Flag ambiguity; get user ruling.**
3. Choose genre folder + book file (`occs/<genre>/<book>.json`); create folder/file if new supplement.
4. Fill **Pass A** composition blocks.
5. Link **XP table** bidirectionally if not default — see [`xp_tables.md`](xp_tables.md).
6. If magic O.C.C.: align `ppeEngine.magicSchools` with `magic_schools.json`; update cross-lists if borrow rules change.
7. If psychic O.C.C.: align with `../psychic_gate.md` and `ispEngine`.
8. If R.C.C. paired: coordinate with race ingest (`forcedOccId`).
9. **Update this doc** if precedents changed.
10. Run `npm run validate:schemas`.
11. Do **not** commit unless the user asks.

---

## Validation & tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:schemas` | O.C.C. rows + `progression/xp_tables` cross-links |
| `npm run audit:skills` | Broken `skillId` refs in skill catalog (indirect O.C.C. dependency) |

No `audit:occs` script yet.

---

## User rulings (precedents)

| O.C.C. / topic | Issue | Ruling |
|----------------|-------|--------|
| File layout | Genre vs book | **`<genre>/<book>.json`** — books grouped by `gameSystems` slug folder |

---

## Reference examples

| Artifact | Pattern |
|----------|---------|
| `palladium-occ.example.json` | Sorcerer — P.P.E., related categories, spell access |
| `palladium-occ.example-spook-squad.json` | Specializations, vouchers |
| `occs/nightbane/nightbane_core.json` | Core Nightbane O.C.C. pool |

---

## Do not

- Split one O.C.C. across duplicate `id`s.
- Point `forcedOccId` from a race at a missing Shadow O.C.C. row.
- **Guess** skill slot counts or category minimums.
- Omit required schema blocks — use empty arrays/objects instead.
- Skip XP table bidirectional validation.

---

## Related docs

- [`races.md`](races.md) — R.C.C. pairing, `forcedOccId`
- [`skills.md`](skills.md) — skill catalog ids
- [`hth.md`](hth.md) — Hand-to-Hand `hth_*` ids
- [`weapon_proficiencies.md`](weapon_proficiencies.md) — W.P. `wp_*` ids
- [`xp_tables.md`](xp_tables.md) — XP floor transcription
- [`magic.md`](magic.md) — `spellAccessRules`, cross-lists
- `../psychic_gate.md` — psychic O.C.C. gate behavior
- `../character_creation.md` — Tab 1 configurator
- `.cursorrules`
