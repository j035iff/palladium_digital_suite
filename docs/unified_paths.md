# Unified Path Registry

> **Pillar 9** (`docs/vision.md`) — Facade, Morphus, and dual-form variants are **modes on one pipeline**, not parallel implementations.  
> **Purpose:** Track every consolidated single-path feature so new work extends existing builders instead of forking per-stat or per-form code.

**Update this document** whenever you introduce a new unified pathway or add a stage to an existing one.

---

## When to use a unified path

| Do | Don't |
|----|-------|
| Add a new stat row via the domain's `build*Line` helper | Inline `{ label, value, hint }` objects in orchestrators |
| Pass a **mode** (`facade_relative`, `combat`, `none`) to one diff function | Copy-paste four Morphus-vs-Facade helpers per section |
| Route tooltips through the domain's single dispatcher | Add a one-off `formatFooTooltip` beside the shared formatter |
| Render all rows through one UI row component | Maintain separate "simple" and "extended" row renderers for the same schema |

---

## Entry template

Copy this block when registering a new unified path:

```markdown
### [Feature domain name]

**Status:** `complete` | `partial` | `planned`  
**Related spec:** `docs/…`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Math | | | |
| Assembly | | | |
| Tooltip / diff | | | |
| UI render | | | |
| Orchestration | | | |

**Modes / variants:** …  
**Extension guide:** …
```

---

## Registry

### Live Ledger — creation preview rows

**Status:** `complete` (Facade + Morphus parity)  
**Related spec:** `docs/stat_engine_spec.md`, `docs/live_ledger.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Math | `src/lib/creationStatEngine.ts` | `buildCreationStatStack`, `statStackTotal`, `resolveExceptionalDisplayValue` | Single stack model for attributes, vitals, saves, combat, exceptional, APM |
| Row assembly | `src/lib/ledgerLineBuilder.ts` | `buildCreationLedgerLine`, `buildFacadeAttributeLedgerLine`, `buildVitalityLedgerLineFromBlock`, `buildStackBonusLedgerLine`, `buildExceptionalStackLedgerLine`, `buildFlatSourceLedgerLine`, `buildNaturalArmorLedgerLine` | All sections produce `CreationLedgerLine` |
| Tooltip | `src/lib/ledgerLineBuilder.ts` | `formatLedgerTooltip` | One dispatcher; `LedgerTooltipSpec` kind per stat |
| Morphus diff | `src/lib/morphusCreationLedger.ts` | `applyMorphusLedgerDiff`, `applyMorphusLedgerGroupDiff` | Modes: `facade_relative` (vitals, exceptional), `combat`, `none` (saves pass-through) |
| UI render | `src/components/creation/LedgerStatGrid.tsx` | `LedgerStatRow` (via `LedgerStatGrid`) | One row renderer; sub-row shows **dice groups only**; value hover shows full breakdown |
| Display policy | `src/lib/ledgerLineBuilder.ts` | `applyLedgerRowDisplayPolicy`, `buildCreationLedgerLine` | Strips breakdown hints; merges `pendingBlock.groups` → `diceGroups` |
| Orchestration | `src/lib/creationLiveLedger.ts` | `buildCreationLiveLedgerSnapshot` | Facade and Morphus share section builders; Morphus branch applies diff only |

**Modes / variants:**

- **Facade (primary):** section builders run with primary effective attributes.
- **Morphus:** attribute block from `buildMorphusCreationAttributeBlock`; sections rebuilt with Morphus attrs; diff pass highlights deltas vs Facade.
- **Single-form races:** Morphus stages skipped; no diff pass.

**Extension guide:**

1. Add or extend a stack term in `buildCreationStatStack` (math).
2. Assemble the row through the appropriate `build*LedgerLine` helper — not inline in `creationLiveLedger.ts`.
3. Add a `LedgerTooltipSpec` kind only if no existing kind fits; wire it in `formatLedgerTooltip`.
4. If Morphus needs delta highlighting, use `applyMorphusLedgerDiff` with the correct mode — do not add a section-specific diff helper.
5. UI changes belong in `LedgerStatRow` only.
6. **Never set breakdown `hint` text** — flats/constants belong in `valueTooltip`; only `diceGroups` (or short context labels like `Immune`) may appear under the row. `buildCreationLedgerLine` enforces this via `applyLedgerRowDisplayPolicy`.

**Tests:** `src/lib/ledgerLineBuilder.test.ts`, `src/lib/creationLiveLedger.test.ts`, `src/lib/morphusCreationLedger.test.ts`, `src/lib/creationOccLedger.test.ts`

---

### Stat stack math (core engine)

**Status:** `complete` for creation Live Ledger; live sheet may still have legacy call sites  
**Related spec:** `docs/stat_engine_spec.md` §3

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Stack terms | `src/lib/creationStatEngine.ts` | `buildCreationStatStack`, `StatStackTerm`, `statStackToLedgerLines` | Buckets: `race`, `occ`, `skill`, `hth`, `exceptional`, `trait`, `misc`, … |
| Save attribution | `src/lib/saveProfile.ts` | `creationLedgerSaveModifierAttribution`, `computeHorrorFactorAura` | Per-source breakdown for saves and H.F. |
| Attribute bonuses | `src/lib/attributeBonuses.ts` | `get*Bonuses` | Exceptional (17–30) and super (31+) tables |

**Extension guide:** New modifier sources become stack terms or flat attribution entries — not ad-hoc totals in UI code.

---

### Pending dice & vitality blocks

**Status:** `complete` for creation  
**Related spec:** `docs/stat_engine_spec.md` §3.3, `docs/forge/character_creation.md` Tab 5–6

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Block schema | `src/lib/spawnDiceBlocks.ts` | `buildPendingDiceBlocks`, `PendingDiceBlock`, `pendingDiceBlockRunningTotal` | Shared with Review tab and Live Ledger |
| Vitality formulas | `src/lib/ledgerVitalFormula.ts` | `resolvePpeCreationFormula`, `formatVitalityBlockValueTooltip` | Formula parts + flat terms |
| Ledger row | `src/lib/ledgerLineBuilder.ts` | `buildVitalityLedgerLineFromBlock` | Pending-roll yellow state via `resolveLedgerHasPendingRolls` |

**Modes / variants:** Facade dice (Tab 5), Morphus dice (Tab 6 when dual-form).

---

### Genre middleware (presentation layer)

**Status:** `complete`  
**Related spec:** `docs/vision.md` §Centralized Pipeline Transformation, `docs/master_flow.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Transform | `src/lib/genreTransformer.ts` | (derived view model from save + `hostGenreId`) | UI never computes cross-genre conversions |
| Components | React views | Consume pre-translated payload | "Dumb UI" — Pillar 9 aligned with architecture §3 |

---

### Movement derivation

**Status:** `complete`  
**Related spec:** `docs/movement_engine_spec.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Derivation | `src/lib/movementDerivation.ts` (or `characterDerived.ts`) | Form-gated speed pipelines | Land / swim / fly / leap from one middleware layer |
| UI | Live sheet components | Render final payload only | No inline Spd×5 math in components |

**Modes / variants:** `activeForm` gates which attribute pool feeds movement.

---

## Planned / partial paths

Track work here until promoted to the registry above.

| Domain | Gap | Target unified entry |
|--------|-----|----------------------|
| Live sheet combat HUD | Some strike/damage rows may bypass `creationStatEngine` stacks | Reuse stack + tooltip pattern from Live Ledger where schemas match |
| Skill percent display | Master Equation in `skill_selection.md` | Single `buildSkillPercentLine` when creation sheet gets parity rows |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-05 | Initial registry: Live Ledger full parity (Pillar 9), stat stack, pending dice, middleware, movement |
