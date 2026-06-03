import type { PalladiumOcc } from '../types'
import { occCharacterCategory } from './occCatalogEngine'

const SUPERNATURAL_OCC_TAGS = new Set([
  'magic',
  'psionic',
  'psychic',
  'spellcaster',
  'mystic',
  'arcane',
])

/** O.C.C. grants spells, psionics, or tagged supernatural progression at creation. */
export function occOffersSupernaturalCreation(occ: PalladiumOcc): boolean {
  if (occ.ppeEngine || occ.ispEngine) return true
  if (occ.occType === 'psychic') return true
  if (occCharacterCategory(occ) === 'psychic') return true
  return (occ.tags ?? []).some((t) =>
    SUPERNATURAL_OCC_TAGS.has(t.toLowerCase()),
  )
}
