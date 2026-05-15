import type { Feature } from '../../../types'

export const POWER_FEATURES: Feature[] = [
  {
    identity: {
      id: 'energy_bolt',
      name: 'Energy Bolt',
      description: 'A focused bolt of magical force.',
      descriptionMorphus:
        'A lance of void-touched force that tears between worlds—raw, hungry, and barely contained.',
      system: 'magic',
    },
    activation: {
      cost: { type: 'ppe', value: 2 },
      range: '100 ft',
      duration: 'Instant',
    },
    metadata: {
      level: 2,
      pickBucket: 'spell',
      durationType: 'instant',
      pumpable: { capPerLevel: 2, energyPerDice: 2, diceSides: 6 },
    },
  },
  {
    identity: {
      id: 'armor_ithan',
      name: 'Armor of Ithan',
      description: 'Magical barrier; ticks down with melee rounds (APM reset).',
      descriptionMorphus:
        'A shell of flickering witch-light that clings to your morphus hide—each melee, it strains thinner.',
      system: 'magic',
    },
    activation: {
      cost: { type: 'ppe', value: 10 },
      duration: '1 melee / level',
    },
    metadata: { level: 3, pickBucket: 'spell', durationType: 'melee' },
  },
  {
    identity: {
      id: 'fireball',
      name: 'Fireball',
      description: 'Explosive flame; fixed cost.',
      descriptionMorphus:
        'A compressed sun of malice—what erupts is not heat alone, but the memory of burning.',
      system: 'magic',
    },
    activation: {
      cost: { type: 'ppe', value: 15 },
      range: '200 ft',
      duration: 'Instant',
      save: 'Dodge 16',
    },
    metadata: { level: 4, pickBucket: 'spell', durationType: 'instant', school: 'Elemental' },
  },
  {
    identity: {
      id: 'mind_block',
      name: 'Mind Block',
      description: 'Psionic shield vs mental intrusion.',
      descriptionMorphus:
        'You fold your thoughts behind obsidian plates; even echoes hesitate to touch you.',
      system: 'psionic',
    },
    activation: {
      cost: { type: 'isp', value: 4 },
      duration: 'Instant',
    },
    metadata: { pickBucket: 'psionic', durationType: 'instant' },
  },
  {
    identity: {
      id: 'telekinesis',
      name: 'Telekinesis (Minor)',
      description: 'Move small objects at range.',
      descriptionMorphus:
        'Invisible tendrils slip from your morphus—objects twitch as if remembering gravity wrong.',
      system: 'psionic',
    },
    activation: {
      cost: { type: 'isp', value: 6 },
      range: '60 ft',
      duration: 'Concentration',
    },
    metadata: {
      pickBucket: 'psionic',
      durationType: 'narrative',
      pumpable: { capPerLevel: 1, energyPerDice: 3, diceSides: 6 },
    },
  },
]
