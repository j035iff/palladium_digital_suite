# App Viewport & Launcher (Gate Check)

## Overview

This specification covers **application bootstrap and session initialization** — what happens before (and outside) the Character Creation Forge. It is **not** part of character creation proper; it is the top-level **Gate Check** that chooses whether the user loads an existing record or starts a new build.

Related docs:

- [Master flow — runtime pipeline](./master_flow.md) (ingest → `hostGenreId` → `genreTransformer` → UI)
- [Character Creation Forge](./forge/character_creation.md) (Identity tab + eight step tabs, after **Create Character**)
- [Character spawn handoff](./character_spawn_handoff.md) (lock-in after Tab 8)

---

## Viewport Model

The shell uses a binary viewport switch (`CharacterContext.viewport`):

| Viewport | UI | Entry |
|----------|-----|--------|
| `launcher` | `AppLauncher` (`src/components/dashboard/AppLauncher.tsx`) | App boot; **Return to launcher** from sheet header |
| `sheet` | `MainLayout` — live sheet + optional creation chrome | **Open Character** or **Create Character** |

`App.tsx` renders `AppLauncher` when `viewport === 'launcher'`, otherwise `MainLayout`.

---

## Vector A: Open Character

**Purpose:** Resume a saved character in play mode (or review a finalized sheet).

1. **Index read** — `listSavedCharacters()` builds rows from local storage (`src/lib/characterIndex.ts`).
2. **Presentation** — Dropdown and recent portrait cards label each row as **`Character Name — [creationGenreId]`** (formatted slug).
3. **Selection** — `loadSavedCharacter(id)`:
   - Loads raw JSON via `loadCharacterSave`.
   - Hydrates root stamps (`id`, `creationGenreId`, `hostGenreId`) with `hydrateCharacterFromStorage` / `ensureCharacterRoot`.
   - If vitality was not committed at save time, may run `syncRaceOccPrimarySdc` for consistency.
   - Sets viewport to `sheet`; does **not** enter a blank creation template.
4. **Runtime display** — The active `character` object exposed to React is **`transformCharacterToHostEnvironment(rawCharacter, hostGenreId)`** (`src/utils/genreTransformer.ts`). Saves remain in **native** `creationGenreId` layout; host-only flags (e.g. `isHostGenreLocked`) are derived at read time and stripped on save (see [master_flow.md](./master_flow.md) §2).

**`hostGenreId` on load:** Taken from the save file. The player may change host environment later via sheet header controls (`setHostGenreId`) without mutating `creationGenreId`.

---

## Vector B: Create Character

**Purpose:** Start a new, unfinalized character bound to a chosen setting.

1. **Genre menu** — `LAUNCHER_CREATE_OPTIONS` (`src/data/genres.ts`) lists playable genres from `GENRE_MANIFEST` plus roadmap rows (`playable: false`, visible but not selectable).
2. **Selection** — `startCreation(genreId)` when `isGenreId(genreId)`:
   - `createBlankCharacterForGenre(genreId)` — blank `primary` / `morphus` form branches, placeholder O.C.C., Forge Tab 1 active, `isFinalized: false`.
   - Sets **`creationGenreId`** and initial **`hostGenreId`** to the chosen genre (immutable creation stamp vs active host context).
   - Applies `genreSupernaturalAbilitiesDisallowed` from manifest via psychic gate bypass on the blank record.
   - Viewport → `sheet`; creation chrome visible (`MainLayout` shows `CreationFlowShell` while `isFinalized !== true`).
3. **Downstream** — User completes the [Character Creation Forge](./forge/character_creation.md); spawn is specified in [character_spawn_handoff.md](./character_spawn_handoff.md).

### Genre manifest flags

| Field | Effect at creation start |
|-------|---------------------------|
| `genreSupernaturalAbilitiesDisallowed: true` | Psychic Gate tab Black (bypassed); supernatural O.C.C.s filtered in configurator; ability picks disabled |
| `playable: false` | Shown in launcher; cannot call `startCreation` |

---

## UX Requirements (Pillar alignment)

- **Radical visibility:** Roadmap genres remain visible but clearly non-selectable.
- **Megaversal bridge:** `creationGenreId` is stamped at creation and preserved in saves; `hostGenreId` may diverge for cross-setting play.
- **No hidden launcher paths:** Only Open vs Create (GM session host override is future work per master_flow).

---

## Implementation References

| Concern | Location |
|---------|----------|
| Launcher UI | `src/components/dashboard/AppLauncher.tsx` |
| Viewport switch | `src/App.tsx`, `CharacterContext` (`startCreation`, `loadSavedCharacter`, `returnToLauncher`) |
| Genre manifest | `src/data/genres.ts` — `GENRE_MANIFEST`, `LAUNCHER_CREATE_OPTIONS` |
| Blank character root | `src/lib/characterRoot.ts` — `createBlankCharacterForGenre` |
| Save index | `src/lib/characterIndex.ts` |
| Host middleware | `src/utils/genreTransformer.ts` |
| Persistence | `src/lib/characterSave.ts` — `serializeCharacterRootForSave` |
