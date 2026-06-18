# Nightbane Morphus trait ingest

How agents should add or update **Nightbane Morphus characteristics** (Survival Guide / Dark Designs trait tables) so every entry matches the schema, Morphus Sub-Forge (Tab 6), passive aggregation, and capability digest.

**Encoding reference (field mapping):** [`../morphus_authoring.md`](../morphus_authoring.md)  
**PDF pipeline CLI:** [`../../src/data/source/morphus-ingest/_README.md`](../../src/data/source/morphus-ingest/_README.md)

---

## What you need to provide

Send one batch per message (or per agent session). Pick **ingest mode** up front.

### Ingest modes

| Mode | When to use | Unit of work |
|------|-------------|--------------|
| **Table (PDF pipeline)** | New table or full re-ingest from book PDFs | **One Morphus table** (may include hub + leaf files) |
| **Trait batch (manual)** | Fix/add traits in an existing table JSON | **2–4 traits** (Pass A) or **1–2 traits** (Pass B) |

Default to **Pass A** unless you explicitly want deep capability / aggregation coverage in the same batch.

### Batch sizes (trait batch mode)

| Pass | Scope | Items per batch | Use a smaller batch when… |
|------|-------|-----------------|---------------------------|
| **Pass A** | Morphus Forge — identity, sources, description, core `statModifiers`, `gameSystems` | **3 traits** | Multi-stat dice overrides, `naturalWeapons`, or long cross-table notes |
| **Pass B** | Mechanical depth — `skillModifiers`, `damageAffinities`, capability fields, `variantPercentiles`, aggregation hooks | **1–2 traits** | Heavy `skill_trait` overrides, flight engines, recovery behaviors, or nested variants |

Pass B is optional and can follow Pass A in a separate batch for the same traits.

### Required in every batch request

| Field | Required | Example |
|-------|----------|---------|
| **PDF + page range** | Yes | `@src/data/reference/nightbane/WB5-Nightbane_Survival_Guide.pdf pp. 28–29` |
| **Table** | Yes | `athlete`, `disproportion_head`, `animal_feline` |
| **Scope** | Yes | `catalog-only` (Pass A) or `include mechanics` (Pass B) |
| **Trait names** | Trait batch | Exact printed names; count matches batch size |

**Table (PDF pipeline) requests** also need:

| Field | Required | Example |
|-------|----------|---------|
| **Table heading** (as printed) | Yes | `Athlete Table` |
| **Books** | Yes | Dark Designs (authoritative) + core Nightbane RPG when both exist |
| **Target file(s)** | Yes | `src/data/content/morphus/tables/athlete.json` |

### Copy-paste template (trait batch — Pass A)

```text
Batch: @src/data/reference/nightbane/WB6-Dark_Designs.pdf pp. 28–29
Table: athlete
Scope: catalog-only (Pass A)
Traits: Streamlined, Gymnast's Build, Musclebound
```

### Copy-paste template (trait batch — Pass B)

```text
Batch: @src/data/reference/nightbane/WB6-Dark_Designs.pdf pp. 28–29
Table: athlete
Scope: include mechanics (Pass B)
Traits: Streamlined, Cleats
```

### Copy-paste template (full table — PDF pipeline)

```text
Ingest Morphus table:
- Table id: athlete
- Heading: "Athlete Table"
- Target: src/data/content/morphus/tables/athlete.json
- Books (authoritative first):
  - src/data/reference/nightbane/WB6-Dark_Designs.pdf — Nightbane® Dark Designs Sourcebook (WB6)
  - src/data/reference/nightbane/Nightbane_RPG.pdf — Nightbane RPG
- Skip Other rows; excludeNonPlayable; Dark Designs wins on description conflicts.
- Run prepare until schema-analysis readyToTranscribe; then build; then finalize.
```

After each batch run `npm run validate:schemas` and `npm run validate:morphus`. **Flag ambiguous book text and ask for a ruling** before encoding — do not guess.

---

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Characteristic schema | `src/data/schemas/palladium-morphus.schema.json` |
| Table wrapper schema | `src/data/schemas/palladium-morphus-table.schema.json` |
| Example characteristic | `src/data/schemas/examples/palladium-morphus-characteristic.example.json` |
| Example trait table | `src/data/schemas/examples/palladium-morphus-table-trait.example.json` |
| Example category hub | `src/data/schemas/examples/palladium-morphus-table-animal-hub.example.json` |
| Trait tables | `src/data/content/morphus/tables/*.json` |
| Morphus Sub-Forge routing | `src/data/content/morphus/forge/*.json` |
| Loader | `src/data/library/morphusTableCatalogLoader.ts` |
| Aggregation | `src/lib/morphusCharacteristicAggregation.ts` |
| Capability digest | `src/lib/morphusPassiveBridge.ts` |
| Skill trait lists | `src/data/source/skill_trait_lists/*.txt` |
| Trait registry | `src/data/content/skills/utils/skill_trait_registry.json` |
| Per-table manifests | `src/data/source/morphus-ingest/<table>.manifest.json` |
| PDF pipeline | `scripts/morphus-ingest.mjs`, `scripts/lib/morphus-*.mjs` |
| Reference PDFs (authoring) | `src/data/reference/nightbane/` (gitignored) |

When a schema changes, **update the matching example JSON** under `src/data/schemas/examples/` (do not create duplicate example files).

### Living document (process rules)

**This file is the shared ingest playbook.** When ingest conventions change — batch sizes, hub/leaf layout, Pass A minimums, PDF pipeline steps, or non-playable row rules — **update this document in the same PR/session** as the catalog change. See `.cursorrules`.

**Layout:** [`../content-catalog-layout.md`](../content-catalog-layout.md). **Field encoding:** [`../morphus_authoring.md`](../morphus_authoring.md). **Doc sync:** [`../gemini-project-context.md`](../gemini-project-context.md) § Development workflow.

---

## Rules ambiguity — flag and ask

**Never guess on book mechanics.** Stop ingest, flag explicitly, and **ask the user for a ruling** before writing JSON.

Flag when you see:

- **Stacking** — whether bonuses add with other Morphus traits, armor, or Hand to Hand
- **Overrides vs additive** — book says “Spd becomes …” vs “+10 Spd”
- **Skill penalties** — flat skill id vs `skill_trait` category (dexterity, light touch, electrical, …)
- **Impossible vs negated** — Disguise impossible in Morphus vs −% to Disguise
- **Cross-table rolls** — redirect-only row (omit) vs trait with mechanics + optional sub-roll (keep + `crossTableRoll`)
- **Hub vs leaf** — Step One routers belong in hub `description`, not as playable `entries[]` on leaf tables
- **Multi-book conflicts** — Dark Designs vs core RPG wording (default: Dark Designs authoritative)
- **Schema encoding** — multiple valid JSON shapes; prefer asking over inventing

**After the user rules:** Encode in catalog JSON; add a note to **User rulings** when it sets a precedent.

---

## Two ingest passes

### Pass A — Morphus Forge / catalog (default)

**Goal:** Tab 6 trait picker, sources, readable description, core passive stats the engine can aggregate.

**Trait batch size:** **3 traits** — see **What you need to provide** above.

**Per-entry minimum (Pass A complete):**

- `id` — stable slug: `<table>_<trait_slug>` (e.g. `athlete_streamlined`)
- `name`, `description`, `gameSystems`: `["nightbane"]`
- `sources[]` — `gameSystem`, `reference`, `pageNumber` (printed start page)
- `tableCategory` — book section label when applicable
- At least one structured mechanic when the book grants stats: `statModifiers`, `heightModifier`, `weightModifier`, or `naturalAr`

**Optional on Pass A:** `percentile` (authoring aid; not required at runtime), `customOneOffs` for pure flavor only.

**Do not block Pass A on:** full `skillModifiers` trees, capability fields, `variantPercentiles`, flight engines — unless batch scope includes Pass B.

### Pass B — Mechanical depth (optional)

**Goal:** Typed fields for aggregation, capability digest, and future automation — minimize prose-only mechanics.

**Trait batch size:** **1–2 traits**.

Typical keys: `skillModifiers` (including `skill_trait` targets), `damageAffinities`, `naturalWeapons`, `mobility`, `sensory`, `saveModifiers`, `limbDurability`, `atWillAbilities`, `combatContextModifiers`, `recoveryBehaviors`, `skillContextModifiers`, `playerChoices`, `variantPercentiles`, `crossTableRoll` (when trait keeps its own mechanics).

See **Structured fields** in [`../morphus_authoring.md`](../morphus_authoring.md).

---

## Catalog layout

```
src/data/content/morphus/
  tables/           # One JSON file per table (trait table or category hub)
  forge/            # Sub-Forge routing (appearance, characteristics manifest)
```

| `kind` | File pattern | `entries[]` |
|--------|--------------|-------------|
| `morphus_trait_table` | `athlete.json`, `animal_feline.json` | Playable traits only |
| `category_hub` | `disproportion.json`, `animal.json` | Routers + `subtables[]`; traits on **leaf** files |

**Hub + leaf pattern (Disproportion, Animal):**

- Hub: Step One percentile routing in `description` + `subtables[]` pointing at leaf files.
- Leaf: `parentTable: "<hub_id>"`, playable traits only — **no** Step One router rows on leaves.

**Playable vs non-playable rows — do not ingest into trait `entries[]`:**

- `Other` / roll on another table (document in table `description` instead)
- `Roll twice` / combination-of-two/three instruction rows
- Step One disproportion routers (`entryRole: table_router`) on **leaf** tables
- Cross-table redirect rows with **no** bonuses/penalties on the row itself
- `subtable_header` / meta section labels

Traits that **include mechanics** plus an optional roll on another table (e.g. Stuffed Animal → Animal Form at half stats) **are kept** with `crossTableRoll` + local modifiers.

---

## Morphus Sub-Forge routing (`morphus/forge/`)

Percentile **routing** tables for Tab 6 (Appearance vs Characteristics paths) — distinct from trait `entries[]` in `morphus/tables/`.

| File | Role |
|------|------|
| `manifest.json` | Sub-Forge entry — Path 1 (`appearance.json`) vs Path 2 (`characteristics.json`), trait table dir |
| `appearance.json` | Path 1 archetype routing (`forgeRole: appearance_archetype`) |
| `characteristics.json` | Path 2 personality crafter (`forgeRole: characteristics_router`) |
| `nightbane_base_morphus.json` | Base Morphus slot plan when applicable |

**Schema:** `palladium-morphus-forge-routing.schema.json`  
**Examples:** `src/data/schemas/examples/palladium-morphus-forge-*.example.json`  
**Forge spec:** [`../forge/morphus_creation.md`](../forge/morphus_creation.md)

### When to edit forge JSON vs trait tables

| Change | Where |
|--------|--------|
| New playable Morphus characteristic | `morphus/tables/<table>.json` — trait batch or PDF pipeline ([`morphus.md`](morphus.md)) |
| New Appearance archetype percentile band | `morphus/forge/appearance.json` routing entry |
| Path 2 count roll or characteristic router | `morphus/forge/characteristics.json` |
| New trait **table** referenced by routing | Create table JSON first, then point `tableId` / `subtableIds` from forge entry |

**Batch size:** **1 routing file** or **2–4 routing entries** per batch — smaller when slot plans nest `subtableIds` or `rerollMultiRollResults`.

After edits run `npm run validate:schemas`. **Flag ambiguity** on percentile bands, slot counts, and hub vs leaf targets before encoding.

---

## Agent workflow (checklist)

### Trait batch (manual)

1. Read cited PDF pages for the named traits.
2. **Flag ambiguity; get user ruling.**
3. Open the correct table file under `morphus/tables/`.
4. Fill **Pass A** fields per entry; use [`../morphus_authoring.md`](../morphus_authoring.md) prose → JSON mapping.
5. Add **Pass B** only when in scope; prefer schema keys over `customOneOffs`.
6. For category skill penalties, use `skill_trait` overrides + list files — not hand-enumerated skill ids when a trait list exists.
7. **Update this doc** if precedents changed.
8. Run `npm run validate:schemas` and `npm run validate:morphus`.
9. Do **not** commit unless the user asks.

### Full table (PDF pipeline)

1. `npm run morphus:ingest -- init …` (or confirm manifest exists).
2. `npm run morphus:ingest -- prepare <table>` until `schema-analysis.json` has `"readyToTranscribe": true`.
3. Extend schema manually if `schema-gap-tasks.json` blocks auto-apply.
4. `structure-entries` / transcribe → `merge` → `build` → `validate`.
5. `npm run morphus:ingest -- finalize <table>` for aggregation coverage.
6. Strip routers/non-playable rows per rules above.
7. Run validation commands; update docs if pipeline conventions changed.

---

## Validation & tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:schemas` | All morphus table files + schema examples |
| `npm run validate:morphus` | Table docs + description leak checks |
| `npm run morphus:ingest -- <cmd> <table>` | PDF extract, schema loop, merge, finalize — see [_README](../../src/data/source/morphus-ingest/_README.md) |
| `npm run migrate:morphus-skills` | Bulk normalize `skillModifiers` / skill_trait overrides on existing tables |
| `npm run dedupe:morphus-skill-prose` | Remove duplicate skill prose when structured modifiers exist |
| `npm run apply:skill-traits` | Refresh skill `skillTraits` after editing trait list `.txt` files |

No `audit:morphus` script yet — use `finalize` aggregation report + validator output.

---

## User rulings (precedents)

| Topic | Issue | Ruling |
|-------|-------|--------|
| Non-playable rows | Routers in catalog JSON | **Omit** from leaf trait tables; document in hub `description` or table `description` |
| Multi-book sources | DD vs core RPG | **Dark Designs authoritative** for description/mechanics when they differ |
| Mind control saves | Book lists +2 vs mind control | **Strip** from Morphus descriptions — Nightbane immunity (pipeline: `morphus-nightbane-prose.mjs`) |
| Percentile on entries | Stored vs extract-only | **Optional** authoring field; PDF pipeline uses for extract, not required at runtime |
| Skill penalties | Enumerate skills vs trait | Prefer **`skill_trait`** + `skill_trait_lists/*.txt` when book uses category phrasing |

---

## Reference examples

| Artifact | Pattern |
|----------|---------|
| `palladium-morphus-table-trait.example.json` | Leaf trait table shell |
| `palladium-morphus-table-animal-hub.example.json` | Category hub with `subtables[]` |
| `palladium-morphus-characteristic.example.json` | Fully structured characteristic |
| `morphus/tables/athlete.json` | Dark Designs trait table with `statModifiers`, weapons |
| `morphus/tables/disproportion.json` | Hub + routers (not leaf trait pattern) |

---

## Do not

- Ingest **router-only** or **Other** rows as playable Morphus traits.
- Put mechanics only in `description` when the schema supports structured fields.
- Add top-level `conditionalStanceModifiers` — only under `mobility.conditionalStanceModifiers`.
- Invent new `morphusRules` blocks — use capability fields from the schema.
- Hand-enumerate dozens of skill ids when `skill_trait` + list files cover the book phrase.
- Duplicate full book text in `customOneOffs` if it is already in `description`.
- Commit unless the user explicitly asks.
