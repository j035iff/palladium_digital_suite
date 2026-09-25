# Join Table — simple LAN flow

Most simple version of the Join Table user story. This is the target LAN UX story for same-WiFi sit-downs; it is not a guarantee that every shipped control label matches today.

**Assumptions**

- Anyone on the same Wi-Fi can see and join any active session on the network without restriction
- GM and Players are all on the same Wi-Fi
- GM has already created a Campaign for the session
- Player has already created a character native to the GM Campaign’s genre

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
   - Same character drop-down as on the Launcher Landing Page
   - Player selects their character
3. **Join Session**
   - Populates any sessions available on the network
   - No session yet → “no session available”
   - When a session exists → show its name (**GM Campaign name** only)
   - If Player Name or Character is missing → section tells them they must enter name + select character before joining

### 2. GM clicks Start Session

(Story also names the top control **Open Table**; treat **Open Table** / **Start Session** as the host action that publishes the sitting.)

- Makes the session visible and joinable on Join Table for any client on the network
- A tray opens under the button: **Players in Session**
  - Dynamic list of players currently in the session
  - Updates as players join and leave

### 3. Player joins

- Session appears as a button on Join Session (campaign name only — **no date/time**)
- Button greyed out until player name + character are set
- Player clicks → dialog **“Joining Session”**
- On success, dialog closes → Player is taken to their **Character Sheet**

### 4. GM sees the joiner

- Player name appears in **Players in Session**
  - Yellow + **“joining”** while connecting
  - Green, no “joining” text, once fully joined
- GM **Party** tab blinks
- GM opens Party → sees the player’s character sheet summary
- Opening Party clears the blink
