import type { EngineSkillDef } from '../data/skillLibrary'
import type { CreationSkillPick, PalladiumOcc, PsychicTier } from '../types'
import { resolveProfessionalPercentBonus } from './creationSkillPicks'
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
import {
  resolveSkillCatalogDisplayDetails,
  type SkillCatalogDisplayDetails,
} from './skillDisplayDetails'

export type SkillPickDisplayTier =
  | 'occ'
  | 'related'
  | 'secondary'
  | 'preview_related'
  | 'preview_secondary'

export type SkillBonusLine = {
  label: string
  value: number
}

export type SkillCreationDisplayInfo = SkillCatalogDisplayDetails & {
  basePercent: number
  perLevel: number
  total: number
  impossibleInMorphus?: boolean
  equationBonuses: readonly SkillBonusLine[]
  contextBonuses: readonly SkillBonusLine[]
}

function buildEquationInput(
  def: EngineSkillDef,
  selectedIds: ReadonlySet<string>,
  occBonus: number,
  pick?: CreationSkillPick,
) {
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
  selectedIds: ReadonlySet<string>,
  pick?: CreationSkillPick,
): SkillBonusLine[] {
  const lines: SkillBonusLine[] = []
  const proBonus = resolveProfessionalPercentBonus(def.id, pick)
  if (proBonus !== 0) {
    lines.push({ label: 'Professional quality', value: proBonus })
  }
  if (occBonus !== 0) {
    lines.push({ label: occBonusLabel(tier), value: occBonus })
  }
  if (iqBonus !== 0) {
    lines.push({ label: 'I.Q.', value: iqBonus })
  }
  let synergy = def.synergyBonuses ?? 0
  if (def.id === 'skill_astronomy' && selectedIds.has('skill_math_advanced')) {
    synergy += 10
  }
  if (synergy !== 0) {
    const label =
      def.id === 'skill_astronomy' && selectedIds.has('skill_math_advanced')
        ? 'Synergy (Advanced Math)'
        : 'Synergy'
    lines.push({ label, value: synergy })
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
  voucherPicks: Readonly<Record<string, readonly string[]>>,
  psychicTier: PsychicTier,
): number {
  if (!occ) return 0
  for (const task of listOccCoreVoucherTasks(occ, specializationId)) {
    if ((voucherPicks[task.id] ?? []).includes(skillId)) {
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
  voucherPicks: Readonly<Record<string, readonly string[]>>,
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
    voucherPicks: Readonly<Record<string, readonly string[]>>
    skillPercentCtx: SkillPercentResolutionContext
    iqBonus: number
    maPbBonus: number
    pick?: CreationSkillPick
  },
): SkillCreationDisplayInfo {
  const occBonus = resolveOccBonusForTier(
    def.id,
    tier,
    opts.occ,
    opts.relatedIds,
    opts.psychicTier,
    opts.specializationId,
    opts.voucherPicks,
  )
  const input = buildEquationInput(def, opts.allSelectedIds, occBonus, opts.pick)
  const resolved = resolveSkillPercent({ ...input, id: def.id }, opts.skillPercentCtx)
  const equationBonuses = collectEquationBonusLines(
    def,
    occBonus,
    opts.iqBonus,
    opts.maPbBonus,
    tier,
    opts.allSelectedIds,
    opts.pick,
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

  return {
    ...catalogDetails,
    basePercent: def.basePercent,
    perLevel: def.perLevel,
    total: resolved.total,
    impossibleInMorphus: resolved.impossibleInMorphus,
    equationBonuses: catalogDetails.isWeaponProficiency ? [] : equationBonuses,
    contextBonuses: catalogDetails.isWeaponProficiency ? [] : contextBonuses,
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
    if (opts.categoryBlocked) return 'Blocked by O.C.C. category rules'
  }
  if (action === 'secondary') {
    if (opts.slotsFull) return 'No secondary slots available'
    if (opts.categoryBlocked) return 'Blocked by O.C.C. category rules'
  }
  return null
}
