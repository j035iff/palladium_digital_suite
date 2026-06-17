Live Ledger definitions and calculations


Rules ror this document:
-- A reference to the Facade's Stats will have an "f" prefix and a reference to the Morphus's Stats will have an "m" prefix
e.g. 
Facade IQ = fIQ
Morphus SDC = mSDC

-- It assumed that the Facade side of the character is complete when building the Morphus, so any Morphus stat that is based directly off of a Facade stat is assumed to be the Facade final stat AFTER all skills have been selected and bonuses applied

Definitions:
"Modifier" = anything that changes a stat by adding, subtracting, change by percent (e.g. 50% Spd), or otherwise
"Race" = a modifier that comes from the character's Race (e.g. Human, Elf, etc)
"OCC" = a modifier that comes from the character's OCC (e.g. Knight, Thief, etc)
"Skills" = a modifier that comes from a skill, usually these come from skills in the Physical category
"misc" = a bucket term for any specialized or 1-off modifier that may apply to the stat
"HtH" = modifiers coming from the Hand to Hand skill (e.g. Hand to Hand: Expert)
"[Attribute]>16" (e.g. ME>16) = modifiers for any attribute 17-30. These modifiers are defined in attributeBonuses.ts
"[Attribute]>30" (e.g. PE>30) = special modifiers that are for attributes above 30 (i.e. off the standard exceptional attribute table; 31 and higher)
"traits" = modifiers coming from a Morphus form trait
"HF" = Horror Factor
"AR" = Natural Armor Rating (i.e. the character's innate armor rating, not from wearing armor)
"mSkills" = modifiers coming from skills that ONLY the Morphus has (e.g. a morphus trait grants Acrobatics to the Morphus and the Facade doesn't have that skill, the acrobatics modifiers are only applied to the morphus)


Standard Characters (and Facade if a Nightbane)
ATTRIBUTES: 
Race + OCC + Skill + misc

EXCEPTIONAL BONUSES: 
Defined in attributeBonuses.ts

VITALS
1. HP = Race + OCC + misc (NOTE: default is PE + 1D6/level)
2. SDC = Race + OCC + Skills + misc
3. PPE = Race + OCC + misc
4. ISP = Race + OCC + misc (NOTE: only relevant if character has psychic abilties)
5. HF = Race + OCC + misc
6. AR = Race + OCC + misc

SAVE VS
1. Magic = PE>16, Race, OCC, misc
2. Psionics = ME>16 + Race + OCC + misc
3. Horror Factor = Race + OCC + misc
4. Illusions = Race + OCC + IQ>30 + misc
5. Disease = Race + OCC + misc
6. Insanity = ME>16 + Race + OCC + misc
7. Poison/Toxins = PE>16 + Race + OCC + misc
8. Mind Control = Race + OCC + misc
9. Coma/Death = PE>16 + Race + OCC + misc
10. Base PE Save Bonus = PE>16
11. Base ME Save Bonus = ME>16

HAND TO HAND COMBAT:
1. Attacks/Actions Per Melee (APM) = 2(all player characters start with 2) + HtH + Race + OCC + Skills + misc
2. Initiative = HtH + Race + OCC + Skills + PP>30
3. Strike = PP>16 + HtH + Race + OCC + Skills + misc
4. Parry = PP>16 + HtH + Race + OCC + Skills + misc
5. Dodge = PP>16 + HtH + Race + OCC + Skills + misc
6. Roll w/ punch,fall,impact = HtH + Race + OCC + Skills + misc
7. Entangle = HtH  + Race + OCC + Skills + misc
8. Disarm = HtH skill + Race + OCC + Skills + misc
9. Hand to Hand Damage = PS>16 + HtH + Race + OCC + Skills + misc



Calculations: Morphus

ATTRIBUTES: 
mIQ: fIQ + traits + mSkills
mME: fME + traits + mSkills
mMA: fMA + traits + mSkills
mPS: fPS + 10 + traits + mSkills
mPP: fPP + 6 + traits + mSkills
mPE: fPE + 10 + traits + mSkills
mPB: fPB + traits + mSkills
mSpd: fSpd + 10 + traits + mSkills

EXCEPTIONAL BONUSES: 
Defined in attributeBonuses.ts and uses the Morphus attribute

VITALS
1. mHP = mPEx2 + 2D6/level
2. mSDC = fSDC + 2d6x10 + mSkills + traits
3. PPE = fPE + 3d6x10+20 + 3d6/level  (NOTE: PPE is not different between forms, it is one pool for the character that both the Facade and Morphus can draw from)
4. ISP = N/A (Nightbane cannot have psychic abilities)
5. mHF = 6 + traits
6. mAR = traits

SAVE VS
1. Magic = 4 + mPE>16 + traits
2. Psionics: 3 + mME>16 + traits
3. Horror Factor: 3 +traits
4. Illusions: mIQ>30 + traits
5. Disease: 3 + traits
6. Insanity: mME>16 + traits
7. Poison/Toxins: mPE>16 + traits
8. Mind Control: IMMUNE (Nightbane are immune to mind control in facade and morphus)
9. Coma/Death: mPE>16 + traits

HAND TO HAND COMBAT:
1. Attacks/Actions Per Melee (APM): 2(PC base) + 1 + HtH + mSkills + traits
2. Initiative: 1 + HtH + mSkills + mPP>30 + traits
3. Strike: 2 + mPP>16 + HtH + mSkills + traits
4. Parry: 2 + mPP>16 + HtH + mSkills + traits
5. Dodge: 2 + mPP>16 + HtH + mSkills + traits
6. Roll w/ punch,fall,impact: 3 + HtH + mSkills + traits
7. Entangle: HtH + mSkills + traits
8. Disarm: HtH + mSkills + traits
9. HtH Damage: mPS>16 + HtH + mSkills + traits