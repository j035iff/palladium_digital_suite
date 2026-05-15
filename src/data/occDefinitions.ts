import type { CharacterOcc, XPTable } from '../types'
import {
  getLibraryOccById,
  OCC_REGISTRY,
  resolveOccXpTable,
  snapshotLibraryOcc,
} from './library'

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
  category: CharacterOcc['category']
  startingOccSkillIds: string[]
  startingRelatedSkillIds: string[]
}

export function snapshotOccForCharacter(def: OCC): CharacterOcc {
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    xpTable: { floors: [...def.xpTable.floors] },
  }
}

export const OCC_DEFINITIONS: readonly OCC[] = OCC_REGISTRY.map((lib) => ({
  id: lib.id,
  name: lib.name,
  xpTable: resolveOccXpTable(lib),
  baseStats: lib.baseStats,
  category: lib.category,
  startingOccSkillIds: [...lib.startingOccSkillIds],
  startingRelatedSkillIds: [...lib.startingRelatedSkillIds],
}))

export function getOccById(id: string): OCC | undefined {
  const lib = getLibraryOccById(id)
  if (!lib) return undefined
  return {
    id: lib.id,
    name: lib.name,
    xpTable: resolveOccXpTable(lib),
    baseStats: lib.baseStats,
    category: lib.category,
    startingOccSkillIds: [...lib.startingOccSkillIds],
    startingRelatedSkillIds: [...lib.startingRelatedSkillIds],
  }
}

export { getLibraryOccById, resolveOccXpTable, snapshotLibraryOcc }
