# UI & Wireframe Specifications

> **Implementation status:** Live sheet has a sticky **Story / Combat** mode switch above shared **Home · Stats · Saves · Skills · Abilities · Gear** tabs (`MainLayout`, `LiveSheetTabBody`). Switching modes always opens that mode's Home. Story Home currently provides persistent play Notes; Combat Home renders `CombatHUD` (APM + Initiative, Unarmed/Ancient/Modern bubbles — Unarmed label is the active Hand-to-Hand style; no duplicate S.D.C./H.P. bars — those stay on the Persistent Core). Identity, XP, vitality, and defensive chips stay anchored across both modes. **Abilities** nests **Natural · O.C.C. · Magic · Psionics · Talents**; empty categories are omitted. Cast / duration / pump workflow remains **target UX**. Toast system and tap-to-expand attributes remain **target UX**.

This document defines the layout, visual hierarchy, and interaction design for the Palladium Digital Suite character sheet. It adheres to the Visual Continuity and Intuitive Depth pillars, ensuring that the interface is robust for power users while remaining clean and anchored to prevent disorientation.
1. The Persistent Core (Anchored Elements)
These elements are "anchored" to specific screen coordinates and do not move when switching between Default and Combat states. This provides a consistent frame of reference for the player.
A. Identity Header (Absolute Top)
Experience (XP) Bar: A progress bar tracking the current level's XP band.
Left Edge: Start of current level (e.g., 2,400 XP).
Center: Current Level and Exact Total (e.g., Level 2 | 3,500 XP).
Right Edge: Threshold for next level (e.g., 4,600 XP).
Identity Row: One-line summary containing Name, Race, O.C.C., and Alignment.
Profile Drawer: A tap-activated overlay containing Sex, Age, Height, Weight, and a text-based Character Description.
B. Vitality & Defense Header
Health/Energy Bars: High-visibility progress bars for H.P., S.D.C., and (if applicable) M.D.C., P.P.E., and I.S.P.
Defensive Stats: Small, always-visible indicators for Natural Armor Rating (A.R.), Horror Factor (H.F.), and Perception Modifier.
C. Navigation & Saves (Sides/Bottom)
Saving Throws panel: Standard saves show **vs N** (GM-called base target) and **(+bonus)** to add to d20; hover reveals full breakdown. A separate **attribute-only saves** block covers P.E./M.E. exceptional rows and Save vs Becoming. Horror Factor is a dedicated aura block. Implementation: `SavingThrowsPanel.tsx` — see `combat_logic.md` §4. On the live sheet, Saves is its own tab (`saves`).
Navigation: Sticky mode switch — **Story / Combat** — followed by forge-style pills (`src/lib/liveSheetTabs.ts`, `ForgeNavigationBar`) — **Home, Stats, Saves, Skills, Abilities, Gear**. Mode changes always reset to Home; shared drill-down tabs remain available in either mode. Abilities nests **Natural / O.C.C. / Magic / Psionics / Talents**; empty categories are omitted.
2. The Active Zone: State 1 (Default / Exploration)
Story **Home** currently contains a persistent freeform Notes field. Shared tabs **Stats / Saves / Skills / Abilities / Gear** populate the center one at a time (no long scroll of every section).
A. The Attribute Grid (2x4 Layout)
A structured grid for the 8 primary attributes (I.Q., M.E., M.A., P.S., P.P., P.E., P.B., Spd).
Numbers highlight in Green/Red if "Current Value" differs from "Base Value."
Tap-to-Expand: Shows the specific bonuses provided by that attribute (e.g., P.P. 20 shows +3 to Strike/Parry/Dodge).

B. Physical Feats & Socials Panel
Movement Hub: Displays ground, swim, and fly speed (MPH and Yards per Melee per `docs/movement_engine_spec.md`). Also includes calculated leaping distances (standing/running, horizontal/vertical).
Social Dashboard: Percentages for Trust/Intimidate (M.A. based) and Charm/Impress (P.B. based).
Lifting/Carrying: Max weight capacities based on P.S. and P.E.
3. The Active Zone: State 2 (Combat / Action)
Triggered via the **Combat mode** switch, this state opens Combat Home and shows tactical data while keeping the Core Anchors and shared tab bar in place.
A. Combat category bubbles
The Unarmed bubble **label** is the active Hand-to-Hand style (`Hand to Hand: EXPERT`, `NONE`, …). **Initiative** sits in the APM header (hover math). Three category bubbles — Unarmed (HtH name) / **Ancient Weapon** / **Modern Weapon** — show collapsed strike/parry/damage for the currently selected item. Empty weapon bubbles stay visible and **grayed** with a Gear-tab explanation (never hidden). A carried firearm still fills Modern even when the host genre has no modern W.P. rows (e.g. a Nightbane **rifted** into Palladium Fantasy) — the slot stays usable, with a short “brought from another world” note. Simple W.P. glyphs (fist / sword / rifle / whip / …) identify type — not a looter-shooter art pack.
**Expand** (one bubble at a time): Unarmed shows remaining combat-sheet totals (not Initiative), punch/kick/specials, dice, and a style picker when the character owns more than one HtH skill (same list as the Skills tab). Weapon expands include a picker of all carried Gear weapons of that era plus the full strike card (modes, ammo, traits, dice).
B. APM & Hand-to-Hand Tracker
APM Tracker: Remaining pips are tappable. Each tap spends **1** A.P.M. (left → right). Spent pips are not toggles — **New melee round** is the only refill. Multi-cost maneuvers (untrained Hand-to-Hand, power punch) = one tap per action. Implementation: `CombatHUD` `ApmPipRow`.
Hand-to-Hand Dashboard: style name replaces the Unarmed bubble title; punch/kick/specials live in the Unarmed expand. Owned styles also list on the **Skills** tab (not as percentile `SkillList` rows).

**Current Combat Home:** `CombatHUD` `layout="panel"` — tap-to-spend APM + Initiative, Unarmed (HtH name) / Ancient / Modern bubbles, apply damage/heal, narrative log. S.D.C./H.P. bars stay on the Persistent Core (unified field still later). One-tap ready-weapon icon strip is still later polish.
4. Visual Transition & Continuity Rules
Anchoring: If a stat (like H.P. or I.Q.) is visible in both states, it MUST NOT change position on the screen.
The "Toast" System: Temporary changes (e.g., gaining +2 P.S. from a spell) appear as floating text "toasts" over the affected stat before fading.
Logic Transparency: Any calculated number can be tapped to reveal the underlying math (Attribute + Skill + Bonus).
