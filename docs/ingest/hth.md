# Palladium Hand-to-Hand (HtH) ingest

How agents should add or update **Hand-to-Hand combat style progression tables** (`hth_*`) so every row matches the schema, O.C.C. `handToHandRules.upgradePaths`, and combat stat aggregation (`accumulateHandToHandBonuses()`).

**Percentile skills** stay in [`skills.md`](skills.md). **W.P. rows** stay in [`weapon_proficiencies.md`](weapon_proficiencies.md). **O.C.C. grants and upgrade paths** are set in [`occs.md`](occs.md).

---

## What you need to provide

Send one batch per message (or per agent session). **Default to Pass A** — one full HtH style is usually one batch.

### Batch sizes

| Pass | Scope | Items per batch | Use a smaller batch when… |
|------|-------|-----------------|---------------------------|
| **Pass A** | Full level 1–15 `progression` matrix for one style | **1 HtH style** | Correcting a single level row or typo |
| **Pass B** | O.C.C. linkage — `handToHandRules` on O.C.C. rows referencing this `hth_*` id | **1 O.C.C.** | Upgrade path / forbidden list only |

Pass B is optional when O.C.C. ingest happens in the same session ([`occs.md`](occs.md)).

### Required in every batch request

| Field | Required | Example |
|-------|----------|---------|
| **PDF + page range** | Yes | `Nightbane RPG p. 65` |
| **Genre** | Yes (Pass A) | `nightbane` — sets `gameSystems` when present on row |
| **Scope** | Yes | `progression-only` (Pass A) or `include O.C.C. links` (Pass B) |
| **Style name** | Yes | `Hand-to-Hand: Expert` |

### Copy-paste template (Pass A)

```text
Batch: Nightbane RPG p. 65
Genre: nightbane
Scope: progression-only (Pass A)
Hand-to-Hand: Hand-to-Hand: Expert
```

After each batch the agent runs `npm run validate:schemas`. **Flag ambiguous book text and ask for a ruling** before encoding.

---

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Schema | `src/data/schemas/palladium-hth.schema.json` |
| Example row | `src/data/schemas/examples/palladium-hth.example.json` |
| Catalog | `src/data/content/skills/hand_to_hand.json` (single array — **root exception** under `skills/`) |
| Loader / engine | `src/data/library/skillsCatalogLoader.ts`, `src/lib/meleeCombat.ts`, `accumulateHandToHandBonuses()` |
| Validator | `scripts/validate-palladium-schemas.mjs` |
| Reference PDFs | `src/data/reference/<genre>/` (gitignored) |

When the schema changes, **update `palladium-hth.example.json`**.

### Living document (process rules)

**This file is the shared ingest playbook.** Update it when conventions change. See `.cursorrules`. **Layout:** [`../content-catalog-layout.md`](../content-catalog-layout.md) (`hand_to_hand.json` root exception). **Doc sync:** [`../gemini-project-context.md`](../gemini-project-context.md) § Development workflow.

---

## Catalog layout

| Rule | Detail |
|------|--------|
| **File** | `src/data/content/skills/hand_to_hand.json` — top-level array of HtH styles |
| **Id convention** | `hth_<snake_case>` (e.g. `hth_basic`, `hth_expert`, `hth_martial_arts`, `hth_assassin`, `hth_none`) |
| **Global unique `id`** | Across the single file |
| **Not a category skill file** | Excluded from `skills/*.json` category glob — do not merge into `communications.json` etc. |

---

## Rules ambiguity — flag and ask

Flag when you see:

- **Incremental vs cumulative** — schema stores **per-level unlocks**; engines sum levels 1…N. Do not store running totals in `progression`.
- **`attacks` vs `apm`** — same column on printed tables; prefer `attacks` unless schema docs specify `apm` alias
- **Window maneuvers** — `criticalStrikeWindow`, `knockoutStunWindow`, `deathBlowWindow` — confirm d20 values and whether they **replace** prior tiers at higher levels
- **Kick / body throw** — `damageFormula` dice notation vs flat `damage` bonus on level rows
- **`attackApmCost`** — styles that cost 2 actions per attack (e.g. `hth_none`) vs default 1
- **O.C.C. upgrade paths** — which styles an O.C.C. may start with vs upgrade into (`handToHandRules.upgradePaths`)

---

## Two ingest passes

### Pass A — Progression matrix (default)

**Goal:** Level 1–15 table matching the rulebook; drives APM, strike/parry/dodge, damage, and maneuver windows on the Live Ledger.

**Batch size:** **1 style**.

**Required fields:**

- `id`, `name`, `description`, `progression`
- `sources` + `gameSystems` when ingesting a genre-specific printing (recommended for new rows)
- `progression` keys `"1"` … `"15"` (string digits) — omit empty levels; only encode levels with unlocks

**Progression encoding rules:**

- Numeric fields on a level row are **incremental** bonuses unlocked at that character level.
- `kickAttack`, `bodyThrowFlip` — structured objects with `damageFormula` (+ optional `effects` / `description`).
- Boolean flags (`pairedWeapons`, `criticalStrikeFromBehind`, `entangleUnlocked`, `disarmUnlocked`, …) unlock at the listed level.
- Window arrays (`criticalStrikeWindow`, …) **replace** prior tiers when a higher level defines them (per schema description).

**Do not block Pass A on:** O.C.C. `handToHandRules` unless the user asked for O.C.C. linkage in the same batch.

### Pass B — O.C.C. linkage (optional)

**Goal:** `handToHandRules` on O.C.C. rows — `defaultSkillId`, `upgradePaths`, alignment gates.

See [`occs.md`](occs.md). Every referenced `hth_*` id must exist in `hand_to_hand.json`.

**Slot costs:** There is **no** genre-wide or style-wide default `electiveSlotCost`. Each O.C.C. (or specialization override) defines costs in its own book prose — transcribe from **that O.C.C.'s cited pages**, not from p. 65 combat tables or other O.C.C. rows. Flag ambiguous wording and ask for a ruling.

Encode `electiveSlotCost` on each `upgradePaths[]` entry exactly as the O.C.C. specifies for that row.

---

## Agent workflow (checklist)

1. Read cited PDF page(s) for the HtH table.
2. **Flag ambiguity; get user ruling.**
3. Open `src/data/content/skills/hand_to_hand.json`.
4. Add or update the style object; transcribe level rows into `progression`.
5. If O.C.C. batch in scope: update `handToHandRules` on affected O.C.C.s ([`occs.md`](occs.md)).
6. **Update this doc** if precedents changed.
7. Run `npm run validate:schemas`.
8. Do **not** commit unless the user asks.

---

## Validation & tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:schemas` | Each row in `hand_to_hand.json` vs `palladium-hth.schema.json` |

No dedicated `audit:hth` script.

---

## User rulings (precedents)

| Topic | Issue | Ruling |
|-------|-------|--------|
| File placement | Under `skills/` | **`hand_to_hand.json` at `skills/` root** — documented exception in content-catalog-layout |
| Id prefix | Slug shape | **`hth_*`** referenced from O.C.C. `handToHandRules` (`defaultSkillId`, `upgradePaths[].targetSkillId`) |
| Expert default | O.C.C. grants Expert at creation | `defaultSkillId: "hth_expert"` (e.g. Team Epsilon Trooper, BtS) — upgrade paths list only higher tiers |
| Entangle maneuver | Bare "Entangle" on printed tables | **`entangleUnlocked: true`** on the level row; numeric `entangle` is a separate bonus field |
| Disarm maneuver | Bare "Disarm" on printed tables | **`disarmUnlocked: true`** on the level row; numeric `disarm` is a separate bonus field |
| Martial Arts L13 | Expert uses behind-attack flags at L13; Martial Arts does not | **`knockoutStunWindow: [18, 19, 20]`** only — no `criticalStrikeFromBehind` / `knockoutFromBehind` on Martial Arts |
| Assassin L12 death blow | Printed at L12 (Expert places death blow at L15) | **`deathBlowWindow: [20]`** on level 12 only |
| Assassin L7 KO/stun | Wider window than Expert (18–20 at L11) | **`knockoutStunWindow: [17, 18, 19, 20]`** |
| Assassin alignment gate | Only when O.C.C. prose says “if evil” / “evil alignment” | `alignmentRestrictions` on that O.C.C.’s `upgradePaths[]` row — not genre-wide |

---

## Reference examples

| Artifact | Pattern |
|----------|---------|
| `skills/hand_to_hand.json` | Nightbane core styles (Basic, Expert, Martial Arts, Assassin, None) |
| `palladium-hth.example.json` | Level-keyed progression pattern |

---

## Do not

- File HtH rows in category skill JSON files (`rogue.json`, etc.).
- Store cumulative totals per level in `progression` — use incremental unlocks only.
- Invent `hth_*` ids on O.C.C. rows without catalog rows.
- **Guess** `electiveSlotCost` or copy costs from another O.C.C. — each O.C.C. defines its own.
- **Guess** window ranges or bonus stacking — flag and ask.
- Skip `npm run validate:schemas` after edits.

---

## Related docs

- [`occs.md`](occs.md) — `handToHandRules`, upgrade paths
- [`weapon_proficiencies.md`](weapon_proficiencies.md) — parallel combat catalog
- [`skills.md`](skills.md) — percentile skills (separate schema)
- [`../stat_engine_spec.md`](../stat_engine_spec.md) — HtH stacking on APM, strike, damage
- [`../combat_logic.md`](../combat_logic.md) — melee combat UX
- [`../forge/character_creation.md`](../forge/character_creation.md) — Tab 4 skill / HtH picks
- `.cursorrules`
