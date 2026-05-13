Magic, Psionics, & Abilities: Technical Logic & UI Specification
This document defines the logic for managing supernatural powers, energy consumption, and event-based effect tracking. It prioritizes tactical speed and provides the flexibility required for the Palladium Megaversal system's complex ability scaling.
1. Ability Library: Discovery & Filtering
To accommodate the vast number of spells and powers in the Palladium system, the Ability Drawer utilizes a high-speed filtering interface designed for two-tap execution.
Persistent Search Bar: A text input field anchored at the top of the ability list for immediate keyword lookup.
Filter Categories: Users can toggle views based on:
Level/Tier: (e.g., Spell Levels 1-15, Psionic Disciplines).
Combat Tags: (e.g., Offensive, Defensive, Buff, Debuff).
Energy Source: (e.g., P.P.E., I.S.P., or unique O.C.C. pools).
Duration Type: (e.g., Instant, Melee-based, Narrative-based).
2. Duration & Event-Based Tracking
In alignment with Pillar 5 (Physical Dice Priority), the app avoids real-time countdown clocks. Time is tracked through discrete game events or GM narrative.
Duration Type
Tracking Logic
UI Representation
 
Melee Rounds
Tied to the APM Tracker "Reset" event. Decrements by 1 every time a new melee round begins.
A small counter icon on the HUD (e.g., "Armor of Ithan: 2").
Narrative Time
Durations in minutes, hours, or days. Remains active until the player/GM confirms the time has passed.
An "Active Effect" badge on the main dashboard.
Manual Clear
Any active effect can be terminated instantly by the user (e.g., cancelling a channeled power).
A visible [X] button on every active status icon.

3. Variable Energy Injection (The "Pump" System)
The engine handles abilities that allow players to "pump" extra energy into an effect for increased output, while strictly enforcing character-level caps.
The Cap Logic: The engine calculates the maximum allowable spend per use:
Max_Pump = (Cap_Per_Level * Character_Level).
Direct Input: The "Cast Card" features a numeric entry field for the amount of energy to spend. Tapping the field pulls up the numeric keypad.
Dynamic Result Preview: As the player inputs energy, the card's text updates in real-time to show the final result.
Example: "Energy Bolt (1D6 damage per 2 P.P.E.)." If a Level 4 character inputs 8 P.P.E., the text updates to "Deals 4D6 Damage."
4. Integration & The "Cast" Workflow
When an ability is executed, the following sequence occurs:
Validation: The app ensures the character has sufficient P.P.E./I.S.P. and is within the Level Cap.
Deduction: The specified energy is subtracted from the Vitality Header immediately.
Modification: If the ability grants a bonus (e.g., +2 to P.P.), the signed modifier is pushed to the Attribute Engine.
Feedback: The affected stats on the main UI highlight in Green/Red with a temporary "Toast" notification (e.g., "+2 P.P. Applied").
