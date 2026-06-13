import { getAbilityById } from '../data/abilityLibrary'
import type { PalladiumPsionicCatalogEntry } from '../data/library/catalogTypes'
import type { PalladiumMagicSpell } from '../types'
import { getFeatureById } from '../data/library/registry'
import { abilityPassesOccSupernaturalRules } from './occCreationDerivation'
import { magicSchoolFilterLabel } from './magicSchoolLabels'
import { psychicGatePsionicPickAllowed } from './psychicGatePsionicBudget'
import { occEnginePsionicPickAllowed } from './occSupernaturalSelection'
import { psionicCategoryFilterLabel } from './psionicCategoryLabels'
import type {
  PalladiumOcc,
  PsychicGateMajorAllocation,
  PsychicTier,
} from '../types'

export function psionicCategoryTags(
  row: PalladiumPsionicCatalogEntry,
  genreId: string,
  activeCategoryFilter: string,
  searchAllPools: boolean,
): string {
  const g = genreId.toLowerCase()
  const placements = row.genrePlacements.filter(
    (p) => p.genreId.toLowerCase() === g,
  )
  if (placements.length === 0) return 'Psionics'
  if (!searchAllPools) {
    const match = placements.find((p) => p.category === activeCategoryFilter)
    if (match) return psionicCategoryFilterLabel(genreId, match.category)
  }
  return placements
    .map((p) => psionicCategoryFilterLabel(genreId, p.category))
    .join(' · ')
}

export type PsionicRowSelectContext = {
  activeOcc?: PalladiumOcc
  spellCap: number
  genreId: string
  psychicTier?: PsychicTier
  psychicGateBypassed?: boolean
  majorAllocation?: PsychicGateMajorAllocation | null
  selectedIds?: readonly string[]
  /** Active psionic category tab when not searching all pools. */
  viewingCategory?: string | null
}

export function psionicRowIsSelectable(
  catalog: PalladiumPsionicCatalogEntry,
  ctx: PsionicRowSelectContext,
): boolean {
  const ability = getAbilityById(catalog.id)
  if (!ability || ability.innateStarter) return false
  const feature = getFeatureById(catalog.id)
  if (ctx.activeOcc && feature) {
    const occGate = abilityPassesOccSupernaturalRules(
      ctx.activeOcc,
      feature,
      ctx.spellCap,
      ctx.genreId,
    )
    if (!occGate.allowed) return false
  }
  const psychicGate = psychicGatePsionicPickAllowed({
    tier: ctx.psychicTier ?? 'none',
    majorAllocation: ctx.majorAllocation,
    psychicGateBypassed: ctx.psychicGateBypassed,
    occ: ctx.activeOcc,
    selectedIds: ctx.selectedIds,
    candidateId: catalog.id,
    genreId: ctx.genreId,
    viewingCategory: ctx.viewingCategory,
  })
  if (psychicGate && !psychicGate.allowed) return false

  const occEngine = occEnginePsionicPickAllowed({
    occ: ctx.activeOcc,
    selectedIds: ctx.selectedIds,
    candidateId: catalog.id,
    genreId: ctx.genreId,
    viewingCategory: ctx.viewingCategory,
  })
  if (occEngine && !occEngine.allowed) return false
  return true
}

export function abilityDurationBadgeLabel(
  d: 'instant' | 'melee' | 'narrative',
): string {
  if (d === 'instant') return 'Instant'
  if (d === 'melee') return 'Melee (APM)'
  return 'Narrative'
}

export function magicSchoolTags(
  row: Pick<PalladiumMagicSpell, 'school'>,
  genreId: string,
): string {
  return magicSchoolFilterLabel(genreId, row.school)
}

export type MagicRowSelectContext = {
  activeOcc?: PalladiumOcc
  spellCap: number
  genreId: string
  selectedIds?: readonly string[]
}

export function magicRowIsSelectable(
  catalog: PalladiumMagicSpell,
  ctx: MagicRowSelectContext,
): boolean {
  const ability = getAbilityById(catalog.id)
  if (!ability) return false
  const feature = getFeatureById(catalog.id)
  if (ctx.activeOcc && feature) {
    const occGate = abilityPassesOccSupernaturalRules(
      ctx.activeOcc,
      feature,
      ctx.spellCap,
      ctx.genreId,
    )
    if (!occGate.allowed) return false
  }
  return true
}
