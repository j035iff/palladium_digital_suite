export type AbilityEnergySource = 'ppe' | 'isp'

export type AbilityDurationType = 'instant' | 'melee' | 'narrative'

export type AbilityCategory = 'Spell' | 'Psionic' | 'Talent'

/** Drawer filter buckets (sn_abilities_selection.md §1). */
export type LibraryPowerCategory = 'Magic' | 'Psionics' | 'NightbaneTalents'

export function abilityToLibraryCategory(
  c: AbilityCategory,
): LibraryPowerCategory {
  if (c === 'Spell') return 'Magic'
  if (c === 'Psionic') return 'Psionics'
  return 'NightbaneTalents'
}

export type AbilityPumpRule = {
  capPerLevel: number
  energyPerDice: number
  diceSides: number
}

export type AbilityDef = {
  id: string
  name: string
  description: string
  descriptionMorphus?: string
  category: AbilityCategory
  energySource: AbilityEnergySource
  baseCost: number
  durationType: AbilityDurationType
  pumpable?: AbilityPumpRule
  /** Spell level 1–15; above starting cap is locked (Pillar 8). */
  spellLevel?: number
  /** If true, only selectable while Morphus is active (Nightbane continuity). */
  morphusOnly?: boolean
  /** Nightbane Talent — P.P.E. cost line (lineage nightbane). */
  ppeCost?: number
  /** Human-readable activation cost (e.g. I.S.P. or action economy). */
  activationCost?: string
}

export const ABILITY_LIBRARY: AbilityDef[] = [
  {
    id: 'energy_bolt',
    name: 'Energy Bolt',
    description: 'A focused bolt of magical force.',
    descriptionMorphus:
      'A lance of void-touched force that tears between worlds—raw, hungry, and barely contained.',
    category: 'Spell',
    energySource: 'ppe',
    baseCost: 2,
    durationType: 'instant',
    spellLevel: 2,
    pumpable: { capPerLevel: 2, energyPerDice: 2, diceSides: 6 },
  },
  {
    id: 'armor_ithan',
    name: 'Armor of Ithan',
    description: 'Magical barrier; ticks down with melee rounds (APM reset).',
    descriptionMorphus:
      'A shell of flickering witch-light that clings to your morphus hide—each melee, it strains thinner.',
    category: 'Spell',
    energySource: 'ppe',
    baseCost: 10,
    durationType: 'melee',
    spellLevel: 3,
  },
  {
    id: 'fireball',
    name: 'Fireball',
    description: 'Explosive flame; fixed cost.',
    descriptionMorphus:
      'A compressed sun of malice—what erupts is not heat alone, but the memory of burning.',
    category: 'Spell',
    energySource: 'ppe',
    baseCost: 15,
    durationType: 'instant',
    spellLevel: 4,
  },
  {
    id: 'call_lightning',
    name: 'Call Lightning',
    description: 'High-tier battlefield spell (above starting cap).',
    descriptionMorphus:
      'You tear a hole in the storm’s patience; lightning answers like a debt collector.',
    category: 'Spell',
    energySource: 'ppe',
    baseCost: 45,
    durationType: 'melee',
    spellLevel: 5,
  },
  {
    id: 'meteor_storm',
    name: 'Meteor Storm',
    description: 'Devastation ritual — far beyond starting play.',
    descriptionMorphus:
      'The sky remembers impact; you teach it geography again.',
    category: 'Spell',
    energySource: 'ppe',
    baseCost: 200,
    durationType: 'narrative',
    spellLevel: 15,
  },
  {
    id: 'mind_block',
    name: 'Mind Block',
    description: 'Psionic shield vs mental intrusion.',
    descriptionMorphus:
      'You fold your thoughts behind obsidian plates; even echoes hesitate to touch you.',
    category: 'Psionic',
    energySource: 'isp',
    baseCost: 4,
    durationType: 'instant',
  },
  {
    id: 'telekinesis',
    name: 'Telekinesis (Minor)',
    description: 'Move small objects at range.',
    descriptionMorphus:
      'Invisible tendrils slip from your morphus—objects twitch as if remembering gravity wrong.',
    category: 'Psionic',
    energySource: 'isp',
    baseCost: 6,
    durationType: 'narrative',
    pumpable: { capPerLevel: 1, energyPerDice: 3, diceSides: 6 },
  },
  {
    id: 'sense_evil',
    name: 'Sense Evil',
    description: 'Passive awareness; low I.S.P. ping.',
    descriptionMorphus:
      'The city’s sins leave a taste on the air—your morphus tongue reads them like braille.',
    category: 'Talent',
    energySource: 'isp',
    baseCost: 2,
    durationType: 'narrative',
    ppeCost: 0,
    activationCost: '2 I.S.P. / use (maintenance narrative)',
  },
  {
    id: 'shadow_slide',
    name: 'Shadow Slide',
    description: 'Talent: slip between pools of darkness.',
    descriptionMorphus:
      'You step sideways into the ink between streetlights—distance is a suggestion.',
    category: 'Talent',
    energySource: 'ppe',
    baseCost: 8,
    durationType: 'instant',
    morphusOnly: true,
    ppeCost: 8,
    activationCost: '1 melee action + 8 P.P.E.',
  },
  {
    id: 'flesh_shaper',
    name: 'Flesh Shaper',
    description: 'Talent: minor morphus-only reshaping.',
    descriptionMorphus:
      'Your morphus remembers other bodies; for a heartbeat, it wears them like coats.',
    category: 'Talent',
    energySource: 'ppe',
    baseCost: 12,
    durationType: 'narrative',
    morphusOnly: true,
    ppeCost: 12,
    activationCost: '3 I.S.P. to ignite + 12 P.P.E. / minute sustained',
  },
]

export function getAbilityById(id: string): AbilityDef | undefined {
  return ABILITY_LIBRARY.find((a) => a.id === id)
}
