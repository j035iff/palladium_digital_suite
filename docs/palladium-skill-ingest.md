# Palladium skill catalog ingest

How agents should add or update **Palladium Megaverse skills** (any genre — Nightbane, Rifts, Palladium Fantasy, Heroes Unlimited, etc.) so every row matches the schema, creation picker, percentile engine, and optional Morphus trait lists.

---

## What you need to provide

Send one batch per message (or per agent session). **Default to Pass A** unless you explicitly want mechanical depth in the same batch.

### Batch sizes

| Pass | Scope | Items per batch | Use a smaller batch when… |
|------|-------|-----------------|---------------------------|
| **Pass A** | Catalog / chargen — picker, %, prerequisites, synergies, sources, categories | **6 skills** | Rows have split bases, long prerequisite trees, or heavy specialization |
| **Pass B** | Mechanical depth — physical bonuses, sub-tasks, attacks, roll rules | **3–4 skills** | Combat blocks, `subTasks`, or multi-key Pass B payloads are large |

Pass B is optional and can follow Pass A in a separate batch for the same skills.

### Required in every batch request

| Field | Required | Example |
|-------|----------|---------|
| **PDF + page range** | Yes | `Nightbane RPG pp. 53–55` or `@src/data/reference/rifts/...` |
| **Genre** | Yes (Pass A) | `nightbane`, `rifts`, `palladium_fantasy` — sets `gameSystems` on new/updated rows |
| **Scope** | Yes | `catalog-only` (Pass A) or `include mechanics` (Pass B) |
| **Category** | Pass A | Primary book category — sanity-checks `categories[0]` / file placement |
| **Skill names** | Yes | Exact printed names; count should match batch size (6 Pass A, 3–4 Pass B) |

Optional: supplemental book + pages when mechanics span sources; `update existing` if correcting rows already in catalog.

### Copy-paste template (Pass A)

```text
Batch: Rifts Ultimate Edition pp. 120–122
Genre: rifts
Scope: catalog-only (Pass A)
Category: Technical
Skills: Computer Operation, Computer Programming, Radio: Basic, Cryptography, Surveillance Systems, T.V./Video
```

### Copy-paste template (Pass B)

```text
Batch: Nightbane RPG pp. 53–54
Genre: nightbane
Scope: include mechanics (Pass B)
Skills: Acrobatics, Climbing, Gymnastics
```

After each batch the agent runs `npm run validate:schemas` and `npm run audit:skills`. **Flag ambiguous book text and ask for a ruling** before encoding — do not guess.

---

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Schema | `src/data/schemas/palladium-skill.schema.json` |
| Engine contract | `scripts/skill-engine-contract.mjs` |
| Example rows | `src/data/schemas/examples/palladium-skill.example.json`, `palladium-skill.example-specialization.json` |
| Catalog | `src/data/content/skills/*.json` (category-split JSON files) |
| Loader | `src/data/library/skillsCatalogLoader.ts` |
| Trait registry | `src/data/content/skill_trait_registry.json` |
| Trait list sources | `src/data/source/skill_trait_lists/*.txt` |
| Category file I/O | `scripts/lib/skills-catalog-fs.mjs` |
| Reference PDFs (authoring) | `src/data/reference/<genre>/` (gitignored) |

When the schema changes, **update the matching example JSON** under `src/data/schemas/examples/` (do not create duplicate example files).

### Living document (process rules)

**This file is the shared ingest playbook.** When ingest conventions change — category file rules, batch sizes, prerequisite shapes, trait tagging, split-base patterns, validation expectations — **update this document in the same PR/session** as the catalog change. Do not rely on chat history alone; future agents should read this file (see `.cursorrules`).

If you establish a new pattern (e.g. a new `logical_group` prerequisite or `splitBaseTracks` shape), add a short example here so the next batch stays consistent.

---

## Rules ambiguity — flag and ask

**Never guess on book mechanics.** If anything is unclear, contradictory, or could be encoded multiple ways, **stop ingest on that point**, flag it explicitly, and **ask the user for a ruling** before writing JSON.

Flag when you see:

- **Base % / per level** — multiple columns, footnotes, or O.C.C.-specific bases disagree
- **Prerequisites** — AND vs OR unclear; “any one of” vs “all of”; conditional gates (“only when…”) vs always-on
- **Synergies** — one-time vs ongoing; which skill id receives the bonus; conditional wording
- **Secondary skill eligibility** — book says O.C.C.-only, scholastic-only, or “not available as secondary”
- **Specialization** — topic-per-pick (History, Lore) vs single parameterized pick (Literacy language)
- **Split bases** — Horsemanship-style dual %, Pilot sub-modes, sub-task percentiles vs parent skill
- **Physical bonuses** — dice vs flat; which attributes; when they apply at chargen vs only after skill taken
- **Morphus impossibility** — encode on morphus tables (`skillModifiers`), not on skill rows, unless the skill itself is Morphus-specific
- **Schema encoding** — multiple valid JSON shapes; prefer asking over inventing a one-off

**How to flag:** Name the skill, cite page(s), quote or summarize the ambiguous text, state the options you see, and ask the user to pick (or give a custom ruling).

**After the user rules:** Encode the decision in catalog JSON, then **add or update a note in this doc** (User rulings table) if the ruling sets a precedent.

---

## Two ingest passes

### Pass A — Catalog / chargen (default)

**Goal:** Character creation picker (Tab 4), prerequisite gates, base % display, sources, category filters, secondary-skill eligibility.

**Batch size:** **6 skills** — see **What you need to provide** at the top of this doc.

**Required Pass A fields for a “complete” row** (see `isPassACatalogComplete()` in `skill-engine-contract.mjs`):

- `id` (`skill_*` prefix), `name`, `description`, `gameSystems` (array), `categories` (≥1; first entry = **file placement**)
- `synergies` (array; use `[]` if none)
- `prerequisites` (array; use `[]` if none)
- `sources` (≥1 entry with `reference` + `pageNumber`; any book — not genre-specific)
- **Catalog progression** — at least one of:
  - Percentile: `basePercent` (+ `percentPerLevel` when applicable), structured split base, `subTasks[]` / `subSkills[]` with `basePercent`, or
  - Physical training: `physicalSkillBonuses` / `naturalRollOutcomes` / `mechanicProgressions` (no self %), or
  - Synergy-only: outward `synergies` with description stating **no base percent** (e.g. Hunting)

**Optional but useful on Pass A:** `allowedAsSecondarySkill`, `skillTraits`, `requiresSpecialization` + `specialization`, `replaces` (migration), `occProgressionOverrides`, `initializationBonuses`, `interdependentKnowledge`.

**Do not block Pass A on:** `physicalSkillBonuses`, `specialAttacks`, `mechanicProgressions`, `combatToolBonuses`, `failureResults`, `conditionalRelatedSkills` — unless the batch scope explicitly includes Pass B mechanics.

### Pass B — Mechanical depth (optional)

**Goal:** Chargen ledger, spawn handoff physical applies, combat/skill-roll consumers, sub-skill breakdowns.

**Batch size:** **3–4 skills** — see **What you need to provide** at the top of this doc.

Typical Pass B keys:

- `physicalSkillBonuses` — attribute / S.D.C. / combat mods (often dice strings like `"1D6"`)
- `subTasks` — named sub-skills with their own %
- `specialAttacks`, `combatToolBonuses`
- `conditionalRelatedSkills` — grant or bonus related skills when taking this skill
- `mechanicProgressions`, `situationalModifiers`, `sequentialChecks`
- `failureResults`, `successOutcomes`, `physicalConstraints`

Prefer schema keys over stuffing mechanics into `description` alone when the schema supports them.

---

## Catalog layout

```
src/data/content/skills/
  communications.json
  domestic.json
  electrical.json
  espionage.json
  mechanical.json
  medical.json
  military.json
  physical.json
  pilot.json
  pilot_related.json
  rogue.json
  science.json
  technical.json
  wilderness.json
```

- One JSON **array** per file; rows sorted by `id` within each file.
- Loader merges **all** `*.json` files at runtime (`skillsCatalogLoader.ts`); **duplicate `id` across files is fatal**.
- **File placement:** `categories[0]` (primary category) determines the filename via `skillCategoryFileName()` — e.g. `"Rogue"` → `rogue.json`, `"Pilot Related"` → `pilot_related.json`.
- Additional categories in `categories[1+]` are for filtering/display only; they do **not** change file placement.
- Row `id` pattern: `skill_snake_case_name` (e.g. `skill_computer_hacking`).

After bulk edits or category changes:

```bash
npm run split:skills
```

---

## Pass A vs Pass B (engine contract)

Defined in `scripts/skill-engine-contract.mjs`:

| Pass | Purpose | Consumers |
|------|---------|-----------|
| **Pass A** | Catalog / chargen — identity, %, gates, sources, categories | `SkillEngine`, `creationSkillCatalog`, `skillPercentResolution`, O.C.C. pick rules |
| **Pass B** | Mechanical depth — physical bonuses, sub-tasks, attacks, roll rules | `creationLiveLedger`, `spawnSheetHandoff`, future play-time skill UI |

**Pass A complete** (audit target after ingest):

```text
identity + categories + synergies[] + prerequisites[] + sources + catalog progression
```

Run audit: `npm run audit:skills`

---

## `gameSystems` (setting scope)

Tag each row with every genre where the skill appears in play:

```json
"gameSystems": ["nightbane"]
```

```json
"gameSystems": ["rifts", "nightbane"]
```

Use stable slugs from the schema: `nightbane`, `palladium_fantasy`, `rifts`, `heroes_unlimited`, `robotech`, `after_the_bomb`, etc.

| `gameSystems` | Meaning |
|---------------|---------|
| One or more slugs | Skill appears in those creation manifests / O.C.C. pools |
| `[]` (empty) | Generic Megaversal core — valid but audit emits **info** `generic_game_systems` |

Creation filters by `creationGenreId` + O.C.C. rules. A Rifts-only skill should include `"rifts"` even if prose is shared with core Palladium text.

**Do not** assume Nightbane when ingesting from another line’s book — set `gameSystems` and `sources[].gameSystem` to match the source.

---

## Categories

Use **book category labels** as printed (e.g. `"Rogue"`, `"Technical"`, `"Pilot Related"`).

| Primary `categories[0]` | File |
|-------------------------|------|
| Communications | `communications.json` |
| Domestic | `domestic.json` |
| Electrical | `electrical.json` |
| Espionage | `espionage.json` |
| Mechanical | `mechanical.json` |
| Medical | `medical.json` |
| Military | `military.json` |
| Physical | `physical.json` |
| Pilot | `pilot.json` |
| Pilot Related | `pilot_related.json` |
| Rogue | `rogue.json` |
| Science | `science.json` |
| Technical | `technical.json` |
| Wilderness | `wilderness.json` |

Multi-category skills (e.g. Communications + Technical): put the **primary** category first for file placement; include both in `categories[]`.

---

## Percentile progression

### Simple skill

```json
"basePercent": 30,
"percentPerLevel": 5
```

### Split base (two named tracks on one pick)

```json
"basePercent": {
  "splitBase": {
    "sailing": 45,
    "motor": 44
  }
},
"percentPerLevel": null,
"splitPercentPerLevel": {
  "sailing": 5,
  "motor": 4
}
```

See `skill_boat_ships` in `pilot.json`.

### Split base tracks (topic template — History-style)

```json
"requiresSpecialization": true,
"basePercent": {
  "splitBaseTracks": [
    { "trackId": "general", "label": "General historical knowledge", "basePercent": 60 },
    { "trackId": "specific", "label": "Specific / specialist topic", "basePercent": 40 }
  ]
},
"percentPerLevel": 4
```

See `skill_history` in `technical.json`.

### Sub-tasks (parent skill bundles multiple % lines)

```json
"subTasks": [
  { "name": "Sense of balance", "basePercent": 60, "percentPerLevel": 5 },
  { "name": "Climb rope", "basePercent": 80, "percentPerLevel": 2 }
]
```

Parent may still carry `physicalSkillBonuses` at root. See `skill_acrobatics` in `physical.json`.

**Master equation at runtime:** `docs/skill_selection.md`, `src/lib/skillPercentResolution.ts`.

---

## Prerequisites

Top-level `prerequisites[]` entries are **AND-combined** unless bypassed.

### Single skill (AND leaf)

```json
{ "type": "skill", "skillId": "skill_literacy" }
```

### OR among skills

```json
{
  "type": "skill_any_of",
  "label": "Electronics: basic OR electrical engineering",
  "skillIds": ["skill_basic_electronics", "skill_electrical_engineer"]
}
```

### Nested AND/OR (`logical_group`)

Use when the book nests conditions (e.g. “(A or B) and C”). See schema `$defs/prerequisiteEntry`.

### Conditional prerequisite

```json
{
  "type": "skill",
  "skillId": "skill_computer_operation",
  "condition": "only for complex, high-tech systems"
}
```

### Empty prerequisites

```json
"prerequisites": []
```

**Validation:** every `skillId` / `skillIds` entry must resolve via `resolveCatalogSkillId()` (prefix `skill_`).

---

## Synergies

```json
"synergies": [
  {
    "skillId": "skill_cryptography",
    "bonusPercent": 5,
    "description": "One-time +5% when this skill is taken (book wording)."
  }
]
```

- `synergies` is **required** (use `[]` if none).
- Confirm **direction** (this skill boosts another vs other skill boosts this) with the book before encoding.
- Note one-time vs ongoing in `description` when the book distinguishes them.

---

## Secondary skill eligibility

```json
"allowedAsSecondarySkill": false
```

| Value | Meaning |
|-------|---------|
| `true` or **omitted** | Eligible for secondary skill picks unless O.C.C. rules block |
| `false` | Cannot be taken as a secondary skill (O.C.C.-only, scholastic-only, etc.) |

**Radical visibility (Pillar 8):** show locked skills in creation UI with reason — never hide.

---

## Specialization (topic-per-pick)

For Literacy, History, Lore, Play Instrument, etc.:

```json
"requiresSpecialization": true,
"specialization": {
  "kind": "literacy",
  "prompt": "Which written language?",
  "examples": ["English", "Spanish"],
  "allowsMultipleInstances": true
}
```

- `kind`: `language` | `literacy` | `instrument` | `mount` | `other`
- `allowsMultipleInstances: true` when the book allows repeated picks for different topics
- Schema example: `palladium-skill.example-specialization.json`

---

## Skill traits (Morphus & penalties)

Trait ids live in `skill_trait_registry.json`. Membership lists are maintained in:

```
src/data/source/skill_trait_lists/*.txt
```

After editing any list:

```bash
npm run apply:skill-traits
```

Then tag rows:

```json
"skillTraits": ["requires_dexterity", "related_to_electrical"]
```

**Morphus ingest:** book phrases like “manual dexterity related skills” map to **`skill_trait`** overrides on morphus characteristics — not hand-enumerated skill ids. See `docs/morphus_authoring.md`.

---

## Physical skill bonuses (Pass B)

Applied at **spawn handoff** to attributes / S.D.C. / combat lines when the skill is selected:

```json
"physicalSkillBonuses": {
  "ps": 1,
  "pp": 1,
  "pe": 1,
  "sdc": "1D6",
  "rollWithImpact": 2
}
```

Dice values are entered on **Tab 5 — Roll Pending** (`creationPendingDiceResolutions`), not auto-rolled.

---

## Sources

Every Pass A row needs at least one citation:

```json
"sources": [
  {
    "gameSystem": "rifts",
    "reference": "Rifts World Book 8: Japan",
    "pageNumber": 42
  }
]
```

Add supplemental books as additional entries when mechanics span sources. `gameSystem` on each source entry should match a slug in the row’s `gameSystems` when the skill is setting-specific.

---

## ID migration (`replaces`)

When renaming or merging skills:

```json
"id": "skill_undercover_ops",
"replaces": "skill_fieldcraft"
```

Engines resolve legacy ids via `skillsCatalogLoader.resolveCatalogSkillId()`. Keep the replaced row until character migration is complete, or document removal in the user ruling.

---

## User batch request template

Use the copy-paste templates in **What you need to provide** (top of this doc). Field reference:

| Field | Meaning |
|-------|---------|
| PDF + pages | Primary book evidence |
| Genre | `gameSystems` slug(s) for new/updated rows |
| Scope | `catalog-only` (Pass A) or `include mechanics` (Pass B) |
| Category | Expected primary category (sanity-check `categories[0]`) — Pass A |
| Skills | Exact names (**6** Pass A · **3–4** Pass B) |

Nightbane Pass A example:

```text
Batch: Nightbane RPG pp. 53–55
Genre: nightbane
Scope: catalog-only (Pass A)
Category: Physical
Skills: Acrobatics, Climbing, Gymnastics, Prowl, Swimming, Wrestling
```

---

## Agent workflow (checklist)

1. Read the cited PDF pages (or trusted extracted text).
2. **Flag any rules/mechanics ambiguity and get a user ruling** before encoding.
3. Choose or create rows in the correct category file (`categories[0]` → filename).
4. Fill **Pass A** fields; use `[]` for empty `synergies` / `prerequisites`.
5. Add **Pass B** blocks only when in scope for the batch.
6. If `categories[0]` changed or unsure of file placement: `npm run split:skills`.
7. If trait lists changed: `npm run apply:skill-traits`.
8. **Update `docs/palladium-skill-ingest.md`** if ingest rules or precedents changed this session.
9. Run validation:
   ```bash
   npm run validate:schemas
   npm run audit:skills
   npm test -- --run src/lib/skillEngineContract.test.ts src/lib/creationSkillCatalog.test.ts src/lib/skillPercentResolution.test.ts src/lib/conditionalRelatedSkills.test.ts src/lib/creationSkillPicks.test.ts
   ```
10. Fix **critical** audit items before considering the batch done.
11. Do **not** commit unless the user asks.

---

## Audit & tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:schemas` | Ajv validate all skill rows + examples; unknown `skillTraits` |
| `npm run audit:skills` | Pass A completeness, schema drift, broken skill refs, category file placement |
| `npm run audit:skills -- --json reports/skill-audit.json` | Machine-readable report |
| `npm run split:skills` | Re-home rows by `categories[0]` after bulk edits |
| `npm run apply:skill-traits` | Sync `skillTraits[]` from `skill_trait_lists/*.txt` |

Common audit codes:

| Code | Severity | Meaning |
|------|----------|---------|
| `schema_drift` | critical | Top-level key not in contract/schema |
| `pass_a_incomplete` | critical | Missing Pass A required fields or progression |
| `invalid_skill_reference` | critical | Prerequisite/synergy/grant `skillId` not in catalog |
| `unknown_skill_trait` | critical | `skillTraits` id missing from registry |
| `invalid_skill_id` | critical | `id` missing `skill_` prefix |
| `category_file_mismatch` | warning | Row file ≠ `categories[0]` mapping |
| `specialization_incomplete` | warning | `requiresSpecialization` without `specialization` object |
| `replaces_missing_target` | warning | `replaces` id not in catalog |
| `likely_stub_row` | warning | Short description, no progression |
| `generic_game_systems` | info | Empty `gameSystems` (Megaversal core) |
| `physical_training_skill` | info | Pass B physical skill without self % |

Common validation failures (schema):

| Symptom | Fix |
|---------|-----|
| `additionalProperties` | Remove undocumented keys; extend schema if truly needed |
| Unknown `skillTraits` | Add trait to `skill_trait_registry.json` + list file, run `apply:skill-traits` |
| Duplicate `id` | Merge duplicates; only one row per `id` across all category files |
| Broken `skillId` in prereq/synergy | Use canonical `skill_*` id from catalog |

---

## User rulings (precedents)

Documented table rulings when book text is ambiguous. Encode in catalog JSON; do not re-litigate without a new user decision.

| Skill | Issue | Ruling |
|-------|-------|--------|
| *(none yet)* | — | Add rows here as ingest precedents are confirmed |

---

## Reference examples in catalog

| Skill | Pattern |
|-------|---------|
| `skill_computer_hacking` | Prerequisites AND chain + `skillTraits` |
| `skill_history` | `requiresSpecialization` + `splitBaseTracks` |
| `skill_boat_ships` | `splitBase` + `splitPercentPerLevel` |
| `skill_acrobatics` | `subTasks` + `physicalSkillBonuses` + `conditionalRelatedSkills` |
| `skill_jury_rig` | Multiple trait tags + prerequisite AND |
| `skill_hunting` | Documented synergy-only (no self %) |
| `skill_boxing` | Physical-training Pass A (no self %, `physicalSkillBonuses`) |

Schema examples: `src/data/schemas/examples/palladium-skill.example.json`, `palladium-skill.example-specialization.json`

---

## Do not

- Put skills in a monolithic `palladiumSkills.json` (removed; use `skills/` directory).
- Place a row in the wrong category file — **`categories[0]` drives filename**; run `split:skills` after fixes.
- **Guess when book mechanics are ambiguous** — flag and ask the user.
- Hide O.C.C.-blocked or prerequisite-failed skills — grey out with reason (Pillar 8).
- Encode Morphus-only impossibility on the skill row when the morphus table should carry `skillModifiers` / `skill_trait` overrides.
- Invent `skillTraits` ids not in `skill_trait_registry.json`.
- Change ingest conventions without updating **`docs/palladium-skill-ingest.md`**.
- Commit or open PRs unless the user requests it.
- Skip `npm run validate:schemas` and `npm run audit:skills` after schema or catalog edits.

---

## Related docs

- `docs/skill_selection.md` — Master equation & commitment workflow (forge tabs)
- `docs/morphus_authoring.md` — Morphus `skill_trait` lists and `apply:skill-traits`
- `docs/forge-character_creation.md` — Tab 4 skill selection
- `docs/stat_engine_spec.md` — Skill physical mods at spawn
- `docs/gemini-project-context.md` — project-wide content map
- `.cursorrules` — Core Design Pillars
