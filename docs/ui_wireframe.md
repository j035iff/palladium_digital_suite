# UI & Wireframe Specifications

> **Implementation status:** Mixed. Identity header, attributes, saves panel, combat HUD, and form theming are partially implemented. Toast system, full tap-to-expand everywhere, and Destiny-style weapon HUD polish are **target UX** — see `src/components/` for current coverage.

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
Saving Throws panel: Standard saves show **vs N** (GM-called base target) and **(+bonus)** to add to d20; hover reveals full breakdown. A separate **attribute-only saves** block covers P.E./M.E. exceptional rows and Save vs Becoming. Horror Factor is a dedicated aura block. Implementation: `SavingThrowsPanel.tsx` — see `combat_logic.md` §4.
Navigation Rail: Quick-access icons for Skills, Magic/Abilities, Inventory, and the "Combat Toggle" button.
2. The Active Zone: State 1 (Default / Exploration)
This state populates the center of the screen with information required for non-combat roleplay and world navigation.
A. The Attribute Grid (2x4 Layout)
A structured grid for the 8 primary attributes (I.Q., M.E., M.A., P.S., P.P., P.E., P.B., Spd).
Numbers highlight in Green/Red if "Current Value" differs from "Base Value."
Tap-to-Expand: Shows the specific bonuses provided by that attribute (e.g., P.P. 20 shows +3 to Strike/Parry/Dodge).

B. Physical Feats & Socials Panel
Movement Hub: Displays ground, swim, and fly speed (MPH and Yards per Melee per `docs/movement_engine_spec.md`). Also includes calculated leaping distances (standing/running, horizontal/vertical).
Social Dashboard: Percentages for Trust/Intimidate (M.A. based) and Charm/Impress (P.B. based).
Lifting/Carrying: Max weight capacities based on P.S. and P.E.
3. The Active Zone: State 2 (Combat / Action)
Triggered via the Combat Toggle, this state swaps the center panel for tactical data while keeping the Core Anchors in place.
A. Weapon HUD (Icon-Based Interaction)
Inspired by the Destiny 2 weapon swap UI, this area shows the "Active" weapon and "Ready" alternatives.
Active Slot: Large icon (Sword, Bow, Rifle silhouette) showing the final Strike, Parry, and Damage bonuses. Includes a tap-down for "Philip the Rune Sword" style special abilities.
Ammo Counter: Integrated into the icon for ranged weapons (Arrows, E-Clip count).
Ready Slots: Smaller icons below the active slot for "One-Tap Swap" to other equipped weapons.
B. APM & Hand-to-Hand Tracker
APM Tracker: A series of checkable icons representing "Actions Per Melee." Users tap an icon to "spend" an action during the round.
Hand-to-Hand Dashboard: Displays the current H.T.H. style (Basic, Expert, Martial Arts) and the base damage modifiers for kicks, punches, and special moves (e.g., Leap Kick).
4. Visual Transition & Continuity Rules
Anchoring: If a stat (like H.P. or I.Q.) is visible in both states, it MUST NOT change position on the screen.
The "Toast" System: Temporary changes (e.g., gaining +2 P.S. from a spell) appear as floating text "toasts" over the affected stat before fading.
Logic Transparency: Any calculated number can be tapped to reveal the underlying math (Attribute + Skill + Bonus).
