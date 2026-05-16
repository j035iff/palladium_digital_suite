import type { CharacterOcc, XPTable } from '../types'
import {
  occBaseStatsDice,
  occCharacterCategory,
  occStartingOccSkillIds,
  occStartingRelatedSkillIds,
} from '../lib/occCatalogEngine'
import {
  getLibraryOccById,
  OCC_REGISTRY,
  resolveOccXpTable,
  snapshotLibraryOcc,
} from './library'

/** Slim runtime view for creation flows (derived from {@link PalladiumOcc}). */
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

function occToRuntimeView(lib: NonNullable<ReturnType<typeof getLibraryOccById>>): OCC {
  const base = occBaseStatsDice(lib)
  return {
    id: lib.id,
    name: lib.name,
    xpTable: resolveOccXpTable(lib),
    baseStats: base,
    category: occCharacterCategory(lib),
    startingOccSkillIds: occStartingOccSkillIds(lib),
    startingRelatedSkillIds: occStartingRelatedSkillIds(lib),
  }
}

export const OCC_DEFINITIONS: readonly OCC[] = OCC_REGISTRY.map((lib) =>
  occToRuntimeView(lib),
)

export function getOccById(id: string): OCC | undefined {
  const lib = getLibraryOccById(id)
  if (!lib) return undefined
  return occToRuntimeView(lib)
}

export { getLibraryOccById, resolveOccXpTable, snapshotLibraryOcc }
