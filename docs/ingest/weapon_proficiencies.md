# Palladium weapon proficiency (W.P.) ingest

How agents should add or update **Weapon Proficiency catalog rows** (`wp_*`) so every entry matches the schema, O.C.C. `wpRules`, modern progression bundles, and combat bonus aggregation.

**Hand-to-Hand styles** are in [`hth.md`](hth.md). **Percentile skills** are in [`skills.md`](skills.md). **O.C.C. core / forbidden W.P. lists** are in [`occs.md`](occs.md).

---

## What you need to provide

Send one batch per message (or per agent session). **Default to Pass A**.

### Batch sizes

| Pass | Scope | Items per batch | Use a smaller batch when… |
|------|-------|-----------------|---------------------------|
| **Pass A** | Full W.P. row — tiers, stacking, sources, ancient vs modern shape | **2–3 W.P.s** | Paired Weapons, multi-tier ancient ladder, or `usesStandardModernProgression` override |
| **Pass B** | Shared modern ladder / bundle edits | **1 bundle key** | Changing `standard_modern_weapon_progression.json` affects all flagged modern W.P.s |

Pass B is rare — only when the book's **standard modern firearm ladder** changes for a game line.

### Required in every batch request

| Field | Required | Example |
|-------|----------|---------|
| **PDF + page range** | Yes | `Nightbane RPG pp. 56–58` |
| **Genre** | Yes | `nightbane` — sets `gameSystems` |
| **Category** | Yes | `ancient` or `modern` — determines schema branch |
| **Scope** | Yes | `catalog-only` (Pass A) or `bundle update` (Pass B) |
| **W.P. names** | Yes | Exact printed names |

### Copy-paste template (Pass A — ancient)

```text
Batch: Nightbane RPG pp. 56–57
Genre: nightbane
Category: ancient
Scope: catalog-only (Pass A)
W.P.s: Archery and Targeting, Blunt, Chain
```

### Copy-paste template (Pass A — modern standard ladder)

```text
Batch: Nightbane RPG pp. 57–58
Genre: nightbane
Category: modern
Scope: catalog-only (Pass A)
W.P.s: Revolver, Semi-Automatic Pistol
Note: Revolver uses tier-1 aimedStrikeBonus override (+4) per book
```

After each batch the agent runs `npm run validate:schemas`. **Flag ambiguous book text and ask for a ruling** before encoding.

---

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Schema | `src/data/schemas/palladium-weapon-proficiency.schema.json` |
| Example rows | `src/data/schemas/examples/palladium-weapon-proficiency.example-ancient.json`, `example-modern.json`, `example-paired.json` |
| Modern bundle schema | `src/data/schemas/standard-modern-weapon-progression.schema.json` |
| Modern bundle data | `src/data/content/skills/utils/standard_modern_weapon_progression.json` |
| Catalog | `src/data/content/skills/weapon_proficiencies.json` (single array — **root exception** under `skills/`) |
| Validator | `scripts/validate-palladium-schemas.mjs` |
| Reference PDFs | `src/data/reference/<genre>/` (gitignored) |

When the schema changes, **update the matching example JSON** under `src/data/schemas/examples/`.

### Living document (process rules)

**This file is the shared ingest playbook.** Update it when conventions change. See `.cursorrules`. **Layout:** [`../content-catalog-layout.md`](../content-catalog-layout.md). **Doc sync:** [`../gemini-project-context.md`](../gemini-project-context.md) § Development workflow.

---

## Catalog layout

| Rule | Detail |
|------|--------|
| **File** | `src/data/content/skills/weapon_proficiencies.json` — top-level array |
| **Id convention** | `wp_<snake_case>` |
| **`kind`** | Always `"weapon_proficiency"` on catalog rows |
| **`weaponProficiencyCategory`** | `ancient` or `modern` — selects schema branch |
| **Global unique `id`** | Across the single file |
| **Not a category skill file** | Excluded from skills category glob (see `isSkillCategoryCatalogFile()`) |

---

## Ancient vs modern

| Branch | When to use | Typical shape |
|--------|-------------|---------------|
| **Ancient** | Blades, bows, whips, thrown weapons, etc. | `levelTiers[]` with strike/parry/RoF/range bonuses; `stackingRule` documents cumulative vs highest-tier |
| **Modern (explicit ladder)** | Firearm with per-level aimed/burst ladder in book | `levelTiers[]` on the row |
| **Modern (standard ladder)** | Nightbane-style standard pistol/rifle progression | `usesStandardModernProgression: true` + optional **tier-1-only** override in `levelTiers` |
| **Paired Weapons** | Special attack/parry rules, no numeric tier ladder | `pairedWeapons` object — see `palladium-weapon-proficiency.example-paired.json` |

**`usesStandardModernProgression`:** Engine merges `standard_modern_weapon_progression.json` bundle keyed by `standardModernProgressionKey` (defaults from `gameSystems[0]`). Catalog row may supply **only** `atCharacterLevel: 1` tier to override bundle defaults (e.g. Revolver +4 aimed). Do **not** set `stackingRule` on the row when this flag is true.

---

## Rules ambiguity — flag and ask

Flag when you see:

- **Ancient vs modern** — book reprints a firearm under ancient rules
- **`rateOfFireDelta` vs `rateOfFireTotal`** — cumulative adds vs absolute RoF at tier (never both on same tier)
- **`rangeBonusFeet` vs `rangeBonusPerLevelFeet`** — milestone vs per-level range
- **`damageBonusFlat` vs `damageBonus` notation** — flat integer vs dice token
- **Standard modern bundle** — whether a W.P. truly shares the line-wide ladder or needs a full custom `levelTiers[]`
- **Recognize Weapon Quality** — root vs tier `skillPercentage` with `kind: recognize_weapon_quality`
- **O.C.C. `wpRules`** — core vs elective W.P.s, forbidden lists, alignment gates

---

## Two ingest passes

### Pass A — W.P. row (default)

**Goal:** Picker + combat bonuses for Tab 4 / Live Ledger.

**Batch size:** **2–3 W.P.s**.

**Required fields (typical):**

- `kind`, `weaponProficiencyCategory`, `id`, `name`, `gameSystems`, `description`, `sources`
- Ancient: `levelTiers[]`, `stackingRule` (unless paired-weapons exception)
- Modern standard: `usesStandardModernProgression`, optional single tier-1 override
- Modern custom: full `levelTiers[]` and `stackingRule` on row

Read schema `$description` on `palladium-weapon-proficiency.schema.json` for field-level authoring rules (aimed/burst, RoF, damage tokens).

**Do not block Pass A on:** O.C.C. `wpRules` unless requested — coordinate in [`occs.md`](occs.md).

### Pass B — Standard modern bundle (optional)

**Goal:** Update shared ladder in `skills/utils/standard_modern_weapon_progression.json` when the **line-wide** modern firearm progression changes.

**Batch size:** **1 bundle key** (e.g. `nightbane`).

Update `standard-modern-weapon-progression.example.json` when schema shape changes. Re-validate all `usesStandardModernProgression` rows after bundle edits.

---

## Agent workflow (checklist)

1. Read cited PDF page(s).
2. **Flag ambiguity; get user ruling.**
3. Classify ancient vs modern (and standard-ladder vs custom).
4. Open `src/data/content/skills/weapon_proficiencies.json`.
5. Add or update row(s); prefer explicit schema fields over prose-only `notes`.
6. If bundle Pass B: edit `skills/utils/standard_modern_weapon_progression.json`.
7. If O.C.C. in scope: update `wpRules` ([`occs.md`](occs.md)).
8. **Update this doc** if precedents changed.
9. Run `npm run validate:schemas`.
10. Do **not** commit unless the user asks.

---

## Validation & tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:schemas` | `weapon_proficiencies.json` rows + modern progression bundle |

No dedicated `audit:wp` script.

---

## User rulings (precedents)

| Topic | Issue | Ruling |
|-------|-------|--------|
| File placement | Under `skills/` | **`weapon_proficiencies.json` at `skills/` root** — documented exception |
| Modern Nightbane firearms | Duplicate full ladder per W.P. | Use **`usesStandardModernProgression`** + tier-1 override when book differs only at level 1 |
| Untrained modern shooters | Reload + wild only in prose | Bundle **`untrainedPenalties`** includes double reload time + wild (no strike bonus) |
| Modern combat modes / burst table | Combat section only | Bundle **`combatNotes`** + **`systemConstraints`**; see **`docs/combat_logic.md`** §6 |
| Civilian O.C.C. military W.P.s | Prose-only class ability | **`wpRules.forbiddenWps`** lists `wp_heavy`, `wp_automatic_and_semiautomatic_rifles`; enforced in Skill Engine |
| Weapon item stats | Damage/range of hardware | **`palladium-weapon-item.schema.json`** — not this catalog |

---

## Reference examples

| Artifact | Pattern |
|----------|---------|
| `weapon_proficiencies.json` | Nightbane ancient + modern rows |
| `palladium-weapon-proficiency.example-ancient.json` | Tier ladder + range per level |
| `palladium-weapon-proficiency.example-modern.json` | Standard modern progression flag |
| `palladium-weapon-proficiency.example-paired.json` | Paired Weapons special rules |
| `skills/utils/standard_modern_weapon_progression.json` | Shared modern ladder bundles |

---

## Do not

- File W.P. rows in category skill JSON files.
- Set both `rateOfFireDelta` and `rateOfFireTotal` on the same tier.
- Set `stackingRule` on a row with `usesStandardModernProgression: true`.
- Put weapon **hardware** stats (damage payload, range variants) on W.P. rows — use weapon item schema when that catalog exists.
- **Guess** RoF or aimed/burst stacking — flag and ask.
- Skip `npm run validate:schemas` after edits.

---

## Related docs

- [`occs.md`](occs.md) — `wpRules.coreWps`, `forbiddenWps`
- [`hth.md`](hth.md) — Hand-to-Hand progression
- [`skills.md`](skills.md) — percentile skills
- [`../stat_engine_spec.md`](../stat_engine_spec.md) — combat bonus stacks
- [`../forge/character_creation.md`](../forge/character_creation.md) — Tab 4
- `.cursorrules`
