import type { EngineSkillDef } from '../data/skillLibrary'
import {
  resolveConditionalRelatedSynergyLines,
  resolvePickBasePercentAtLevel,
} from './conditionalRelatedSkills'
import type { CreationSkillPick, PalladiumOcc, PsychicTier } from '../types'
import {
  getPalladiumSkillCatalogEntryById,
  PALLADIUM_SKILL_CATALOG,
} from '../data/library/skillsCatalogLoader'
import { resolveSkillDisplayName } from './skillDisplayNames'
import {
  type CreationSkillAvailabilityContext,
  formatCreationSkillPickLabel,
  isCreationSkillExcludedFromOccOrRace,
  resolveProfessionalPercentBonus,
} from './creationSkillPicks'
import {
  resolveSkillPercent,
  type SkillPercentBreakdownLine,
  type SkillPercentResolutionContext,
} from './skillPercentResolution'
import {
  applyPsychicOccSkillBonusPercent,
  resolveOccSkillBonusPercent,
} from './creationPsychicSkills'
import { listOccCoreVoucherTasks } from './occCoreSkillVouchers'
import { getOccCoreVoucherPicks } from './creationSkillPicks'
import {
  resolveSkillCatalogDisplayDetails,
  type SkillCatalogDisplayDetails,
} from './skillDisplayDetails'

export type SkillPickDisplayTier =
  | 'occ'
  | 'related'
  | 'secondary'
  | 'preview_occ'
  | 'preview_related'
  | 'preview_secondary'

export type SkillBonusLine = {
  label: string
  value: number
}

export type SkillPercentBreakdownPartKind =
  | 'base'
  | 'iq'
  | 'occ'
  | 'synergy'
  | 'penalty'

export type SkillPercentBreakdownPart = {
  kind: SkillPercentBreakdownPartKind
  text: string
}

export type SkillPercentSummary = {
  baseAtLevel: number
  perLevel: number
  total: number
  parts: readonly SkillPercentBreakdownPart[]
}

export type SkillCreationDisplayInfo = SkillCatalogDisplayDetails & {
  basePercent: number
  perLevel: number
  total: number
  impossibleInMorphus?: boolean
  equationBonuses: readonly SkillBonusLine[]
  contextBonuses: readonly SkillBonusLine[]
  percentSummary?: SkillPercentSummary
}

function effectiveSkillLevel(
  acquisitionLevel: number,
  characterLevel: number,
): number {
  return Math.max(1, characterLevel - acquisitionLevel + 1)
}

export function skillBasePercentAtLevel(
  def: Pick<EngineSkillDef, 'basePercent' | 'perLevel' | 'acquisitionLevel'>,
  characterLevel: number,
): number {
  const eff = effectiveSkillLevel(def.acquisitionLevel, characterLevel)
  return def.basePercent + def.perLevel * Math.max(0, eff - 1)
}

export type ActiveSynergyBonusLine = {
  label: string
  value: number
}

function synergyPartnerAvailable(
  skillId: string,
  availability?: CreationSkillAvailabilityContext,
): boolean {
  if (!availability?.effectiveOcc && !availability?.raceBlocked) return true
  return !isCreationSkillExcludedFromOccOrRace(skillId, availability)
}

export function resolveActiveSynergyBonusLines(
  def: EngineSkillDef,
  selectedIds: ReadonlySet<string>,
  picks: readonly CreationSkillPick[],
  pick?: CreationSkillPick,
  availability?: CreationSkillAvailabilityContext,
): ActiveSynergyBonusLine[] {
  const lines: ActiveSynergyBonusLine[] = []

  const proBonus = resolveProfessionalPercentBonus(def.id, pick)
  if (proBonus !== 0) {
    lines.push({ label: 'Professional quality', value: proBonus })
  }

  if (def.synergyBonuses != null && def.synergyBonuses !== 0) {
    lines.push({ label: 'Synergy', value: def.synergyBonuses })
  }

  if (
    def.id === 'skill_astronomy' &&
    selectedIds.has('skill_math_advanced') &&
    synergyPartnerAvailable('skill_math_advanced', availability)
  ) {
    lines.push({
      label: formatSourceSkillLabel('skill_math_advanced', picks),
      value: 10,
    })
  }

  const catalog = getPalladiumSkillCatalogEntryById(def.id)
  for (const raw of catalog?.synergies ?? []) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as { skillId?: string; bonusPercent?: number }
    if (typeof row.skillId !== 'string' || typeof row.bonusPercent !== 'number') {
      continue
    }
    if (!selectedIds.has(row.skillId)) continue
    if (!synergyPartnerAvailable(row.skillId, availability)) continue
    lines.push({
      label: formatSourceSkillLabel(row.skillId, picks),
      value: row.bonusPercent,
    })
  }

  for (const line of resolveConditionalRelatedSynergyLines(
    def.id,
    selectedIds,
    picks,
    pick,
    availability,
  )) {
    lines.push(line)
  }

  for (const raw of PALLADIUM_SKILL_CATALOG) {
    if (!synergyPartnerAvailable(raw.id, availability)) continue
    if (!selectedIds.has(raw.id)) continue
    const synergies = (
      raw as { synergies?: Array<{ skillId?: string; bonusPercent?: number }> }
    ).synergies
    for (const row of synergies ?? []) {
      if (row.skillId !== def.id || typeof row.bonusPercent !== 'number') continue
      lines.push({
        label: formatSourceSkillLabel(raw.id, picks),
        value: row.bonusPercent,
      })
    }
  }

  return lines.filter((line) => line.value !== 0)
}

function formatSourceSkillLabel(
  skillId: string,
  picks: readonly CreationSkillPick[],
): string {
  const pick = picks.find((p) => p.skillId === skillId)
  const baseName = resolveSkillDisplayName(skillId)
  return pick ? formatCreationSkillPickLabel(pick, baseName) : baseName
}

function sumSynergyBonuses(lines: readonly ActiveSynergyBonusLine[]): number {
  return lines.reduce((sum, line) => sum + line.value, 0)
}

function buildPercentBreakdownParts(
  baseAtLevel: number,
  iqBonus: number,
  maPbBonus: number,
  occBonus: number,
  synergyLines: readonly ActiveSynergyBonusLine[],
  contextBonuses: readonly SkillBonusLine[],
  scaledAttSkill: number,
  statusMod: number,
): SkillPercentBreakdownPart[] {
  const parts: SkillPercentBreakdownPart[] = [
    { kind: 'base', text: `Base ${baseAtLevel}` },
  ]

  if (iqBonus !== 0) {
    parts.push({
      kind: 'iq',
      text: `${iqBonus > 0 ? '+' : ''}${iqBonus} IQ`,
    })
  }

  if (maPbBonus !== 0) {
    parts.push({
      kind: 'iq',
      text: `${maPbBonus > 0 ? '+' : ''}${maPbBonus} M.A. / P.B.`,
    })
  }

  if (occBonus !== 0) {
    parts.push({
      kind: 'occ',
      text: `${occBonus > 0 ? '+' : ''}${occBonus} OCC`,
    })
  }

  for (const line of synergyLines) {
    parts.push({
      kind: 'synergy',
      text: `${line.value > 0 ? '+' : ''}${line.value}% ${line.label}`,
    })
  }

  if (scaledAttSkill < 0) {
    parts.push({
      kind: 'penalty',
      text: `${scaledAttSkill}% Attribute (skill)`,
    })
  }

  if (statusMod < 0) {
    parts.push({
      kind: 'penalty',
      text: `${statusMod}% Status`,
    })
  }

  for (const line of contextBonuses) {
    if (line.value >= 0) continue
    parts.push({
      kind: 'penalty',
      text: `${line.value}% ${line.label}`,
    })
  }

  return parts
}

function buildEquationInput(
  def: EngineSkillDef,
  selectedIds: ReadonlySet<string>,
  occBonus: number,
  pick?: CreationSkillPick,
  allPicks: readonly CreationSkillPick[] = [],
  characterLevel = 1,
  availability?: CreationSkillAvailabilityContext,
) {
  const synergyLines = resolveActiveSynergyBonusLines(
    def,
    selectedIds,
    allPicks,
    pick,
    availability,
  )
  const synergy = sumSynergyBonuses(synergyLines)
  const baseAtLevel = resolvePickBasePercentAtLevel(def, pick, characterLevel)
  const basePercentForEquation =
    pick?.conditionalGrantStartingPercent != null
      ? pick.conditionalGrantStartingPercent
      : def.basePercent
  return {
    synergyLines,
    input: {
      basePercent: basePercentForEquation,
      perLevel: def.perLevel,
      acquisitionLevel: def.acquisitionLevel,
      occBonus,
      synergyBonuses: synergy,
      scaledAttBonuses: def.scaledAttBonuses,
      statusModifiers: def.statusModifiers,
    },
    baseAtLevel,
  }
}

function occBonusLabel(tier: SkillPickDisplayTier): string {
  switch (tier) {
    case 'occ':
      return 'O.C.C. core'
    case 'related':
    case 'preview_related':
      return 'O.C.C. related'
    default:
      return 'O.C.C.'
  }
}

function collectEquationBonusLines(
  def: EngineSkillDef,
  occBonus: number,
  iqBonus: number,
  maPbBonus: number,
  tier: SkillPickDisplayTier,
  synergyLines: readonly ActiveSynergyBonusLine[],
): SkillBonusLine[] {
  const lines: SkillBonusLine[] = []
  for (const line of synergyLines) {
    lines.push({ label: line.label, value: line.value })
  }
  if (occBonus !== 0) {
    lines.push({ label: occBonusLabel(tier), value: occBonus })
  }
  if (iqBonus !== 0) {
    lines.push({ label: 'I.Q.', value: iqBonus })
  }
  const skillScaled = def.scaledAttBonuses ?? 0
  if (skillScaled !== 0) {
    lines.push({ label: 'Attribute (skill)', value: skillScaled })
  }
  if (maPbBonus !== 0) {
    lines.push({ label: 'M.A. / P.B.', value: maPbBonus })
  }
  const status = def.statusModifiers ?? 0
  if (status !== 0) {
    lines.push({ label: 'Status', value: status })
  }
  return lines
}

function resolveVoucherOccBonus(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  skillId: string,
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
  psychicTier: PsychicTier,
): number {
  if (!occ) return 0
  for (const task of listOccCoreVoucherTasks(occ, specializationId)) {
    const picks = getOccCoreVoucherPicks(voucherPicks, task.id)
    if (picks.some((pick) => pick.skillId === skillId)) {
      return applyPsychicOccSkillBonusPercent(
        task.entry.bonusPercent ?? 0,
        psychicTier,
      )
    }
  }
  return 0
}

function resolveOccBonusForTier(
  skillId: string,
  tier: SkillPickDisplayTier,
  occ: PalladiumOcc | undefined,
  relatedIds: ReadonlySet<string>,
  psychicTier: PsychicTier,
  specializationId: string | null | undefined,
  voucherPicks: Readonly<Record<string, unknown>> | undefined,
): number {
  if (tier === 'secondary' || tier === 'preview_secondary') return 0
  if (tier === 'occ') {
    const grantBonus = resolveOccSkillBonusPercent(
      occ,
      skillId,
      relatedIds,
      psychicTier,
      specializationId,
    )
    if (grantBonus !== 0) return grantBonus
    return resolveVoucherOccBonus(
      occ,
      specializationId,
      skillId,
      voucherPicks,
      psychicTier,
    )
  }
  const relatedForBonus =
    tier === 'preview_related'
      ? new Set([...relatedIds, skillId])
      : relatedIds
  return resolveOccSkillBonusPercent(
    occ,
    skillId,
    relatedForBonus,
    psychicTier,
    specializationId,
  )
}

export function resolveSkillCreationDisplay(
  def: EngineSkillDef,
  tier: SkillPickDisplayTier,
  opts: {
    occ?: PalladiumOcc
    relatedIds: ReadonlySet<string>
    allSelectedIds: ReadonlySet<string>
    psychicTier: PsychicTier
    specializationId?: string | null
    voucherPicks: Readonly<Record<string, unknown>> | undefined
    skillPercentCtx: SkillPercentResolutionContext
    iqBonus: number
    maPbBonus: number
    pick?: CreationSkillPick
    allPicks?: readonly CreationSkillPick[]
    synergyAvailability?: CreationSkillAvailabilityContext
  },
): SkillCreationDisplayInfo {
  const allPicks = opts.allPicks ?? (opts.pick ? [opts.pick] : [])
  const occBonus = resolveOccBonusForTier(
    def.id,
    tier,
    opts.occ,
    opts.relatedIds,
    opts.psychicTier,
    opts.specializationId,
    opts.voucherPicks,
  )
  const { synergyLines, input, baseAtLevel } = buildEquationInput(
    def,
    opts.allSelectedIds,
    occBonus,
    opts.pick,
    allPicks,
    opts.skillPercentCtx.characterLevel,
    opts.synergyAvailability,
  )
  const resolved = resolveSkillPercent({ ...input, id: def.id }, opts.skillPercentCtx)
  const equationBonuses = collectEquationBonusLines(
    def,
    occBonus,
    opts.iqBonus,
    opts.maPbBonus,
    tier,
    synergyLines,
  )
  const contextBonuses: SkillBonusLine[] = resolved.lines.map(
    (line: SkillPercentBreakdownLine) => ({
      label: line.label,
      value: line.value,
    }),
  )

  const catalogDetails = resolveSkillCatalogDisplayDetails(
    def,
    opts.skillPercentCtx.characterLevel,
  )

  const percentSummary: SkillPercentSummary | undefined =
    catalogDetails.showMainPercentLine && !catalogDetails.isWeaponProficiency
      ? {
          baseAtLevel,
          perLevel: def.perLevel,
          total: resolved.total,
          parts: buildPercentBreakdownParts(
            baseAtLevel,
            opts.iqBonus,
            opts.maPbBonus,
            occBonus,
            synergyLines,
            contextBonuses,
            def.scaledAttBonuses ?? 0,
            def.statusModifiers ?? 0,
          ),
        }
      : undefined

  return {
    ...catalogDetails,
    basePercent: def.basePercent,
    perLevel: def.perLevel,
    total: resolved.total,
    impossibleInMorphus: resolved.impossibleInMorphus,
    equationBonuses: catalogDetails.isWeaponProficiency ? [] : equationBonuses,
    contextBonuses: catalogDetails.isWeaponProficiency ? [] : contextBonuses,
    percentSummary,
  }
}

/** True when O.C.C. related category % would change the preview vs secondary. */
export function skillRelatedVsSecondaryPreviewDiffers(
  related: SkillCreationDisplayInfo,
  secondary: SkillCreationDisplayInfo,
): boolean {
  const occRelatedBonus = (d: SkillCreationDisplayInfo) =>
    d.equationBonuses.find((b) => b.label === 'O.C.C. related')?.value ?? 0
  return occRelatedBonus(related) !== occRelatedBonus(secondary)
}

export function resolveSelectionTier(
  skillId: string,
  occSkillIds: readonly string[],
  relatedPicks: readonly CreationSkillPick[],
  secondaryPicks: readonly CreationSkillPick[],
): SkillPickDisplayTier | undefined {
  if (relatedPicks.some((p) => p.skillId === skillId)) return 'related'
  if (secondaryPicks.some((p) => p.skillId === skillId)) return 'secondary'
  if (occSkillIds.includes(skillId)) return 'occ'
  return undefined
}

export type SkillAddAction = 'related' | 'secondary'

export function skillAddDisabledReason(
  action: SkillAddAction,
  opts: {
    picked: boolean
    slotsFull: boolean
    categoryBlocked: boolean
    actionAvailable: boolean
  },
): string | null {
  if (opts.picked) return 'Already selected'
  if (action === 'related') {
    if (opts.slotsFull) return 'No O.C.C. related slots available'
    if (opts.categoryBlocked) return 'Not available to O.C.C.'
  }
  if (action === 'secondary') {
    if (opts.slotsFull) return 'No secondary slots available'
    if (opts.categoryBlocked) return 'Not available to O.C.C.'
  }
  return null
}
