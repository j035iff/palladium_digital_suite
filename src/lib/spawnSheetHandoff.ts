import type { EngineSkillDef } from '../data/skillLibrary'
import { getSkillById } from '../data/skillLibrary'
import { getLibraryOccById } from '../data/library/registry'
import type {
  ActiveForm,
  CharacterAttributes,
  CharacterRootState,
  FormState,
  PalladiumOcc,
  PsychicTier,
  SheetSkill,
} from '../types'
import { computeLiveBonuses } from './characterDerived'
import {
  missingPrerequisiteMessage,
  prerequisiteSatisfied,
} from './skillPrerequisites'
import { aggregateSkillModifiers } from './skillModifiers'
import {
  buildSkillPercentContext,
  resolveSkillPercent,
} from './skillPercentResolution'
import { maPbScaledBonuses, type SkillEquationSkill } from './skillEquation'
import {
  resolveCreationPsychicTier,
  resolveOccSkillBonusPercent,
} from './creationPsychicSkills'
import { resolveCreationOccSkillIds } from './occCoreSkillVouchers'

function buildSkillEquationInput(
  def: EngineSkillDef,
  selectedIds: ReadonlySet<string>,
  occBonus: number,
): SkillEquationSkill {
  let synergy = def.synergyBonuses ?? 0
  if (def.id === 'skill_astronomy' && selectedIds.has('skill_math_advanced')) {
    synergy += 10
  }
  return {
    basePercent: def.basePercent,
    perLevel: def.perLevel,
    acquisitionLevel: def.acquisitionLevel,
    occBonus,
    synergyBonuses: synergy,
    scaledAttBonuses: def.scaledAttBonuses,
    statusModifiers: def.statusModifiers,
  }
}

/** Build sheet skill rows from creation picks (Skill Engine → live sheet). */
export function projectCreationSkillsToSheet(
  character: CharacterRootState,
  occ?: PalladiumOcc,
  activeForm: ActiveForm = 'facade',
  psychicTier?: PsychicTier,
): SheetSkill[] {
  const occIds = character.creationOccSkillIds ?? []
  const relatedIds = character.creationRelatedSkillIds ?? []
  const voucherPicks = character.creationOccCoreVoucherPicks ?? {}
  const resolvedOccIds = resolveCreationOccSkillIds(
    occ,
    character.occSpecializationId,
    occIds,
    voucherPicks,
  )
  const allIds = [...new Set([...resolvedOccIds, ...relatedIds])]
  if (!allIds.length) return []

  const relatedSet = new Set(relatedIds)
  const selectedSet = new Set(allIds)
  const branch = activeForm === 'morphus' ? character.morphus : character.facade
  const attrs = branch.attributes
  const tier = psychicTier ?? resolveCreationPsychicTier(character)

  const iqBonus = computeLiveBonuses(attrs).iqOccSkillPercent
  const maPbBonus = maPbScaledBonuses(attrs.ma, attrs.pb)
  const ctx = buildSkillPercentContext(
    character,
    activeForm,
    iqBonus,
    maPbBonus,
    'hard_flat',
  )

  const rows: SheetSkill[] = []
  for (const id of allIds) {
    const def = getSkillById(id)
    if (!def) continue

    const occBonus = resolveOccSkillBonusPercent(
      occ,
      id,
      relatedSet,
      tier,
      character.occSpecializationId,
    )
    const equation = buildSkillEquationInput(def, selectedSet, occBonus)
    const resolved = resolveSkillPercent({ ...equation, id: def.id }, ctx)

    const prereqOk = prerequisiteSatisfied(def.prerequisite, selectedSet)
    const restricted = !prereqOk || resolved.impossibleInMorphus === true

    let restrictionReason: string | undefined
    if (!prereqOk) {
      restrictionReason =
        missingPrerequisiteMessage(def.prerequisite, selectedSet) ??
        'Prerequisite not met (skill_selection.md §2).'
    } else if (resolved.impossibleInMorphus) {
      restrictionReason =
        'Marked impossible in Morphus for this build (Morphus characteristic rules).'
    }

    rows.push({
      id: def.id,
      name: def.name,
      restricted,
      restrictionReason,
      basePercent: restricted ? equation.basePercent : resolved.total,
    })
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

function applyAttributeModifiers(
  attrs: CharacterAttributes,
  mods: ReturnType<typeof aggregateSkillModifiers>,
): CharacterAttributes {
  const ps = mods.ps != null ? attrs.ps.score + mods.ps : attrs.ps.score
  return {
    ...attrs,
    ps: { ...attrs.ps, score: Math.max(1, ps) },
    pp: Math.max(1, attrs.pp + (mods.pp ?? 0)),
    pe: Math.max(1, attrs.pe + (mods.pe ?? 0)),
    spd: Math.max(1, attrs.spd + (mods.spd ?? 0)),
  }
}

function applySdcFromModifiers(
  branch: FormState,
  sdcBonus: number,
): FormState {
  if (!sdcBonus) return branch
  const max = Math.max(0, branch.structuralDamageCapacity.maximum + sdcBonus)
  const cur = Math.max(
    0,
    Math.min(branch.structuralDamageCapacity.current + sdcBonus, max),
  )
  return {
    ...branch,
    structuralDamageCapacity: {
      ...branch.structuralDamageCapacity,
      maximum: max,
      current: cur,
    },
  }
}

function finalizeFormBranch(
  branch: FormState,
  skills: SheetSkill[],
  skillIds: readonly string[],
): FormState {
  const mods = aggregateSkillModifiers(skillIds)
  let next: FormState = { ...branch, skills }
  next = {
    ...next,
    attributes: applyAttributeModifiers(next.attributes, mods),
  }
  return applySdcFromModifiers(next, mods.sdc ?? 0)
}

/**
 * Spawn handoff: mirror creation skill picks onto both forms and apply staged
 * physical skill modifiers (skill_selection.md §4).
 */
export function applySpawnSheetHandoff(
  prev: CharacterRootState,
  opts?: { psychicTier?: PsychicTier },
): CharacterRootState {
  const occ = getLibraryOccById(prev.occ.id) ?? undefined
  const tier = opts?.psychicTier ?? resolveCreationPsychicTier(prev)
  const skillIds = [
    ...new Set([
      ...resolveCreationOccSkillIds(
        occ,
        prev.occSpecializationId,
        prev.creationOccSkillIds ?? [],
        prev.creationOccCoreVoucherPicks ?? {},
      ),
      ...(prev.creationRelatedSkillIds ?? []),
    ]),
  ]

  const facadeSkills = projectCreationSkillsToSheet(prev, occ, 'facade', tier)
  const morphusSkills = projectCreationSkillsToSheet(prev, occ, 'morphus', tier)

  return {
    ...prev,
    creationPsychicTier: tier,
    facade: finalizeFormBranch(prev.facade, facadeSkills, skillIds),
    morphus: finalizeFormBranch(prev.morphus, morphusSkills, skillIds),
    isFinalized: true,
  }
}
