# Join Table — simple LAN flow

Most simple version of the Join Table user story. This is the target LAN UX story for same-WiFi sit-downs; it is not a guarantee that every shipped control label matches today.

**Assumptions**

- Anyone on the same Wi-Fi can see and join any active session on the network without restriction
- GM and Players are all on the same Wi-Fi
- GM has already created a Campaign for the session
- Player has a character native to the GM Campaign’s genre **or** will create one from Join Table (Create new character / save-for-later draft)

Related: [gm_hub.md](./gm_hub.md) · [app_viewport_launcher.md](./app_viewport_launcher.md)

---

## Flow

### 1. GM and Player launch the App

They land on the Launcher Landing Page.

#### 1a. GM — start from Campaigns

- GM opens the **Campaigns** drop-down and selects the Campaign to start
- Campaign Interface opens
- Top of the main page shows an **Open Table** button

#### 1b. Player — Join Table

Player clicks **Join Table** and sees a page with:

1. **Player Name**
   - Text box for the **player** name (not character name)
   - Visible to everyone in the session
2. **My Characters**
   - Character drop-down: **spawned** characters **and** in-progress **save-for-later** forge drafts (drafts labeled `[Draft]`)
   - Defaults to **“Select a character”** — Player cannot join until a real character is selected
   - **Create new character** — pick a setting → blank draft is saved and selected; after Join Session the shared Character Creation Forge opens (same forge path as the launcher — no fork)
   - Player selects their character (complete or draft)
3. **Join Session**
   - Populates any sessions available on the network
   - No session yet → “no session available”
   - When a session exists → show its name (**GM Campaign name** only)
   - Browse always polls this device’s interim listener **`GET /discover`** (never the Advanced GM IP field). Discover UDP-beacons the LAN, TCP-probes ARP + `/24` peers (including browser-visible LAN hints for WSL/VPN), and if still empty the client probes the same `/24` over browser TCP — the plane Advanced IP already uses. Players keep their own device/app so **My Characters** stays local.
   - If Player Name or Character is missing → section tells them they must enter name + select character before joining
   - If browse cannot find the GM → Advanced short code + GM Wi‑Fi IP (Radical Visibility **failure mode only** — not the happy path)

### 2. GM clicks Start Session

(Narrative Hub also names the top control **Open Table**; treat **Open Table** / **Start Session** as the host action that publishes the sitting.)

- Makes the session visible and joinable on Join Table for any client on the network
- Open Table chrome matches real listen/publish state (stale stamps from a prior visit are cleared on campaign open; listen failure rolls the stamp back)
- A tray opens under the button: **Players in Session**
  - Dynamic list of players currently in the session
  - Updates as players join and leave
  - Compact Hub: control label becomes **Table Open**; click expands a hover overlay (Close Table inside; leaving the zone collapses). Host Advanced code/QR is not shown on Hub this pass.

### 3. Player joins

- Session appears as a button on Join Session (campaign name only — **no date/time**)
- Button greyed out until player name + character are set
- Player clicks → dialog **“Joining Session”**
- On success, dialog closes → Player is taken to their **Character Sheet** (spawned) **or** **Character Creation Forge** (draft / Create new)

### 4. GM sees the joiner

- Player name appears in **Players in Session**
  - Yellow + **“joining”** while connecting
  - Green, no “joining” text, once fully joined
- GM **Narrative → People** tab blinks (and/or **PCs** sub-tab when already on People → NPCs); if the GM is on Combat, the Narrative mode control pulses
- GM opens Narrative → People → PCs → **At the table** sees the player’s character sheet summary with the **player name** upper-right on each joined character box
- Each At-the-table card has a **Messages** section (compose + thread) for private notes with that seated player; the GM can also **Create Group Chat** (pick seated players + optional title) for a shared thread. The player sees a **Messages** tray (1:1 GM + groups) on their joined sheet/forge chrome. Campaign history cards are summary-only (no comment field).
- Opening Narrative → People → PCs clears the blink
- **At the table** lists **joined players only**; GM adds local-machine characters as **NPCs** under People → NPCs (“Add from this machine”)
- **Campaign history** (same PCs tab) lists unique **spawned** characters that have ever joined this campaign; drafts at the table stay out of history until Review & Spawn; seated history rows are greyed with “currently at table”
- Combat **Melee** adds those characters into the round via dropdowns (same People data — no Combat People tab)

### 5. Leave

- GM **Return to launcher** with a table open → confirm → **Close Table** (unpublish + stop listen) → launcher
- Joined player **Return to launcher** (Join table or live-sheet exit icon) → confirm → detach (`session.leave`) → launcher
- Leave/kick removes the seat and clears that character from PCs / joiner cache (no phantom Missing saves)
