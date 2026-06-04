import type { Character, PalladiumOcc, Race } from '../types'
import { creationNeedsAbilitySelection, creationShowsPsychicGate } from './creationPhases'
import { listOccVariableBonusTasks, occVariableBonusTasksComplete } from './occVariableBonus'
import { raceCanPickOcc, raceLineageFromDefinition } from './raceEngine'
import { assessConfiguratorPairConflict } from './configuratorMatrix'
import type { ForgeAttrKey } from './attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from './attributeKeys'

/** Navigable creation phases (forge-character_creation.md). */
export type CreationPhase =
  | 'configurator'
  | 'attributes'
  | 'occVariableBonus'
  | 'psychicGate'
  | 'skills'
  | 'morphus'
  | 'abilities'
  | 'review'

export type CreationFlowContext = {
  raceCanPickOcc: boolean
  showPsychicGate: boolean
  showAbilitySelection: boolean
  showMorphusPhase: boolean
  hasOccVariableBonus: boolean
}

export { PALLADIUM_ALIGNMENT_VALUES as PALLADIUM_ALIGNMENTS } from './configuratorMatrix'

export function buildCreationFlowContext(
  character: Pick<
    Character,
    'raceId' | 'creationAbilityBudget' | 'creationOccVariableResolutions' | 'occSpecializationId'
  >,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  creationGenreId: string,
): CreationFlowContext {
  const picksOcc = raceCanPickOcc(race)
  const tasks = listOccVariableBonusTasks(occ, character.occSpecializationId)
  return {
    raceCanPickOcc: picksOcc,
    showPsychicGate: creationShowsPsychicGate(character, occ, creationGenreId),
    showAbilitySelection: creationNeedsAbilitySelection(
      character.creationAbilityBudget,
      creationGenreId,
    ),
    // Nightbane Phase II.5 — stub UI until MORPHUS_FORGE_IMPLEMENTED (morphusForgeStub.ts)
    showMorphusPhase: raceLineageFromDefinition(race) === 'nightbane',
    hasOccVariableBonus: tasks.length > 0,
  }
}

export function orderedCreationPhases(ctx: CreationFlowContext): CreationPhase[] {
  const phases: CreationPhase[] = ['configurator', 'attributes']
  if (ctx.hasOccVariableBonus) phases.push('occVariableBonus')
  if (ctx.showPsychicGate) phases.push('psychicGate')
  phases.push('skills')
  if (ctx.showMorphusPhase) phases.push('morphus')
  if (ctx.showAbilitySelection) phases.push('abilities')
  phases.push('review')
  return phases
}

export function defaultCreationPhase(): CreationPhase {
  return 'configurator'
}

export function normalizeCreationPhase(
  phase: CreationPhase | undefined,
  ctx: CreationFlowContext,
): CreationPhase {
  const order = orderedCreationPhases(ctx)
  if (phase && order.includes(phase)) return phase
  return order[0] ?? 'configurator'
}

export function nextCreationPhase(
  current: CreationPhase,
  ctx: CreationFlowContext,
): CreationPhase | null {
  const order = orderedCreationPhases(ctx)
  const ix = order.indexOf(current)
  if (ix === -1 || ix >= order.length - 1) return null
  return order[ix + 1] ?? null
}

export function prevCreationPhase(
  current: CreationPhase,
  ctx: CreationFlowContext,
): CreationPhase | null {
  const order = orderedCreationPhases(ctx)
  const ix = order.indexOf(current)
  if (ix <= 0) return null
  return order[ix - 1] ?? null
}

export function creationPhaseLabel(phase: CreationPhase): string {
  switch (phase) {
    case 'configurator':
      return 'Race & O.C.C.'
    case 'attributes':
      return 'Attributes'
    case 'occVariableBonus':
      return 'O.C.C. Bonuses'
    case 'psychicGate':
      return 'Psychic Gate'
    case 'skills':
      return 'Skills'
    case 'morphus':
      return 'Morphus'
    case 'abilities':
      return 'Abilities'
    case 'review':
      return 'Review & Spawn'
    default:
      return phase
  }
}

export function assessConfiguratorBlockers(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): string[] {
  const blockers: string[] = []
  if (!character.raceId || !race) {
    blockers.push('Select a race.')
    return blockers
  }
  const picksOcc = raceCanPickOcc(race)
  if (picksOcc) {
    if (!character.occ?.id || !character.occ?.xpTable?.floors?.length) {
      blockers.push('Select an O.C.C.')
    } else if (occ) {
      const pair = assessConfiguratorPairConflict(
        race,
        occ,
        character.facade.alignment,
      )
      if (pair) blockers.push(pair)
    }
    if (occ?.specializations?.length && !character.occSpecializationId) {
      blockers.push('Select an O.C.C. specialization.')
    }
  }
  return blockers
}

function occMinForAttr(
  occ: PalladiumOcc | undefined,
  attr: ForgeAttrKey,
): number | undefined {
  const reqs = occ?.attributeRequirements as Record<string, number> | undefined
  const key = attr === 'ps' ? 'ps' : attr
  const req = reqs?.[key]
  return typeof req === 'number' && req > 0 ? req : undefined
}

export function assessAttributesBlockers(
  character: Character,
  occ: PalladiumOcc | undefined,
): string[] {
  const blockers: string[] = []
  const assignments = character.creationAttributeAssignments ?? {}
  const pool = character.creationAttributePool ?? []

  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const v = assignments[attr]
    if (v == null || !Number.isFinite(v) || v < 1) {
      blockers.push(`Assign a rolled value to ${attr.toUpperCase()}.`)
      continue
    }
    const min = occMinForAttr(occ, attr)
    if (min != null && v < min) {
      blockers.push(
        `${attr.toUpperCase()} ${v} is below O.C.C. minimum ${min}.`,
      )
    }
  }

  const filledPool = pool.filter((n) => n != null && Number.isFinite(n)).length
  if (filledPool < 8) {
    blockers.push('Enter all eight rolled values in the attribute pool.')
  }

  const usedValues = FORGE_ATTRIBUTE_KEYS.map((a) => assignments[a]).filter(
    (n) => n != null,
  )
  const poolValues = pool.filter((n): n is number => n != null)
  if (usedValues.length === 8 && poolValues.length === 8) {
    const sortedUsed = [...usedValues].sort((a, b) => a - b)
    const sortedPool = [...poolValues].sort((a, b) => a - b)
    const mismatch = sortedUsed.some((v, i) => v !== sortedPool[i])
    if (mismatch) {
      blockers.push(
        'Assigned attributes must match the eight pool values (each roll used once).',
      )
    }
  }

  return blockers
}

export function assessOccVariableBlockers(
  character: Character,
  occ: PalladiumOcc | undefined,
): string[] {
  const tasks = listOccVariableBonusTasks(occ, character.occSpecializationId)
  if (!tasks.length) return []
  if (
    occVariableBonusTasksComplete(
      tasks,
      character.creationOccVariableResolutions ?? {},
    )
  ) {
    return []
  }
  return ['Resolve all O.C.C. variable dice bonuses.']
}

export function canAdvanceFromPhase(
  phase: CreationPhase,
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  _ctx: CreationFlowContext,
): { ok: boolean; blockers: string[] } {
  switch (phase) {
    case 'configurator':
      return {
        ok: assessConfiguratorBlockers(character, race, occ).length === 0,
        blockers: assessConfiguratorBlockers(character, race, occ),
      }
    case 'attributes':
      return {
        ok: assessAttributesBlockers(character, occ).length === 0,
        blockers: assessAttributesBlockers(character, occ),
      }
    case 'occVariableBonus':
      return {
        ok: assessOccVariableBlockers(character, occ).length === 0,
        blockers: assessOccVariableBlockers(character, occ),
      }
    case 'psychicGate':
    case 'skills':
    case 'morphus':
    case 'abilities':
      return { ok: true, blockers: [] }
    case 'review':
      return { ok: true, blockers: [] }
    default:
      return { ok: false, blockers: ['Unknown phase.'] }
  }
}
