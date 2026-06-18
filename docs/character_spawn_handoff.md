# Character Spawn: Finalization & Sheet Handoff

## Overview

This specification covers **what happens when the player commits a new character** — after the [Character Creation Forge](./forge/character_creation.md) Tab 8 gates pass and the user confirms the spawn modal. It is distinct from in-forge editing (Continue, yellow/red repair) and from [app launch](./app_viewport_launcher.md).

**Terminology:** Nightbane UI labels **Facade** and **Morphus**. Persisted save JSON uses `character.primary` and `character.morphus` (`ActiveForm`: `'primary' | 'morphus'`).

**Pre-handoff (Tabs 5–8, still reversible until modal confirm):**

- **Tab 5 — Roll Pending:** Resolve primary / Facade / single-form pending dice; **Continue** commits primary vitality via `commitVitalityFromPendingDice()` and related helpers.
- **Tab 6 — Traits (Nightbane):** Morphus vitality dice and Sub-Forge finalize when applicable.
- **Tab 7 — Abilities:** Mandatory magic / psionic / talent budget satisfied.
- **Tab 8 — Review & Spawn:** **Select alignment** (required for spawn even if skipped on Tab 1). **Spawn Character** enabled when `assessTab8SpawnBlockers` returns no blockers.

**Irreversible step:** Confirming the spawn modal calls `finalizeCharacter()` → `applySpawnSheetHandoff()`.

---

## Confirmation Modal

- **Trigger:** Active **Spawn Character** on Tab 8 (`CreationReviewFinalize`).
- **Copy:** Warns that creation-level framework choices will lock; offers **Go back** or confirm spawn.
- **Presentation:** `MainLayout` may show a brief spawn splash (~1.5s) before invoking finalize (cosmetic only).

---

## Handoff Pipeline (`applySpawnSheetHandoff`)

Implemented in `src/lib/spawnSheetHandoff.ts`; invoked from `CharacterContext.finalizeCharacter`.

### 1. Skill projection

For each form branch (`primary`, `morphus`):

- Merge O.C.C. core skill ids with voucher resolutions (`resolveCreationOccSkillIds`).
- Union with `creationRelatedSkillIds`.
- Build `SheetSkill[]` via `projectCreationSkillsToSheet`:
  - Master Equation / `resolveSkillPercent` with O.C.C. and psychic-tier bonuses (`resolveOccSkillBonusPercent` — Major halves related bonuses).
  - Prerequisite checks → `restricted` + `restrictionReason` when unmet.
  - Morphus impossibility flags when applicable.

### 2. Physical skill modifiers

Per form branch (`finalizeFormBranch`):

- `aggregateSkillModifiers` from selected skill ids.
- Apply attribute deltas (P.S., P.P., P.E., Spd, etc.) to the form’s `attributes`.
- Apply staged **S.D.C.** bonuses to `structuralDamageCapacity` (current capped to new maximum).

### 3. Root flags

- `creationPsychicTier` — normalized via `resolveCreationPsychicTier`.
- **`isFinalized: true`** — hides creation chrome; enables full play layout (combat sidebar resize, armory, inventory blocks).

**Not cleared on spawn:** Creation-phase fields (`creationForgeCompleted`, pool assignments, `selectedAbilities`, etc.) may remain on the persisted JSON for audit/history unless a future serializer strips them. UI treats finalized records as play sheets only.

---

## Post-Handoff UI (`MainLayout`)

| `isFinalized` | Behavior |
|---------------|----------|
| `false` | Renders `CreationFlowShell` (eight-tab Forge) below core sheet sections |
| `true` | Hides Forge; shows finalized banner, **Armory**, **Inventory**; combat HUD sidebar resizable |

Level-up queue and XP rituals activate when `isFinalized` and O.C.C. XP table floors exist.

---

## Persistence & Save Loop

Spawn **does not** auto-write to disk. The player uses header **Save** (`saveCharacter`):

1. `serializeCharacterRootForSave(rawCharacter)` — strips runtime-only flags (`isHostGenreLocked`, etc.) per [master_flow.md](./master_flow.md) §2.
2. `saveCharacterToStorage` — writes pristine JSON keyed by character `id`.
3. Index refresh for launcher **Open Character** list.

**Rule:** The save file stores the character in **`creationGenreId` native layout** without host-derived transforms. Reloading applies `transformCharacterToHostEnvironment` for display.

---

## Spawn Blockers (Tab 8)

`assessTab8SpawnBlockers` (`characterCreationForge.ts`) composes:

- `assessCreationSpawnBlockers` — dice completeness, vitality commit, and related readiness checks.
- **Alignment** — non-empty `character.primary.alignment` after trim.
- **Identity** — name / identity profile requirements when applicable.

Blockers render on Tab 8; spawn button stays disabled until resolved.

(`assessTab7SpawnBlockers` is a deprecated alias for `assessTab8SpawnBlockers`.)

---

## Relationship to Forge Tab 8

| Phase | Document |
|-------|----------|
| Tab availability, alignment UI, summary, Continue N/A | [forge/character_creation.md](./forge/character_creation.md) Tab 8 |
| Pending dice (Tabs 5–6), abilities (Tab 7) | [forge/character_creation.md](./forge/character_creation.md) Tabs 5–7 |
| Modal + `applySpawnSheetHandoff` + sheet mode | This document |

---

## Implementation References

| Concern | Location |
|---------|----------|
| Tab 8 UI & modal | `src/components/creation/CreationReviewFinalize.tsx` |
| Spawn blockers | `src/lib/forgeNavigation/characterCreationForge.ts` — `assessTab8SpawnBlockers` |
| Readiness checks | `src/lib/creationReadiness.ts` |
| Handoff engine | `src/lib/spawnSheetHandoff.ts` |
| Finalize entry | `src/context/CharacterContext.tsx` — `finalizeCharacter` |
| Vitality commit | `commitVitalityFromPendingDice`, `pendingDiceLedger` |
| Tests | `src/lib/spawnSheetHandoff.test.ts` |
| Save serialization | `src/lib/characterSave.ts` |
