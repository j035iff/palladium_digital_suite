import type { Character, PalladiumOcc, Race } from '../types'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { calculateBaseSdc } from '../utils/vitalsCalculator'
import { diceNotationBounds, isDiceNotation, singleDieBounds } from './diceNotationBounds'
import { listOccVariableBonusTasks } from './occVariableBonus'

export type PendingDiceEntry = {
  id: string
  label: string
  notation: string
  min: number
  max: number
  hint?: string
}

function skillDiceFromSelection(ids: readonly string[]): PendingDiceEntry[] {
  const out: PendingDiceEntry[] = []
  for (const skillId of ids) {
    const entry = getPalladiumSkillCatalogEntryById(skillId)
    const bonuses = (entry as { physicalSkillBonuses?: Record<string, unknown> })
      ?.physicalSkillBonuses
    if (!bonuses) continue
    for (const [key, raw] of Object.entries(bonuses)) {
      if (typeof raw !== 'string' || !isDiceNotation(raw)) continue
      const bounds = diceNotationBounds(raw)
      out.push({
        id: `skill.${skillId}.${key}`,
        label: `${entry?.name ?? skillId} — ${key}`,
        notation: raw,
        min: bounds.min,
        max: bounds.max,
      })
    }
  }
  return out
}

/** Staged dice the player must resolve before Spawn (Phase IV checklist). */
export function listPendingDiceEntries(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts?: { supportsDualForm?: boolean; psychicTier?: string },
): PendingDiceEntry[] {
  const entries: PendingDiceEntry[] = []
  const pe = character.facade.attributes.pe

  const hpDie = singleDieBounds('1D6')
  entries.push({
    id: 'vitality.facade_hp_die',
    label: 'Facade base H.P. die',
    notation: '1D6',
    min: hpDie.min,
    max: hpDie.max,
    hint: `Add to P.E. (${pe}) — min total 4`,
  })

  const sdcFormula = race ? calculateBaseSdc(race, occ) : '3D6'
  if (isDiceNotation(sdcFormula)) {
    const bounds = diceNotationBounds(sdcFormula)
    entries.push({
      id: 'vitality.facade_sdc',
      label: 'Facade S.D.C.',
      notation: sdcFormula,
      min: bounds.min,
      max: bounds.max,
    })
  } else {
    entries.push({
      id: 'vitality.facade_sdc_die',
      label: 'Facade S.D.C. die',
      notation: '1D6',
      min: 1,
      max: 6,
      hint: 'Added to attribute-derived S.D.C. baseline',
    })
  }

  const ppeDie = singleDieBounds('2D6')
  entries.push({
    id: 'vitality.ppe_die',
    label: 'P.P.E. dice',
    notation: '2D6',
    min: ppeDie.min,
    max: ppeDie.max,
    hint: `Add to M.E. + P.E.`,
  })

  const showIsp =
    opts?.psychicTier !== 'none' || character.psychicGateBypassed === true
  if (showIsp) {
    const ispDie = singleDieBounds('1D6')
    entries.push({
      id: 'vitality.isp_die',
      label: 'I.S.P. die',
      notation: '1D6',
      min: ispDie.min,
      max: ispDie.max,
      hint: `Add to M.E. (${character.facade.attributes.me})`,
    })
  }

  if (opts?.supportsDualForm) {
    entries.push({
      id: 'vitality.morphus_hp_die',
      label: 'Morphus H.P. dice',
      notation: '2D6',
      min: 2,
      max: 12,
      hint: 'P.E.-weighted morphus convergence',
    })
    entries.push({
      id: 'vitality.morphus_sdc_die',
      label: 'Morphus S.D.C. dice',
      notation: '2D6',
      min: 2,
      max: 12,
      hint: 'P.E. + P.S. weighted morphus pool',
    })
  }

  for (const task of listOccVariableBonusTasks(occ, character.occSpecializationId)) {
    if (task.section === 'vitals') {
      entries.push({
        id: `occ.${task.id}`,
        label: `O.C.C. ${task.label}`,
        notation: task.notation,
        min: task.min,
        max: task.max,
      })
    }
  }

  const skillIds = [
    ...(character.creationOccSkillIds ?? []),
    ...(character.creationRelatedSkillIds ?? []),
  ]
  entries.push(...skillDiceFromSelection(skillIds))

  return entries
}

export function pendingDiceResolutionsComplete(
  entries: readonly PendingDiceEntry[],
  resolutions: Readonly<Record<string, number>>,
): boolean {
  return entries.every((e) => {
    const v = resolutions[e.id]
    return (
      typeof v === 'number' &&
      Number.isFinite(v) &&
      v >= e.min &&
      v <= e.max
    )
  })
}
