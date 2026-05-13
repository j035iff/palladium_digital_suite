Character Creation & Attribute Forge: Technical Specification

This document defines the non-linear character creation flow for the Palladium Digital Suite. It establishes the "Persistent Mirror" UI and the flexible "Attribute Forge" designed to accommodate both standard rules and custom GM house rules.


###The Creation Sidebar (The "Mirror")
To satisfy Pillar 6 (Visual Continuity), a persistent panel remains visible throughout the creation process. This "Mirror" provides real-time feedback on every selection.
Live Attributes: Displays current values and pending modifiers (e.g., "P.S. 12 [+2 Pending]").
Derived Bonuses: A live preview of Strike, Parry, Dodge, and Save modifiers as they accumulate.
Validation Flags: Visual indicators (Red/Green) showing if O.C.C. prerequisites or Alignment restrictions are met.


###Step 1: The Validation Matrix
The app cross-references Race, O.C.C., and Alignment to ensure a valid "Megaversal" build while allowing for GM-approved exceptions.
--Compatibility Filtering: Selecting a Race (e.g., Dwarf) will automatically gray out or flag incompatible O.C.C.s (e.g., Magic-users).
--Alignment Gating: Enforces rules like "Assassins must be Evil or Anarchist." Flagged combinations show a warning but remain overrideable by the user.


###Step 2: The Attribute Forge (House Rule Support)
The Forge supports manual entry or digital rolling using the "Pool and Assign" method.

--Configuration & Methods
-Advantage Mode: Supports rolling N+1 dice and keeping the highest N (e.g., roll 4d6, keep 3).
-Bucket Logic: The engine groups attributes with identical dice pools (e.g., a "Bucket" for all 3d6 stats and a "Bucket" for all 4d6 stats).
-Assignment: Players roll the entire bucket at once and drag the results to their preferred attributes.

--Exceptional Attributes (The Soft-Prompt System)
In accordance with Pillar 5 (Physical Dice Priority), the app trusts user-entered totals but provides assistance for "raw" results.
-Detection: If a player enters a 12 (for a 2d6 stat) or a 16, 17, or 18 (for a 3d6 stat), a "Soft Prompt" icon appears.
Interaction: Tapping the icon offers to roll the "Exceptional Bonus Die" (+1d6). If the result is a 6, it triggers another explosion.
Direct Entry: If the player has already calculated the explosion physically, they can type the final total (e.g., "24") and the engine accepts it without intervention.

###Step 2.5: The Psychic Gate (Branching Logic)
Choosing to be Psychic triggers a logic shift in the O.C.C. calculations.
-Skill Impact: If a character is determined to be a Major Psionic, the Skill Selection Engine (Step 3) automatically reduces the number of "O.C.C. Related Skills" by half, per standard rules.
-Exclusion Logic: If the selected Race (e.g., Nightbane) is incapable of standard psionics, this step is automatically flagged or hidden.

###Step 3: Select Skills (skill_selection.md)

###Step 4: Select Magic/Psionics/Talents/Misc Abilities (sn_abilities_selection.md)

###Step 5 & Final Commit: The "Spawn"
Before the character is finalized, a summary of all randomized "Derived Stats" (H.P., S.D.C., P.P.E., I.S.P.) is presented for a final physical roll or digital generation.
The Warning: A final confirmation screen ensures the player is satisfied with the build.
The Spawn: Tapping "Spawn Your Character" locks the base record and transitions the UI from "Creation Mode" to the "Live Character Sheet."
