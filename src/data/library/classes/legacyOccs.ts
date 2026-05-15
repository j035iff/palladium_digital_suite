import type { LibraryOCC } from '../types'

export const LEGACY_OCCS: LibraryOCC[] = [
  {
    id: 'city_rat',
    name: 'City Rat',
    xpTableId: 'standard',
    category: 'standard',
    tags: ['civilian'],
    skillSlotPolicy: { kind: 'fixed', multiplier: 1 },
    baseStats: { hpDice: '1d6', sdcDice: '2d6', ppeDice: '—', ispDice: '—' },
    startingOccSkillIds: ['literacy', 'math_basic'],
    startingRelatedSkillIds: ['electronics', 'pick_locks'],
  },
  {
    id: 'borg',
    name: 'Borg',
    xpTableId: 'borg',
    category: 'standard',
    tags: ['military'],
    skillSlotPolicy: { kind: 'fixed', multiplier: 1 },
    baseStats: { hpDice: '1d6', sdcDice: '2d6', ppeDice: '—', ispDice: '—' },
    startingOccSkillIds: ['literacy', 'math_basic'],
    startingRelatedSkillIds: ['electronics', 'mech_eng'],
  },
  {
    id: 'mind_melter',
    name: 'Mind Melter',
    xpTableId: 'psychic',
    category: 'psychic',
    tags: ['detective'],
    skillSlotPolicy: {
      kind: 'psychic_tier',
      majorMultiplier: 0.5,
      defaultMultiplier: 1,
    },
    baseStats: {
      hpDice: '1d6',
      sdcDice: '2d6',
      ppeDice: '2d6+6',
      ispDice: '1d6+ME',
    },
    startingOccSkillIds: ['literacy'],
    startingRelatedSkillIds: ['electronics'],
  },
]
