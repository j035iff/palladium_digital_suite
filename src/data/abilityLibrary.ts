/**
 * Back-compat adapter — content lives in `src/data/library/features`.
 */
import type { Feature } from '../types'
import { FEATURE_REGISTRY, getFeatureById as getFeature } from './library/registry'
import { featureBudgetCategory, morphusRequired } from '../lib/featureEngine'

export type AbilityEnergySource = 'ppe' | 'isp'
export type AbilityDurationType = 'instant' | 'melee' | 'narrative'
export type AbilityCategory = 'Spell' | 'Psionic' | 'Talent'
export type LibraryPowerCategory = 'Magic' | 'Psionics' | 'NightbaneTalents'

export function abilityToLibraryCategory(
  c: AbilityCategory,
): LibraryPowerCategory {
  if (c === 'Spell') return 'Magic'
  if (c === 'Psionic') return 'Psionics'
  return 'NightbaneTalents'
}

export type AbilityPumpRule = {
  capPerLevel: number
  energyPerDice: number
  diceSides: number
}

export type AbilityDef = {
  id: string
  name: string
  description: string
  descriptionMorphus?: string
  category: AbilityCategory
  energySource: AbilityEnergySource
  baseCost: number
  durationType: AbilityDurationType
  pumpable?: AbilityPumpRule
  spellLevel?: number
  morphusOnly?: boolean
  ppeCost?: number
  activationCost?: string
  innateStarter?: boolean
}

function featureToAbilityDef(f: Feature): AbilityDef | null {
  const bc = featureBudgetCategory(f)
  if (!bc) return null
  const cat: AbilityCategory =
    bc === 'Spell' ? 'Spell' : bc === 'Psionic' ? 'Psionic' : 'Talent'
  const cost = f.activation?.cost
  const energySource: AbilityEnergySource =
    cost?.type === 'isp' ? 'isp' : 'ppe'
  const baseCost =
    typeof cost?.value === 'number' ? cost.value : Number(cost?.value) || 0
  const durationType =
    (f.metadata?.durationType as AbilityDurationType | undefined) ?? 'instant'
  return {
    id: f.identity.id,
    name: f.identity.name,
    description: f.identity.description,
    descriptionMorphus: f.identity.descriptionMorphus,
    category: cat,
    energySource,
    baseCost,
    durationType,
    pumpable: f.metadata?.pumpable as AbilityPumpRule | undefined,
    spellLevel: typeof f.metadata?.level === 'number' ? f.metadata.level : undefined,
    morphusOnly: morphusRequired(f),
    ppeCost: typeof f.metadata?.ppeCost === 'number' ? f.metadata.ppeCost : undefined,
    activationCost:
      typeof f.metadata?.activationCost === 'string'
        ? f.metadata.activationCost
        : undefined,
    innateStarter: f.metadata?.innateStarter === true,
  }
}

export const ABILITY_LIBRARY: AbilityDef[] = FEATURE_REGISTRY.map((f) =>
  featureToAbilityDef(f),
).filter((a): a is AbilityDef => a != null)

export function getAbilityById(id: string): AbilityDef | undefined {
  const f = getFeature(id)
  if (!f) return undefined
  return featureToAbilityDef(f) ?? undefined
}
