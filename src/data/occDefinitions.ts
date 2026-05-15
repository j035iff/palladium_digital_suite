import type { CharacterOcc, XPTable } from '../types'
import { BORG_XP_TABLE, PSYCHIC_XP_TABLE, STANDARD_XP_TABLE } from './xpTables'

/**
 * O.C.C. / R.C.C. definition — package deal for creation (name, skills, fixed XP curve, base dice).
 */
export interface OCC {
  id: string
  name: string
  xpTable: XPTable
  baseStats: {
    hpDice: string
    sdcDice: string
    ppeDice?: string
    ispDice?: string
  }
  /** Drives Psychic Gate lock when `psychic`. */
  category: CharacterOcc['category']
  /** Pre-filled O.C.C. skill slots (Skill Engine). */
  startingOccSkillIds: string[]
  /** Pre-filled O.C.C. related skill slots. */
  startingRelatedSkillIds: string[]
}

/** Snapshot thresholds onto the character so library edits do not retroactively change progression. */
export function snapshotOccForCharacter(def: OCC): CharacterOcc {
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    xpTable: { floors: [...def.xpTable.floors] },
  }
}

export const OCC_DEFINITIONS: readonly OCC[] = [
  {
    id: 'city_rat',
    name: 'City Rat',
    xpTable: STANDARD_XP_TABLE,
    baseStats: { hpDice: '1d6', sdcDice: '2d6', ppeDice: '—', ispDice: '—' },
    category: 'standard',
    startingOccSkillIds: ['literacy', 'math_basic'],
    startingRelatedSkillIds: ['electronics', 'pick_locks'],
  },
  {
    id: 'borg',
    name: 'Borg',
    xpTable: BORG_XP_TABLE,
    baseStats: { hpDice: '3d6', sdcDice: '4d6+12', ppeDice: '2d6', ispDice: '—' },
    category: 'standard',
    startingOccSkillIds: ['literacy', 'math_basic'],
    startingRelatedSkillIds: ['electronics', 'mech_eng'],
  },
  {
    id: 'mind_melter',
    name: 'Mind Melter',
    xpTable: PSYCHIC_XP_TABLE,
    baseStats: { hpDice: '1d6', sdcDice: '2d6', ppeDice: '2d6+6', ispDice: '1d6+ME' },
    category: 'psychic',
    startingOccSkillIds: ['literacy'],
    startingRelatedSkillIds: ['electronics'],
  },
] as const

export function getOccById(id: string): OCC | undefined {
  return OCC_DEFINITIONS.find((o) => o.id === id)
}
