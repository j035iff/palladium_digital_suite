Core Attribute & Base Stat Engine: Palladium Digital Suite
This document defines the technical architecture for managing the eight primary attributes and their derived statistics. It establishes how data flows from the central attribute core to the rest of the application modules.
1. The Attribute Data Model
Each attribute is treated as a dynamic variable. The system tracks a Base Value (permanent) and a Current Value (including all active modifiers). All modifiers are treated as signed integers.
Attribute
Primary Logic Impact
 
I.Q. (Intelligence Quotient)
Applies a signed % modifier to all skills (exceptional bonus table from 17+; e.g. 17 → +3%).
M.E. (Mental Endurance)
Applies a signed modifier to Save vs. Psionics and Save vs. Insanity.
M.A. (Mental Affinity)
Determines the % chance to Trust/Intimidate. Scales Skill: Seduction.
P.S. (Physical Strength)
Adds to Hand-to-Hand damage; dictates Lift, Carry, and Throw capacities.
P.P. (Physical Prowess)
Adds to Strike, Parry, and Dodge (Melee/Ancient combat only).
P.E. (Physical Endurance)
Adds to Save vs. Magic/Poison; determines Base H.P. and Coma/Death saves.
P.B. (Physical Beauty)
Determines % chance to Charm/Impress. Scales Skill: Seduction.
Spd (Speed)
Feeds the Land Spd attribute; derived MPH and yards/melee are calculated by the movement engine (`docs/movement_engine_spec.md`).

2. Threshold & Bonus Logic
The engine utilizes a look-up table for "Natural Bonuses." In alignment with the Palladium system, exceptional bonuses generally trigger at a value of 17 or higher.
The Null Rule: If the Current Value is 16 or lower, the attribute-based bonus is 0 (unless a specific status effect applies a direct penalty to the bonus itself).
Signed Recalculation: If a temporary status effect (e.g., "Weakness") drops an attribute below 17, all dependent bonuses in the Combat and Skill modules are instantly updated.

3. Data "Push" Architecture
The Attribute Engine acts as a broadcaster. When an attribute value changes, it sends a signal to all subscriber modules:
Subscriber: Combat HUD — Updates Strike/Parry/Dodge/Damage totals.
Subscriber: Saves Dashboard — Updates active Save modifiers.
Subscriber: Skill Engine — Recalculates all percentages (I.Q. bonus) and checks physical skill dependencies.
Subscriber: Movement Panel — Recomputes `DerivedMovementStats` (ground, swim, fly, leap) per `docs/movement_engine_spec.md`.

4. State Persistence: Base vs. Current
The system maintains two layers of data to ensure the permanent character record is never lost to temporary modifiers.
Base Score: Permanent value (Initial Roll + O.C.C. bonuses + Physical Skill permanent additions).
Current Score: The Base Score + all active signed Status Modifiers.
Visual Representation: The UI will highlight any attribute where Current Score != Base Score to signal an active buff or penalty.
