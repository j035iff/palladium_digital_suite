# Stat Engine — Technical Specification (Source of Truth)

This document is the **canonical reference for how character statistics are calculated, stacked, and displayed** in the Palladium Digital Suite. It supersedes formula fragments scattered across older docs.

**Related (not duplicated here):**

| Topic | Document |
|-------|----------|
| Product pillars & GM override philosophy | `docs/vision.md` |
| Unified path registry (Pillar 9) | `docs/unified_paths.md` |
| M.D.C. scaling, P.S. tiers, APM tracker UX | `docs/combat_logic.md` |
| Modern firearm W.P. modes, burst table, untrained penalties | `docs/combat_logic.md` §6 |
| Skill **percent** Master Equation | `docs/skill_selection.md` |
| Ground / swim / fly / leap from Spd | `docs/movement_engine_spec.md` |
| Psychic tier & I.S.P. gate | `docs/psychic_gate.md` |
| Tab 8 spawn commit & sheet projection | `docs/character_spawn_handoff.md` |
| Morphus trait authoring | `docs/morphus_authoring.md` |

**Legacy alias:** `docs/live_ledger.md` — formula cheat sheet; **this file is authoritative** when they disagree.

---

## 1. Design rules

1. **Signed modifiers** — Every bump is a signed integer (or explicit dice notation). Bonuses and penalties use the same pipeline.
2. **Radical visibility (Pillar 8)** — Restricted options are greyed out with a reason, never hidden.
3. **Physical dice first (Pillar 5)** — Dice to roll appear in the hint row (or dice-group segments) during creation; attribute multipliers, flats, and Facade carry-over appear only on the **value tooltip**. Values are entered manually on **Tab 5** (primary / Facade dice) and **Tab 6** (Morphus dice when applicable), stored in `creationPendingDiceResolutions` — not auto-rolled.
4. **Primary form before Morphus (Nightbane)** — When building Morphus, primary-form totals are assumed **final** (attributes, skills, and primary vitality dice resolved).
5. **Inspectable stacks** — Live Ledger hints show modifier buckets (`Race`, `OCC`, `HtH`, `traits`, etc.) so GMs can audit math (Pillar 4).
6. **Form scope** — Nightbane maintains separate primary and Morphus attribute/vitality pools where the rules require it; some pools are **shared** (see §5). Single-form races use the primary pool only.
7. **Schema owns constants** — `constant1`, `constant2`, dice notation, and flat bumps for each derived stat are defined in content JSON (race vitals, OCC engines, Morphus profiles). The stat engine applies them uniformly; a wrong value is a schema error or a global engine bug, never a stat-specific code path.
8. **Unified path (Pillar 9)** — Live Ledger rows, tooltips, Morphus diffs, and UI renderers share one pipeline per stage. See `docs/unified_paths.md` before adding stat-specific forks.

---

## 2. Lifecycle phases

Stats are computed in different **phases**. The same formula may be preview-only in one phase and committed in another.

| Phase | When | Engine entry points | Persisted? |
|-------|------|---------------------|------------|
| **A. Forge preview** | Tabs 1–6 during creation | `buildCreationLiveLedgerSnapshot()` | No — read-only ledger |
| **B. Pending dice** | Tab 5 (primary) and Tab 6 (Morphus) — user enters physical dice | `buildPendingDiceBlocks()`, `patchPendingDiceResolution()` | `creationPendingDiceResolutions` |
| **C. Vitality commit** | Tab 5–6 Continue (before Tab 8 spawn) | `commitVitalityFromPendingDice()`, `applyPrimaryPendingDiceResolutions()`, `applyMorphusPendingDiceResolutions()` | Form `hitPoints` / `structuralDamageCapacity`, `ppe` |
| **D. Spawn handoff** | Spawn modal confirm | `applySpawnSheetHandoff()` — skill %, physical skill attribute/SDC apply | `isFinalized: true`, sheet skills |
| **E. Live play** | Post-spawn HUD | `CharacterContext` derived state, `featureEngine`, `morphusPassiveBridge` | Combat state, toggles |

**Rule:** Phase A must match Phase C/D for the same inputs. Phase E is **still catching up** in places (see §8).

---

## 3. Modifier vocabulary

Use these bucket names consistently in docs, ledger hints, and code comments.

| Token | Meaning | Typical data source |
|-------|---------|---------------------|
| **Race dice** | Rolled pool assignment (e.g. human 3D6) | `creationAttributeAssignments` |
| **Race flat** | Racial flat attribute bumps | `races/*.json` → `innateBonuses` |
| **Race / level** | Per-level racial bumps | Race level tables (when applicable) |
| **OCC dice** | O.C.C. attribute dice (resolved on Spawn) | `creationOccVariableResolutions` |
| **OCC flat** | O.C.C. static attribute bumps | `occs/*.json` → `staticBonuses` |
| **OCC / level** | Per-level O.C.C. bumps | OCC level progression |
| **Skill dice** | Physical skill dice (entered on Review) | `creationPendingDiceResolutions` |
| **Skill flat** | Skill flat attribute bumps | `skills/*.json` → `physicalSkillBonuses` |
| **Skill / level** | Per-level skill bumps | Skill progression (when applicable) |
| **misc** | Catch-all: talents, gear, traits, GM overrides | `featureEngine`, Morphus traits |
| **constant** | Post-sum multiplier (e.g. Spd × 0.5) | Trait / rule text |
| **Facade baseline** | Morphus only — Tier-1 Facade aggregated total | Computed Tier-1 Facade attrs |
| **Exceptional** | Table lookup from aggregated attribute | `attributeBonuses.ts` |
| **HtH** | Hand-to-Hand progression (derived stats) | Hand-to-hand catalog |

**Implementation hub:** `src/lib/creationStatEngine.ts` — `resolveAggregatedAttribute()`, `resolveDerivedStat()`.

**Legacy ledger bucket aliases:** Race, OCC, Skills, Traits, HtH map from the terms above for tooltip display.

**Notation:**

- **Single-form characters** — Plain attribute names (`IQ` … `Spd`); no form prefix in UI or docs.
- **Nightbane dual-form** — UI labels **Facade** and **Morphus**. Code uses branch id `primary` for the default sheet pool.
- `pIQ` … `pSpd` — Primary-form attribute totals (Nightbane ledger notation).
- `mIQ` … `mSpd` — Morphus attribute totals.
- **`Attr>16`** — Exceptional natural bonus from `src/lib/attributeBonuses.ts` (17–30 table).
- **`Attr>30`** — Supernatural attribute band bonuses (same file).

---

## 4. Character formulas (all races)

Single-form builds (elf, human, dwarf, etc.) use this section. Nightbane **Facade** uses the same formulas; Morphus-only stacking is §5.

### 4.1 Aggregated attributes (Tier 1 — computed first)

All eight attributes are **aggregated attributes**. Every other stat reads from these totals.

```
AggregatedAttr = (
  RaceDice + RaceFlat + RacePerLevel
  + OCCDice + OCCFlat + OCCPerLevel
  + SkillDice + SkillFlat + SkillPerLevel
  + misc
) × constant
```

- **Race dice** — Pool assignment on the attribute strip (e.g. human 3D6 → entered roll).
- **OCC variable dice** — Resolved on Spawn into flat adds (`creationOccVariableResolutions`).
- **constant** — Post-sum multiplier when rules require it (e.g. Spd reduced 50% → `0.5`). Defaults to `1`.
- **Exceptional table lookups are not part of Tier 1** — they feed Tier 2 derived stats only.

**Implementation:** `resolveAggregatedAttribute()`, `buildFacadeAggregatedAttributeInput()`, `resolveFacadeAggregatedAttribute()`.

**Status:** ✅ Creation ledger · ✅ Spawn attribute dice · ✅ Sheet after handoff

### 4.2 Exceptional attribute modifiers (Tier 2 input)

Derived from **aggregated attribute scores** (not separate inputs).

- Standard table: 17–30 (`meStyleStepBonus`, I.Q. skill %, P.P. strike, etc.)
- Super band: 31+ where defined

**Implementation:** `attributeBonuses.ts` — invoked via `resolveDerivedStat()` / `resolveExceptionalDisplayValue()`.

**Status:** ✅ Ledger · ✅ Saves/combat attribution · Partial on live sheet

### 4.3 Derived stats (Tier 2 — all non-attribute stats)

**Evaluation order:**

1. **Attribute portion** — `AggregatedAttr × constant1` (`constant1` defaults to **1** when omitted).
2. **Add remaining terms** — exceptional modifier, then all dice/flats/per-level buckets (`Race`, `OCC`, `Skills`, `misc`, etc.).
3. **Final multiplier** — multiply the sum by `constant2` (defaults to **1**).

```
DerivedStat = (
  (AggregatedAttr × constant1)     ← defaults to ×1
  + ExceptionalModifier
  + RaceDice + RaceFlat + RacePerLevel
  + OCCDice + OCCFlat + OCCPerLevel
  + SkillDice + SkillFlat + SkillPerLevel
  + misc
) × constant2                        ← defaults to ×1
```

- **constant1** (`attrConstant1` in code) — Multiplier on the Tier-1 aggregated attribute **before** any rolls/flats are added. **Defined by content schema** for each stat (race `vitals.hpFormula`, Morphus `hitPointsFormula`, OCC `ppeEngine.baseFormula`, etc.). Defaults to `1` when the formula is a bare attribute token (e.g. `PE`). Combat S/P/D use `0` (attribute portion comes from the exceptional P.P. table instead).
- **constant2** — Post-sum multiplier when rules require it (e.g. S.D.C. reduced 50% → `0.5`). Also schema-defined when applicable. Defaults to `1`.
- **Combat S/P/D** — `constant1 = 0`; the exceptional P.P. table supplies the attribute-derived portion in the `+ …` step.

**H.P. examples (schema-driven `constant1`):**

| Source | Formula string | Compiled `constant1` | Tier-1 attr | Other Tier-2 terms |
|--------|----------------|----------------------|-------------|----------------------|
| Human / Nightbane Facade race | `PE + 1D6` | **1** | Aggregated P.E. | `1D6`/level (Review) |
| Example NPC race | `PE*3` | **3** | Aggregated P.E. | (per schema) |
| Nightbane Morphus base | `PEx2` | **2** | Morphus aggregated P.E. | `2D6`/level (Review) |

```
Human H.P.      = (AggregatedPE × 1) + 1D6/level + …     ← from race.vitals.hpFormula
Other race H.P. = (AggregatedPE × N) + …                  ← N from that race's hpFormula
Morphus H.P.    = (mAggregatedPE × 2) + 2D6/level + …    ← from morphus hitPointsFormula
```

**Schema → engine:** Formula strings in JSON compile to `{ aggregatedAttr, constant1, diceTerms, flatTerms }` before calling `resolveDerivedStat()`. The engine never hardcodes race-specific multipliers.

**Cascade rule:** When an aggregated attribute changes, every derived stat that references it must recompute.

**Implementation:** `resolveDerivedStat()`, `resolveCombatDerivedStat()`, `buildCreationStatStack()`.

### 4.4 Vitals (Tier 2 — unified engine)

All vitality pools use the same Tier-2 pipeline as combat and saves. Schema formula strings compile to `{ aggregatedAttr, constant1, flatTerms, diceTerms }`, then `resolveDerivedStat()` / `vitalStatEngine.ts`.

| Stat | Schema sources | Tier-2 pattern |
|------|----------------|----------------|
| **H.P.** | `race.vitals.hpFormula`; Morphus `hitPointsFormula` | `(AggregatedPE × constant1) + level dice` |
| **S.D.C.** | `race.vitals.sdc`, OCC/skills | `0 + race/OCC/skill flats + dice` |
| **P.P.E.** | Race P.P.E. + `occ.ppeEngine` | `(AggregatedPE × constant1) + flats + dice`; Facade P.E. in dual-form |
| **I.S.P.** | `occ.ispEngine` | `(AggregatedME × constant1) + dice` |
| **H.F.** | Race/OCC/traits | `buildCreationStatStack({ kind: 'horror_factor_flat' })` |
| **Natural A.R.** | Passive modifiers | `buildCreationStatStack({ kind: 'natural_armor' })` |

**Implementation:** `vitalStatEngine.ts` (compute), `ledgerVitalFormula.ts` (schema parse + display), `buildPendingDiceBlocks()`, `buildCreationVitalsBlock()`, `computeSpawnVitalityFromResolutions()`.

### 4.4 Saves

**Live sheet display (additive rolls):** Each row shows the **base target** the GM calls (e.g. **vs 12**) and the **total bonus to add to d20** (e.g. **(+3)**). Hover/tooltip shows the full bonus breakdown. The app does **not** pre-subtract bonuses into a single “you need X” number.

```
Save roll bonus = Attr>16 (where applicable) + Race + OCC + Skills + misc
```

**Attribute-only rows** (`base_pe`, `base_me`, `vs_becoming`) use exceptional P.E. / M.E. only (plus Becoming level progression). **Saver wins ties** unless an ability overrides (`opposedRollRules.ts`). See `combat_logic.md` §4.

**Implementation:** `buildCreationSavesBlock()`, `saveProfile.ts`, `computeAttributeSaveProfile()`, `saveRollDisplay.ts`, `attributeSaves.ts`, `nightbaneBecomingSave.ts`.

**Status:** ✅ Creation ledger · ✅ Live save display (`SavingThrowsPanel`) · Nightbane Mind Control: **Immune** (both forms)

### 4.5 Hand-to-hand combat

| Stat | Formula |
|------|---------|
| **APM** | `2` (PC base) `+ HtH + Race + OCC + Skills + misc` |
| **Initiative** | `HtH + Race + OCC + Skills + PP>30 + misc` |
| **Strike / Parry / Dodge** | `PP>16 + HtH + Race + OCC + Skills + misc` |
| **Roll w/ impact** | `HtH + Race + OCC + Skills + misc` |
| **Entangle / Disarm** | `HtH + Race + OCC + Skills + misc` |
| **HtH damage** | `PS>16 + HtH + Race + OCC + Skills + misc` |

**APM core** (before skill/OCC/misc/mBase/trait adds):

```ts
// src/lib/meleeCombat.ts — no engine cap; GM may rule otherwise
apmCore = 2 + hthAttackBonus
```

There is **no** character-level APM bump — only HtH extra attacks feed the core.

**Implementation:** `buildCreationCombatBlock()`, `buildCreationCombatLedger()`, `computeMaxApm()`, `handToHandAttackBonus()`.

**Status:** ✅ Ledger (full stack) · ✅ Live HUD APM (full stack via `resolveCharacterMaxApm()`)

---

## 5. Morphus formulas (Nightbane dual form)

Assume Facade is complete when computing Morphus previews.

### 5.1 Morphus aggregated attributes

Morphus uses **Facade aggregated attributes** as its baseline, then applies Morphus-only modifiers through the same Tier-1 formula:

```
mAggregatedAttr = (
  FacadeAggregatedAttr
  + RaceFlat_morphus + OCC + Skills_morphus + trait misc
  + entered trait dice
) × constant
```

- **Facade baseline** — Final Tier-1 Facade total for that attribute (not recomputed from Facade terms).
- **Race flat (Morphus)** — Nightbane R.C.C. mBase bumps (+10 P.S., etc.) — displayed as **Race** in tooltips.
- **Traits** — Morphus characteristic flat/dice modifiers.
- **mSkills** — Skill modifiers that apply only on Morphus (trait-granted skills Facade lacks).

**Shared Facade stats:** P.P.E. always uses **Facade P.E.** in its formula even on the Morphus ledger toggle.

**Implementation:** `buildMorphusAggregatedAttributeInput()`, `resolveMorphusAggregatedAttribute()`, `buildMorphusCreationAttributeBlock()`.

**Status:** ✅ Ledger · ✅ Morphus base apply on forge · ✅ Trait mins at Morphus finalize

### 5.2 Vitals (legacy section)

| Stat | Formula |
|------|---------|
| **mH.P.** | `mPE × 2 + 2D6/level` |
| **mS.D.C.** | `pSDC + 2D6×10 + trait dice/flat + mSkills + misc` |
| **P.P.E.** | **Shared pool** — same as Facade formula; not duplicated per form |
| **I.S.P.** | N/A for standard Nightbane R.C.C. |
| **mH.F.** | `mBase + traits` |
| **mNatural A.R.** | Trait stacking (`stackNaturalArmorFromTraits()`) |

**Morphus-only dice on Tab 6 (Traits):** `morphus_hp` (2D6/level), `morphus_sdc` (2D6×10 + trait S.D.C. dice).

**Implementation:** `spawnDiceBlocks.ts` (dual-form blocks), `buildMorphusTraitSdcBonusDetails()`, `buildCreationVitalsBlock()` when `activeForm === 'morphus'`.

**Status:** ✅ Ledger · ✅ Pending dice · ✅ Trait S.D.C. dice in morphus block

### 5.3 Saves (Morphus)

Morphus ledger saves use **mBase + Morphus attributes + traits** — not Facade race/OCC save lines.

| Save | Formula |
|------|---------|
| Magic | `mBase + mPE>16 + traits` |
| Psionics | `mBase + mME>16 + traits` |
| Horror Factor | `mBase + traits` |
| Disease | `mBase + traits` |
| Insanity | `mME>16 + traits` |
| Poison | `mPE>16 + traits` |
| Mind Control | **Immune** |
| Coma/Death | `mPE>16 + traits` |

**Implementation:** `creationLedgerSavePassiveModifiers()`, `buildMorphusCreationBasePassiveModifiers()`.

**Status:** ✅ Ledger

### 5.4 Hand-to-hand combat (Morphus)

| Stat | Formula |
|------|---------|
| **APM** | `2 + mBase + HtH + mSkills + traits + misc` |
| **Initiative** | `mBase + HtH + mSkills + mPP>30 + traits` |
| **Strike / Parry / Dodge** | `mBase + mPP>16 + HtH + mSkills + traits` |
| **Roll w/ impact** | `mBase + HtH + mSkills + traits` |
| **Entangle / Disarm** | `HtH + mSkills + traits` |
| **HtH damage** | `mPS>16 + HtH + mSkills + traits` |

**mBase combat package:** +1 APM, +1 init, +2 strike/parry/dodge, +3 roll, +4 magic save, +3 psionics/disease/HF saves; Hand-to-Hand **Martial Arts** on Morphus.

**Status:** ✅ Ledger · ✅ Live HUD APM (`resolveCharacterMaxApm()` with Morphus mBase + traits)

---

## 6. Skill percentages

Master equation (`docs/skill_selection.md`):

```
Final % = [Base + (PerLevel × (EffLevel − 1))] + OCC + IQ% + synergies + attr scaling + status
```

| Layer | Module | Role |
|-------|--------|------|
| **Core equation** | `skillEquation.ts` — `calculateSkillPercent()` |
| **Context modifiers** | `skillPercentResolution.ts` — catalog attr mods, Morphus skill traits |
| **Live/creation adapter** | `liveSkillEngine.ts` — I.Q. via `resolveLiveIqSkillBonus()`, display M.A./P.B., quick roll |
| **Spawn projection** | `spawnSheetHandoff.ts` → `projectCreationSkillsToSheet()` |
| **Creation UI** | `skillCreationDisplay.ts`, `SkillEngine.tsx` |
| **Live sheet** | `SkillList.tsx`, `weaponBonuses.ts` (W.P. dice bonus), `levelUpSkillSummary.ts` |

**Status:** ✅ Creation · ✅ Spawn · ✅ Live quick roll & Morphus modifiers · Level-up summary via `resolveLiveSkillRollTarget()`

---

## 7. Dice resolution rules

| Pool | When rolled | Block ids (examples) |
|------|-------------|------------------------|
| Facade H.P. (Nightbane) / character H.P. | Tab 5 Roll Pending | `hp` |
| Facade S.D.C. (Nightbane) / character S.D.C. | Tab 5 Roll Pending | `sdc` |
| P.P.E. | Tab 5 Roll Pending | `ppe` (base dice + per-level) |
| I.S.P. | Tab 5 Roll Pending | `isp` |
| Attribute OCC/skill dice | Tab 5 Roll Pending | `attr_*` |
| Morphus H.P. | Tab 6 Traits (dual form) | `morphus_hp` |
| Morphus S.D.C. | Tab 6 Traits | `morphus_sdc` (+ trait dice) |

**Running total:** `flatBaseline + Σ(entered dice)` per block (`pendingDiceBlockRunningTotal()`).

**Scope filter:** `filterPendingDiceBlocksByScope('primary' | 'morphus')` — `primary` scope = default / single-form dice.

---

## 8. Implementation gaps (intentional tracking)

Update this table when closing gaps.

| Area | Ledger (Phase A) | Live sheet (Phase E) | Notes |
|------|------------------|----------------------|-------|
| APM full stack | ✅ Skills + mBase + traits | ✅ `resolveCharacterMaxApm()` | `CharacterContext.attacksPerMelee.max` |
| Combat bonuses | ✅ Full hints | ✅ `computeSheetCombatDerived()` via `liveStatEngine` | Strike/parry/dodge on HUD |
| Morphus passive bundle | ✅ Preview | ✅ `morphusPassiveBridge` | Active play middleware |
| Perception stat line | ✅ Combat block + exceptional | — | `buildCreationPerceptionLine()` |
| P.P.E. `+20` flat | ✅ Flat column | Commit uses dice+PE+flat | `parseVitalFormulaFlatIntegerTerm()` |
| Level-up stat bumps | — | Partial | Not creation ledger scope |
| Live saves / HF | ✅ Creation ledger | ✅ `computeSaveProfile()` + `horror_factor_flat` stack | Attribute-only saves via engine |
| Weapon / unarmed strike | ✅ Creation ledger | ✅ `weaponBonuses` / `strikeEngine` via `liveStatEngine` | |
| Legacy auto-roll vitals | — | ✅ `spawnFinalVitality` via `vitalStatEngine` | Manual dice path is primary |

---

## 9. Code map (canonical modules)

| Responsibility | Primary module(s) |
|----------------|-------------------|
| **Ledger snapshot orchestrator** | `src/lib/creationLiveLedger.ts` → `buildCreationLiveLedgerSnapshot()` |
| Character attribute lines | `buildCreationAttributeBlock()` |
| Morphus attribute lines | `src/lib/morphusCreationLedger.ts` → `buildMorphusCreationAttributeBlock()` |
| Morphus R.C.C. base | `nightbane_base_morphus.json`, `buildMorphusCreationBasePassiveModifiers()` |
| Trait S.D.C. / passive | `morphusPassiveBridge.ts`, `morphusCharacteristicAggregation.ts` |
| **Stat engine hub** | `creationStatEngine.ts` — Tier 1/Tier 2 for all stats |
| **Live play adapter** | `liveStatEngine.ts` — Phase E sheet/HUD/combat/saves/HF |
| **Skill % adapter** | `liveSkillEngine.ts` — creation + live skill % via stat-engine I.Q. |
| **Skill % core** | `skillPercentResolution.ts`, `skillEquation.ts` |
| **Vitals compiler** | `vitalStatEngine.ts` — schema formula → Tier 2 inputs |
| **Vitals display/parse** | `ledgerVitalFormula.ts` — formula strings, hints, tooltips |
| **Legacy auto-roll vitals** | `spawnFinalVitality.ts` — delegates to `vitalStatEngine` (Pillar 5 manual path is primary) |
| Pending / spawn dice | `spawnDiceBlocks.ts`, `spawnVitalityManual.ts` |
| Exceptional attributes | `attributeBonuses.ts` |
| APM core + live stack | `meleeCombat.ts` → `resolveAttacksPerMelee()`, `resolveCharacterMaxApm()` |
| Hand-to-Hand accumulation | `utils/combatCalculator.ts` |
| Saves display & additive UI | `saveProfile.ts`, `saveRollDisplay.ts`, `attributeSaves.ts`, `nightbaneBecomingSave.ts`, `opposedRollRules.ts`, `buildCreationSavesBlock()` |
| Skill physical mods | `skillPhysicalBonuses.ts`, `ledgerStatBonuses.ts` |
| Live passive merge | `featureEngine.ts` |
| UI — creation ledger | `src/components/creation/LiveLedger.tsx` |
| UI — roll entry | `PendingDiceResolutionPanel.tsx`, `CreationFinalizeDice.tsx` |
| UI — live saves | `src/components/live/SavingThrowsPanel.tsx` |
| UI — combat APM | `CombatHUD.tsx` ← `CharacterContext.attacksPerMelee` |

---

## 10. Change protocol

1. **Rules change** — Update this spec first (or in the same PR).
2. **Implement** — Adjust the mapped module(s) in §9.
3. **Tests** — `creationLiveLedger.test.ts`, `morphusCreationLedger.test.ts`, `spawnDiceBlocks.test.ts`, domain-specific `*.test.ts`.
4. **Sub-specs** — If the change is movement-only or M.D.C.-only, update the sub-spec and add a cross-link here.

When `vision.md` pillars conflict with a rulebook nuance, flag to the user and document the **encoded** behavior here (the app is a calculator, not an arbiter of RAW debates).

---

## Appendix A — Quick formula index

<details>
<summary>Character / Facade (expand)</summary>

**Attributes:** Pool + Race + OCC + Skills + misc

**Vitals:** HP `PE+1D6/lv` · SDC Race+OCC+Skills · PPE Race+OCC · ISP if psychic

**Saves:** Attr>16 + Race + OCC + Skills + misc

**APM:** `2 + HtH + Race + OCC + Skills + misc`

</details>

<details>
<summary>Morphus (expand)</summary>

**Attributes:** pAttr + mBase + traits + mSkills + misc

**Vitals:** mHP `mPE×2+2D6/lv` · mSDC `pSDC+2D6×10+traits` · PPE shared · mHF mBase+traits

**Saves:** mBase + mAttr>16 + traits (Mind Control immune)

**APM:** `2 + mBase + HtH + mSkills + traits + misc`

</details>
