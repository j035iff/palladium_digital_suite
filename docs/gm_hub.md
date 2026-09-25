# Gamemaster Hub (v1)

Local-only table workspace for running a session from this machine. It is a **sophisticated calculator and orchestrator**, not a VTT and not a video game that plays Palladium for the table.

**Not in v1 (still deferred):** internet/cloud relay, Plot wiki, item push, Creation-Forge-named GM factory, structural M.D.C.↔S.D.C. conversion, production Tauri/Electron packaging polish.

**Shipped (client join first slice):** interim same-WiFi `ws` listen on the GM machine, short join code + QR, same-SPA **Join table** viewport, interacting sheet (initiative / H.F. save / PC APM over the wire), `party.snapshot` attach from the joiner. Production desktop WebSocket sidecar is **not** shipped — join chrome greys that path with an explicit why (Radical Visibility).

Related: [vision.md](./vision.md) · [master_flow.md](./master_flow.md) · [app_viewport_launcher.md](./app_viewport_launcher.md) · [join-table-flow.md](./join-table-flow.md) (target simple LAN Join Table UX) · [ingest/encounters.md](./ingest/encounters.md) · [unified_paths.md](./unified_paths.md)

---

## Viewport

Launcher **Campaigns** opens an existing table in `GmHubShell` (`viewport: 'gm'`). **New Campaign** opens the Campaign Creation Forge (`viewport: 'campaign_forge'`); confirming **Yes** creates the table and enters the hub. **Join table** opens `GmJoinTableViewport` (`viewport: 'join_table'`) on a second device — clients never load `pds:gmSession:*`. Campaign records persist in `localStorage` (`pds:gmSession:*`) on the **GM machine only**, independently of character saves.

The hub header **title is the campaign name**. Host genre and conversion rules stay in the subtitle. When a play session is open, the subtitle also shows the player-facing join name.

### Campaign vs play session

A **campaign** is the persistent table created in the Campaign Creation Forge (`GmSessionRecord.name`, `hostGenreId`, `conversionPolicy`). Switch campaigns from the launcher **Campaigns** menu — Sessions does not list other campaigns.

A **play session** is a joinable sitting under that campaign (`playSessions[]`, `activePlaySessionId`). **Open Session** lives in the hub header under **Return to launcher**. Players see:

`{campaign name}: {session date}`

example: `Harbor Watch: August 30, 2026`

If that label is already used, the stamp adds local time. **Close Session** ends the live sitting, stops the join listener, and clears seats. `session.hello` carries `campaignName`, `sessionName` (player label), and `playSessionId`.

Old campaign saves missing `playSessions` hydrate to `[]` / `null` on load.

### Campaign Creation Forge

Option registry: `src/lib/gm/campaignForge.ts`. v1 Identity: unique name + host genre. v1 Rules: **Conversion rules** (`disable_non_native` | `apply_conversion`), baked in at create. Sessions does not edit this. Future campaign options are new `CampaignForgeOptionDef` rows (and a renderer `kind` if needed). Do not fork a second campaign-create form. Extra groups can become UFNE tabs later.

Confirm: **Yes** commits; **Not yet** returns to the forge with the draft intact.

## Workspaces

Story / Combat master modes match the live character sheet. Home is mode-specific; **Party**, **Cast**, and **Gear** are the same panels under both modes (not forked).

| Mode | Home | Shared tabs |
|------|------|-------------|
| **Story** | Sessions landing (scratchpad, conversion rules) | Party, Cast, Gear |
| **Combat** | Combat HUD (initiative, APM, Quick-Blocks, H.F.) | Party, Cast, Gear |

Switching Story ↔ Combat returns to that mode’s Home, same as the character sheet. Campaigns are still switched from the launcher.

**Gear tab:** mounts the shared [Gear Forge](./forge/gear_forge.md) shell (`kind: 'gm'`). Grant target is a **party** character’s local save inventory (write-back via `gmCharacterInventoryGrant`). Party observer still does not mutate saves for vitals/overlays. Cast Quick-Blocks have no inventory — the Gear tab shows why Cast cannot receive grants. Do not fork a GM-only forge shell.

Deferred tab names **Forge** / **Plot** are omitted so they do not collide with Character Creation Forge.

## Conversion policy

Chosen in the Campaign Creation Forge (**Conversion rules**) and stored on the campaign. Session-wide, view-model only (`genreTransformer` + `hostGenreId`). Not editable on Sessions.

| Policy | Behavior in v1 |
|--------|----------------|
| `disable_non_native` | Native scale kept. Host-illegal assets lock (`isHostGenreLocked`). No structural M.D.C. ↔ S.D.C. mapping. |
| `apply_conversion` | Same lockout today. Banner states structural conversion is **not implemented yet**. Character JSON is still not mutated. |

## Combat rules (v1)

- Physical d20 in, bonus out (Pillar 5). Hub prints the strike total; players contest on their own sheets (no parry round-trip).
- GM taps **NPC** APM only. Party APM pips are display-only (player-managed). Joined clients may **report** PC APM spends over the wire; the hub logs them and does **not** auto-spend or change roster pips.
- **Lock initiative** greys out d20 fields with an explanation; Unlock is a visible GM override (Total GM Agency). Lock state is broadcast to joined clients.
- **New melee round** refills NPC APM, increments the round, clears the live H.F. emit, unlocks initiative (and clears client H.F. UI).
- **Emit H.F.** records the save target and party pass/fail icons. It does **not** auto-spend player APM or apply book penalties. Joined clients may submit H.F. saves with a physical d20 on their device.

## Client join (interim same-WiFi)

Target simple LAN Join Table UX (Open Table / Join Session discovery, campaign-name-only session button, Players in Session tray): [join-table-flow.md](./join-table-flow.md). Shipped path below still uses join code + QR until that story is implemented.

| Piece | Behavior |
|-------|----------|
| Protocol | `src/lib/gm/sessionMessages.ts` (`v: 1`) — `session.join` / `welcome` / `leave` / `closed` / `presence` / `kick`, plus existing combat + `party.snapshot` |
| Authority | GM host remains source of truth for `GmSessionRecord`; presence is **ephemeral in-memory** on the host (not in campaign JSON) |
| Token | **Rotate-on-open** join token when listen starts; short code + QR carry it |
| Reconnect | Same `deviceId` reclaims the seat for the life of the sitting; Close Session clears seats |
| Character attach | Joiner sends `party.snapshot`; host caches JSON for the sitting and runs the **same** party observer pipeline. Host “Add from this machine” remains as fallback |
| Transport | Interim Node `ws` relay: `npm run gm:ws-host` (Vite dev auto-starts it). Target production path: desktop WS sidecar — greyd until shipped (`DESKTOP_WS_HOST_SHIPPED`) |
| UI | Host chrome on `GmHubShell`; client `viewport: 'join_table'` from launcher **Join table** |

Envelope `sessionId` = campaign id; room key for join = `playSessionId` from hello.

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
| Gear grant (party save) | `src/lib/gear/gmGearForgeHost.ts`, `gmCharacterInventoryGrant.ts`, `src/components/gm/GmGearPanel.tsx` |
| Protocol | `src/lib/gm/sessionMessages.ts` |
| Presence / join token | `src/lib/gm/sessionPresence.ts`, `sessionJoinCode.ts` |
| Host / client runtime | `src/lib/gm/sessionHostRuntime.ts`, `sessionClientRuntime.ts`, `gmHostListenController.ts` |
| Interim WS relay | `scripts/gm-interim-ws-host.mjs`, `src/lib/gm/browserWsTransport.ts` |
| Joiner character cache | `src/lib/gm/sessionPartyCache.ts` |
| Campaign forge | `src/lib/gm/campaignForge.ts`, `src/components/gm/CampaignCreationForge.tsx` |
| React | `src/context/GmSessionContext.tsx`, `src/components/gm/*` (`GmJoinHostChrome`, `GmJoinTableViewport`) |
