# Stat Engine — Technical Specification (Source of Truth)

This document is the **canonical reference for how character statistics are calculated, stacked, and displayed** in the Palladium Digital Suite. It supersedes formula fragments scattered across older docs.

**Related (not duplicated here):**

| Topic | Document |
|-------|----------|
| Product pillars & GM override philosophy | `docs/vision.md` |
| M.D.C. scaling, P.S. tiers, APM tracker UX | `docs/combat_logic.md` |
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
3. **Physical dice first (Pillar 5)** — Dice formulas appear in hints during creation; values are entered manually on **Tab 5** (primary / Facade dice) and **Tab 6** (Morphus dice when applicable), stored in `creationPendingDiceResolutions` — not auto-rolled.
4. **Primary form before Morphus (Nightbane)** — When building Morphus, primary-form totals are assumed **final** (attributes, skills, and primary vitality dice resolved).
5. **Inspectable stacks** — Live Ledger hints show modifier buckets (`Race`, `OCC`, `HtH`, `traits`, etc.) so GMs can audit math (Pillar 4).
6. **Form scope** — Nightbane maintains separate primary and Morphus attribute/vitality pools where the rules require it; some pools are **shared** (see §5). Single-form races use the primary pool only.

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
| **Race** | Racial bonuses | `src/data/content/races/*.json` → `innateBonuses`, `vitals` |
| **OCC** | O.C.C. / R.C.C. bonuses | `src/data/content/occs/<genre>/*.json` → static + variable resolutions |
| **Skills** | Physical (and other) skill combat/stat mods | `skills/*.json`, `aggregateSkillPhysicalBonuses()` |
| **HtH** | Hand-to-Hand progression | Hand-to-hand catalog → `accumulateHandToHandBonuses()` |
| **Pool** | Attribute pool assignment | `creationAttributeAssignments` |
| **mBase** | Nightbane Morphus R.C.C. base package | `src/data/content/morphus/forge/nightbane_base_morphus.json` |
| **traits** | Active Morphus characteristic picks | `morphusTraitSlotResolutions` → `resolveActiveMorphusTraits()` |
| **mSkills** | Skill modifiers that apply **only** on Morphus (e.g. trait-granted skills Facade lacks) | Same skill engine, Morphus-only skill id set |
| **misc** | Catch-all: talents, gear, bursts, stance, GM overrides | `featureEngine`, future systems |

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

### 4.1 Attributes

```
Attr = Pool + Race + OCC + Skills + misc
```

- **Pool** — Dice pool assignment on the attribute strip.
- **OCC variable dice** — Resolved on Spawn into flat adds (`creationOccVariableResolutions`).
- **Implementation:** `buildCreationAttributeBlock()`, `buildCreationAttributes()`, `resolveLedgerEffectiveAttributes()`.
- **Status:** ✅ Creation ledger · ✅ Spawn attribute dice · ✅ Sheet after handoff

### 4.2 Exceptional bonuses

Derived from **current** attribute scores (not separate inputs).

- Standard table: 17–30 (`meStyleStepBonus`, I.Q. skill %, etc.)
- Super band: 31+ where defined

**Implementation:** `src/lib/attributeBonuses.ts`, `buildCreationExceptionalStandardBlock()`, `buildCreationExceptionalSuperGroups()`.

**Status:** ✅ Ledger · ✅ Saves/combat attribution · Partial on live sheet

### 4.3 Vitals

| Stat | Formula (default / Nightbane) | Dice entry (forge tab) |
|------|------------------------------|------------------|
| **H.P.** | Race: `PE + 1D6/level` (Nightbane Facade) | Tab 5 |
| **S.D.C.** | Race flat/dice + OCC dice + skill dice | Tab 5 |
| **P.P.E.** | Race + OCC engine (`ppeEngine.baseFormula` + `perLevelFormula`) | Tab 5 |
| **I.S.P.** | OCC `ispEngine` when psychic tier ≠ none | Tab 5 |
| **H.F.** | Race + OCC + traits (play) | Usually flat |
| **Natural A.R.** | Race + OCC + trait `naturalAr` stacking | Flat |

**Nightbane Facade P.P.E. example:** `PE (Facade) + 3D6×10 + 20 (+ 3D6/level)` — P.E. term always uses **Facade** P.E. even on the Morphus ledger toggle.

**Implementation:** `ledgerVitalFormula.ts`, `buildCreationVitalsBlock()`, `buildPendingDiceBlocks()`, `computeSpawnVitalityFromResolutions()`.

**Status:** ✅ Ledger preview · ✅ Pending dice blocks · ✅ Commit on Tab 5–6 Continue · ✅ Flat integer terms in formulas (e.g. `+20` on P.P.E.) in ledger flat column

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

### 5.1 Attributes

```
mAttr = pAttr + mBase + traits + mSkills + misc
```

**mBase attribute bumps** (from `nightbane_base_morphus.json`): P.S. +10, P.E. +10, P.P. +6, Spd +10; supernatural P.S. tier.

**Polymorphic trait mods** — Percent, dice, flat, min floors: `morphusPolymorphicResolver.ts`, `collectMorphusStatModifierBlocks()`.

**Implementation:** `buildMorphusCreationAttributeBlock()`, `applyNightbaneMorphusBaseAttributes()`.

**Status:** ✅ Ledger · ✅ Morphus base apply on forge · ✅ Trait mins at Morphus finalize

### 5.2 Vitals

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

## 6. Skill percentages (reference)

Not re-derived here — see `docs/skill_selection.md`:

```
Final % = [Base + (PerLevel × (EffLevel − 1))] + OCC + IQ% + synergies + attr scaling + status
```

**Implementation:** `resolveSkillPercent()`, `projectCreationSkillsToSheet()` at spawn.

**Status:** ✅ At spawn · Level-up summary in `levelUpSkillSummary.ts`

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
| Combat bonuses | ✅ Full hints | ✅ OCC + mBase via `computeSheetCombatDerived()` | Strike/parry/dodge on HUD |
| Morphus passive bundle | ✅ Preview | ✅ `morphusPassiveBridge` | Active play middleware |
| Perception stat line | ✅ Combat block + exceptional | — | `buildCreationPerceptionLine()` |
| P.P.E. `+20` flat | ✅ Flat column | Commit uses dice+PE+flat | `parseVitalFormulaFlatIntegerTerm()` |
| Level-up stat bumps | — | Partial | Not creation ledger scope |

---

## 9. Code map (canonical modules)

| Responsibility | Primary module(s) |
|----------------|-------------------|
| **Ledger snapshot orchestrator** | `src/lib/creationLiveLedger.ts` → `buildCreationLiveLedgerSnapshot()` |
| Character attribute lines | `buildCreationAttributeBlock()` |
| Morphus attribute lines | `src/lib/morphusCreationLedger.ts` → `buildMorphusCreationAttributeBlock()` |
| Morphus R.C.C. base | `nightbane_base_morphus.json`, `buildMorphusCreationBasePassiveModifiers()` |
| Trait S.D.C. / passive | `morphusPassiveBridge.ts`, `morphusCharacteristicAggregation.ts` |
| Vitals formulas | `ledgerVitalFormula.ts`, `creationVitalityPreview.ts` |
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
