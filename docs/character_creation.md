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

###Step 2: The Attribute Forge (attribute_and_stat.md)

###Step 2.5: The Psychic Gate (psychic_gate.md)

###Step 3: Select Skills (skill_selection.md)

###Step 4: Select Magic/Psionics/Talents/Misc Abilities (sn_abilities_selection.md)

###Step 5 & Final Commit: The "Spawn"
Before the character is finalized, a summary of all randomized "Derived Stats" (H.P., S.D.C., P.P.E., I.S.P.) is presented for a final physical roll or digital generation.
The Warning: A final confirmation screen ensures the player is satisfied with the build.
The Spawn: Tapping "Spawn Your Character" locks the base record and transitions the UI from "Creation Mode" to the "Live Character Sheet."
