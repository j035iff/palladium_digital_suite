import type { Feature } from '../../../types'

export const TRAIT_FEATURES: Feature[] = [
  {
    identity: {
      id: 'leathery_wings',
      name: 'Leathery Wings',
      description: 'Broad membrane wings grant lift and hardened hide.',
      descriptionMorphus:
        'The wings remember flight before the city existed—each beat sheds dust like ash.',
      system: 'trait',
    },
    requirement: { form: 'morphus' },
    modifiers: { sdc: 20, horror_factor: 2 },
    metadata: { tier: 'common' },
  },
  {
    identity: {
      id: 'razor_hide',
      name: 'Razor Hide',
      description: 'Keratin plates along the forearms and shoulders.',
      descriptionMorphus:
        'Your morphus skin rings when struck—metal thinks twice.',
      system: 'trait',
    },
    requirement: { form: 'morphus' },
    modifiers: { sdc: 12, pp: 1 },
    metadata: { tier: 'common' },
  },
]
