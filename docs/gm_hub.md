# Gamemaster Hub (v1)

Local-only table workspace for running a session from this machine. It is a **sophisticated calculator and orchestrator**, not a VTT and not a video game that plays Palladium for the table.

**Not in v1 (still deferred):** internet/cloud relay, Plot wiki, item push, Creation-Forge-named GM factory, structural M.D.C.↔S.D.C. conversion, production Tauri/Electron packaging polish.

**Shipped (client join):** interim same-WiFi `ws` listen on the GM machine, LAN `/sessions` discovery, **Open Table** (one-click publish = open sitting + start listen), compact Hub chrome (**Table Open** expands a hover **Players in Session** overlay — yellow joining / green joined; **Close Table** inside the panel), Advanced join code / QR / manual listen **hidden on Hub this pass** (transport + listen stay intact), same-SPA **Join table** viewport (name + characters + Join Session list → Character Sheet handoff + `party.snapshot` on join; Advanced code/IP remains on the player Join Table viewport as failure fallback), interacting sheet combat wire (initiative / H.F. save / PC APM), Narrative → People → PCs blink when a seat fully joins (clears on open People/PCs). Hub mode chrome reads **Narrative** / **Combat** (internal `hubMode: 'story'` unchanged). Production desktop WebSocket sidecar is **not** shipped — capability reasons remain on the listen pipeline (Radical Visibility).

Related: [vision.md](./vision.md) · [master_flow.md](./master_flow.md) · [app_viewport_launcher.md](./app_viewport_launcher.md) · [join-table-flow.md](./join-table-flow.md) (target simple LAN Join Table UX) · [ingest/encounters.md](./ingest/encounters.md) · [unified_paths.md](./unified_paths.md)

---

## Viewport

Launcher **Campaigns** opens an existing table in `GmHubShell` (`viewport: 'gm'`). **New Campaign** opens the Campaign Creation Forge (`viewport: 'campaign_forge'`); confirming **Yes** creates the table and enters the hub. **Join table** opens `GmJoinTableViewport` (`viewport: 'join_table'`) on a second device — clients never load `pds:gmSession:*`. Campaign records persist in `localStorage` (`pds:gmSession:*`) on the **GM machine only**, independently of character saves.

The hub header **title is the campaign name**. Host genre and conversion rules stay in the subtitle. When a table is open, the subtitle notes **Table open**.

### Compact Hub chrome (desktop-first)

Top nav only — **no bottom bar**. Layout (`GmHubShell`):

| Zone | Contents |
|------|----------|
| Title block | **GAMEMASTER HUB** + campaign name; Narrative / Combat mode toggle (internal `story` / `combat`); lane-specific tabs (`GmTabBar`) — Narrative: Story Beats / People / Places / Things / Notes; Combat: Melee / Prefabs |
| Top-right icons | Shared `PortalChromeActions`: **Return to launcher** + **Settings** (gear). Units (**Standard / Metric**) live in Settings only — not a header toggle |
| Table control | Closed → orange **Open Table** (publish). Open → violet **Table Open** (expands Players overlay; does not re-publish) |
| Players overlay | `GmJoinHostChrome` — absolute overlay under the table control; Kick per seat; **Close Table** only inside the panel. Stays open while the pointer is in the control+panel zone; leaving collapses. Advanced code / QR / Start–Stop listen UI is **not surfaced** on Hub this pass |

Main content fills below the header. People (PCs / NPCs) is Narrative-only; Melee adds from the same data via dropdowns (Pillar 9) — do not fork pipelines or put People on Combat.

### Campaign vs play session

A **campaign** is the persistent table created in the Campaign Creation Forge (`GmSessionRecord.name`, `hostGenreId`, `conversionPolicy`). Switch campaigns from the launcher **Campaigns** menu — Sessions does not list other campaigns.

A **play session** is a joinable sitting under that campaign (`playSessions[]`, `activePlaySessionId`). **Open Table** is the header table control — one click that stamps the sitting **and** starts the LAN listener. When open, the same control reads **Table Open** and expands the **Players in Session** overlay (`GmJoinHostChrome`). Internally the sitting still uses a date-stamped `playerLabel` for event-log / collision uniqueness; Join Session browse shows **campaign name only**.

If that label is already used, the stamp adds local time. **Close Table** (inside the Players overlay, or via Return-to-launcher confirm) ends the live sitting, stops the join listener, clears seats, and detaches joined party snapshots (no phantom `Missing saves`). Opening a campaign clears any **stale** open-sitting stamp left from a prior hub visit so **Open Table** matches real LAN publish state. If Open Table’s listen start fails, the stamp rolls back. `session.hello` carries `campaignName`, `sessionName` (player label), and `playSessionId`.

**Return to launcher:** With a table open, GM Hub confirms then **Close Table** before leaving. A joined player (Join Table viewport or live-sheet exit icon) confirms then sends `session.leave` / detaches before returning to the launcher.

Old campaign saves missing `playSessions` hydrate to `[]` / `null` on load.

### Campaign Creation Forge

Option registry: `src/lib/gm/campaignForge.ts`. v1 Identity: unique name + host genre. v1 Rules: **Conversion rules** (`disable_non_native` | `apply_conversion`), baked in at create. Sessions does not edit this. Future campaign options are new `CampaignForgeOptionDef` rows (and a renderer `kind` if needed). Do not fork a second campaign-create form. Extra groups can become UFNE tabs later.

Confirm: **Yes** commits; **Not yet** returns to the forge with the draft intact.

## Workspaces

Narrative / Combat master modes match the live character sheet mode split (GM chrome labels **Narrative**; internal id stays `hubMode: 'story'`). Each mode has its **own top-tab set** (not shared Home/Characters/Gear).

| Mode | Top tabs |
|------|----------|
| **Narrative** (`story`) | **Story Beats** (content-linked pad) · **People** (PCs / NPCs — former Characters) · **Places** (stub) · **Things** (notes stub + Gear) · **Notes** (scratchpad + content links) |
| **Combat** | **Melee** (combat HUD + add-from-People dropdowns) · **Prefabs** (stub) |

Switching Narrative ↔ Combat resets to that lane’s default first tab (**Story Beats** / **Melee**). Campaigns are still switched from the launcher.

### People (Narrative only)

| Sub-tab | Contents |
|---------|----------|
| **PCs** | Joined player seats only (`GmPartyPanel`) |
| **NPCs** | Local-machine characters (GM-run) + encounter fodder / Quick-Blocks (`GmCastPanel`) — “Add from this machine” stays here |

Do **not** put People on Combat and do **not** navigate to People from Combat. Melee selects from the same party / NPC data via dropdowns (`meleeEngagement.ts` → shared `assembleGmCombatRoster`).

### Melee add-from-People

Combat roster is **opt-in**: GM picks joined PCs and local/fodder NPCs from Melee dropdowns (lists built from People data). Engagement ids live on `combat.meleeCharacterIds` / `combat.meleeNpcInstanceIds`. Remove drops engagement only — People management is unchanged.

### Notes content links (v1)

While writing on any **Narrative notes-like surface**, the GM inserts outbound in-app links (`[[kind:id|label]]`) that jump to placeholder or live targets. Surfaces share one editor pipeline (`GmContentLinkedNotesField`): **Notes** scratchpad, **Story Beats**, **Places / Things / People** stub notes, note stubs, and cast/NPC notes. **Primary authoring:** type `@` (Cursor-like mentions) → filter existing places / NPCs / PCs / things / people / note stubs → pick one → the structured link is stored as `[[…]]` but **rendered as the clickable label** (Familiar Surface — never show engine ids as the primary UX). **Insert link…** remains a fallback on scratchpad-density fields; hand-typed `[[…]]` still parses but is not the taught UX. Person stubs are a notes page that links to real cast on **People → NPCs** (not a second sheet). No match / missing targets offer **Create?** to make a stub, then link (Radical Visibility). Broken links stay visible with why-text. Backlinks / wiki graph are deferred.

| Kind | Navigate to |
|------|-------------|
| `npc` | Narrative → People → NPCs (live fodder **or** Notes-link stub) |
| `pc` | Narrative → People → PCs (joined seat **or** Notes-link stub) |
| `person` | Narrative → People (person stub lane) |
| `place` | Narrative → Places |
| `thing` | Narrative → Things → Notes stub |
| `note` | Narrative → Notes (optional note stubs) |

Navigation uses one shared Hub navigator (`hubNavigation.ts` + context `navigateHubTarget`): People / narrative kinds always force Narrative (never open People from Combat). Do not fork Story vs Combat link handlers.

**Things → Gear:** mounts the shared [Gear Forge](./forge/gear_forge.md) shell (`kind: 'gm'`). Grant target is a character save on the table (write-back via `gmCharacterInventoryGrant`). Party observer still does not mutate saves for vitals/overlays. Encounter Quick-Blocks have no inventory — the Gear sub-tab shows why they cannot receive grants. Do not fork a GM-only forge shell.

Deferred tab names **Forge** / **Plot** are omitted so they do not collide with Character Creation Forge.

## Conversion policy

Chosen in the Campaign Creation Forge (**Conversion rules**) and stored on the campaign. Session-wide, view-model only (`genreTransformer` + `hostGenreId`). Not editable on Sessions.

| Policy | Behavior in v1 |
|--------|----------------|
| `disable_non_native` | Native scale kept. Host-illegal assets lock (`isHostGenreLocked`). No structural M.D.C. ↔ S.D.C. mapping. |
| `apply_conversion` | Same lockout today. Banner states structural conversion is **not implemented yet**. Character JSON is still not mutated. |

## Combat rules (v1)

- Physical d20 in, bonus out (Pillar 5). Hub prints the strike total; players contest on their own sheets (no parry round-trip).
- Melee roster is opt-in via dropdowns populated from Narrative → People data (joined PCs + local/fodder NPCs). Add/remove engagement does not fork party or NPC pipelines.
- GM taps **NPC** APM only. Party APM pips are display-only (player-managed). Joined clients may **report** PC APM spends over the wire; the hub logs them and does **not** auto-spend or change roster pips.
- **Lock initiative** greys out d20 fields with an explanation; Unlock is a visible GM override (Total GM Agency). Lock state is broadcast to joined clients.
- **New melee round** refills NPC APM, increments the round, clears the live H.F. emit, unlocks initiative (and clears client H.F. UI). Melee engagement lists persist across rounds until removed.
- **Emit H.F.** records the save target and party pass/fail icons. It does **not** auto-spend player APM or apply book penalties. Joined clients may submit H.F. saves with a physical d20 on their device.

## Client join (interim same-WiFi)

Target simple LAN Join Table UX (Open Table / Join Session discovery, campaign-name-only session button, Players in Session overlay, player Join Session list → Character Sheet, People/PCs blink): [join-table-flow.md](./join-table-flow.md). Host Open Table + discovery + player Join Session list + Narrative → People → PCs blink on full join are shipped. Host Advanced code/QR is hidden on Hub this pass (listen still runs under Open Table). Player Join Table keeps Advanced code/IP as failure fallback.

| Piece | Behavior |
|-------|----------|
| Protocol | `src/lib/gm/sessionMessages.ts` (`v: 1`) — `session.join` / `welcome` / `leave` / `closed` / `presence` / `kick`, plus existing combat + `party.snapshot` |
| Authority | GM host remains source of truth for `GmSessionRecord`; presence is **ephemeral in-memory** on the host (not in campaign JSON) |
| Seat status | `joining` → `connected` (wire name for fully joined) → optional `reconnecting`; join completes on character attach (`party.snapshot`). Tray tone helpers + Join Session gate: `sessionPresence.ts`, `sessionJoinGate.ts` |
| People blink | Ephemeral hub flag (`partyBlink.ts`): set when `seatFlippedToFullyJoined`; cleared when GM opens Narrative → People → PCs or Close Table. Tab chrome only — same `buildPartyObserverSlice` / `GmPartyPanel` |
| Discovery | Interim host **`GET /sessions`** (local rooms) + **`GET /discover`** (UDP beacon on **8766** + ARP-assisted TCP `/24` peer probe, accepting browser `lanHint` query params). Client `listLanSessions` always browses the **local** sidecar (Advanced IP does not rebind browse), passes WebRTC LAN hints, and falls back to an in-browser `/24` `/sessions` probe so listing succeeds whenever direct TCP to the GM would. List display identity is **campaign name only**. Closed/unlist when host stops listen. Advanced code/IP is Radical Visibility **failure mode only**. |
| Token | **Rotate-on-open** join token when listen starts; short code + QR generation remains on the host runtime (Hub UI hides Advanced this pass; player Join Table keeps code/IP fallback) |
| Reconnect | Same `deviceId` reclaims the seat for the life of the sitting; Close Table clears seats |
| Character attach | Happy-path Join Session sends `party.snapshot` on join (pre-selected character); host caches JSON for the sitting and runs the **same** party observer pipeline. **People → PCs** shows **joined seats only** (player name upper-right on each card). Local “Add from this machine” lives on **People → NPCs** (same `addPartyMember` pipeline — local seats are NPCs, not PCs) |
| Transport | Interim Node `ws` relay: `npm run gm:ws-host` (Vite dev auto-starts it; Vite `server.host: true` prints a Network URL). Target production path: desktop WS sidecar — greyd until shipped (`DESKTOP_WS_HOST_SHIPPED`). Advertise: `GET /sessions`; LAN browse: `GET /discover` |
| Leave / detach | `session.leave` and kick remove the seat **and** detach that character from party + joiner cache. Close Table / stop listen detaches all seated joiners. Prevents phantom party ids / `Missing saves` |
| UI | Host compact chrome on `GmHubShell`: Narrative/Combat + lane tabs (Story Beats/People/Places/Things/Notes · Melee/Prefabs), Return + Settings icons, **Open Table** / **Table Open** control, **Players in Session** hover overlay + **Close Table** on `GmJoinHostChrome` (Advanced host chrome hidden). Table control helpers: `hubTableChrome.ts`. People/PCs blink via `GmTabBar`. Client `viewport: 'join_table'`: **Player Name** + **My Characters** (default **Select a character** — join gated until chosen) + **Join Session** list (`listLanSessions`); grey + explain until name+character (`resolveJoinSessionGate`); **Joining Session** dialog → Character Sheet handoff (`loadSavedCharacter`). Advanced manual code/IP retained on player Join Table. Shared client runtime: `sessionClientHandle.ts` |

Envelope `sessionId` = campaign id; room key for join = `playSessionId` from hello.

## Implementation map

| Concern | Location |
|---------|----------|
| Scratchpad + Notes links | `contentLinks.ts` (`findActiveMention`, `replaceMentionWithContentLink`), `narrativePlaceholders.ts` (`searchAllLinkableEntities`), `hubNavigation.ts`, `textareaCaretCoords.ts`, `GmNotesScratchpad`, `GmPlaceholderLane` |
| Session record + mutators | `src/lib/gm/sessionTypes.ts`, `sessionModel.ts` |
| Campaign forge registry | `src/lib/gm/campaignForge.ts` |
| Play sessions | `src/lib/gm/playSession.ts`, `openPlaySession` / `closePlaySession` in `sessionModel.ts` |
| Compact table chrome | `src/lib/gm/hubTableChrome.ts` — Open Table / Table Open labels, Players overlay expand/collapse, seat overlay lines |
| Persistence | `src/lib/gm/sessionPersistence.ts` |
| Party observer (Pillar 9) | `src/lib/gm/partyObserver.ts` |
| Combat roster | `src/lib/gm/combatRoster.ts` + `meleeEngagement.ts` (Melee dropdown add/remove) |
| Fodder spawn | `src/lib/gm/npcInstance.ts` |
| Gear grant (party save) | `src/lib/gear/gmGearForgeHost.ts`, `gmCharacterInventoryGrant.ts`, `src/components/gm/GmGearPanel.tsx` (Things → Gear) |
| Protocol | `src/lib/gm/sessionMessages.ts` |
| Presence / join token / join gate | `src/lib/gm/sessionPresence.ts`, `sessionJoinCode.ts`, `sessionJoinGate.ts` |
| People blink | `src/lib/gm/partyBlink.ts` → `GmTabBar` / hub context (clears on Narrative → People → PCs) |
| LAN discovery | `src/lib/gm/sessionDiscovery.ts` + `browserLanHints.ts` (`listLanSessions` → local `/discover` + browser TCP fallback) |
| Join connect / gate | `src/lib/gm/joinSessionConnect.ts`, `sessionJoinGate.ts`, `sessionClientHandle.ts` |
| Host / client runtime | `src/lib/gm/sessionHostRuntime.ts`, `sessionClientRuntime.ts`, `gmHostListenController.ts` |
| Interim WS relay | `scripts/gm-interim-ws-host.mjs` + `scripts/gm-lan-discover.mjs` (`/health`, `/sessions`, `/discover`, UDP beacon), `src/lib/gm/browserWsTransport.ts` |
| Joiner character cache | `src/lib/gm/sessionPartyCache.ts` |
| Campaign forge | `src/lib/gm/campaignForge.ts`, `src/components/gm/CampaignCreationForge.tsx` |
| React | `src/context/GmSessionContext.tsx`, `src/components/gm/*` (`GmHubShell`, `GmJoinHostChrome`, `GmHubSettingsDialog`, `GmJoinTableViewport`) |
