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

### Creation ledger resolution (Pillar 9 — one source, many views)

**Status:** `partial` (Facade + Morphus attributes + vitality gather-first; combat/saves stacks wired)  
**Related spec:** `docs/stat_engine_spec.md`, `docs/unified_paths.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Canonical row | `src/lib/ledgerRowResolution.ts` | `ResolvedLedgerRow`, `LedgerContribution`, `sumResolvedRowTotal` | Single gather pass per stat; contributions are source of truth |
| Attribute resolution | `src/lib/resolveCreationLedgerContext.ts` | `resolveFacadeAttributeRows`, `resolveMorphusAttributeRows` | Facade resolves first; Morphus builds on Facade totals |
| Vitality resolution | `src/lib/resolveVitalityLedgerRows.ts` | `resolveVitalityLedgerRows` | Contributions-first gather for H.P., S.D.C., P.P.E., I.S.P., Morphus vitals |
| Bundle | `src/lib/spawnDiceBlocks.ts` | `buildCreationLedgerResolutionBundle` | Live Ledger + Review tab share one bundle |
| Context assembly | `src/lib/resolveCreationLedgerContext.ts` | `resolveCreationLedgerContext`, `resolveCreationLedgerBundle` | Merges attribute + vitality rows; projects pending blocks |
| Projections | `src/lib/ledgerRowResolution.ts` | `projectFacadeAttributeLine`, `projectMorphusAttributeLine`, `projectVitalityLine`, `projectDiceGroups`, `projectPendingDiceBlockFromRow`, `resolveStackLedgerRow`, `projectStackLine` | Views only — never re-gather |
| Stack rows (combat/saves) | `src/lib/creationLiveLedger.ts` | `projectCombatStackLine`, `saveLineWithAttribution` | Saves + combat lines project from `resolveStackLedgerRow` |

**Modes / variants:**

- **Facade attributes / vitals:** `formScope: 'facade'`
- **Morphus attributes / vitals:** `formScope: 'morphus'`; Morphus dice isolated from Facade dice sub-rows
- **Review tab:** `PendingDiceBlock` is a projection via `projectPendingDiceBlockFromRow`, not a parallel model

**Extension guide:**

1. Add sources as `LedgerContribution` entries in a resolver — not in UI or tooltip formatters.
2. Add UI surfaces as projection functions alongside existing `project*` helpers.
3. Prefer `buildCreationLedgerResolutionBundle` over ad-hoc `buildPendingDiceBlocks` + separate row math.
4. Facade row must resolve before Morphus row when Morphus uses a Facade base (`facade_base` contribution).

**Tests:** `src/lib/ledgerRowResolution.test.ts`, `src/lib/resolveCreationLedgerContext.test.ts`, `src/lib/resolveVitalityLedgerRows.test.ts`

---

### Live Ledger — creation preview rows

**Status:** `complete` (Facade + Morphus parity)  
**Related spec:** `docs/stat_engine_spec.md`, `docs/live_ledger.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Math | `src/lib/creationStatEngine.ts` | `buildCreationStatStack`, `statStackTotal`, `resolveExceptionalDisplayValue` | Single stack model for attributes, vitals, saves, combat, exceptional, APM |
| Row assembly | `src/lib/ledgerLineBuilder.ts` | `buildCreationLedgerLine`, `buildFacadeAttributeLedgerLine`, `buildVitalityLedgerLineFromBlock`, `buildStackBonusLedgerLine`, `buildExceptionalStackLedgerLine`, `buildFlatSourceLedgerLine`, `buildNaturalArmorLedgerLine` | All sections produce `CreationLedgerLine` |
| Tooltip | `src/lib/ledgerLineBuilder.ts` | `formatLedgerTooltip` | **Only** string emitter for live-ledger value tooltips; all rows pass a `LedgerTooltipSpec` through `buildCreationLedgerLine` |
| Vitality formatter | `src/lib/spawnDiceBlocks.ts` | `formatVitalityBlockValueTooltip` | Implementation detail invoked by `vitality_block` spec (Review tab `flatTooltip` uses the same function) |
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
3. Pass a `LedgerTooltipSpec` to `buildCreationLedgerLine` — never pre-build `valueTooltip` strings in orchestrators.
4. Add a `LedgerTooltipSpec` kind only if no existing kind fits; wire it in `formatLedgerTooltip`.
5. If Morphus needs delta highlighting, use `applyMorphusLedgerDiff` with the correct mode — do not add a section-specific diff helper.
6. UI changes belong in `LedgerStatRow` only.
7. **Never set breakdown `hint` text** — flats/constants belong in `valueTooltip`; only `diceGroups` (or short context labels like `Immune`) may appear under the row. `buildCreationLedgerLine` enforces this via `applyLedgerRowDisplayPolicy`.

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
| 2026-07-05 | Vitality gather-first via `resolveVitalityLedgerRows`; combat/saves project through `resolveStackLedgerRow` + `projectStackLine` |
| 2026-07-05 | Vitality pending blocks projected from `ResolvedLedgerRow`; `refreshMorphusAttributeRowsInContext` avoids full bundle rebuild on Morphus ledger |
| 2026-07-05 | Creation ledger resolution layer: `ResolvedLedgerRow` + projections; vitality rows from pending blocks; `buildCreationLedgerResolutionBundle` |
| 2026-07-05 | Tooltip path consolidation: removed parallel `valueTooltip` / `valueTooltipOverride` bypasses; all live-ledger tooltips route through `formatLedgerTooltip` |
| 2026-07-05 | Initial registry: Live Ledger full parity (Pillar 9), stat stack, pending dice, middleware, movement |
