# Character Spawn: Finalization & Sheet Handoff

## Overview

This specification covers **what happens when the player commits a new character** — after the [Character Creation Forge](./forge/character_creation.md) Tab 9 gates pass and the user confirms the spawn modal. It is distinct from in-forge editing (Continue, yellow/red repair) and from [app launch](./app_viewport_launcher.md).

**Terminology:** Nightbane UI labels **Facade** and **Morphus**. Persisted save JSON uses `character.primary` and `character.morphus` (`ActiveForm`: `'primary' | 'morphus'`).

**Pre-handoff (Tabs 5–9, still reversible until modal confirm):**

- **Tab 5 — Roll Pending:** Resolve primary / Facade / single-form pending dice; **Continue** commits primary vitality via `commitVitalityFromPendingDice()` and related helpers.
- **Tab 6 — Traits (Nightbane):** Morphus vitality dice and Sub-Forge finalize when applicable.
- **Tab 7 — Abilities:** Mandatory magic / psionic / talent budget satisfied.
- **Tab 8 — Gear:** Optional starting gear via Gear Forge (`kind: 'creation'`).
- **Tab 9 — Review & Spawn:** **Select alignment** (required for spawn even if skipped on Tab 1). **Spawn Character** enabled when `assessTab9SpawnBlockers` returns no blockers.

**Irreversible step:** Confirming the spawn modal calls `finalizeCharacter()` → `applySpawnSheetHandoff()`.

---

## Confirmation Modal

- **Trigger:** Active **Spawn Character** on Tab 9 (`CreationReviewFinalize`).
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
- **`physicalSkillModsApplied: true`** — primary attribute flats from physical skills were baked at spawn; live passive skill staging keys are omitted to avoid double-count.
- **`isFinalized: true`** — hides creation chrome; enables full play layout (combat sidebar resize, armory, inventory blocks).

**Not cleared on spawn:** Creation-phase fields (`creationForgeCompleted`, pool assignments, `selectedAbilities`, etc.) may remain on the persisted JSON for audit/history unless a future serializer strips them. UI treats finalized records as play sheets only.

---

## Post-Handoff UI (`MainLayout`)

| `isFinalized` | Behavior |
|---------------|----------|
| `false` | Renders `CreationFlowShell` (Forge: Identity tab + eight step tabs) at the top of the creation viewport (global header hidden) |
| `true` | Hides Forge; shows live sheet **Persistent Core** (Identity → Stats…Gear strip + quick-ref/XP → **Campaigns \| Combat** mode switch), with shared overlay tabs via `LiveSheetTabBody`. Mode switch opens that mode's Home: Campaigns (forever name-keyed pills + per-campaign PPTN/Notes wiki) or `CombatHUD`. |

Level-up queue and XP rituals activate when `isFinalized` and O.C.C. XP table floors exist.

---

## Persistence & Save Loop

Spawn **does not** auto-write to disk until Confirm (then one handoff write so Open Character can find the sheet). After that, the live sheet uses **explicit Save** only:

1. Header **Save** (`saveCharacter`) — `serializeCharacterRootForSave(rawCharacter)` strips runtime-only flags (`isHostGenreLocked`, etc.) per [master_flow.md](./master_flow.md) §2; stamps `schemaVersion`. Merges the live gear session (`inventory` block: carried items, equipped armor id, primary/secondary weapon slot ids, ammo reserves) before write.
2. `saveCharacterToStorage` — writes pristine JSON keyed by character `id`.
3. Index refresh for launcher **Open Character** list.
4. Dirty tracking (`src/lib/liveSheetSave.ts`) compares the would-be save fingerprint to the last Save; Persistent Core shows Saved / Unsaved + Save. Portal leave with unsaved edits → dialog (Save / Continue without saving).

Live-sheet edits (identity, notes, gear, vitality, etc.) stay in memory until Save — **no auto-persist** after `isFinalized`. While joined at a table, the same Save also flushes `party.snapshot` to peers (dirty edits do not live-push the seated snapshot). Creation **Save for Later** remains its own explicit draft write.

**Rule:** The save file stores the character in **`creationGenreId` native layout** without host-derived transforms. Reloading applies `transformCharacterToHostEnvironment` for display.

### Save migration (`characterMigrate.ts`)

On every open/hydrate, `migrateCharacterSave()` runs **before** gameplay hydration:

| Concern | Behavior |
|---------|----------|
| Persist-field renames | e.g. `facade` → `primary`, legacy forge tab ids |
| Catalog ID remaps | `CATALOG_ID_REMAPS` (race / occ / morphusTrait / skill / ability) — always applied (idempotent) |
| Orphan detection | Unresolvable catalog ids after remap → reported (`console.info`); load continues |
| Version stamp | `schemaVersion` → `CHARACTER_SAVE_SCHEMA_VERSION` |

**When renaming a catalog id:** add an entry to `CATALOG_ID_REMAPS` (map to new id, or `null` to drop list/slot refs).  
**When renaming a persisted Character field:** add a versioned step and bump `CHARACTER_SAVE_SCHEMA_VERSION`.  
Additive catalog fields (e.g. new `naturalAr`) do not need a save migrator — they resolve live by id.

---

## Spawn Blockers (Tab 9)

`assessTab9SpawnBlockers` (`characterCreationForge.ts`) composes:

- `assessCreationSpawnBlockers` — dice completeness, vitality commit, and related readiness checks.
- **Alignment** — non-empty `character.primary.alignment` after trim.
- **Identity** — name / identity profile requirements when applicable.

Blockers render on Tab 9; spawn button stays disabled until resolved.

(`assessTab8SpawnBlockers` / `assessTab7SpawnBlockers` are deprecated aliases for `assessTab9SpawnBlockers`.)

---

## Relationship to Forge Tab 9

| Phase | Document |
|-------|----------|
| Tab availability, alignment UI, summary, Continue N/A | [forge/character_creation.md](./forge/character_creation.md) Tab 9 |
| Pending dice (Tabs 5–6), abilities (Tab 7), gear (Tab 8) | [forge/character_creation.md](./forge/character_creation.md) Tabs 5–8 |
| Modal + `applySpawnSheetHandoff` + sheet mode | This document |

---

## Implementation References

| Concern | Location |
|---------|----------|
| Tab 9 UI & modal | `src/components/creation/CreationReviewFinalize.tsx` |
| Spawn blockers | `src/lib/forgeNavigation/characterCreationForge.ts` — `assessTab9SpawnBlockers` |
| Readiness checks | `src/lib/creationReadiness.ts` |
| Handoff engine | `src/lib/spawnSheetHandoff.ts` |
| Finalize entry | `src/context/CharacterContext.tsx` — `finalizeCharacter` |
| Vitality commit | `commitVitalityFromPendingDice`, `pendingDiceLedger` |
| Tests | `src/lib/spawnSheetHandoff.test.ts` |
| Save serialization | `src/lib/characterSave.ts` |
