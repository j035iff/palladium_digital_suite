# App Viewport & Launcher (Gate Check)

## Overview

**This specification covers application bootstrap and session initialization** — what happens before (and outside) the Character Creation Forge. It is **not** part of character creation proper; it is the top-level **Gate Check** that chooses whether the user loads an existing record, starts a new build, or opens the Gamemaster Hub.

Related docs:

- [Master flow — runtime pipeline](./master_flow.md) (ingest → `hostGenreId` → `genreTransformer` → UI)
- [Character Creation Forge](./forge/character_creation.md) (Identity tab + eight step tabs, after **Create Character**)
- [Character spawn handoff](./character_spawn_handoff.md) (lock-in after Tab 8)

---

## Viewport Model

The shell uses a viewport switch (`CharacterContext.viewport`):

| Viewport | UI | Entry |
|----------|-----|--------|
| `launcher` | `AppLauncher` (`src/components/dashboard/AppLauncher.tsx`) | App boot; **Return to launcher** from sheet header, GM Hub, or Campaign Creation Forge |
| `sheet` | `MainLayout` — live sheet + optional creation chrome | **Open Character** or **Create Character** |
| `campaign_forge` | `CampaignCreationForge` — Identity options + confirm | **New Campaign** on the launcher |
| `gm` | `GmHubShell` — Story / Combat (Home + Party + Cast) | **Campaigns** on the launcher, or **Yes** after Campaign Creation Forge |

`App.tsx` renders `AppLauncher` when `viewport === 'launcher'`, `CampaignCreationForge` when `viewport === 'campaign_forge'`, `GmHubShell` when `viewport === 'gm'`, otherwise `MainLayout`.

GM Hub sessions are a separate local record (not a character save). Spec: [gm_hub.md](./gm_hub.md).

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
   - Clears live session gear: empty inventory, no equipped armor, no ready weapons, empty ammo reserves.
   - Sets **`creationGenreId`** and initial **`hostGenreId`** to the chosen genre (immutable creation stamp vs active host context).
   - Applies `genreSupernaturalAbilitiesDisallowed` from manifest via psychic gate bypass on the blank record.
   - Viewport → `sheet`; creation chrome visible (`MainLayout` shows `CreationFlowShell` while `isFinalized !== true`).
3. **Downstream** — User completes the [Character Creation Forge](./forge/character_creation.md); spawn is specified in [character_spawn_handoff.md](./character_spawn_handoff.md).

**Bootstrap:** While the launcher is showing, `CharacterContext` holds a blank Nightbane placeholder root (`createBlankCharacterForGenre`) — not a seeded demo sheet. Inventory/ammo start empty until the player adds gear (Armory) or equipment handoff exists.

### Genre manifest flags

| Field | Effect at creation start |
|-------|---------------------------|
| `genreSupernaturalAbilitiesDisallowed: true` | Psychic Gate tab Black (bypassed); supernatural O.C.C.s filtered in configurator; ability picks disabled |
| `playable: false` | Shown in launcher; cannot call `startCreation` |

---

## Vector C: Campaigns (Gamemaster Hub)

**Purpose:** Open or start a local GM campaign without loading a character sheet.

1. **Campaigns** — dropdown of persisted tables (`listGmSessions()` / `pds:gmSession:*`). Selecting a row calls `openSession(id)` then `enterGmHub()` → `viewport: 'gm'`.
2. **New Campaign** — button (not a dropdown). Resets the campaign-forge draft and sets `viewport: 'campaign_forge'`.
3. **Campaign Creation Forge** — option registry in `src/lib/gm/campaignForge.ts`. v1 **Identity** (unique name + host genre) and **Rules** (`conversionPolicy` dropdown: Disable non-native / Apply conversion). Roadmap genres stay visible but not selectable. Add later campaign choices as new option rows / renderer `kind`s on this same forge — do not fork a second create form. Extra groups may become UFNE tabs later.
4. **Create Campaign** on the forge is gated until name, genre, and conversion rules validate. Confirm dialog: *Are you sure you want to create a new {Genre} Campaign?* **Yes** commits (`createGmSession` with the chosen conversion policy) and `enterGmHub()`. **Not yet** closes the dialog and leaves the draft editable. Host genre and conversion rules are immutable after create. Hub header `h1` is the campaign name; host genre and conversion rules stay in the subtitle.
5. Hub landing: Story / Combat master tabs (sheet analogue). **Open Session** is in the hub header under **Return to launcher**. Story Home is Sessions (scratchpad, conversion rules). Combat Home is the combat HUD. Party and Cast sit under both modes. Full hub: [gm_hub.md](./gm_hub.md).

---

## UX Requirements (Pillar alignment)

- **Radical visibility:** Roadmap genres remain visible but clearly non-selectable.
- **Megaversal bridge:** `creationGenreId` is stamped at creation and preserved in saves; `hostGenreId` may diverge for cross-setting play.
- **No hidden launcher paths:** My Characters, Create Character, Campaigns, and New Campaign are all on the portal. Roadmap genres stay visible but non-selectable.

---

## Implementation References

| Concern | Location |
|---------|----------|
| Launcher UI | `src/components/dashboard/AppLauncher.tsx` |
| Viewport switch | `src/App.tsx`, `CharacterContext` (`startCreation`, `loadSavedCharacter`, `enterCampaignForge`, `enterGmHub`, `returnToLauncher`) |
| Campaign Creation Forge | `src/lib/gm/campaignForge.ts`, `src/components/gm/CampaignCreationForge.tsx` |
| GM Hub | [gm_hub.md](./gm_hub.md) — `src/components/gm/`, `src/context/GmSessionContext.tsx` |
| Genre manifest | `src/data/genres.ts` — `GENRE_MANIFEST`, `LAUNCHER_CREATE_OPTIONS` |
| Blank character root | `src/lib/characterRoot.ts` — `createBlankCharacterForGenre` |
| Save index | `src/lib/characterIndex.ts` |
| Host middleware | `src/utils/genreTransformer.ts` |
| Persistence | `src/lib/characterSave.ts` — `serializeCharacterRootForSave` |
