Technical Spec: Advanced Skill & Dependency Engine V2

This document defines the logic for skill synergies, attribute scaling, prerequisites, and the commitment workflow for the Palladium Digital Suite. Update: All modifiers in this system are signed integers (positive or negative) to allow for universal application of buffs and penalties.


1. Skill Acquisition & Leveling
Acquisition Level: Each skill must store the character level at which it was gained.
Proficiency Level = (Current Character Level) - (Acquisition Level) + 1.
Selection Constraints: Skills can be tagged as O.C.C. Only or No Secondary to prevent invalid character builds.
2. Synergy & Gating Logic
The app uses a dependency graph to handle complex skill requirements.
Type
Logic Requirement
Example
 
AND Gate
Requires all listed skills to unlock.
Mechanical Engineering requires Literacy AND Electronics.
OR Gate
Requires at least one listed skill to unlock.
Mech. Engineering requires Math: Basic OR Math: Advanced.
Synergy
Presence of Skill A grants a % bonus to Skill B.
Math: Advanced grants +10% to Astronomy.

3. Scaled Attribute & Status Modifiers
The calculation engine treats all modifiers as signed values (e.g., +10 or -15).
The Master Skill Equation:
[Base% + (Per Level * (Eff. Level - 1))] + [O.C.C. Bonus] + [I.Q. Bonus] + [Synergy Bonuses] + [Scaled Att. Bonuses] + [Status Modifiers] = Final %

Universal Modifier Support: No modifier is hard-coded as a "penalty" or "benefit." The system simply sums the signed values.
M.A. Scaling: +1% bonus for every 1 point above M.A. 20.
P.B. Scaling: +1% bonus for every 2 points above P.B. 17.
Status Modifiers: A global modifier variable (e.g., -20% for 'Confused' or +10% for 'Blessed') is added to the final calculated total.

4. The "Commitment" Workflow
Physical skill bonuses (S.D.C., Attributes) are staged before being permanently applied.
Stage: Skills are selected; bonuses are shown as "Pending."
Review: A summary screen shows all attribute changes.
Input: User enters manual dice rolls (e.g., 1D4 S.D.C.) into the summary fields.
Commit: Data is written to the character sheet. Visual "toasts" confirm the changes to the UI.
