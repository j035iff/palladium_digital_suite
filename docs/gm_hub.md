# Gamemaster Hub (v1)

Local-only table workspace for running a session from this machine. It is a **sophisticated calculator and orchestrator**, not a VTT and not a video game that plays Palladium for the table.

**Not in v1:** player-device join, QR / LAN WebSocket server, Tauri/Electron, Plot wiki, item push, Creation-Forge-named GM factory.

Related: [vision.md](./vision.md) · [master_flow.md](./master_flow.md) · [app_viewport_launcher.md](./app_viewport_launcher.md) · [ingest/encounters.md](./ingest/encounters.md) · [unified_paths.md](./unified_paths.md)

---

## Viewport

Launcher **Gamemaster Hub** sets `CharacterContext.viewport` to `'gm'` and renders `GmHubShell`. Sessions persist in `localStorage` (`pds:gmSession:*`) independently of character saves.

## Workspaces

| Tab | Role |
|-----|------|
| **Sessions** | Create/open a table. `hostGenreId` is immutable. Scratchpad auto-saves. Cross-genre policy. Passive matrix in the margin. |
| **Party** | Add spawned local characters. Observer cards run the live stat / save / combat pipeline with Facade/Morphus as a **view mode**. Saves are never written. |
| **Cast** | Spawn encounter archetypes as fodder instances (H.P., S.D.C., APM, notes). |
| **Combat** | Initiative sort, NPC APM ledger, Adversary Quick-Blocks (math-in strike), H.F. emit + recorded saves. |

Deferred tab names **Forge** / **Plot** are omitted so they do not collide with Character Creation Forge.

## Conversion policy

Session-wide, view-model only (`genreTransformer` + `hostGenreId`):

| Policy | Behavior in v1 |
|--------|----------------|
| `disable_non_native` | Native scale kept. Host-illegal assets lock (`isHostGenreLocked`). No structural M.D.C. ↔ S.D.C. mapping. |
| `apply_conversion` | Same lockout today. Banner states structural conversion is **not implemented yet**. Character JSON is still not mutated. |

## Combat rules (v1)

- Physical d20 in, bonus out (Pillar 5). Hub prints the strike total; players contest on their own sheets (no parry round-trip).
- GM taps **NPC** APM only. Party APM pips are display-only (player-managed; device sync later).
- **Lock initiative** greys out d20 fields with an explanation; Unlock is a visible GM override (Total GM Agency).
- **New melee round** refills NPC APM, increments the round, clears the live H.F. emit, unlocks initiative.
- **Emit H.F.** records the save target and party pass/fail icons. It does **not** auto-spend player APM or apply book penalties.

## Future LAN

JSON envelopes live in `src/lib/gm/sessionMessages.ts` (`v: 1`). No transport is wired. A desktop listener can adopt these payloads without changing the session record shape.

## Implementation map

| Concern | Location |
|---------|----------|
| Session record + mutators | `src/lib/gm/sessionTypes.ts`, `sessionModel.ts` |
| Persistence | `src/lib/gm/sessionPersistence.ts` |
| Party observer (Pillar 9) | `src/lib/gm/partyObserver.ts` |
| Combat roster | `src/lib/gm/combatRoster.ts` |
| Fodder spawn | `src/lib/gm/npcInstance.ts` |
| Protocol | `src/lib/gm/sessionMessages.ts` |
| React | `src/context/GmSessionContext.tsx`, `src/components/gm/*` |
