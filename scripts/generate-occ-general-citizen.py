#!/usr/bin/env python3
"""Generate occ_general_citizen + specializations for survival_guide.json OCC catalog."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/data/content/occs/nightbane/survival_guide.json"

WP_FORBIDDEN_CIVILIAN = [
    "wp_polearm",
    "wp_whip",
    "wp_automatic_and_semiautomatic_rifles",
    "wp_heavy",
]
WP_FORBIDDEN_NO_POLE_WHIP_HEAVY = ["wp_polearm", "wp_whip", "wp_heavy"]

PILOT_EXCLUDE_ADVANCED = [
    "skill_helicopter",
    "skill_jet_aircraft",
    "skill_jet_fighters",
    "skill_jet_packs",
    "skill_boat_ships",
    "skill_tanks_and_apcs",
]
PILOT_EXCLUDE_NO_JET_SHIPS_TANKS = [
    "skill_jet_fighters",
    "skill_jet_packs",
    "skill_boat_ships",
    "skill_tanks_and_apcs",
]
PILOT_EXCLUDE_JET_AIRCRAFT_FIGHTERS_PACKS_SHIPS_TANKS = [
    "skill_jet_aircraft",
    *PILOT_EXCLUDE_NO_JET_SHIPS_TANKS,
]
STREET_PILOT_ONLY = [
    "skill_boat_motor_and_hydrofoils",
    "skill_boat_sail_type",
    "skill_boats_paddle_types",
    "skill_automobile",
    "skill_bicycling",
    "skill_motorcycle",
    "skill_truck",
]
CHEMISTRY_AND_MATH = [
    "skill_chemistry",
    "skill_chemistry_analytical",
    "skill_math_basic",
    "skill_math_advanced",
]
TECH_LORE_BONUS_SKILLS = {
    "skill_lore_magic": 10,
    "skill_lore_factions": 10,
    "skill_lore_nightbane": 10,
    "skill_lore_nightlands": 10,
    "skill_lore_demons_and_monsters": 10,
    "skill_mythology": 10,
    "skill_philosophy": 10,
    "skill_photography": 10,
    "skill_research": 10,
    "skill_creative_writing": 10,
}

ASSASSIN_ALIGN = {
    "allowed": ["Miscreant", "Aberrant", "Diabolic"],
}

HTH_CIVILIAN = {
    "defaultSkillId": "hth_basic",
    "upgradePaths": [
        {"targetSkillId": "hth_expert", "electiveSlotCost": 2},
        {"targetSkillId": "hth_martial_arts", "electiveSlotCost": 3},
        {
            "targetSkillId": "hth_assassin",
            "electiveSlotCost": 3,
            "alignmentRestrictions": ASSASSIN_ALIGN,
        },
    ],
}
HTH_RESCUE_MILITARY = {
    "defaultSkillId": "hth_basic",
    "upgradePaths": [
        {"targetSkillId": "hth_expert", "electiveSlotCost": 1},
        {"targetSkillId": "hth_martial_arts", "electiveSlotCost": 2},
        {
            "targetSkillId": "hth_assassin",
            "electiveSlotCost": 3,
            "alignmentRestrictions": ASSASSIN_ALIGN,
        },
    ],
}
HTH_FIRST_RESPONDER = {
    "defaultSkillId": "hth_basic",
    "upgradePaths": [
        {"targetSkillId": "hth_expert", "electiveSlotCost": 1},
        {"targetSkillId": "hth_martial_arts", "electiveSlotCost": 2},
    ],
}
HTH_STREET_THUG = {
    "defaultSkillId": "hth_expert",
    "upgradePaths": [
        {"targetSkillId": "hth_martial_arts", "electiveSlotCost": 1},
    ],
}

STREET_SCHOOLED_CLASS_ABILITIES = [
    {
        "name": "No Formal Education",
        "description": (
            "Runaway, impoverished, dropout, NSB fugitive, orphan, or other circumstance — "
            "never obtained formal schooling. Skills come from people and street experience (WB5 pp. 61–62)."
        ),
    },
    {
        "name": "Street Survival Lifestyle",
        "description": (
            "Life on the streets means scrounging, salvaging, begging, bartering, odd jobs, and petty theft. "
            "Core skills emphasize Barter, Begging, Roadwise, Salvage, and Streetwise (WB5 pp. 61–62)."
        ),
    },
    {
        "name": "Young Street Survivor",
        "description": (
            "Probably age 12–20 living on the streets of a big city, but any age is allowed. "
            "Consider NSB pursuit, homelessness, and lack of family support when building the background (WB5 pp. 61–62)."
        ),
    },
    {
        "name": "Facade Hand to Hand",
        "description": (
            "Hand to Hand: Basic is included. Upgrade to Expert for two related-skill selections, "
            "or Martial Arts for three (WB5 p. 61). Assassin remains available per civilian upgrade table "
            "when alignment permits (`handToHandRules`). Facade only — see Morphus Innate Combat for Nightbane."
        ),
    },
    {
        "name": "Civilian Weapon Proficiencies",
        "description": (
            "Related W.P. selections exclude Pole Arm, Whip, Automatic Rifle, and Heavy (Military). "
            "Core package includes W.P. Knife or W.P. Blunt (WB5 p. 62)."
        ),
    },
    {
        "name": "Technical Lore Bonus",
        "description": (
            "Technical related skills grant +10% only on Lore-type picks "
            "(Lore: Magic, Factions, Nightbane, Nightlands, Demons & Monsters) — not all Technical skills (WB5 p. 62)."
        ),
    },
    {
        "name": "Related Skill Minimums",
        "description": (
            "At level 1 select one Rogue skill, one Domestic skill, one Technical skill, and three additional "
            "picks from the related list. Category access and bonuses match the encoded `occRelatedSkills` program (WB5 pp. 61–62)."
        ),
    },
    {
        "name": "Related Skill Advancement",
        "description": (
            "Six related skills at creation; gain one additional related skill at levels 3, 6, 9, and 13. "
            "All new related picks start at 1st-level proficiency (WB5 pp. 61–62)."
        ),
    },
    {
        "name": "Secondary Skill Program",
        "description": (
            "Three secondary skills at creation plus one each at levels 3, 5, 7, 9, 11, and 13. "
            "Secondary pool matches the related list above; no O.C.C. percentage bonus (WB5 p. 62)."
        ),
    },
    {
        "name": "Education Modifiers Option",
        "description": (
            "Survival Guide Education Modifiers alternative to the Basic Nightbane skill package (core p. 89). "
            "Suitable for Wampyrs and NPCs; G.M. may allow free choice of background when appropriate (WB5 p. 61)."
        ),
    },
    {
        "name": "GM Skill Flexibility",
        "description": (
            "Education backgrounds are guidelines — the G.M. may approve related skills outside the listed "
            "groupings when the player provides a convincing reason (WB5 p. 61; parent `packageNotes`)."
        ),
    },
    {
        "name": "Morphus Innate Combat",
        "description": (
            "When the character is a Nightbane (`race_nightbane`), Morphus form uses innate Hand to Hand: Martial Arts "
            "(+1 melee action and Morphus combat bonuses on the race row) — independent of Facade H2H included here (core pp. 88–89)."
        ),
    },
    {
        "name": "Starting Resources",
        "description": (
            "WB5 does not list starting cash for Education Modifiers rows. Impoverished street survivors typically "
            "own far less than the core civilian 3D6×100 baseline — encoded `finances` uses 2D6×10; G.M. may adjust "
            "or substitute scavenged goods for cash (WB5 pp. 61–62; core pp. 89–90)."
        ),
    },
]

STREET_SCHOOLED_STARTING_EQUIPMENT = {
    "miscellaneous": [
        "Worn street clothing and personal effects — often everything the character owns",
        "Backpack, bedroll, or shopping cart with scavenged odds and ends",
        "Cheap knife or blunt weapon matching the core W.P. pick",
        "Bicycle or beat-up automobile per core transport choice (Bicycling +16% or Automobile +4%)",
        "Begging bottle, litter, or small trade goods as background-dependent street kit",
        "No military weapons — civilian street gear only (WB5 pp. 61–62)",
    ],
}

STREET_SCHOOLED_FINANCES = {"startingCashFormula": "2D6*10"}

STREET_THUG_CLASS_ABILITIES = [
    {
        "name": "No Formal Education",
        "description": (
            "Runaway, dropout, orphan, or poverty victim who never obtained formal schooling — "
            "skills learned on the streets and from criminal associates (WB5 pp. 61–62)."
        ),
    },
    {
        "name": "Small-Time Criminal Background",
        "description": (
            "Fell in with the wrong crowd and survived as small-time criminal and street muscle — "
            "not a trained soldier or faction operative, but hardened by street violence and petty crime (WB5 pp. 61–62)."
        ),
    },
    {
        "name": "Young Street Criminal",
        "description": (
            "Probably age 16–30 growing up on the streets of a big city, but any age is allowed. "
            "Gang ties, drug trade exposure, and NSB attention are common background hooks (WB5 pp. 61–62)."
        ),
    },
    {
        "name": "Facade Hand to Hand",
        "description": (
            "Hand to Hand: Expert is included. Upgrade to Martial Arts for one related-skill selection (WB5 p. 62). "
            "Applies to the Facade only — see Morphus Innate Combat for Nightbane (`handToHandRules`)."
        ),
    },
    {
        "name": "Street Weapon Proficiencies",
        "description": (
            "Core package includes W.P. Knife or W.P. Blunt plus W.P. Automatic Pistol. "
            "Related W.P. selections exclude Pole Arm, Whip, and Heavy (Military) only — "
            "automatic rifles are not listed among exclusions (WB5 p. 62)."
        ),
    },
    {
        "name": "Street Muscle Training",
        "description": (
            "Core emphasizes brawling (Body Building, Wrestling, or Boxing), Roadwise (+10%), "
            "Streetwise (+30%), and Streetwise: Drugs (+25%). Literacy (+10%) is included in the core package (WB5 p. 62)."
        ),
    },
    {
        "name": "Related Skill Minimums",
        "description": (
            "At level 1 select two Espionage skills, two Rogue skills, one Physical skill, and two additional "
            "picks from the related list. Category access and bonuses match the encoded `occRelatedSkills` program (WB5 p. 62)."
        ),
    },
    {
        "name": "Related Skill Advancement",
        "description": (
            "Seven related skills at creation (minimums above); gain two additional related skills at levels 3, 6, 9, and 12. "
            "All new related picks start at 1st-level proficiency (WB5 p. 62)."
        ),
    },
    {
        "name": "Secondary Skill Program",
        "description": (
            "Three secondary skills at creation plus one each at levels 2, 4, 6, 8, 10, 12, and 14. "
            "Secondary pool matches the related list above; no O.C.C. percentage bonus (WB5 p. 62)."
        ),
    },
    {
        "name": "Education Modifiers Option",
        "description": (
            "Survival Guide Education Modifiers alternative to the Basic Nightbane skill package (core p. 89). "
            "Suitable for Wampyrs and NPCs; G.M. may allow free choice of background when appropriate (WB5 p. 61)."
        ),
    },
    {
        "name": "GM Skill Flexibility",
        "description": (
            "Education backgrounds are guidelines — the G.M. may approve related skills outside the listed "
            "groupings when the player provides a convincing reason (WB5 p. 61; parent `packageNotes`)."
        ),
    },
    {
        "name": "Morphus Innate Combat",
        "description": (
            "When the character is a Nightbane (`race_nightbane`), Morphus form uses innate Hand to Hand: Martial Arts "
            "(+1 melee action and Morphus combat bonuses on the race row) — independent of Facade H2H included here (core pp. 88–89)."
        ),
    },
    {
        "name": "Starting Resources",
        "description": (
            "WB5 does not list starting cash for Education Modifiers rows. Small-time criminals may carry modest stolen "
            "proceeds or drug-trade cash — encoded `finances` uses 2D6×100 (below core civilian 3D6×100; above impoverished "
            "Street Schooled). G.M. may adjust or add gang-supplied gear (WB5 pp. 61–62; core pp. 89–90)."
        ),
    },
]

STREET_THUG_STARTING_EQUIPMENT = {
    "miscellaneous": [
        "Handgun matching W.P. Automatic Pistol (owned, stolen, or gang-supplied)",
        "Knife or blunt weapon matching the core W.P. pick",
        "Street or gang clothing, personal effects, and identifiers as background-dependent",
        "Automobile, motorcycle, or bicycle — pilot skills include Combat Driving (WB5 p. 62)",
        "Drug paraphernalia, contraband, or petty-theft goods when background-appropriate",
        "Radios or cheap electronics on a case-by-case basis — small-time street gear, not military loadout",
    ],
}

STREET_THUG_FINANCES = {"startingCashFormula": "2D6*100"}

HIGH_SCHOOL_EDUCATED_CLASS_ABILITIES = [
    {
        "name": "High School Graduate Background",
        "description": (
            "Finished high school before seeking work or being forced underground after the Becoming — "
            "typical educated civilian with computer literacy and basic academics (WB5 pp. 61–62)."
        ),
    },
    {
        "name": "Young Adult at the Becoming",
        "description": (
            "Probably age 17–21 with little work experience, but any age is allowed. "
            "Matches the core Basic Nightbane skill-package demographic (core p. 89; WB5 p. 62)."
        ),
    },
    {
        "name": "Facade Hand to Hand",
        "description": (
            "Hand to Hand: Basic is included. Upgrade to Expert for two related-skill selections, "
            "or Martial Arts for three (WB5 p. 62). Assassin remains available per civilian upgrade table "
            "when alignment permits (`handToHandRules`). Facade only — see Morphus Innate Combat for Nightbane."
        ),
    },
    {
        "name": "Civilian Weapon Proficiencies",
        "description": (
            "Related W.P. selections exclude Pole Arm, Whip, Automatic Rifle, and Heavy (Military) — "
            "civilian arms only (WB5 p. 62)."
        ),
    },
    {
        "name": "Computer-Literate Core",
        "description": (
            "Core package includes Computer Operation (+15%), Literacy (+20%), and Math: Basic (+20%) — "
            "reflects a modern high-school education before the Becoming (WB5 p. 62)."
        ),
    },
    {
        "name": "Limited Rogue Access",
        "description": (
            "Rogue related skills are limited to Computer Hacking and Netwise only — "
            "no full criminal skill program (WB5 p. 62)."
        ),
    },
    {
        "name": "Related Skill Minimums",
        "description": (
            "At level 1 select three Domestic skills, one Technical skill, and five additional picks from the related list. "
            "Domestic (+5%), Technical (+10%), and Science (+5%) bonuses apply per category rules (WB5 p. 62)."
        ),
    },
    {
        "name": "Related Skill Advancement",
        "description": (
            "Nine related skills at creation (minimums above); gain one additional related skill at levels 3, 6, 9, and 12. "
            "All new related picks start at 1st-level proficiency (WB5 p. 62)."
        ),
    },
    {
        "name": "Secondary Skill Program",
        "description": (
            "Three secondary skills at creation plus one each at levels 3, 6, 9, and 12. "
            "Secondary pool matches the related list above; no O.C.C. percentage bonus (WB5 p. 62)."
        ),
    },
    {
        "name": "Education Modifiers Option",
        "description": (
            "Survival Guide Education Modifiers alternative to the Basic Nightbane skill package (core p. 89). "
            "Suitable for Wampyrs and NPCs; G.M. may allow free choice of background when appropriate (WB5 p. 61)."
        ),
    },
    {
        "name": "GM Skill Flexibility",
        "description": (
            "Education backgrounds are guidelines — the G.M. may approve related skills outside the listed "
            "groupings when the player provides a convincing reason (WB5 p. 61; parent `packageNotes`)."
        ),
    },
    {
        "name": "Morphus Innate Combat",
        "description": (
            "When the character is a Nightbane (`race_nightbane`), Morphus form uses innate Hand to Hand: Martial Arts "
            "(+1 melee action and Morphus combat bonuses on the race row) — independent of Facade H2H included here (core pp. 88–89)."
        ),
    },
    {
        "name": "Starting Resources",
        "description": (
            "WB5 does not list starting cash for Education Modifiers rows. High-school graduates align with the core "
            "civilian baseline — encoded `finances` uses 3D6×100 (core pp. 89–90). Likely owns a bicycle or car, "
            "personal computer or handheld device, clothing, and school-era personal effects."
        ),
    },
]

HIGH_SCHOOL_EDUCATED_STARTING_EQUIPMENT = {
    "miscellaneous": [
        "Bicycle or automobile per core pilot skills (Bicycling +10% or Automobile +4%)",
        "Clothing and personal effects — school-era wardrobe and everyday civilian gear",
        "Home computer, laptop, or handheld device (Computer Operation +15% in core)",
        "Books, school supplies, and high-school memorabilia as background-dependent",
        "Radio, music player, camera, or other typical young-adult odds and ends",
        "No military weapons — civilian gear only (WB5 pp. 61–62; core pp. 89–90)",
    ],
}

HIGH_SCHOOL_EDUCATED_FINANCES = {"startingCashFormula": "3D6*100"}

ASSOCIATES_VOCATIONAL_CLASS_ABILITIES = [
    {
        "name": "Associate's or Vocational Training Background",
        "description": (
            "Two-year college associate's degree or equivalent vocational/trade-school education — "
            "broader technical foundation than high school alone (WB5 pp. 62–63)."
        ),
    },
    {
        "name": "Young Adult with Trade Education",
        "description": (
            "Probably age 19–25 with little work experience, but any age is allowed. "
            "Vocational specialty should inform the +10% cluster pick and starting gear (WB5 pp. 62–63)."
        ),
    },
    {
        "name": "Facade Hand to Hand",
        "description": (
            "Hand to Hand: Basic is included. Upgrade to Expert for two related-skill selections, "
            "or Martial Arts for three (WB5 pp. 62–63). Assassin remains available per civilian upgrade table "
            "when alignment permits (`handToHandRules`). Facade only — see Morphus Innate Combat for Nightbane."
        ),
    },
    {
        "name": "Civilian Weapon Proficiencies",
        "description": (
            "Related W.P. selections exclude Pole Arm, Whip, Automatic Rifle, and Heavy (Military) — "
            "civilian arms only (WB5 p. 63)."
        ),
    },
    {
        "name": "Vocational Cluster (+10%)",
        "description": (
            "Select three related skills from one special-training category — Communications, Electrical, Medical, "
            "Mechanical, or Science — all three at +10%. Communications and Medical are otherwise unavailable "
            "except through this cluster. G.M. adjudicates mixed-category edge cases (WB5 p. 63; parent `packageNotes`)."
        ),
    },
    {
        "name": "Domestic or Pilot Foundation",
        "description": (
            "At level 1 select two Domestic skills or Pilot skills (Pilot includes boats except Ships, automobiles, "
            "bicycles, motorcycles, and trucks per related list). Domestic related skills gain +10% (WB5 p. 63)."
        ),
    },
    {
        "name": "Expanded Related Access",
        "description": (
            "Broader pool than High School Educated — Wilderness any, Pilot Related any, full Mechanical (+5%) and "
            "Electrical (+5%) access, and Netwise-only Rogue (+5%). Physical any except Acrobatics (WB5 p. 63)."
        ),
    },
    {
        "name": "Related Skill Advancement",
        "description": (
            "Ten related skills at creation (two Domestic/Pilot + three vocational cluster + five choice); "
            "gain one additional related skill at levels 3, 5, 7, 10, and 12. "
            "All new related picks start at 1st-level proficiency (WB5 p. 63)."
        ),
    },
    {
        "name": "Secondary Skill Program",
        "description": (
            "Four secondary skills at creation plus one each at levels 3, 5, 7, 10, and 13. "
            "Secondary pool matches the related list above; no O.C.C. percentage bonus (WB5 p. 63)."
        ),
    },
    {
        "name": "Education Modifiers Option",
        "description": (
            "Survival Guide Education Modifiers alternative to the Basic Nightbane skill package (core p. 89). "
            "Suitable for Wampyrs and NPCs; G.M. may allow free choice of background when appropriate (WB5 p. 61)."
        ),
    },
    {
        "name": "GM Skill Flexibility",
        "description": (
            "Education backgrounds are guidelines — the G.M. may approve related skills outside the listed "
            "groupings when the player provides a convincing reason (WB5 p. 61; parent `packageNotes`)."
        ),
    },
    {
        "name": "Morphus Innate Combat",
        "description": (
            "When the character is a Nightbane (`race_nightbane`), Morphus form uses innate Hand to Hand: Martial Arts "
            "(+1 melee action and Morphus combat bonuses on the race row) — independent of Facade H2H included here (core pp. 88–89)."
        ),
    },
    {
        "name": "Starting Resources",
        "description": (
            "WB5 does not list starting cash for Education Modifiers rows. Vocational graduates align with the core "
            "civilian baseline — encoded `finances` uses 3D6×100. Likely owns an automobile (+10%), computer, "
            "trade-school textbooks, and tools for the chosen vocational specialty (WB5 pp. 62–63; core pp. 89–90)."
        ),
    },
]

ASSOCIATES_VOCATIONAL_STARTING_EQUIPMENT = {
    "miscellaneous": [
        "Automobile per core pilot skill (Automobile +10%)",
        "Computer, laptop, or handheld device (Computer Operation +20% in core)",
        "Trade-school textbooks, certificates, and vocational reference materials",
        "Basic tool kit or specialty equipment for the chosen vocational cluster (Communications, Electrical, Medical, Mechanical, or Science)",
        "Clothing and personal effects — young adult civilian or trade-school graduate gear",
        "Bicycle as secondary transport when background-appropriate (Bicycling +6% in core)",
        "No military weapons — civilian gear only (WB5 pp. 62–63)",
    ],
}

ASSOCIATES_VOCATIONAL_FINANCES = {"startingCashFormula": "3D6*100"}

COLLEGE_GRADUATE_CLASS_ABILITIES = [
    {
        "name": "Bachelor's Degree Background",
        "description": (
            "Four-year university graduate or equivalent vocational education in some field — "
            "broad scholastic and technical foundation with high literacy and computer proficiency (WB5 p. 63)."
        ),
    },
    {
        "name": "Young Professional at the Becoming",
        "description": (
            "Probably age 22–28 with minimal work experience, but any age is allowed. "
            "Degree major should inform the +20% special-training cluster and starting gear (WB5 p. 63)."
        ),
    },
    {
        "name": "Facade Hand to Hand",
        "description": (
            "Hand to Hand: Basic is included. Upgrade to Expert for two related-skill selections, "
            "or Martial Arts for three (WB5 p. 63). Assassin remains available per civilian upgrade table "
            "when alignment permits (`handToHandRules`). Facade only — see Morphus Innate Combat for Nightbane."
        ),
    },
    {
        "name": "Civilian Weapon Proficiencies",
        "description": (
            "Related W.P. selections exclude Pole Arm, Whip, Automatic Rifle, and Heavy (Military) — "
            "civilian arms only (WB5 p. 63)."
        ),
    },
    {
        "name": "Special-Training Cluster (+20%)",
        "description": (
            "Select three related skills from one category — Communications, Electrical, Medical, Mechanical, "
            "Science, or Technical — all three at +20%. Communications and Medical are otherwise unavailable "
            "except through this cluster. G.M. adjudicates mixed-category edge cases (WB5 p. 63; parent `packageNotes`)."
        ),
    },
    {
        "name": "Scholastic Core Skills",
        "description": (
            "Core package includes Computer Operation (+25%), Language (+30%), Literacy (+40%), "
            "and Math: Basic (+30%) — reflects a completed university education (WB5 p. 63)."
        ),
    },
    {
        "name": "Broad Related Access",
        "description": (
            "Twelve related slots at creation (three cluster + nine choice) with full Domestic (+10%), "
            "Electrical/Mechanical/Technical (+10%), Science (+15%), Pilot Related (+10%), Wilderness (+5%), "
            "and Netwise-only Rogue (+10%). Physical any except Acrobatics (WB5 p. 63)."
        ),
    },
    {
        "name": "Related Skill Advancement",
        "description": (
            "Twelve related skills at creation; gain one additional related skill at levels 3, 6, 9, and 12. "
            "All new related picks start at 1st-level proficiency (WB5 p. 63)."
        ),
    },
    {
        "name": "Secondary Skill Program",
        "description": (
            "Five secondary skills at creation plus one each at levels 3, 6, 9, and 12. "
            "Secondary pool matches the related list above; no O.C.C. percentage bonus (WB5 p. 63)."
        ),
    },
    {
        "name": "Education Modifiers Option",
        "description": (
            "Survival Guide Education Modifiers alternative to the Basic Nightbane skill package (core p. 89). "
            "Suitable for Wampyrs and NPCs; G.M. may allow free choice of background when appropriate (WB5 p. 61)."
        ),
    },
    {
        "name": "GM Skill Flexibility",
        "description": (
            "Education backgrounds are guidelines — the G.M. may approve related skills outside the listed "
            "groupings when the player provides a convincing reason (WB5 p. 61; parent `packageNotes`)."
        ),
    },
    {
        "name": "Morphus Innate Combat",
        "description": (
            "When the character is a Nightbane (`race_nightbane`), Morphus form uses innate Hand to Hand: Martial Arts "
            "(+1 melee action and Morphus combat bonuses on the race row) — independent of Facade H2H included here (core pp. 88–89)."
        ),
    },
    {
        "name": "Starting Resources",
        "description": (
            "WB5 does not list starting cash for Education Modifiers rows. College graduates align with the core "
            "civilian baseline — encoded `finances` uses 3D6×100. Likely owns an automobile (+10%), computer/laptop, "
            "books, and degree-related materials; may operate as specialists or consultants (WB5 p. 63; core pp. 89–90)."
        ),
    },
]

COLLEGE_GRADUATE_STARTING_EQUIPMENT = {
    "miscellaneous": [
        "Automobile per core pilot skill (Automobile +10%)",
        "Home computer, laptop, or handheld device (Computer Operation +25% in core)",
        "University textbooks, degree materials, and academic or professional reference library",
        "Clothing, dress clothes, and personal effects — educated civilian gear",
        "Camera, research notes, and specialty equipment for the chosen +20% training cluster",
        "Bicycle as secondary transport when background-appropriate (Bicycling +6% in core)",
        "No military weapons — civilian gear only (WB5 p. 63; core pp. 89–90)",
    ],
}

COLLEGE_GRADUATE_FINANCES = {"startingCashFormula": "3D6*100"}

RESCUE_FIRST_RESPONDER_CLASS_ABILITIES = [
    {
        "name": "First Responder or Law Enforcement Background",
        "description": (
            "High school graduate with up to 1D4 years of college and special training — firefighter, paramedic, "
            "law enforcement (any branch), disaster relief, or similar. Select skills to fit the desired occupation (WB5 pp. 63–64)."
        ),
    },
    {
        "name": "Age 22+ with Occupational Training",
        "description": (
            "Can be age 22 and older. Occupation (fire, EMS, police, disaster relief) should drive the +20% "
            "Medical/Technical specialty picks and starting gear (WB5 pp. 63–64)."
        ),
    },
    {
        "name": "Facade Hand to Hand",
        "description": (
            "Hand to Hand: Basic is included. Upgrade to Expert for one related-skill selection, "
            "or Martial Arts for two (WB5 pp. 63–64). Applies to the Facade only — see Morphus Innate Combat for Nightbane (`handToHandRules`)."
        ),
    },
    {
        "name": "Civilian Weapon Proficiencies (Law Enforcement Exception)",
        "description": (
            "Related W.P. selections exclude Pole Arm, Whip, Automatic Rifle, and Heavy (Military) for most occupations. "
            "Law enforcement may select any Modern W.P. despite the general restriction — G.M. confirms police/military branch "
            "background (WB5 pp. 63–64; encoded `wpRules` uses civilian forbidden list; exception documented here)."
        ),
    },
    {
        "name": "First Responder Core Skills",
        "description": (
            "Core package includes Climbing (+20%), Combat Driving, Computer Operation (+20%), Paramedic (+20%), "
            "Radio: Basic (+20%), and Automobile (+12%) or Truck (+16%) — reflects rescue/response training (WB5 pp. 63–64)."
        ),
    },
    {
        "name": "First Responder Specialty (+20%)",
        "description": (
            "Select two Medical or Technical skills that relate to the character's first-responder role "
            "(e.g. Excavation, Firefighting, Law, Rope Works) at +20%. Medical category is otherwise unavailable "
            "except through this vocational pick (WB5 pp. 63–64; parent `packageNotes`)."
        ),
    },
    {
        "name": "Pilot or Pilot Related Foundation",
        "description": (
            "At level 1 select two Pilot or Pilot Related skills. Pilot any except Jet Fighters, Jet Packs, Ships, and Tanks; "
            "Pilot Related any (+10%) (WB5 pp. 63–64)."
        ),
    },
    {
        "name": "Law Enforcement Espionage Exception",
        "description": (
            "Espionage is none for most occupations. Law enforcement characters may take Espionage related skills (+10%) — "
            "engine encodes `accessType: none` with exception documented here; G.M. enables picks for police backgrounds (WB5 p. 63)."
        ),
    },
    {
        "name": "Related Skill Advancement",
        "description": (
            "Ten related skills at creation (two Pilot/Pilot Related + two specialty + six choice); "
            "gain one additional related skill at levels 3, 5, 7, 10, and 12. "
            "All new related picks start at 1st-level proficiency (WB5 pp. 63–64)."
        ),
    },
    {
        "name": "Secondary Skill Program",
        "description": (
            "Five secondary skills at creation plus one each at levels 3, 5, 7, 10, and 12. "
            "Secondary pool matches the related list above; no O.C.C. percentage bonus (WB5 p. 64)."
        ),
    },
    {
        "name": "Education Modifiers Option",
        "description": (
            "Survival Guide Education Modifiers alternative to the Basic Nightbane skill package (core p. 89). "
            "Suitable for Wampyrs and NPCs; G.M. may allow free choice of background when appropriate (WB5 p. 61)."
        ),
    },
    {
        "name": "GM Skill Flexibility",
        "description": (
            "Education backgrounds are guidelines — the G.M. may approve related skills outside the listed "
            "groupings when the player provides a convincing occupation-specific reason (WB5 p. 61; parent `packageNotes`)."
        ),
    },
    {
        "name": "Morphus Innate Combat",
        "description": (
            "When the character is a Nightbane (`race_nightbane`), Morphus form uses innate Hand to Hand: Martial Arts "
            "(+1 melee action and Morphus combat bonuses on the race row) — independent of Facade H2H included here (core pp. 88–89)."
        ),
    },
    {
        "name": "Starting Resources",
        "description": (
            "WB5 does not list starting cash for Education Modifiers rows. Professional first responders align with the core "
            "civilian baseline — encoded `finances` uses 3D6×100. Department-issued or personally owned service gear varies by "
            "occupation; law enforcement may include duty sidearm (WB5 pp. 63–64; core pp. 89–90)."
        ),
    },
]

RESCUE_FIRST_RESPONDER_STARTING_EQUIPMENT = {
    "miscellaneous": [
        "Service vehicle — automobile (+12%) or truck (+16%) per core pilot pick",
        "Radio and communications gear (Radio: Basic +20% in core)",
        "First-aid / paramedic kit, climbing rope, or firefighting tools per occupation",
        "Work uniform, turnout gear, or law-enforcement duty belt as background-dependent",
        "Computer or dispatch equipment (Computer Operation +20% in core)",
        "Law enforcement: duty sidearm and any Modern W.P. the G.M. allows despite civilian restrictions",
        "Disaster-relief or agency identifiers when affiliated with a department or volunteer unit",
    ],
}

RESCUE_FIRST_RESPONDER_FINANCES = {"startingCashFormula": "3D6*100"}

LABORER_LIGHT_CLASS_ABILITIES = [
    {
        "name": "Unskilled or Semi-Skilled Laborer Background",
        "description": (
            "Unskilled or semi-skilled worker — probably finished high school and possibly one or two years of "
            "college or vocational education. Practical hands-on skills over professional credentials (WB5 p. 64)."
        ),
    },
    {
        "name": "Age 17+ Worker",
        "description": (
            "Can be age 17 and older. Work specialty (warehouse, maintenance, domestic services, light trades, etc.) "
            "should inform the +15% cluster pick and starting gear (WB5 p. 64)."
        ),
    },
    {
        "name": "Facade Hand to Hand",
        "description": (
            "Hand to Hand: Basic is included. Upgrade to Expert for two related-skill selections, "
            "or Martial Arts for three (WB5 p. 64). Assassin remains available per civilian upgrade table "
            "when alignment permits (`handToHandRules`). Facade only — see Morphus Innate Combat for Nightbane."
        ),
    },
    {
        "name": "Civilian Weapon Proficiencies",
        "description": (
            "Related W.P. selections exclude Pole Arm, Whip, Automatic Rifle, and Heavy (Military) — "
            "civilian arms only (WB5 p. 64)."
        ),
    },
    {
        "name": "Work Specialty Cluster (+15%)",
        "description": (
            "Select three related skills from one work area — Communications, Domestic, Mechanical, Science, or Technical — "
            "all three at +15%. Communications is otherwise unavailable except through this cluster. "
            "G.M. adjudicates mixed-category edge cases (WB5 p. 64; parent `packageNotes`)."
        ),
    },
    {
        "name": "Practical Core Skills",
        "description": (
            "Core package includes Aerobic Athletics, Computer Operation (+20%), General Repair & Maintenance (+15%), "
            "and Automobile or Truck (+10%) — reflects a working-class job before the Becoming (WB5 p. 64)."
        ),
    },
    {
        "name": "Related Skill Advancement",
        "description": (
            "Eight related skills at creation (three work-cluster + five choice); gain one additional related skill "
            "at levels 3, 6, 9, and 12. All new related picks start at 1st-level proficiency (WB5 p. 64)."
        ),
    },
    {
        "name": "Secondary Skill Program",
        "description": (
            "Four secondary skills at creation plus one each at levels 3, 5, 7, 10, and 13. "
            "Secondary pool matches the related list above; no O.C.C. percentage bonus (WB5 p. 64)."
        ),
    },
    {
        "name": "Education Modifiers Option",
        "description": (
            "Survival Guide Education Modifiers alternative to the Basic Nightbane skill package (core p. 89). "
            "Suitable for Wampyrs and NPCs; G.M. may allow free choice of background when appropriate (WB5 p. 61)."
        ),
    },
    {
        "name": "GM Skill Flexibility",
        "description": (
            "Education backgrounds are guidelines — the G.M. may approve related skills outside the listed "
            "groupings when the player provides a convincing work-background reason (WB5 p. 61; parent `packageNotes`)."
        ),
    },
    {
        "name": "Morphus Innate Combat",
        "description": (
            "When the character is a Nightbane (`race_nightbane`), Morphus form uses innate Hand to Hand: Martial Arts "
            "(+1 melee action and Morphus combat bonuses on the race row) — independent of Facade H2H included here (core pp. 88–89)."
        ),
    },
    {
        "name": "Starting Resources",
        "description": (
            "WB5 does not list starting cash for Education Modifiers rows. Working laborers align with the core "
            "civilian baseline — encoded `finances` uses 3D6×100. Likely owns work clothes, basic tools, and an "
            "automobile or truck (+10%) (WB5 p. 64; core pp. 89–90)."
        ),
    },
]

LABORER_LIGHT_STARTING_EQUIPMENT = {
    "miscellaneous": [
        "Work clothes, boots, gloves, and personal effects",
        "Basic hand tools or job-specific kit for the chosen +15% work cluster",
        "Automobile or truck per core pilot pick (+10%)",
        "Lunch box, water bottle, and everyday worker odds and ends",
        "Hard hat or safety gear when the work specialty warrants it (background-dependent)",
        "No military weapons — civilian work gear only (WB5 p. 64)",
    ],
}

LABORER_LIGHT_FINANCES = {"startingCashFormula": "3D6*100"}

LABORER_HEAVY_CONSTRUCTION_CLASS_ABILITIES = [
    {
        "name": "Skilled Construction Laborer Background",
        "description": (
            "Skilled laborer with high school plus 1D6 years of college or trade-school/vocational training — "
            "construction, carpentry, crane operator, mechanical engineering, and similar trades (WB5 p. 64)."
        ),
    },
    {
        "name": "Age 21+ Tradesworker",
        "description": (
            "Can be age 21 and older. Trade specialty should inform the +20% cluster pick (Electrical, Mechanical, "
            "Pilot, or Technical) and starting gear — e.g. Boat Building, Carpentry, Construction, Excavation (WB5 p. 64)."
        ),
    },
    {
        "name": "Facade Hand to Hand",
        "description": (
            "Hand to Hand: Basic is included. Upgrade to Expert for two related-skill selections, "
            "or Martial Arts for three (WB5 p. 64). Assassin remains available per civilian upgrade table "
            "when alignment permits (`handToHandRules`). Facade only — see Morphus Innate Combat for Nightbane."
        ),
    },
    {
        "name": "Construction Weapon Proficiencies",
        "description": (
            "Related W.P. selections exclude Pole Arm, Whip, and Heavy (Military) only — "
            "automatic rifles are not listed among exclusions (WB5 p. 64)."
        ),
    },
    {
        "name": "Work Specialty Cluster (+20%)",
        "description": (
            "Select three related skills from one work specialty — Electrical, Mechanical, Pilot, or Technical — "
            "all three at +20%. G.M. adjudicates mixed-category edge cases (WB5 p. 64; parent `packageNotes`)."
        ),
    },
    {
        "name": "Construction Core Skills",
        "description": (
            "Core package includes Barter (+16%), Computer Operation (+30%), General Repair & Maintenance (+20%), "
            "Jury-Rig (+15%), Physical Labor, Radio: Basic (+10%), Salvage (+15%), and Automobile or Truck (+10%) "
            "(WB5 p. 64)."
        ),
    },
    {
        "name": "Demolition Military Access",
        "description": (
            "Military related skills are limited to Demolitions skills only (+20%) — "
            "reflects construction/demolition trade training, not full military program (WB5 p. 64)."
        ),
    },
    {
        "name": "Science Chemistry and Math Bonus",
        "description": (
            "Science related skills gain +5% generally; Chemistry and Math: Advanced gain +10% when taken "
            "from the Science category (`skillSpecificOverrides` on related rules) (WB5 p. 64)."
        ),
    },
    {
        "name": "Related Skill Advancement",
        "description": (
            "Ten related skills at creation (three specialty cluster + seven choice); gain one additional related skill "
            "at levels 3, 6, 9, and 12. All new related picks start at 1st-level proficiency (WB5 p. 64)."
        ),
    },
    {
        "name": "Secondary Skill Program",
        "description": (
            "Six secondary skills at creation plus one each at levels 3, 6, 9, and 13. "
            "Secondary pool matches the related list above; no O.C.C. percentage bonus (WB5 p. 64)."
        ),
    },
    {
        "name": "Education Modifiers Option",
        "description": (
            "Survival Guide Education Modifiers alternative to the Basic Nightbane skill package (core p. 89). "
            "Suitable for Wampyrs and NPCs; G.M. may allow free choice of background when appropriate (WB5 p. 61)."
        ),
    },
    {
        "name": "GM Skill Flexibility",
        "description": (
            "Education backgrounds are guidelines — the G.M. may approve related skills outside the listed "
            "groupings when the player provides a convincing trade-background reason (WB5 p. 61; parent `packageNotes`)."
        ),
    },
    {
        "name": "Morphus Innate Combat",
        "description": (
            "When the character is a Nightbane (`race_nightbane`), Morphus form uses innate Hand to Hand: Martial Arts "
            "(+1 melee action and Morphus combat bonuses on the race row) — independent of Facade H2H included here (core pp. 88–89)."
        ),
    },
    {
        "name": "Starting Resources",
        "description": (
            "WB5 does not list starting cash for Education Modifiers rows. Skilled tradesworkers align with the core "
            "civilian baseline — encoded `finances` uses 3D6×100. Likely owns trade tools, safety gear, truck, and "
            "job-site equipment (WB5 p. 64; core pp. 89–90)."
        ),
    },
]

LABORER_HEAVY_CONSTRUCTION_STARTING_EQUIPMENT = {
    "miscellaneous": [
        "Hard hat, safety vest, steel-toe boots, and work clothing",
        "Heavy tool belt, hand tools, and power tools for the chosen trade specialty",
        "Automobile or truck per core pilot pick (+10%)",
        "Two-way radio (Radio: Basic +10% in core)",
        "Blueprints, measuring tape, and construction-site odds and ends",
        "Demolition or salvage gear when the work specialty warrants it (background-dependent)",
        "W.P. gear per related picks — pole arm, whip, and heavy military excluded (WB5 p. 64)",
    ],
}

LABORER_HEAVY_CONSTRUCTION_FINANCES = {"startingCashFormula": "3D6*100"}

MECHANIC_REPAIR_CLASS_ABILITIES = [
    {
        "name": "Skilled Mechanic Background",
        "description": (
            "Skilled mechanic — may be a high school dropout with on-the-job/vocational training or a college graduate. "
            "Repair, salvage, and jury-rig expertise over combat training (WB5 pp. 64–65)."
        ),
    },
    {
        "name": "Age 18+ Tradesperson",
        "description": (
            "Can be age 18 and older. Specialty (automotive, aircraft, general repair, etc.) should inform the "
            "four Mechanical picks at +15% and starting gear (WB5 pp. 64–65)."
        ),
    },
    {
        "name": "Facade Hand to Hand",
        "description": (
            "Hand to Hand: Basic is included. Upgrade to Expert for two related-skill selections, "
            "or Martial Arts for three (WB5 pp. 64–65). Assassin remains available per civilian upgrade table "
            "when alignment permits (`handToHandRules`). Facade only — see Morphus Innate Combat for Nightbane."
        ),
    },
    {
        "name": "Civilian Weapon Proficiencies",
        "description": (
            "Related W.P. selections exclude Pole Arm, Whip, Automatic Rifle, and Heavy (Military) — "
            "civilian arms only (WB5 p. 65)."
        ),
    },
    {
        "name": "Mechanical Specialty (+15%)",
        "description": (
            "Select four Mechanical related skills as the character's area of specialty — each at +15%. "
            "Mechanical category also grants +10% on other Mechanical picks per related rules (WB5 pp. 64–65; parent `packageNotes`)."
        ),
    },
    {
        "name": "Mechanic Core Skills",
        "description": (
            "Core package includes Basic Electronics (+15%), Computer Operation (+25%), General Repair & Maintenance (+20%), "
            "Jury-Rig (+10%), Salvage (+15%), and Pilot: Automobile (+10%) — hands-on repair foundation (WB5 pp. 64–65)."
        ),
    },
    {
        "name": "Limited Rogue Access",
        "description": (
            "Rogue related skills are limited to Find Contraband, Netwise, Palming, and Roadwise (+5%) — "
            "scrounging and street-smart picks for salvage mechanics, not full criminal program (WB5 p. 65)."
        ),
    },
    {
        "name": "Related Skill Advancement",
        "description": (
            "Nine related skills at creation (four Mechanical specialty + five choice); gain one additional related skill "
            "at levels 3, 6, 9, and 12. All new related picks start at 1st-level proficiency (WB5 pp. 64–65)."
        ),
    },
    {
        "name": "Secondary Skill Program",
        "description": (
            "Four secondary skills at creation plus one each at levels 3, 5, 7, 10, and 13. "
            "Secondary pool matches the related list above; no O.C.C. percentage bonus (WB5 p. 65)."
        ),
    },
    {
        "name": "Education Modifiers Option",
        "description": (
            "Survival Guide Education Modifiers alternative to the Basic Nightbane skill package (core p. 89). "
            "Suitable for Wampyrs and NPCs; G.M. may allow free choice of background when appropriate (WB5 p. 61)."
        ),
    },
    {
        "name": "GM Skill Flexibility",
        "description": (
            "Education backgrounds are guidelines — the G.M. may approve related skills outside the listed "
            "groupings when the player provides a convincing mechanic-background reason (WB5 p. 61; parent `packageNotes`)."
        ),
    },
    {
        "name": "Morphus Innate Combat",
        "description": (
            "When the character is a Nightbane (`race_nightbane`), Morphus form uses innate Hand to Hand: Martial Arts "
            "(+1 melee action and Morphus combat bonuses on the race row) — independent of Facade H2H included here (core pp. 88–89)."
        ),
    },
    {
        "name": "Starting Resources",
        "description": (
            "WB5 does not list starting cash for Education Modifiers rows. Skilled mechanics align with the core "
            "civilian baseline — encoded `finances` uses 3D6×100. Likely owns tool chest, diagnostic gear, automobile, "
            "and salvaged parts (WB5 pp. 64–65; core pp. 89–90)."
        ),
    },
]

MECHANIC_REPAIR_STARTING_EQUIPMENT = {
    "miscellaneous": [
        "Tool chest, wrenches, sockets, and mechanic hand tools",
        "Diagnostic equipment, multimeter, and Basic Electronics kit (+15% in core)",
        "Automobile per core pilot skill (+10%)",
        "Coveralls or shop clothing and work gloves",
        "Salvaged parts, scrap metal, and jury-rig materials (Salvage +15% in core)",
        "Two-way radio when background-appropriate (Radio: Basic available in related list)",
        "No military weapons — civilian shop gear only (WB5 pp. 64–65)",
    ],
}

MECHANIC_REPAIR_FINANCES = {"startingCashFormula": "3D6*100"}

COMPUTER_ELECTRONICS_CLASS_ABILITIES = [
    {
        "name": "Computer and Electronics Expert Background",
        "description": (
            "High school dropout with self-taught computer/electronics talent, or graduate of high school, trade school, "
            "or college — deep digital skill stack over physical or wilderness training (WB5 p. 65)."
        ),
    },
    {
        "name": "Age 16+ Tech Specialist",
        "description": (
            "Can be age 16 and older. Education path (self-taught hacker, trade-school technician, or CS graduate) "
            "should inform Communications/Technical +15% picks and starting gear (WB5 p. 65)."
        ),
    },
    {
        "name": "Facade Hand to Hand",
        "description": (
            "Hand to Hand: Basic is included. Upgrade to Expert for two related-skill selections, "
            "or Martial Arts for three (WB5 p. 65). Assassin remains available per civilian upgrade table "
            "when alignment permits (`handToHandRules`). Facade only — see Morphus Innate Combat for Nightbane."
        ),
    },
    {
        "name": "Civilian Weapon Proficiencies",
        "description": (
            "Related W.P. selections exclude Pole Arm, Whip, Automatic Rifle, and Heavy (Military) — "
            "civilian arms only (WB5 p. 65)."
        ),
    },
    {
        "name": "Digital Core Skills",
        "description": (
            "Core package includes Computer Hacking (+25%), Computer Operation (+30%), Computer Programming (+30%), "
            "Computer Repair (+20%), Netwise (+25%), Literacy (+40%), and Math: Basic (+30%) — "
            "allotted R.C.C. Rogue skills are in core; no additional Rogue related picks (WB5 p. 65)."
        ),
    },
    {
        "name": "Communications and Technical Minimums (+15%)",
        "description": (
            "At level 1 select two Communications skills and two Technical skills — each at +15%. "
            "Plus six additional related picks from the list below (WB5 p. 65)."
        ),
    },
    {
        "name": "Technical Lore Bonus",
        "description": (
            "Technical related skills grant +10% only on Lore-type picks plus Mythology, Philosophy, Photography, "
            "Research, and Creative Writing — not all Technical skills (`skillSpecificOverrides` on related rules) (WB5 p. 65)."
        ),
    },
    {
        "name": "Limited Physical and No Wilderness",
        "description": (
            "Physical related skills any except Acrobatics and Boxing. Wilderness unavailable — "
            "urban/digital specialist, not outdoors survivalist (WB5 p. 65)."
        ),
    },
    {
        "name": "Related Skill Advancement",
        "description": (
            "Ten related skills at creation (two Communications + two Technical + six choice); gain one additional related skill "
            "at levels 3, 6, 9, and 12. All new related picks start at 1st-level proficiency (WB5 p. 65)."
        ),
    },
    {
        "name": "Secondary Skill Program",
        "description": (
            "Five secondary skills at creation plus one each at levels 3, 6, 9, and 12. "
            "Secondary pool matches the related list above; no O.C.C. percentage bonus (WB5 p. 65)."
        ),
    },
    {
        "name": "Education Modifiers Option",
        "description": (
            "Survival Guide Education Modifiers alternative to the Basic Nightbane skill package (core p. 89). "
            "Suitable for Wampyrs and NPCs; G.M. may allow free choice of background when appropriate (WB5 p. 61)."
        ),
    },
    {
        "name": "GM Skill Flexibility",
        "description": (
            "Education backgrounds are guidelines — the G.M. may approve related skills outside the listed "
            "groupings when the player provides a convincing tech-background reason (WB5 p. 61; parent `packageNotes`)."
        ),
    },
    {
        "name": "Morphus Innate Combat",
        "description": (
            "When the character is a Nightbane (`race_nightbane`), Morphus form uses innate Hand to Hand: Martial Arts "
            "(+1 melee action and Morphus combat bonuses on the race row) — independent of Facade H2H included here (core pp. 88–89)."
        ),
    },
    {
        "name": "Starting Resources",
        "description": (
            "WB5 does not list starting cash for Education Modifiers rows. Tech specialists align with the core "
            "civilian baseline — encoded `finances` uses 3D6×100. Likely owns multiple computers, networking gear, "
            "and electronics bench equipment (WB5 p. 65; core pp. 89–90)."
        ),
    },
]

COMPUTER_ELECTRONICS_STARTING_EQUIPMENT = {
    "miscellaneous": [
        "Desktop PC, laptop, handheld devices, and networking hardware",
        "Coding manuals, electronics references, and tech textbooks",
        "Electronics bench tools, soldering kit, and spare components",
        "Automobile or bicycle per core pilot skills (Automobile +6% or Bicycling +4%)",
        "Modems, cables, and hacker/technician odds and ends as background-dependent",
        "No military weapons — civilian tech gear only (WB5 p. 65)",
    ],
}

COMPUTER_ELECTRONICS_FINANCES = {"startingCashFormula": "3D6*100"}

MILITARY_SOLDIER_CLASS_ABILITIES = [
    {
        "name": "Ex-Military Service Background",
        "description": (
            "Completed high school (and possibly some college) or dropped out before joining the military — "
            "likely ex-Army, Air Force, Navy, or Marine, honorably discharged or AWOL after the Becoming (WB5 p. 65)."
        ),
    },
    {
        "name": "Age 20+ Veteran",
        "description": (
            "Age 20 and older. Branch, MOS, and discharge status (honorable vs AWOL) should inform skill picks "
            "and starting gear (WB5 p. 65)."
        ),
    },
    {
        "name": "Facade Hand to Hand",
        "description": (
            "Hand to Hand: Basic is included. Upgrade to Expert for one related-skill selection, "
            "or Martial Arts for two (WB5 p. 65). Applies to the Facade only — see Morphus Innate Combat for Nightbane (`handToHandRules`)."
        ),
    },
    {
        "name": "Any Weapon Proficiencies",
        "description": (
            "Core package includes W.P. Knife and W.P. Automatic Rifle; related W.P. selections include "
            "any weapon proficiency — military arms and heavy weapons allowed (WB5 p. 65)."
        ),
    },
    {
        "name": "Military Core Skills",
        "description": (
            "Core package includes Climbing (+20%), Military Etiquette (+20%), Radio: Basic (+20%), Running, "
            "and service-oriented academics — reflects formal military training (WB5 p. 65)."
        ),
    },
    {
        "name": "Military and Communications Minimums (+20%)",
        "description": (
            "At level 1 select three Military skills, two Physical skills, two Communications or Espionage skills, "
            "and two W.P.s — Military and Communications/Espionage minimum picks gain +20% "
            "(not applicable to Physical skills). Plus five additional related choices (WB5 p. 65; parent `packageNotes`)."
        ),
    },
    {
        "name": "Broad Military Related Access",
        "description": (
            "Full related pool — Communications (+15%), Military (+15%), Medical (+10%), Pilot/Pilot Related (+10%), "
            "Wilderness (+10%), Rogue any, and W.P. any. Science limited to Astronomy and Math: Advanced (+10%) (WB5 p. 65)."
        ),
    },
    {
        "name": "Related Skill Advancement",
        "description": (
            "Fourteen related skills at creation (minimums above + five choice); gain one additional related skill "
            "at levels 3, 6, 9, and 12. All new related picks start at 1st-level proficiency (WB5 p. 65)."
        ),
    },
    {
        "name": "Secondary Skill Program",
        "description": (
            "Five secondary skills at creation plus one each at levels 3, 6, 9, and 12. "
            "Secondary pool matches the related list above; no O.C.C. percentage bonus (WB5 p. 65)."
        ),
    },
    {
        "name": "Education Modifiers Option",
        "description": (
            "Survival Guide Education Modifiers alternative to the Basic Nightbane skill package (core p. 89). "
            "Suitable for Wampyrs and NPCs; G.M. may allow free choice of background when appropriate (WB5 p. 61)."
        ),
    },
    {
        "name": "GM Skill Flexibility",
        "description": (
            "Education backgrounds are guidelines — the G.M. may approve related skills outside the listed "
            "groupings when the player provides a convincing service-background reason (WB5 p. 61; parent `packageNotes`)."
        ),
    },
    {
        "name": "Morphus Innate Combat",
        "description": (
            "When the character is a Nightbane (`race_nightbane`), Morphus form uses innate Hand to Hand: Martial Arts "
            "(+1 melee action and Morphus combat bonuses on the race row) — independent of Facade H2H included here (core pp. 88–89)."
        ),
    },
    {
        "name": "Starting Resources",
        "description": (
            "WB5 does not list starting cash for Education Modifiers rows. Ex-military characters align with the core "
            "civilian baseline — encoded `finances` uses 3D6×100. Likely retains service rifle, knife, radio, "
            "uniform or civvies, and personal vehicle (WB5 p. 65; core pp. 89–90)."
        ),
    },
]

MILITARY_SOLDIER_STARTING_EQUIPMENT = {
    "miscellaneous": [
        "Service rifle and knife matching core W.P.s (Automatic Rifle and Knife)",
        "Two additional W.P. weapons per related minimum picks",
        "Military uniform, BDUs, or civilian clothes post-discharge",
        "Two-way radio (Radio: Basic +20% in core)",
        "Automobile per core pilot skill (+10%)",
        "Field pack, canteen, and basic survival gear from service issue",
        "Dog tags, discharge papers, or AWOL fugitive status items as background-dependent",
    ],
}

MILITARY_SOLDIER_FINANCES = {"startingCashFormula": "3D6*100"}


def grant(skill_id: str, bonus: int = 0, base: int | None = None) -> dict[str, Any]:
    row: dict[str, Any] = {"skillId": skill_id, "bonusPercent": bonus}
    if base is not None:
        row["basePercent"] = base
    return row


def choice(
    count: int,
    label: str,
    bonus: int = 0,
    categories: list[str] | None = None,
    skill_ids: list[str] | None = None,
    overrides: dict[str, int] | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "choiceCount": count,
        "bonusPercent": bonus,
        "label": label,
    }
    if categories:
        row["allowedCategories"] = categories
    if skill_ids:
        row["allowedSkillIds"] = skill_ids
    if overrides:
        row["skillSpecificOverrides"] = overrides
    return row


def rule(
    category: str,
    access: str,
    bonus: int = 0,
    exceptions: list[str] | None = None,
    overrides: dict[str, int] | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "categoryName": category,
        "accessType": access,
        "bonusPercent": bonus,
    }
    if exceptions:
        row["exceptions"] = exceptions
    if overrides:
        row["skillSpecificOverrides"] = overrides
    return row


def related(
    slots: int,
    rules: list[dict[str, Any]],
    minimums: list[dict[str, Any]] | None = None,
    vouchers: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    block: dict[str, Any] = {
        "replaceBaseline": True,
        "initialSlotsCount": slots,
        "categoryRules": rules,
    }
    if vouchers:
        block["skillVouchers"] = vouchers
    elif minimums:
        block["categoryMinimums"] = minimums
    return block


def related_voucher(
    voucher_id: str,
    count: int,
    *,
    label: str | None = None,
    cluster_bonus: int | None = None,
    cluster_options: list[str] | None = None,
    or_branches: list[str] | None = None,
    categories: list[str] | None = None,
    skill_ids: list[str] | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {"id": voucher_id, "choiceCount": count}
    if label:
        row["label"] = label
    if cluster_bonus is not None:
        row["clusterBonusPercent"] = cluster_bonus
    if cluster_options:
        row["clusterCategoryOptions"] = cluster_options
    if or_branches:
        row["orCategoryBranches"] = or_branches
    if categories:
        row["allowedCategories"] = categories
    if skill_ids:
        row["allowedSkillIds"] = skill_ids
    return row


def level_related(levels: list[int], quantity: int = 1) -> list[dict[str, Any]]:
    return [
        {"levelUnlocked": level, "quantity": quantity, "poolSource": "related"}
        for level in levels
    ]


def level_secondary(levels: list[int], quantity: int = 1) -> list[dict[str, Any]]:
    return [
        {"levelUnlocked": level, "quantity": quantity, "poolSource": "secondary"}
        for level in levels
    ]


def secondary(count: int, levels: list[int]) -> dict[str, Any]:
    return {
        "initialSlotsCount": count,
        "forbiddenCategories": [],
    }, level_secondary(levels)


def wp_rules(forbidden: list[str], core: list[str] | None = None) -> dict[str, Any]:
    return {"coreWps": core or [], "forbiddenWps": forbidden}


def spec(
    spec_id: str,
    name: str,
    roll_range: str,
    prose: str,
    *,
    core: list[dict[str, Any]],
    related_block: dict[str, Any],
    secondary_count: int,
    secondary_levels: list[int],
    related_levels: list[int],
    related_qty: int = 1,
    hth: dict[str, Any],
    wps: dict[str, Any],
    minimums: list[dict[str, Any]] | None = None,
    vouchers: list[dict[str, Any]] | None = None,
    class_abilities: list[dict[str, Any]] | None = None,
    starting_equipment: dict[str, Any] | None = None,
    finances: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if vouchers:
        related_block = {**related_block, "skillVouchers": vouchers}
    elif minimums:
        related_block = {**related_block, "categoryMinimums": minimums}
    sec, sec_levels = secondary(secondary_count, secondary_levels)
    row: dict[str, Any] = {
        "id": spec_id,
        "name": name,
        "description": f"{roll_range} — {prose}",
        "occSkillsCore": core,
        "occRelatedSkills": related_block,
        "secondarySkills": sec,
        "levelUpSkillChoices": level_related(related_levels, related_qty)
        + sec_levels,
        "handToHandRules": hth,
        "wpRules": wps,
    }
    if class_abilities:
        row["classAbilities"] = class_abilities
    if starting_equipment:
        row["startingEquipment"] = starting_equipment
    if finances:
        row["finances"] = finances
    return row


def build_specializations() -> list[dict[str, Any]]:
    specs: list[dict[str, Any]] = []

    specs.append(
        spec(
            "street_schooled",
            "Street Schooled",
            "01-10%",
            (
                "Runaway, impoverished, dropout, NSB fugitive, orphan, or other street survivor with no formal education — "
                "skills learned from people and experience on the streets. Life on the streets means scrounging, salvaging, "
                "begging, bartering, odd jobs, and petty theft. Typical age 12–20 in a big city; any age allowed."
            ),
            core=[
                choice(
                    1,
                    "Bicycling (+16%) or Pilot: Automobile (+4%)",
                    0,
                    skill_ids=["skill_bicycling", "skill_automobile"],
                    overrides={"skill_bicycling": 16, "skill_automobile": 4},
                ),
                grant("skill_barter", 12),
                grant("skill_begging", 20),
                grant("skill_language", 10),
                grant("skill_literacy", 5),
                choice(1, "Lore: Nightbane or Lore: Nightlands (+25%)", 25, skill_ids=["skill_lore_nightbane", "skill_lore_nightlands"]),
                grant("skill_roadwise", 12),
                grant("skill_salvage", 15),
                grant("skill_streetwise", 30),
                choice(1, "W.P. Knife or W.P. Blunt", 0, skill_ids=["wp_knife", "wp_blunt"]),
            ],
            related_block=related(
                6,
                [
                    rule("Communications", "only", 0, ["skill_radio_basic"]),
                    rule("Domestic", "any", 5),
                    rule("Electrical", "only", 0, ["skill_basic_electronics"]),
                    rule("Espionage", "only", 0, ["skill_detect_ambush", "skill_detect_concealment", "skill_disguise"]),
                    rule("Mechanical", "only", 0, ["skill_automotive_mechanics", "skill_basic_mechanics"]),
                    rule("Medical", "none", 0),
                    rule("Military", "none", 0),
                    rule("Physical", "except", 0, ["skill_acrobatics", "skill_gymnastics", "skill_scuba"]),
                    rule("Pilot", "only", 0, STREET_PILOT_ONLY, {"skill_automobile": 6, "skill_bicycling": 10, "skill_motorcycle": 10, "skill_truck": 10}),
                    rule("Pilot Related", "none", 0),
                    rule("Rogue", "except", 5, ["skill_computer_hacking", "skill_computer_programming", "skill_computer_repair", "skill_computer_operation", "skill_netwise", "skill_safe_cracking"]),
                    rule("Science", "only", 0, ["skill_math_basic"]),
                    rule("Technical", "any", 0, overrides={"skill_lore_magic": 10, "skill_lore_factions": 10, "skill_lore_nightbane": 10, "skill_lore_nightlands": 10, "skill_lore_demons_and_monsters": 10}),
                    rule("Weapon Proficiencies", "any", 0),
                    rule("Wilderness", "none", 0),
                ],
            ),
            vouchers=[
                related_voucher("related_rogue", 1, label="One Rogue skill", categories=["Rogue"]),
                related_voucher("related_domestic", 1, label="One Domestic skill", categories=["Domestic"]),
                related_voucher("related_technical", 1, label="One Technical skill", categories=["Technical"]),
            ],
            secondary_count=3,
            secondary_levels=[3, 5, 7, 9, 11, 13],
            related_levels=[3, 6, 9, 13],
            hth=HTH_CIVILIAN,
            wps=wp_rules(WP_FORBIDDEN_CIVILIAN),
            class_abilities=STREET_SCHOOLED_CLASS_ABILITIES,
            starting_equipment=STREET_SCHOOLED_STARTING_EQUIPMENT,
            finances=STREET_SCHOOLED_FINANCES,
        )
    )

    specs.append(
        spec(
            "street_thug",
            "Street Thug",
            "11-20%",
            (
                "Runaway, dropout, orphan, or poverty victim with no formal education who grew up on the streets — "
                "fell in with the wrong crowd and survived as small-time criminal and street muscle. "
                "Typical age 16–30 in a big city; any age allowed."
            ),
            core=[
                grant("skill_language", 15),
                grant("skill_literacy", 10),
                choice(1, "Lore: Nightlands or Lore: Factions (+25%)", 25, skill_ids=["skill_lore_nightlands", "skill_lore_factions"]),
                choice(1, "Body Building, Wrestling, or Boxing", 0, skill_ids=["skill_body_building_weight_lifting", "skill_wrestling", "skill_boxing"]),
                grant("skill_roadwise", 10),
                grant("skill_streetwise", 30),
                grant("skill_streetwise_drugs", 25),
                choice(1, "W.P. Knife or W.P. Blunt", 0, skill_ids=["wp_knife", "wp_blunt"]),
            ],
            related_block=related(
                7,
                [
                    rule("Communications", "only", 0, ["skill_radio_basic"]),
                    rule("Domestic", "any", 0),
                    rule("Electrical", "only", 0, ["skill_basic_electronics"]),
                    rule("Espionage", "except", 10, ["skill_sniper", "skill_tracking", "skill_wilderness_survival"]),
                    rule("Mechanical", "only", 5, ["skill_automotive_mechanics", "skill_basic_mechanics"]),
                    rule("Medical", "only", 0, ["skill_first_aid"]),
                    rule("Military", "only", 10, ["skill_recognize_weapon_quality"]),
                    rule("Physical", "except", 0, ["skill_acrobatics", "skill_gymnastics", "skill_scuba"]),
                    rule("Pilot", "only", 0, STREET_PILOT_ONLY + ["skill_combat_driving"], {"skill_automobile": 6, "skill_bicycling": 10, "skill_motorcycle": 10, "skill_truck": 10}),
                    rule("Pilot Related", "none", 0),
                    rule("Rogue", "any", 10),
                    rule("Science", "only", 10, ["skill_math_basic"]),
                    rule("Technical", "any", 5),
                    rule("Weapon Proficiencies", "any", 0),
                    rule("Wilderness", "none", 0),
                ],
            ),
            vouchers=[
                related_voucher("related_espionage", 2, label="Two Espionage skills", categories=["Espionage"]),
                related_voucher("related_rogue", 2, label="Two Rogue skills", categories=["Rogue"]),
                related_voucher("related_physical", 1, label="One Physical skill", categories=["Physical"]),
            ],
            secondary_count=3,
            secondary_levels=[2, 4, 6, 8, 10, 12, 14],
            related_levels=[3, 6, 9, 12],
            related_qty=2,
            hth=HTH_STREET_THUG,
            wps=wp_rules(WP_FORBIDDEN_NO_POLE_WHIP_HEAVY, core=["wp_automatic_pistol"]),
            class_abilities=STREET_THUG_CLASS_ABILITIES,
            starting_equipment=STREET_THUG_STARTING_EQUIPMENT,
            finances=STREET_THUG_FINANCES,
        )
    )

    specs.append(
        spec(
            "high_school_educated",
            "High School Educated",
            "21-25%",
            (
                "Finished high school before going out to find work or being forced underground after the Becoming. "
                "Typical age 17–21 with little work experience; any age allowed."
            ),
            core=[
                grant("skill_bicycling", 10),
                grant("skill_computer_operation", 15),
                grant("skill_language", 15),
                grant("skill_literacy", 20),
                grant("skill_math_basic", 20),
                grant("skill_automobile", 4),
            ],
            related_block=related(
                9,
                [
                    rule("Communications", "only", 0, ["skill_radio_basic", "skill_tv_video"]),
                    rule("Domestic", "any", 5),
                    rule("Electrical", "only", 0, ["skill_basic_electronics"]),
                    rule("Espionage", "none", 0),
                    rule("Mechanical", "only", 0, ["skill_automotive_mechanics", "skill_basic_mechanics"]),
                    rule("Medical", "only", 0, ["skill_first_aid"]),
                    rule("Military", "none", 0),
                    rule("Physical", "any", 0),
                    rule("Pilot", "except", 0, exceptions=PILOT_EXCLUDE_ADVANCED),
                    rule("Pilot Related", "none", 0),
                    rule("Rogue", "only", 0, ["skill_computer_hacking", "skill_netwise"]),
                    rule("Science", "any", 5),
                    rule("Technical", "any", 10),
                    rule("Weapon Proficiencies", "any", 0),
                    rule("Wilderness", "none", 0),
                ],
            ),
            vouchers=[
                related_voucher("related_domestic", 3, label="Three Domestic skills", categories=["Domestic"]),
                related_voucher("related_technical", 1, label="One Technical skill", categories=["Technical"]),
            ],
            secondary_count=3,
            secondary_levels=[3, 6, 9, 12],
            related_levels=[3, 6, 9, 12],
            hth=HTH_CIVILIAN,
            wps=wp_rules(WP_FORBIDDEN_CIVILIAN),
            class_abilities=HIGH_SCHOOL_EDUCATED_CLASS_ABILITIES,
            starting_equipment=HIGH_SCHOOL_EDUCATED_STARTING_EQUIPMENT,
            finances=HIGH_SCHOOL_EDUCATED_FINANCES,
        )
    )

    # Remaining specs — abbreviated builder calls with full book rules
    specs.append(
        spec(
            "associates_vocational",
            "Associate's Degree or Vocational Training",
            "26-30%",
            (
                "Associate's degree or equivalent two-year college/vocational education. "
                "Typical age 19–25 with little work experience; any age allowed."
            ),
            core=[
                grant("skill_bicycling", 6),
                grant("skill_computer_operation", 20),
                grant("skill_language", 25),
                grant("skill_literacy", 30),
                grant("skill_math_basic", 20),
                grant("skill_automobile", 10),
            ],
            related_block=related(
                10,
                [
                    rule("Communications", "none", 0),
                    rule("Domestic", "any", 10),
                    rule("Electrical", "any", 5),
                    rule("Espionage", "none", 0),
                    rule("Mechanical", "any", 5),
                    rule("Medical", "none", 0),
                    rule("Military", "none", 0),
                    rule("Physical", "except", 0, ["skill_acrobatics"]),
                    rule("Pilot", "except", 0, exceptions=PILOT_EXCLUDE_ADVANCED),
                    rule("Pilot Related", "any", 0),
                    rule("Rogue", "only", 5, ["skill_netwise"]),
                    rule("Science", "any", 10),
                    rule("Technical", "any", 10),
                    rule("Weapon Proficiencies", "any", 0),
                    rule("Wilderness", "any", 0),
                ],
            ),
            vouchers=[
                related_voucher(
                    "related_domestic_or_pilot",
                    2,
                    label="Two Domestic or Pilot skills",
                    or_branches=["Domestic", "Pilot"],
                ),
                related_voucher(
                    "related_vocational_cluster",
                    3,
                    label="Three skills from one special-training category (Communications, Electrical, Medical, Mechanical, or Science) at +10%",
                    cluster_bonus=10,
                    cluster_options=["Communications", "Electrical", "Medical", "Mechanical", "Science"],
                ),
            ],
            secondary_count=4,
            secondary_levels=[3, 5, 7, 10, 13],
            related_levels=[3, 5, 7, 10, 12],
            hth=HTH_CIVILIAN,
            wps=wp_rules(WP_FORBIDDEN_CIVILIAN),
            class_abilities=ASSOCIATES_VOCATIONAL_CLASS_ABILITIES,
            starting_equipment=ASSOCIATES_VOCATIONAL_STARTING_EQUIPMENT,
            finances=ASSOCIATES_VOCATIONAL_FINANCES,
        )
    )

    specs.append(
        spec(
            "college_graduate",
            "College Graduate (Bachelor's Degree)",
            "31-35%",
            (
                "Four-year university graduate or equivalent vocational education in some field. "
                "Typical age 22–28 with minimal work experience; any age allowed."
            ),
            core=[
                grant("skill_bicycling", 6),
                grant("skill_computer_operation", 25),
                grant("skill_language", 30),
                grant("skill_literacy", 40),
                grant("skill_math_basic", 30),
                grant("skill_automobile", 10),
            ],
            related_block=related(
                12,
                [
                    rule("Communications", "none", 0),
                    rule("Domestic", "any", 10),
                    rule("Electrical", "any", 10),
                    rule("Espionage", "none", 0),
                    rule("Mechanical", "any", 10),
                    rule("Medical", "none", 0),
                    rule("Military", "none", 0),
                    rule("Physical", "except", 0, ["skill_acrobatics"]),
                    rule("Pilot", "except", 0, exceptions=PILOT_EXCLUDE_ADVANCED),
                    rule("Pilot Related", "any", 10),
                    rule("Rogue", "only", 10, ["skill_netwise"]),
                    rule("Science", "any", 15),
                    rule("Technical", "any", 10),
                    rule("Weapon Proficiencies", "any", 0),
                    rule("Wilderness", "any", 5),
                ],
            ),
            vouchers=[
                related_voucher(
                    "related_vocational_cluster",
                    3,
                    label="Three skills from one special-training category (Communications, Electrical, Medical, Mechanical, Science, or Technical) at +20%",
                    cluster_bonus=20,
                    cluster_options=["Communications", "Electrical", "Medical", "Mechanical", "Science", "Technical"],
                ),
            ],
            secondary_count=5,
            secondary_levels=[3, 6, 9, 12],
            related_levels=[3, 6, 9, 12],
            hth=HTH_CIVILIAN,
            wps=wp_rules(WP_FORBIDDEN_CIVILIAN),
            class_abilities=COLLEGE_GRADUATE_CLASS_ABILITIES,
            starting_equipment=COLLEGE_GRADUATE_STARTING_EQUIPMENT,
            finances=COLLEGE_GRADUATE_FINANCES,
        )
    )

    specs.append(
        spec(
            "rescue_first_responder",
            "Rescue / First Responder or Law",
            "36-40%",
            (
                "High school graduate with up to 1D4 years of college and special training — firefighter, paramedic, "
                "law enforcement (any branch), disaster relief, or similar; select skills to fit the desired occupation. "
                "Age 22+. Law enforcement may take Espionage skills (+10%) and any Modern W.P. despite general restrictions."
            ),
            core=[
                grant("skill_climbing", 20),
                grant("skill_combat_driving", 0),
                grant("skill_computer_operation", 20),
                grant("skill_paramedic", 20),
                grant("skill_language", 25),
                grant("skill_literacy", 30),
                grant("skill_math_basic", 30),
                choice(
                    1,
                    "Pilot: Automobile (+12%) or Pilot: Truck (+16%)",
                    0,
                    skill_ids=["skill_automobile", "skill_truck"],
                    overrides={"skill_automobile": 12, "skill_truck": 16},
                ),
                grant("skill_radio_basic", 20),
            ],
            related_block=related(
                10,
                [
                    rule("Communications", "any", 15),
                    rule("Domestic", "any", 10),
                    rule("Electrical", "any", 10),
                    rule("Espionage", "none", 0),
                    rule("Mechanical", "any", 10),
                    rule("Medical", "none", 0),
                    rule("Military", "none", 0),
                    rule("Physical", "any", 0),
                    rule("Pilot", "except", 0, exceptions=PILOT_EXCLUDE_NO_JET_SHIPS_TANKS),
                    rule("Pilot Related", "any", 10),
                    rule("Rogue", "only", 10, ["skill_find_contraband", "skill_netwise", "skill_roadwise", "skill_streetwise"]),
                    rule("Science", "any", 10),
                    rule("Technical", "any", 10),
                    rule("Weapon Proficiencies", "any", 0),
                    rule("Wilderness", "any", 10),
                ],
            ),
            vouchers=[
                related_voucher(
                    "related_pilot_or_pilot_related",
                    2,
                    label="Two Pilot or Pilot Related skills",
                    or_branches=["Pilot", "Pilot Related"],
                ),
                related_voucher(
                    "related_first_responder",
                    2,
                    label="Two Medical or Technical skills for first-responder role (e.g. Excavation, Firefighting, Law, Rope Works; +20%)",
                    cluster_bonus=20,
                    or_branches=["Medical", "Technical"],
                ),
            ],
            secondary_count=5,
            secondary_levels=[3, 5, 7, 10, 12],
            related_levels=[3, 5, 7, 10, 12],
            hth=HTH_FIRST_RESPONDER,
            wps=wp_rules(WP_FORBIDDEN_CIVILIAN),
            class_abilities=RESCUE_FIRST_RESPONDER_CLASS_ABILITIES,
            starting_equipment=RESCUE_FIRST_RESPONDER_STARTING_EQUIPMENT,
            finances=RESCUE_FIRST_RESPONDER_FINANCES,
        )
    )

    specs.append(
        spec(
            "laborer_light",
            "Laborer / Worker: Light",
            "41-50%",
            (
                "Unskilled or semi-skilled laborer — probably finished high school and possibly one or two years of "
                "college or vocational education. Age 17+."
            ),
            core=[
                grant("skill_aerobic_athletics", 0),
                grant("skill_computer_operation", 20),
                grant("skill_general_repair_and_maintenance", 15),
                grant("skill_language", 25),
                grant("skill_literacy", 30),
                grant("skill_math_basic", 20),
                choice(1, "Pilot: Automobile or Pilot: Truck (+10%)", 10, skill_ids=["skill_automobile", "skill_truck"]),
            ],
            related_block=related(
                8,
                [
                    rule("Communications", "none", 0),
                    rule("Domestic", "any", 10),
                    rule("Electrical", "any", 5),
                    rule("Espionage", "none", 0),
                    rule("Mechanical", "any", 10),
                    rule("Medical", "only", 5, ["skill_first_aid"]),
                    rule("Military", "none", 0),
                    rule("Physical", "except", 0, ["skill_acrobatics"]),
                    rule("Pilot", "except", 0, exceptions=PILOT_EXCLUDE_JET_AIRCRAFT_FIGHTERS_PACKS_SHIPS_TANKS),
                    rule("Pilot Related", "any", 5),
                    rule("Rogue", "only", 5, ["skill_netwise"]),
                    rule("Science", "any", 10),
                    rule("Technical", "any", 10),
                    rule("Weapon Proficiencies", "any", 0),
                    rule("Wilderness", "any", 0),
                ],
            ),
            vouchers=[
                related_voucher(
                    "related_work_cluster",
                    3,
                    label="Three skills from one work area (Communications, Domestic, Mechanical, Science, or Technical) at +15%",
                    cluster_bonus=15,
                    cluster_options=["Communications", "Domestic", "Mechanical", "Science", "Technical"],
                ),
            ],
            secondary_count=4,
            secondary_levels=[3, 5, 7, 10, 13],
            related_levels=[3, 6, 9, 12],
            hth=HTH_CIVILIAN,
            wps=wp_rules(WP_FORBIDDEN_CIVILIAN),
            class_abilities=LABORER_LIGHT_CLASS_ABILITIES,
            starting_equipment=LABORER_LIGHT_STARTING_EQUIPMENT,
            finances=LABORER_LIGHT_FINANCES,
        )
    )

    specs.append(
        spec(
            "laborer_heavy_construction",
            "Heavy Laborer / Construction",
            "51-60%",
            (
                "Skilled laborer with high school, 1D6 years of college or trade-school/vocational training for the job — "
                "construction, carpentry, crane operator, mechanical engineering, and similar. Age 21+."
            ),
            core=[
                grant("skill_barter", 16),
                grant("skill_computer_operation", 30),
                grant("skill_general_repair_and_maintenance", 20),
                grant("skill_jury_rig", 15),
                grant("skill_language", 25),
                grant("skill_literacy", 30),
                grant("skill_math_basic", 30),
                grant("skill_physical_labor", 0),
                choice(1, "Pilot: Automobile or Pilot: Truck (+10%)", 10, skill_ids=["skill_automobile", "skill_truck"]),
                grant("skill_radio_basic", 10),
                grant("skill_salvage", 15),
            ],
            related_block=related(
                10,
                [
                    rule("Communications", "any", 0),
                    rule("Domestic", "any", 0),
                    rule("Electrical", "any", 10),
                    rule("Espionage", "none", 0),
                    rule("Mechanical", "any", 15),
                    rule("Medical", "only", 10, ["skill_first_aid"]),
                    rule("Military", "only", 20, ["skill_demolitions", "skill_demolitions_disposal", "skill_demolitions_underwater"]),
                    rule("Physical", "except", 0, ["skill_acrobatics"]),
                    rule("Pilot", "except", 0, exceptions=PILOT_EXCLUDE_JET_AIRCRAFT_FIGHTERS_PACKS_SHIPS_TANKS),
                    rule("Pilot Related", "any", 5),
                    rule("Rogue", "none", 0),
                    rule("Science", "any", 5, overrides={"skill_chemistry": 10, "skill_chemistry_analytical": 10, "skill_math_advanced": 10}),
                    rule("Technical", "any", 10),
                    rule("Weapon Proficiencies", "any", 0),
                    rule("Wilderness", "any", 10),
                ],
            ),
            vouchers=[
                related_voucher(
                    "related_work_specialty_cluster",
                    3,
                    label="Three skills from one work specialty (Electrical, Mechanical, Pilot, or Technical) at +20% — e.g. Boat Building, Carpentry, Construction, Excavation",
                    cluster_bonus=20,
                    cluster_options=["Electrical", "Mechanical", "Pilot", "Technical"],
                ),
            ],
            secondary_count=6,
            secondary_levels=[3, 6, 9, 13],
            related_levels=[3, 6, 9, 12],
            hth=HTH_CIVILIAN,
            wps=wp_rules(WP_FORBIDDEN_NO_POLE_WHIP_HEAVY),
            class_abilities=LABORER_HEAVY_CONSTRUCTION_CLASS_ABILITIES,
            starting_equipment=LABORER_HEAVY_CONSTRUCTION_STARTING_EQUIPMENT,
            finances=LABORER_HEAVY_CONSTRUCTION_FINANCES,
        )
    )

    specs.append(
        spec(
            "mechanic_repair",
            "Mechanic & Repair",
            "61-70%",
            (
                "Skilled mechanic — high school dropout with on-the-job/vocational training or a college graduate. "
                "Age 18+."
            ),
            core=[
                grant("skill_basic_electronics", 15),
                grant("skill_computer_operation", 25),
                grant("skill_general_repair_and_maintenance", 20),
                grant("skill_jury_rig", 10),
                grant("skill_language", 25),
                grant("skill_literacy", 30),
                grant("skill_math_basic", 20),
                grant("skill_automobile", 10),
                grant("skill_salvage", 15),
            ],
            related_block=related(
                9,
                [
                    rule("Communications", "only", 0, ["skill_radio_basic"]),
                    rule("Domestic", "any", 5),
                    rule("Electrical", "any", 10),
                    rule("Espionage", "none", 0),
                    rule("Mechanical", "any", 10),
                    rule("Medical", "only", 5, ["skill_first_aid"]),
                    rule("Military", "none", 0),
                    rule("Physical", "except", 0, ["skill_acrobatics"]),
                    rule("Pilot", "except", 0, exceptions=PILOT_EXCLUDE_JET_AIRCRAFT_FIGHTERS_PACKS_SHIPS_TANKS),
                    rule("Pilot Related", "any", 0),
                    rule("Rogue", "only", 5, ["skill_find_contraband", "skill_netwise", "skill_palming", "skill_roadwise"]),
                    rule("Science", "only", 5, CHEMISTRY_AND_MATH),
                    rule("Technical", "any", 5),
                    rule("Weapon Proficiencies", "any", 0),
                    rule("Wilderness", "any", 5),
                ],
            ),
            vouchers=[
                related_voucher(
                    "related_mechanical_specialty",
                    4,
                    label="Four Mechanical specialty skills (+15% each)",
                    cluster_bonus=15,
                    categories=["Mechanical"],
                ),
            ],
            secondary_count=4,
            secondary_levels=[3, 5, 7, 10, 13],
            related_levels=[3, 6, 9, 12],
            hth=HTH_CIVILIAN,
            wps=wp_rules(WP_FORBIDDEN_CIVILIAN),
            class_abilities=MECHANIC_REPAIR_CLASS_ABILITIES,
            starting_equipment=MECHANIC_REPAIR_STARTING_EQUIPMENT,
            finances=MECHANIC_REPAIR_FINANCES,
        )
    )

    specs.append(
        spec(
            "computer_electronics",
            "Computer / Electronics",
            "71-80%",
            (
                "High school dropout with self-taught computer/electronics talent, or graduate of high school, trade school, "
                "or college. Age 16+."
            ),
            core=[
                grant("skill_bicycling", 4),
                grant("skill_computer_hacking", 25),
                grant("skill_computer_operation", 30),
                grant("skill_computer_programming", 30),
                grant("skill_computer_repair", 20),
                grant("skill_language", 30),
                grant("skill_literacy", 40),
                grant("skill_math_basic", 30),
                grant("skill_netwise", 25),
                grant("skill_automobile", 6),
            ],
            related_block=related(
                10,
                [
                    rule("Communications", "any", 10),
                    rule("Domestic", "any", 5),
                    rule("Electrical", "any", 10),
                    rule("Espionage", "none", 0),
                    rule("Mechanical", "only", 10, ["skill_basic_mechanics"]),
                    rule("Medical", "none", 0),
                    rule("Military", "none", 0),
                    rule("Physical", "except", 0, ["skill_acrobatics", "skill_boxing"]),
                    rule("Pilot", "except", 0, exceptions=PILOT_EXCLUDE_ADVANCED),
                    rule("Pilot Related", "any", 10),
                    rule("Rogue", "none", 0),
                    rule("Science", "any", 5),
                    rule("Technical", "any", 0, overrides=TECH_LORE_BONUS_SKILLS),
                    rule("Weapon Proficiencies", "any", 0),
                    rule("Wilderness", "none", 0),
                ],
            ),
            vouchers=[
                related_voucher(
                    "related_communications",
                    2,
                    label="Two Communications skills (+15%)",
                    cluster_bonus=15,
                    categories=["Communications"],
                ),
                related_voucher(
                    "related_technical",
                    2,
                    label="Two Technical skills (+15%)",
                    cluster_bonus=15,
                    categories=["Technical"],
                ),
            ],
            secondary_count=5,
            secondary_levels=[3, 6, 9, 12],
            related_levels=[3, 6, 9, 12],
            hth=HTH_CIVILIAN,
            wps=wp_rules(WP_FORBIDDEN_CIVILIAN),
            class_abilities=COMPUTER_ELECTRONICS_CLASS_ABILITIES,
            starting_equipment=COMPUTER_ELECTRONICS_STARTING_EQUIPMENT,
            finances=COMPUTER_ELECTRONICS_FINANCES,
        )
    )

    specs.append(
        spec(
            "military_soldier",
            "Military / Soldier",
            "81-90%",
            (
                "May have finished high school and some college, or be a dropout who joined the military — "
                "likely ex-Army, Air Force, Navy, or Marine, honorably discharged or AWOL after the Becoming. Age 20+."
            ),
            core=[
                grant("skill_climbing", 20),
                grant("skill_computer_operation", 25),
                grant("skill_language", 30),
                grant("skill_literacy", 35),
                grant("skill_math_basic", 30),
                grant("skill_military_etiquette", 20),
                grant("skill_automobile", 10),
                grant("skill_radio_basic", 20),
                grant("skill_running", 0),
            ],
            related_block=related(
                14,
                [
                    rule("Communications", "any", 15),
                    rule("Domestic", "any", 0),
                    rule("Electrical", "any", 5),
                    rule("Espionage", "any", 5),
                    rule("Mechanical", "any", 10),
                    rule("Medical", "any", 10),
                    rule("Military", "any", 15),
                    rule("Physical", "any", 0),
                    rule("Pilot", "any", 10),
                    rule("Pilot Related", "any", 10),
                    rule("Rogue", "any", 0),
                    rule("Science", "only", 10, ["skill_astronomy", "skill_math_advanced"]),
                    rule("Technical", "any", 5),
                    rule("Weapon Proficiencies", "any", 0),
                    rule("Wilderness", "any", 10),
                ],
            ),
            vouchers=[
                related_voucher(
                    "related_military",
                    3,
                    label="Three Military skills (+20%; not applicable to Physical skills)",
                    cluster_bonus=20,
                    categories=["Military"],
                ),
                related_voucher(
                    "related_physical",
                    2,
                    label="Two Physical skills",
                    categories=["Physical"],
                ),
                related_voucher(
                    "related_comm_or_espionage",
                    2,
                    label="Two Communications or Espionage skills (+20%)",
                    cluster_bonus=20,
                    or_branches=["Communications", "Espionage"],
                ),
                related_voucher(
                    "related_wp_choice",
                    2,
                    label="Two W.P.s of choice",
                    categories=["Weapon Proficiencies"],
                ),
            ],
            secondary_count=5,
            secondary_levels=[3, 6, 9, 12],
            related_levels=[3, 6, 9, 12],
            hth=HTH_FIRST_RESPONDER,
            wps=wp_rules([], core=["wp_knife", "wp_automatic_and_semiautomatic_rifles"]),
            class_abilities=MILITARY_SOLDIER_CLASS_ABILITIES,
            starting_equipment=MILITARY_SOLDIER_STARTING_EQUIPMENT,
            finances=MILITARY_SOLDIER_FINANCES,
        )
    )

    specs.append(
        spec(
            "driver_delivery_trucker",
            "Driver / Delivery / Trucker",
            "91-00%",
            (
                "High school graduate with optional year or two of college or trade-school education — professional driver. "
                "Age 20+."
            ),
            core=[
                grant("skill_combat_driving", 0),
                grant("skill_computer_operation", 15),
                grant("skill_land_navigation", 20),
                grant("skill_language", 25),
                grant("skill_literacy", 30),
                grant("skill_math_basic", 20),
                grant("skill_automobile", 12),
                grant("skill_truck", 20),
                grant("skill_roadwise", 30),
            ],
            related_block=related(
                8,
                [
                    rule("Communications", "only", 0, ["skill_radio_basic"]),
                    rule("Domestic", "any", 10),
                    rule("Electrical", "only", 5, ["skill_basic_electronics"]),
                    rule("Espionage", "none", 0),
                    rule("Mechanical", "only", 10, ["skill_aircraft_mechanics", "skill_automotive_mechanics", "skill_basic_mechanics"]),
                    rule("Medical", "only", 5, ["skill_first_aid"]),
                    rule("Military", "none", 0),
                    rule("Physical", "except", 0, ["skill_acrobatics"]),
                    rule("Pilot", "except", 0, exceptions=PILOT_EXCLUDE_NO_JET_SHIPS_TANKS),
                    rule("Pilot Related", "any", 10),
                    rule("Rogue", "any", 0),
                    rule("Science", "only", 10, ["skill_astronomy", "skill_math_basic", "skill_math_advanced"]),
                    rule("Technical", "any", 10),
                    rule("Weapon Proficiencies", "any", 0),
                    rule("Wilderness", "any", 5),
                ],
            ),
            vouchers=[
                related_voucher(
                    "related_driving_expertise",
                    3,
                    label="Three Technical (+15%) or Pilot (+20%) skills for driving expertise (any except military vehicles)",
                    or_branches=["Technical", "Pilot"],
                ),
            ],
            secondary_count=4,
            secondary_levels=[3, 6, 9, 12],
            related_levels=[3, 5, 7, 10, 12],
            hth=HTH_CIVILIAN,
            wps=wp_rules(WP_FORBIDDEN_NO_POLE_WHIP_HEAVY),
        )
    )

    return specs


def build_occ() -> dict[str, Any]:
    return {
        "id": "occ_general_citizen",
        "name": "General Citizen",
        "description": "Pre-Becoming civilian education and occupation from the Survival Guide Education Modifiers table — an alternative skill foundation for any playable race that selects an O.C.C. Roll D100 on the table or choose a background with G.M. approval.",
        "gameSystems": ["nightbane"],
        "sources": [
            {
                "gameSystem": "nightbane",
                "reference": "Nightbane Survival Guide (WB5)",
                "pageNumber": 61,
            },
            {
                "gameSystem": "nightbane",
                "reference": "Nightbane Survival Guide (WB5)",
                "pageNumber": 65,
            },
        ],
        "occType": "civilian",
        "tags": ["civilian", "survival_guide", "education"],
        "packageNotes": [
            "Survival Guide pp. 61–65: Education Modifiers — optional alternative to the Basic Nightbane skill package (core p. 89) for skill selection and background.",
            "Select one education specialization at creation (D100 table bands shown in each branch description). G.M. may allow free choice when appropriate.",
            "Available to any race with manual O.C.C. selection (`canPickOcc: true`). R.C.C.s with auto-mounted skill programs (Guardian, Wampyr, etc.) do not use this row.",
            "Vocational cluster picks (Associate's, College, Laborer, etc.): player chooses one category group, then takes the required skills from that group at the listed bonus — G.M. adjudicates mixed-category edge cases.",
            "Facade Hand to Hand is included or purchased per branch; upgrade costs vary (see active specialization `handToHandRules`).",
            "Secondary skills: no O.C.C. percentage bonus; category access matches Related Skills for the active specialization.",
            "XP progression follows the selected race (`progression.xpTableSource: race`) — Nightbane uses `nightbane_core_nightbane_guardian`; Human uses `nightbane_core_doppleganger` (core p. 233 human column).",
        ],
        "occSkillsCore": [],
        "occRelatedSkills": {
            "initialSlotsCount": 0,
            "categoryRules": [],
        },
        "secondarySkills": {"initialSlotsCount": 0, "forbiddenCategories": []},
        "wpRules": {"coreWps": [], "forbiddenWps": []},
        "handToHandRules": {
            "defaultSkillId": "hth_none",
            "upgradePaths": [],
        },
        "progression": {"xpTableSource": "race"},
        "specializations": build_specializations(),
    }


def main() -> None:
    payload = [build_occ()]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({len(payload[0]['specializations'])} specializations)")


if __name__ == "__main__":
    main()
