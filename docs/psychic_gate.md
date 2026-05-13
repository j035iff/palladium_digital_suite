Step 2.5: The Psychic Gate Logic Specification
This document defines the logic for determining psionic potential during character creation and the resulting mechanical impacts on skills and energy pools.
1. Tier Determination Logic
The Psychic Gate utilizes three primary entry triggers to ensure setting accuracy.
Psychic O.C.C. (Force Master): If Step 1 contains a Psychic-class O.C.C., the tier is locked to Master.
Incompatible Race (Auto-Skip): If Step 1 contains a race like Nightbane, the Psychic Gate is bypassed to maintain setting integrity.
Standard Entry: Users can manually select a tier or utilize a randomized roll (e.g., 01-10% Master, 11-25% Major, etc., based on setting).
2. The "Skill Tax" Engine
The system enforces the Palladium "Skill Penalty" for high-potential psychics who are not in psychic-specific O.C.C.s.
Psychic Tier
Save vs. Psi Target
Mechanical Impact
 
None
15
Standard skill progression.
Minor
12
Selection of 1-2 powers. No skill penalty.
Major
12
Selection of 8 powers. O.C.C. Related skills reduced by 50% (floor).
Master
10
Typically O.C.C.-driven. Full skill access.

3. I.S.P. Initialization & Growth
Upon confirmation of a psychic tier, the Vitality Engine initializes the I.S.P. pool.
Base Pool: Calculated using the Tier Formula (e.g., M.E. + Dice Roll).
Growth Variable: A hidden variable is set for the Level-Up Engine to track I.S.P. gain per level (e.g., +1d6).
4. Selection Interaction
The "Power Picker" UI provides a count-down of available selections based on the Tier.
Constraint: Super Psionic powers remain locked/hidden for Minor Psionic characters unless a specific O.C.C. ability overrides the restriction.
