import crossListsRef from '../data/content/magic/utils/magic_cross_lists.json'
import type { MagicCrossList, MagicCrossListsRef, SpellCaveat } from '../types'

const ref = crossListsRef as MagicCrossListsRef

export function getMagicCrossList(id: string): MagicCrossList | undefined {
  return ref.crossLists?.[id]
}

export function listMagicCrossListIds(): readonly string[] {
  return Object.keys(ref.crossLists ?? {})
}

export function caveatsForCrossListSpell(
  crossListId: string,
  spellId: string,
): readonly SpellCaveat[] {
  const list = getMagicCrossList(crossListId)
  if (!list) return []
  const override = list.spellOverrides?.[spellId]?.caveats
  if (override?.length) return override
  return list.defaultCaveats ?? []
}

export function spellInMagicCrossList(crossListId: string, spellId: string): boolean {
  const list = getMagicCrossList(crossListId)
  return list?.spellIds?.includes(spellId) ?? false
}
