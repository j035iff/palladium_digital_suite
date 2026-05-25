import type { ActiveForm, Character, Feature, FeatureModifiers } from '../types'
import { getFeatureById, getRaceById } from '../data/library/registry'
import { DEFAULT_RACE_ID } from './raceFormPolicy'
import { racePassiveModifiers } from './raceEngine'
import { getSkillById } from '../data/skillLibrary'
import {
  buildMorphusPassiveBundle,
  mergeMorphusIntoPassive,
} from './morphusPassiveBridge'
import type { MorphusSurfaceType } from '../types'

export function morphusRequired(feature: Feature): boolean {
  return feature.requirement?.form === 'morphus' || feature.metadata?.morphusOnly === true
}

export function featureAppliesToForm(feature: Feature, activeForm: ActiveForm): boolean {
  const reqForm = feature.requirement?.form
  if (reqForm != null) return activeForm === reqForm
  if (feature.metadata?.morphusOnly === true) return activeForm === 'morphus'
  return true
}

export function aggregateFeatureModifiers(
  featureIds: readonly string[],
  activeForm: ActiveForm,
): FeatureModifiers {
  const out: FeatureModifiers = {}
  for (const id of featureIds) {
    const f = getFeatureById(id)
    if (!f?.modifiers || !featureAppliesToForm(f, activeForm)) continue
    for (const [key, val] of Object.entries(f.modifiers)) {
      out[key] = (out[key] ?? 0) + val
    }
  }
  return out
}

/** Physical / passive modifiers from Skill Engine picks (modifiers block on sheet skills). */
export function aggregateCreationSkillModifiers(character: Character): FeatureModifiers {
  const out: FeatureModifiers = {}
  const ids = new Set<string>([
    ...(character.creationOccSkillIds ?? []),
    ...(character.creationRelatedSkillIds ?? []),
  ])
  for (const id of ids) {
    const s = getSkillById(id)
    if (!s?.modifiers) continue
    for (const [k, v] of Object.entries(s.modifiers)) {
      out[k] = (out[k] ?? 0) + v
    }
  }
  return out
}

export function aggregateAllPassiveModifiers(
  character: Character,
  activeForm: ActiveForm,
  morphusSurfaceType: MorphusSurfaceType = 'hard_flat',
): FeatureModifiers {
  const a = aggregateFeatureModifiers(character.selectedAbilities ?? [], activeForm)
  const sk = aggregateCreationSkillModifiers(character)
  const race = racePassiveModifiers(
    getRaceById(character.raceId ?? DEFAULT_RACE_ID),
  )
  let out: FeatureModifiers = { ...a, ...race }
  for (const [k, v] of Object.entries(sk)) {
    out[k] = (out[k] ?? 0) + v
  }
  const morphus = buildMorphusPassiveBundle(
    character,
    activeForm,
    morphusSurfaceType,
  )
  out = mergeMorphusIntoPassive(out, morphus)
  return out
}

/** Features that contribute modifiers while active on this form (for UI attribution). */
export function listApplyingFeatures(
  featureIds: readonly string[],
  activeForm: ActiveForm,
): Feature[] {
  const out: Feature[] = []
  for (const id of featureIds) {
    const f = getFeatureById(id)
    if (f?.modifiers && featureAppliesToForm(f, activeForm)) out.push(f)
  }
  return out
}

export function featureSystemLabel(system: Feature['identity']['system']): string {
  const labels: Record<Feature['identity']['system'], string> = {
    magic: 'Magic',
    psionic: 'Psionic',
    trait: 'Trait',
    skill: 'Skill',
  }
  return labels[system]
}

/** Supernatural picker tabs (Nightbane Talents keyed off metadata.pickBucket === 'talent'). */
export function featureLibraryFilterCategory(feature: Feature): 'Magic' | 'Psionics' | 'NightbaneTalents' | null {
  if (feature.metadata?.pickBucket === 'talent') return 'NightbaneTalents'
  if (feature.identity.system === 'psionic') return 'Psionics'
  if (feature.identity.system === 'magic') return 'Magic'
  return null
}

/** Legacy budget categories used by Creation Step 4 and {@link AbilityDef}. */
export function featureBudgetCategory(feature: Feature): 'Spell' | 'Psionic' | 'Talent' | null {
  const raw = feature.metadata?.pickBucket
  if (raw === 'spell') return 'Spell'
  if (raw === 'psionic') return 'Psionic'
  if (raw === 'talent') return 'Talent'
  if (feature.identity.system === 'psionic') return 'Psionic'
  if (feature.identity.system === 'magic') return 'Spell'
  if (feature.identity.system === 'trait' && feature.metadata?.pickBucket === 'talent') {
    return 'Talent'
  }
  return null
}
