# Nightbane talent catalog ingest

How agents should add or update **Nightbane Talents** (Dark Designs / Survival Guide) so every row matches the schema, engine contract, and character-creation UI.

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Schema | `src/data/schemas/palladium-talent.schema.json` |
| Engine contract | `scripts/talent-engine-contract.mjs` |
| Example rows | `src/data/schemas/examples/palladium-talent*.json` |
| Common catalog | `src/data/content/talents/common.json` |
| Elite catalog | `src/data/content/talents/elite.json` |
| Reference PDF (authoring) | `src/data/reference/nightbane/WB6-Dark_Designs.pdf` |

When the schema changes, **update the matching example JSON** under `src/data/schemas/examples/`.

### Living document (process rules)

**This file is the shared ingest playbook.** When ingest conventions change — form defaults, batch sizes, new schema fields, audit expectations, worked examples, user rulings on ambiguous mechanics — **update this document in the same PR/session** as the code or catalog change. Do not rely on chat history alone; future agents read this file via `.cursorrules`.

If you establish a new pattern (e.g. a new `formUsage` shape or P.P.E. structure), add a short example here so the next batch stays consistent.

---

## Rules ambiguity — flag and ask

**Never guess on book mechanics.** If anything is unclear, contradictory, or could be encoded multiple ways, **stop ingest on that point**, flag it explicitly, and **ask the user for a ruling** before writing JSON.

Flag when you see:

- **Form** — Facade vs Morphus (or self vs others vs phase) not stated clearly in the book
- **Level gates** — `[N]` brackets ambiguous in column layout, or text vs list disagree
- **P.P.E.** — variable costs, caps, or enhancement steps not spelled out
- **Targets / saves** — who is affected, save type/number, or immunity lists unclear
- **Scope** — whether a limitation applies to activation only, duration, or specific modes
- **Schema encoding** — multiple valid JSON shapes; prefer asking over inventing a one-off

**How to flag:** Name the talent, cite page(s), quote or summarize the ambiguous text, state the options you see, and ask the user to pick (or give a custom ruling).

**After the user rules:** Encode the decision in catalog JSON (and `formUsage` when applicable), then **add or update a note in this doc** if the ruling sets a precedent others should follow.

---

## Two ingest passes

### Pass A — Chargen-only (default)

**Goal:** Character creation picker, gates, P.P.E. display, sources, form rules.

**Batch size:** **4 talents** per batch (user provides page range + names).

**Required Tier 1 fields for a “complete” row:**

- `id`, `name`, `description`, `gameSystems`, `sources` (≥1 Dark Designs ref with `pageNumber`)
- `talentTier`: `common` or `elite` (must match the file — see below)
- `ppe.permanentBurnToAcquire` and `ppe.baseActivation` (number, string, or structured object when variable)
- `limitations.usableInNightbaneForm` (default `morphus_only` — see Form rules)

**Optional but useful on Pass A:** `limitations.minimumCharacterLevelToAcquire`, `ranges`, `duration`, `save`, `notes`, `modifiers`, `prerequisites`, `incompatibleTalentIds`, `ppe.notes`, `ppe.activationTiers`, `ppe.enhancement`, `limitations.formUsage`.

**Do not block Pass A on:** Tier 2 play blocks (`powerModes`, `combatMechanics`, `damage` objects, etc.) unless the batch scope explicitly includes play mechanics.

### Pass B — Play mechanics (optional)

**Goal:** Structured blocks for combat / FeatureCard when the engine consumes them.

**Batch size:** **2–3 talents** when adding or extending Tier 2 keys.

Use documented Tier 2 keys from `TALENT_TIER2_PLAY_KEYS` in `scripts/talent-engine-contract.mjs`. Prefer schema keys over ad-hoc top-level fields (audit flags **schema drift**).

---

## Catalog layout

```
src/data/content/talents/
  common.json   # talentTier: common
  elite.json    # talentTier: elite
```

- One JSON **array** per file; rows sorted by `id`.
- Loader merges both files at runtime (`talentCatalogLoader.ts`).
- **`talentTier` must match the file** (`common.json` → `common`, `elite.json` → `elite`).
- Row `id` pattern: `talent_snake_case_name` (e.g. `talent_blast_wave`).

---

## Tier 1 vs Tier 2 (engine contract)

Defined in `scripts/talent-engine-contract.mjs`:

| Tier | Purpose | Consumers |
|------|---------|-----------|
| **Tier 1** | Chargen — picker, gates, P.P.E., sources, form | `TalentsForgePanel`, `talentSelectionGates`, `talentCatalogLoader` |
| **Tier 2** | Play — damage chains, modes, recovery, etc. | FeatureCard / combat (planned) |

**Tier 1 complete** (audit target after Pass A):

```text
identity + talentTier + ppe (acquire + activation) + Dark Designs source
```

Run audit: `npm run audit:talents`

---

## Form rules (Facade / Morphus)

### Default

**`limitations.usableInNightbaneForm`: `morphus_only`** unless book text explicitly allows Facade use (e.g. “Double activation cost if used in Facade form”, “Can be used in Facade form”, Channel Speed/Strength, Shadow Pockets in both forms).

Do **not** infer Facade permission from:

- Mentioning “Facade” when describing what you *see* (e.g. See Truth)
- Target restrictions (“Nightbane stuck in Facade” as a valid target for Zombie Master)

### Simple form values

| Value | When |
|-------|------|
| `morphus_only` | Default; Morphus-only talents |
| `primary_only` | Book says Facade only (Channel Speed, Heal Facade, etc.) |
| `either_form` | Book allows both (Blast Wave with Facade double cost, Chronosphere, Shadow Pockets) |
| `varies_by_scope` | Structured rules in `formUsage` (see below) |

Legacy `both_forms_note_special` may appear on older rows; prefer `varies_by_scope` + `formUsage` for new work.

### Structured form — `limitations.formUsage`

Use when rules **differ by target or phase**. Do **not** bury this in `otherLimitations` prose.

**By target** (self vs others vs willing):

```json
"usableInNightbaneForm": "varies_by_scope",
"formUsage": {
  "byTarget": {
    "self": { "form": "either_form", "effectiveness": "full" },
    "others": { "form": "morphus_only", "effectiveness": "base_only" }
  }
}
```

**By phase** (activation vs after):

```json
"usableInNightbaneForm": "varies_by_scope",
"formUsage": {
  "phases": {
    "activation": { "form": "morphus_only", "notes": "Plant the seedling" },
    "ongoingUse": { "form": "either_form" }
  }
}
```

Each rule supports:

- `form`: `morphus_only` | `primary_only` | `either_form`
- `effectiveness` (optional): `full` | `base_only` | `reduced`
- `notes` (optional): short clarifier

**UI:** `formatTalentFormRules()` in `src/lib/talentDisplay.ts` renders labeled lines on talent cards (On self, On others, Activation, After activation).

**Modal talents:** Per-mode form can live on `powerModes[].limitations.usableInNightbaneForm` (e.g. Rigor Mortis Feign Death vs Debilitate). Top-level `formUsage.byTarget` should still summarize the player-facing rule.

### Ambiguous form

Form is the most common ambiguity. If the book does not state Facade/Morphus (or self vs others) clearly, follow **Rules ambiguity — flag and ask** above. Document confirmed rulings in `formUsage` and in this file when they set precedent.

Re-apply defaults across the catalog: `node scripts/backfill-talent-form-defaults.mjs` (dry run: `--dry-run`).

---

## P.P.E. economy

```json
"ppe": {
  "permanentBurnToAcquire": 6,
  "baseActivation": 9,
  "notes": "Optional prose for variable costs",
  "activationTiers": [
    { "summary": "Simple lock: 1 P.P.E." }
  ],
  "enhancement": {
    "summary": "What spending extra P.P.E. buys",
    "costPerStep": 3,
    "stepDefinition": "+1D6 to initial target",
    "differsFromBaseActivation": true
  },
  "maxEnhancementPpePerActivation": {
    "ppePerCharacterLevel": 9
  }
}
```

- **Acquire:** permanent burn when the talent is first taken.
- **Activation:** per use; use an object with `summary` when cost is variable or capped per level.
- **Tiered costs** (Bypass lock types): prefer `activationTiers` over long `notes` alone.

---

## Attribute-only saves (`saveKind`)

Nightbane talents often call for **P.E. or M.E. bonuses only** — no stacked `save_magic`, racial, O.C.C., or skill modifiers.

| `saveKind` | Use when | Sheet / resolution |
|------------|----------|-------------------|
| `base_pe` | Book says P.E. bonus only (e.g. Darksong save vs 10) | `targetNumber` is the GM-called save; add P.E. exceptional bonus to d20 |
| `base_me` | Book says M.E. bonus only | Add M.E. exceptional bonus to d20 |
| `vs_becoming` | Facade ↔ Morphus shift save | Target **12**; **Facade M.E.** bonus + Nightbane level progression. Add both to d20. |

Runtime: `src/lib/attributeSaves.ts`, `src/data/saveKinds.ts`, `src/lib/saveRollDisplay.ts`. Character sheet shows **vs N** and **+bonus to roll**.

**Roll resolution:** GM calls the save number. Player rolls d20 + bonuses; total ≥ target succeeds. **Saver wins ties** (`opposedRollRules.ts`). Book “roll under N” failure wording (Darksong) = fail save vs N — same encoding.

```json
"save": {
  "summary": "Save vs 10 (P.E. bonus only). Failure stuns for 1D4 melee rounds.",
  "saveKind": "base_pe",
  "targetNumber": 10
}
```

---

## Level gates

```json
"limitations": {
  "minimumCharacterLevelToAcquire": 3
}
```

No bracket usually means **level 1**. Do not copy a bracket from the **next** line in a column layout (e.g. `[3]` applies to Ashes to Ashes, not All-Nighter).

Creation defaults to **level 1**; gated talents show as locked in `TalentsForgePanel` until level matches.

---

## Sources

Every Pass A row needs at least one Dark Designs citation:

```json
"sources": [
  {
    "gameSystem": "nightbane",
    "reference": "Dark Designs",
    "pageNumber": 64
  }
]
```

Add supplemental books (Nightbane RPG, Survival Guide, Between the Shadows) as additional `sources` entries when mechanics span books.

---

## User batch request template

Users should send batches like:

```text
Batch: only @src/data/reference/nightbane/WB6-Dark_Designs.pdf : pp 64–66
Scope: chargen-only
Talents: Bookworm, Brain Freeze, Bypass, Chain Lightning
```

| Field | Meaning |
|-------|---------|
| PDF + pages | Primary book evidence for the batch |
| Scope | `chargen-only` (Pass A) or include play mechanics (Pass B) |
| Talents | Exact names (4 default for Pass A) |

Optional: `Original: Nightbane RPG pp. X–Y` when DD references core book text.

---

## Agent workflow (checklist)

1. Read the cited PDF pages (or trusted extracted text under `src/data/source/` if PDF is unavailable).
2. **Flag any rules/mechanics ambiguity and get a user ruling** before encoding (see above).
3. Locate or create rows in the correct file (`common.json` vs `elite.json`).
4. Fill **Tier 1** fields; align form with rules above.
5. Move form rules out of `otherLimitations` into `formUsage` when they vary by target/phase.
6. **Update `docs/nightbane-talent-ingest.md`** if ingest rules or precedents changed this session.
7. Run validation:
   ```bash
   npm run validate:schemas
   npm run audit:talents
   npm test -- --run src/lib/talentEngineContract.test.ts src/lib/talentDisplay.test.ts src/lib/talentSelectionGates.test.ts
   ```
8. Fix **critical** audit items before considering the batch done.
9. Do **not** commit unless the user asks.

---

## Audit & tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:schemas` | Ajv validate all catalog rows + examples |
| `npm run audit:talents` | Tier 1 completeness, schema drift, form mismatches |
| `npm run audit:talents -- --json reports/talent-audit.json` | Machine-readable report |
| `node scripts/backfill-talent-form-defaults.mjs --dry-run` | Preview morphus-only form backfill |

Common audit codes:

| Code | Meaning |
|------|---------|
| `tier1_incomplete` | Missing tier, P.P.E., or Dark Designs source |
| `schema_drift` | Top-level key not in contract/schema |
| `form_rule_mismatch` | `usableInNightbaneForm` ≠ inferred prose |
| `form_usage_missing` | `varies_by_scope` without `formUsage` |
| `form_usage_scope_mismatch` | `formUsage` present but summary enum wrong |

---

## User rulings (precedents)

Documented table rulings when book text is ambiguous or contradictory. Encode in catalog JSON; do not re-litigate without a new user decision.

| Talent | Issue | Ruling |
|--------|-------|--------|
| Inferno Fist | Dark Designs p. 74 lists **5 P.P.E.** per melee round but also “only 2 P.P.E. may be spent on activation per level.” | **Flat 5 P.P.E. per activation**, one melee round. Ignore the per-level cap. |
| Darksong | Save is “roll under 10” with P.E. bonuses — book failure wording for save vs 10. | `saveKind: base_pe`, `targetNumber: 10`. Area targets save at +4. |
| Attribute-only saves | Nightbane talents often use P.E. or M.E. bonuses only (no racial/O.C.C./skill save stacks). | `saveKind`: `base_pe`, `base_me`, or `vs_becoming`. Sheet shows **vs target** + **bonus to roll**. Saver wins ties. |
| A Face in the Crowd | Prerequisite is prose-only (“monstrous or alien trait from any appropriate table”). | Keep `limitations.morphusTablePrerequisites` + `prerequisites.summary`; no structured `morphusTableIds` until forge can express “monstrous/alien, not attractive/human.” |
| Forbidding Woods | Effect prose cites 5 P.P.E. per 100 ft radius; **Cost** line cites 7 P.P.E. per 100 ft (both books). | **7 P.P.E. per 100 foot radius** per Cost line. |
| Pariah's Mantle | Book calls for "saving throw of 15 or better using any bonuses from a high M.E. attribute" — not save vs magic. | `saveKind: base_me`, `targetNumber: 15`. Good alignment +2 and pacifist +5 are flat save modifiers. |

---

## Reference examples in catalog

| Talent | Pattern |
|--------|---------|
| Leave No Trace | `formUsage.byTarget` — self full / others base only |
| Rigor Mortis | `formUsage.byTarget` + `powerModes` per mode |
| Seedling | `formUsage.phases` — plant Morphus / use either |
| Splittin' Image | `formUsage.phases.activation` — Morphus to activate |
| Bypass | `ppe.activationTiers` — tiered lock costs |
| Blast Wave | `either_form` + variable activation cap in `ppe` |
| Chain Lightning | `maxEnhancementPpePerActivation.ppePerCharacterLevel` |

Schema example file: `src/data/schemas/examples/palladium-talent.example-form-usage.json`

---

## Do not

- Put talents in a single monolithic `palladiumTalents.json` (removed; use `talents/` directory).
- Set `either_form` without book evidence.
- **Guess when book mechanics are ambiguous** — flag and ask the user (see **Rules ambiguity — flag and ask**).
- Hide level-gated talents in the UI — show them locked with level labels.
- Add undocumented top-level JSON keys (causes `schema_drift`).
- Change ingest conventions without updating **`docs/nightbane-talent-ingest.md`**.
- Commit or open PRs unless the user requests it.
- Skip `npm run validate:schemas` after schema or catalog edits.

---

## Related docs

- `docs/gemini-project-context.md` — project-wide schema ↔ content map
- `docs/forge-character_creation.md` — creation forge flow
- `.cursorrules` — Core Design Pillars (Mechanical Integrity, Radical Visibility, etc.)
