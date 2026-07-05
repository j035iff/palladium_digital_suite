/**
 * Brief label tooltips for every live-ledger stat row.
 * Hover the stat name (header) — not the value — for what it means.
 */

export const LEDGER_LABEL_TOOLTIPS: Readonly<Record<string, string>> = {
  // Attributes
  'I.Q.': 'How smart the character is — learning, reasoning, and skill aptitude.',
  'M.E.': 'Mental endurance — willpower, sanity, and resistance to psionics.',
  'M.A.': 'Physical appearance and force of personality — trust and intimidation.',
  'P.S.': 'Physical strength — lifting, carrying, and hand-to-hand damage.',
  'P.P.': 'Physical prowess — agility, reflexes, and combat bonuses.',
  'P.E.': 'Physical endurance — health, stamina, and save vs magic and poison.',
  'P.B.': 'Physical beauty — charm, impress, and social presence.',
  Spd: 'How fast the character moves on foot (yards per melee).',

  // Exceptional bonuses (17–30)
  'I.Q. skill bonus': 'Extra percent added to learned skills from high I.Q.',
  'I.Q. perception bonus': 'Bonus to notice hidden objects, traps, and ambushes.',
  'M.E. save vs psionic / insanity': 'Bonus on saves vs psionic attacks and insanity.',
  'M.A. trust / intimidate': 'Percent chance to win trust or intimidate others.',
  'P.S. HtH combat damage': 'Extra damage on hand-to-hand strikes from high P.S.',
  'P.P. strike / parry / dodge': 'Combat bonuses from high P.P. (strike, parry, dodge).',
  'P.E. save vs magic / poisons': 'Bonus on saves vs magic and poison / toxins.',
  'P.E. save vs coma / death':
    'Percent chance to survive coma and death saves (higher at superhuman P.E. 31+).',
  'P.B. charm / impress': 'Percent chance to charm or impress others.',

  // Exceptional bonuses (31+)
  'I.Q. save vs illusions': 'Superhuman bonus to disbelieve illusions and holograms.',
  'M.E. save vs possession': 'Superhuman bonus to resist possession and mind control.',
  'M.A. perception penalty (others)': 'Penalty others suffer when trying to spot this character.',
  'P.S. throw range': 'Extra distance when throwing objects or weapons.',
  'P.S. lift / carry': 'Percent increase to carry and lift capacity.',
  'P.P. initiative': 'Bonus to act first in combat from superhuman reflexes.',
  'P.E. fatigue rate': 'How quickly the character tires (superhuman endurance).',
  'P.E. disease': 'Resistance to disease at superhuman P.E.',

  // Vitals
  'H.P.': 'Hit Points — physical damage the character can take before dying.',
  'S.D.C.': 'Structural Damage Capacity — armor-like body toughness before H.P. are touched.',
  'P.P.E.': 'Potential Psychic Energy — fuel for magic and some supernatural abilities.',
  'I.S.P.': 'Inner Strength Points — fuel for psionic powers.',
  'H.F.': 'Horror Factor — how frightening the character appears to others.',
  'Natural A.R.': 'Natural Armor Rating — innate armor that may reduce incoming damage.',

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
