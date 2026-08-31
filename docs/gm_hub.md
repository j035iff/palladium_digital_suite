# Gamemaster Hub (v1)

Local-only table workspace for running a session from this machine. It is a **sophisticated calculator and orchestrator**, not a VTT and not a video game that plays Palladium for the table.

**Not in v1:** player-device join, QR / LAN WebSocket server, Tauri/Electron, Plot wiki, item push, Creation-Forge-named GM factory.

Related: [vision.md](./vision.md) · [master_flow.md](./master_flow.md) · [app_viewport_launcher.md](./app_viewport_launcher.md) · [ingest/encounters.md](./ingest/encounters.md) · [unified_paths.md](./unified_paths.md)

---

## Viewport

Launcher **Campaigns** opens an existing table in `GmHubShell` (`viewport: 'gm'`). **New Campaign** opens the Campaign Creation Forge (`viewport: 'campaign_forge'`); confirming **Yes** creates the table and enters the hub. Campaign records persist in `localStorage` (`pds:gmSession:*`) independently of character saves.

The hub header **title is the campaign name**. Host genre and conversion rules stay in the subtitle. When a play session is open, the subtitle also shows the player-facing join name.

### Campaign vs play session

A **campaign** is the persistent table created in the Campaign Creation Forge (`GmSessionRecord.name`, `hostGenreId`, `conversionPolicy`). Switch campaigns from the launcher **Campaigns** menu — Sessions does not list other campaigns.

A **play session** is a joinable sitting under that campaign (`playSessions[]`, `activePlaySessionId`). **Open Session** lives in the hub header under **Return to launcher**. Players see:

`{campaign name}: {session date}`

example: `Harbor Watch: August 30, 2026`

If that label is already used, the stamp adds local time. **Close Session** ends the live sitting so another can open. LAN / QR transport is still not wired; `session.hello` carries `campaignName`, `sessionName` (player label), and `playSessionId` for a future listener.

Old campaign saves missing `playSessions` hydrate to `[]` / `null` on load.

### Campaign Creation Forge

Option registry: `src/lib/gm/campaignForge.ts`. v1 Identity: unique name + host genre. v1 Rules: **Conversion rules** (`disable_non_native` | `apply_conversion`), baked in at create. Sessions does not edit this. Future campaign options are new `CampaignForgeOptionDef` rows (and a renderer `kind` if needed). Do not fork a second campaign-create form. Extra groups can become UFNE tabs later.

Confirm: **Yes** commits; **Not yet** returns to the forge with the draft intact.

## Workspaces

Story / Combat master modes match the live character sheet. Home is mode-specific; **Party** and **Cast** are the same panels under both modes (not forked).

| Mode | Home | Shared tabs |
|------|------|-------------|
| **Story** | Sessions landing (scratchpad, conversion rules) | Party, Cast |
| **Combat** | Combat HUD (initiative, APM, Quick-Blocks, H.F.) | Party, Cast |

Switching Story ↔ Combat returns to that mode’s Home, same as the character sheet. Campaigns are still switched from the launcher.

Deferred tab names **Forge** / **Plot** are omitted so they do not collide with Character Creation Forge.

## Conversion policy

Chosen in the Campaign Creation Forge (**Conversion rules**) and stored on the campaign. Session-wide, view-model only (`genreTransformer` + `hostGenreId`). Not editable on Sessions.

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

JSON envelopes live in `src/lib/gm/sessionMessages.ts` (`v: 1`). No transport is wired. A desktop listener can adopt these payloads without changing the campaign record shape. Bind join to `activePlaySessionId` / `gmHelloPayloadFromCampaign`.

## Implementation map

| Concern | Location |
|---------|----------|
| Session record + mutators | `src/lib/gm/sessionTypes.ts`, `sessionModel.ts` |
| Campaign forge registry | `src/lib/gm/campaignForge.ts` |
| Play sessions | `src/lib/gm/playSession.ts`, `openPlaySession` / `closePlaySession` in `sessionModel.ts` |
| Persistence | `src/lib/gm/sessionPersistence.ts` |
| Party observer (Pillar 9) | `src/lib/gm/partyObserver.ts` |
| Combat roster | `src/lib/gm/combatRoster.ts` |
| Fodder spawn | `src/lib/gm/npcInstance.ts` |
| Protocol | `src/lib/gm/sessionMessages.ts` |
| Campaign forge | `src/lib/gm/campaignForge.ts`, `src/components/gm/CampaignCreationForge.tsx` |
| React | `src/context/GmSessionContext.tsx`, `src/components/gm/*` |
