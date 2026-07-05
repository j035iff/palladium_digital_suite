/**
 * Brief label tooltips for every live-ledger stat row.
 * Hover the stat name (header) — not the value — for what it means.
 */

export const LEDGER_LABEL_TOOLTIPS: Readonly<Record<string, string>> = {
  // Attributes
  'I.Q.': 'Intelligence Quotient— Indicates the intelligence of the character. The exact I.Q. is equal to the I.Q. attribute multiplied times ten. A character with an I.Q. of 17 or better will receive a one time bonus added to all the character\'s skill percentages and a bonus to Perception checks',
  'M.E.': 'Mental Endurance — Measures the amount of mental and emotional stress the character can withstand.',
  'M.A.': 'Mental Affinity - Shows the character\'s personal charm and charisma. Natural leaders, with an M.A. of 17 or higher, have a bonus to evoke trust or intimidation in others.',
  'P.S.': 'Physical Strength — This is the raw physical power of the character.',
  'P.P.': 'Physical Prowess — Shows the degree of dexterity and agility of the character. A P.P. of 17 or higher is rewarded with bonuses to dodge, parry and strike.',
  'P.E.': 'Physical Endurance — Demonstrates the character\'s stamina and durability. The amount of physical punishment, and resistance to fatigue and disease, are determined by P.E.',
  'P.B.': 'Physical Beauty — Is an indication of the physical attractiveness of the character. A P.B. of 17 or better will be rewarded with a bonus to charm or impress.',
  Spd: 'Speed — Specifically, this is the character\'s maximum running speed. The Spd. times 20 is the number of yards or meters that the character can run in one minute. The greater the speed attribute number the faster the character can run.',

  // Exceptional bonuses (17–30)
  'I.Q. Skill Bonus': 'Extra percent added to learned skills from high I.Q.',
  'I.Q. Perception Bonus': 'Bonus to notice hidden objects, traps, and ambushes.',
  'M.E. Save vs Psionic / Insanity': 'Bonus on saves vs psychic attacks and insanity.',
  'M.A. Trust / Intimidate': 'Percent chance to win trust or intimidate others.',
  'P.S. HtH Combat Damage': 'Extra damage on hand-to-hand strikes from high P.S.',
  'P.P. Strike / Parry / Dodge': 'Combat bonuses from high P.P. (strike, parry, dodge).',
  'P.E. Save vs Magic / Poisons': 'Bonus on saves vs magic and poison / toxins.',
  'P.E. Save vs Coma / Death':
    'Percent chance to survive coma and death saves (higher at superhuman P.E. 31+).',
  'P.B. Charm / Impress': 'Percent chance to charm or impress others.',

  // Exceptional bonuses (31+)
  'I.Q. Save vs illusions': 'Superhuman bonus to disbelieve illusions and holograms.',
  'M.E. Save vs possession': 'Superhuman bonus to resist possession and mind control.',
  'M.A. Perception Penalty (others)': 'Penalty others suffer when trying to spot this character.',
  'P.S. Throw Range': 'Extra distance when throwing objects or weapons.',
  'P.S. Lift / Carry': 'Percent increase to carry and lift capacity.',
  'P.P. Initiative': 'Bonus to act first in combat from superhuman reflexes.',
  'P.E. Fatigue Rate': 'How quickly the character tires (superhuman endurance).',
  'P.E. Disease': 'Resistance to disease at superhuman P.E.',

  // Vitals
  'H.P.': 'Hit Points — Physical damage the character can take before dying.',
  'S.D.C.': 'Structural Damage Capacity — Armor-like body toughness before H.P. are touched.',
  'P.P.E.': 'Potential Psychic Energy — Fuel for magic and some supernatural abilities.',
  'I.S.P.': 'Inner Strength Points — Fuel for psionic powers.',
  'H.F.': 'Horror Factor — How frightening the character appears to others.',
  'Natural A.R.': 'Natural Armor Rating — Innate resistance to damage that an opponent must roll above in order to damage the character.',

  // Save vs
  Magic: 'Save vs spells, rituals, and magical effects.',
  Psionics: 'Save vs psionic powers and mental attacks.',
  'Horror Factor': 'Save vs being frightened by a Horror Factor aura.',
  Illusions: 'Save vs illusions, holograms, and deceptive images.',
  Disease: 'Save vs infection and disease.',
  Insanity: 'Save vs insanity, trauma, and mental breakdown.',
  'Poison / Toxins': 'Save vs poison, venom, and toxic substances.',
  Possession: 'Save vs possession and external mental domination.',
  'Mind Control': 'Save vs mind control, domination, and similar mental intrusion.',
  'Coma / Death': 'Percent chance to survive when reduced to zero or negative H.P.',
  'Base P.E. Save Bonus':
    'Add to d20 on saves that call for P.E. bonuses only (exceptional P.E., no race/O.C.C./skill stack).',
  'Base M.E. Save Bonus':
    'Add to d20 on saves that call for M.E. bonuses only (exceptional M.E., no race/O.C.C./skill stack).',
  'Save vs Becoming':
    'Nightbane shift between Facade and Morphus. Uses Facade M.E. only. Success: one melee action (~3 sec). Failure: one full melee round.',

  // Combat
  'Hand to Hand': 'Hand-to-hand combat training tier (Basic, Expert, Martial Arts, etc.).',
  'Attacks / melee': 'Number of hand-to-hand attacks the character can make each melee round.',
  Initiative: 'Bonus to act first when combat starts or when order is rolled.',
  Perception: 'Bonus to notice ambushes, traps, and hidden threats.',
  Strike: 'Bonus added to strike rolls (hit in combat).',
  Parry: 'Bonus added to parry rolls (block melee attacks).',
  Dodge: 'Bonus added to dodge rolls (avoid attacks).',
  'Roll w/ punch, fall, impact': 'Bonus to roll with a punch, fall, or impact to reduce damage.',
  'Pull punch': 'Bonus when pulling a punch to deal reduced damage.',
  Entangle: 'Bonus to entangle maneuvers (grappling / restraining).',
  Disarm: 'Bonus to disarm an opponent’s weapon.',
  'Hand-to-hand damage (P.S.)': 'Extra damage on punches and kicks from P.S. and training.',
}

const LABEL_PREFIX_TOOLTIPS: ReadonlyArray<{ prefix: string; tooltip: string }> = [
  {
    prefix: 'M.A. ',
    tooltip: 'M.A. exceptional bonus applied to this specific skill.',
  },
  {
    prefix: 'P.B. ',
    tooltip: 'P.B. exceptional bonus applied to this specific skill.',
  },
]

/** Resolve the header tooltip for a live-ledger row label. */
export function resolveLedgerLabelTooltip(
  label: string,
  explicit?: string,
): string | undefined {
  const trimmed = explicit?.trim()
  if (trimmed) return trimmed

  const exact = LEDGER_LABEL_TOOLTIPS[label.trim()]
  if (exact) return exact

  for (const entry of LABEL_PREFIX_TOOLTIPS) {
    if (label.startsWith(entry.prefix)) {
      return entry.tooltip
    }
  }

  return undefined
}
