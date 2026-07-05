import type { EngineSkillDef } from '../data/skillLibrary'
import { getSkillById } from '../data/skillLibrary'
import { getLibraryOccById } from '../data/library/registry'
import type {
  ActiveForm,
  CharacterAttributes,
  CharacterRootState,
  CreationSkillPick,
  FormState,
  PalladiumOcc,
  PsychicTier,
  SheetSkill,
} from '../types'
import {
  resolveLiveSkillPercent,
} from './liveSkillEngine'
import {
  missingPrerequisiteMessage,
  prerequisiteSatisfied,
} from './skillPrerequisites'
import { aggregateSkillModifiers } from './skillModifiers'
import type { SkillEquationSkill } from './skillEquation'
import {
  resolveCreationPsychicTier,
  resolveOccSkillBonusPercent,
} from './creationPsychicSkills'
import {
  resolveCreationOccSkillIds,
  resolveOccCoreSkillPicks,
} from './occCoreSkillVouchers'
import { sheetSkillIdForCreationHandToHandTier } from './creationHandToHandChoice'
import {
  creationSkillIdsSet,
  flattenCreationSkillIds,
  formatCreationSkillPickLabel,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
  migrateSkillIdToPick,
  resolveProfessionalPercentBonus,
} from './creationSkillPicks'

function buildSkillEquationInput(
  def: EngineSkillDef,
  selectedIds: ReadonlySet<string>,
  occBonus: number,
  pick?: CreationSkillPick,
): SkillEquationSkill {
  let synergy = def.synergyBonuses ?? 0
  if (def.id === 'skill_astronomy' && selectedIds.has('skill_math_advanced')) {
    synergy += 10
  }
  synergy += resolveProfessionalPercentBonus(def.id, pick)
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
  activeForm: ActiveForm = 'primary',
  psychicTier?: PsychicTier,
): SheetSkill[] {
  const occIds = character.creationOccSkillIds ?? []
  const relatedPicks = getCreationRelatedPicks(character)
  const secondaryPicks = getCreationSecondaryPicks(character)
  const voucherPicks = character.creationOccCoreVoucherPicks ?? {}
  const resolvedOccIds = resolveCreationOccSkillIds(
    occ,
    character.occSpecializationId,
    occIds,
    voucherPicks,
  )
  const hthId = sheetSkillIdForCreationHandToHandTier(
    character.creationHandToHandTier,
  )

  const occCorePicks = resolveOccCoreSkillPicks(
    occ,
    character.occSpecializationId,
    voucherPicks,
    character.creationOccGrantPickDetails,
  )

  type PickEntry = { pick: CreationSkillPick; tier: 'occ' | 'related' | 'secondary' }
  const entries: PickEntry[] = [
    ...occCorePicks.map((pick) => ({ pick, tier: 'occ' as const })),
    ...relatedPicks.map((pick) => ({ pick, tier: 'related' as const })),
    ...secondaryPicks.map((pick) => ({ pick, tier: 'secondary' as const })),
  ]
  if (hthId) {
    entries.push({ pick: migrateSkillIdToPick(hthId), tier: 'occ' })
  }
  if (!entries.length) return []

  const relatedSet = new Set(flattenCreationSkillIds(relatedPicks))
  const selectedSet = creationSkillIdsSet(
    resolvedOccIds,
    relatedPicks,
    secondaryPicks,
  )
  if (hthId) selectedSet.add(hthId)
  const tier = psychicTier ?? resolveCreationPsychicTier(character)

  const rows: SheetSkill[] = []
  for (const { pick, tier: pickTier } of entries) {
    const def = getSkillById(pick.skillId)
    if (!def) continue

    const relatedForBonus =
      pickTier === 'related'
        ? new Set([...relatedSet, pick.skillId])
        : relatedSet
    const occBonus = resolveOccSkillBonusPercent(
      occ,
      pick.skillId,
      relatedForBonus,
      tier,
      character.occSpecializationId,
    )
    const equation = buildSkillEquationInput(def, selectedSet, occBonus, pick)
    const resolved = resolveLiveSkillPercent(
      { ...equation, id: def.id },
      character,
      activeForm,
    )

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
      id: pick.instanceId,
      name: formatCreationSkillPickLabel(pick, def.name),
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
      ...flattenCreationSkillIds(getCreationRelatedPicks(prev)),
      ...flattenCreationSkillIds(getCreationSecondaryPicks(prev)),
      ...(() => {
        const id = sheetSkillIdForCreationHandToHandTier(
          prev.creationHandToHandTier,
        )
        return id ? [id] : []
      })(),
    ]),
  ]

  const primarySkills = projectCreationSkillsToSheet(prev, occ, 'primary', tier)
  const morphusSkills = projectCreationSkillsToSheet(prev, occ, 'morphus', tier)

  return {
    ...prev,
    creationPsychicTier: tier,
    primary: finalizeFormBranch(prev.primary, primarySkills, skillIds),
    morphus: finalizeFormBranch(prev.morphus, morphusSkills, skillIds),
    isFinalized: true,
  }
}
