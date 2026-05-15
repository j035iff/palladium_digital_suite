import type { LibraryOCC } from '../types'

export const NIGHTBANE_SORCERER_OCC: LibraryOCC = {
  id: 'nightbane_sorcerer',
  name: 'Nightbane Sorcerer',
  xpTableId: 'standard',
  category: 'psychic',
  skillSlotPolicy: {
    kind: 'psychic_tier',
    majorMultiplier: 0.5,
    defaultMultiplier: 1,
  },
  baseStats: {
    hpDice: '2d6',
    sdcDice: '3d6',
    ppeDice: '2d6+12',
    ispDice: '1d6+ME',
  },
  startingOccSkillIds: ['literacy', 'math_basic'],
  startingRelatedSkillIds: ['electronics', 'hand_to_hand_basic'],
  occSkillSlotBudget: 8,
  occRelatedSkillSlotBudget: 10,
  creationAbilityBudget: {
    spellSlots: 8,
    psionicSlots: 6,
    talentSlots: 4,
  },
  startingSpellLevelCap: 4,
  psychicGateBypassed: true,
}
