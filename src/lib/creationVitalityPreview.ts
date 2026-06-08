import type { Character, PalladiumOcc, Race } from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { formatOccSdcRollHint } from './creationOccBonuses'
import {
  creationHpLabel,
  creationIspLabel,
  creationSdcLabel,
} from './creationFormLabels'
import { formatVitalFormulaLedgerHint } from './ledgerVitalFormula'
import {
  buildAttrFormulaLedgerFields,
  resolveIspCreationFormula,
  resolvePpeCreationFormula,
} from './ledgerVitalFormula'

const UNASSIGNED = '—'

export type CreationVitalityPreview = {
  /** Resolved H.P. line value (— until P.E. is assigned, then P.E. score + dice). */
  facadeHpValue: string
  /** Race H.P. roll template shown under H.P. once a race is selected. */
  facadeHpRollHint: string | undefined
  /** S.D.C. stays — during creation; resolved at Spawn. */
  facadeSdcValue: string
  /** Race/O.C.C. S.D.C. dice once both are selected. */
  facadeSdcRollHint: string | undefined
  /** P.P.E. stays — during creation; resolved at Spawn. */
  ppeValue: string
  /** Race/O.C.C. P.P.E. dice once both are selected. */
  ppeRollHint: string | undefined
  ispValue: string
  ispRollHint: string | undefined
}

export function isCreationOccSelected(occ: PalladiumOcc | undefined): boolean {
  return Boolean(occ?.id?.trim())
}

/** Human-readable race H.P. roll (e.g. `P.E. + 1D6/level` for humans). */
export function formatRaceHpRollHint(hpFormula?: string): string {
  const withPe = (hpFormula ?? 'PE + 1D6').trim().replace(/\bPE\b/gi, 'P.E.')
  return withPe.replace(/(\d+D\d+(?:\*\d+)?)/gi, (match) =>
    match.includes('/level') ? match : `${match}/level`,
  )
}

/** Read-only vitality formulas for the Live Ledger before spawn dice are entered. */
export function creationVitalityPreview(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts?: {
    psychicTier?: string
    assignments?: Partial<Record<ForgeAttrKey, number>>
  },
): CreationVitalityPreview {
  const assignments =
    opts?.assignments ?? character.creationAttributeAssignments ?? {}
  const showIsp =
    opts?.psychicTier !== 'none' || character.psychicGateBypassed === true

  const facadeHpRollHint = race
    ? formatRaceHpRollHint(race.vitals?.hpFormula)
    : undefined
  const hpFormula = race ? (race.vitals?.hpFormula ?? 'PE + 1D6') : null
  const facadeHpValue = buildAttrFormulaLedgerFields(hpFormula, assignments, {
    hintOverride: facadeHpRollHint,
  }).value

  const facadeSdcValue = UNASSIGNED
  const facadeSdcRollHint =
    race && occ && isCreationOccSelected(occ)
      ? formatOccSdcRollHint(race, occ, character)
      : undefined

  const ppeFormula =
    race && occ && isCreationOccSelected(occ)
      ? resolvePpeCreationFormula(race, occ)
      : null
  const ppeFields = buildAttrFormulaLedgerFields(ppeFormula, assignments, {
    perLevelFormula: occ?.ppeEngine?.perLevelFormula,
  })
  const ppeValue = ppeFields.value
  const ppeRollHint = ppeFields.hint

  const ispFormula = resolveIspCreationFormula(
    occ && isCreationOccSelected(occ) ? occ : undefined,
    opts?.psychicTier ?? 'none',
    showIsp,
  )
  const ispRollHint = showIsp
    ? ispFormula
      ? formatVitalFormulaLedgerHint(ispFormula.base, ispFormula.perLevel)
      : `M.E. + 1D6 (after attributes assigned)`
    : undefined
  const ispFields = ispFormula
    ? buildAttrFormulaLedgerFields(ispFormula.base, assignments, {
        perLevelFormula: ispFormula.perLevel,
        hintOverride: ispRollHint,
      })
    : null
  const ispValue = showIsp ? (ispFields?.value ?? UNASSIGNED) : UNASSIGNED

  return {
    facadeHpValue,
    facadeHpRollHint,
    facadeSdcValue,
    facadeSdcRollHint,
    ppeValue,
    ppeRollHint,
    ispValue,
    ispRollHint,
  }
}

export function creationVitalityPreviewLines(
  preview: CreationVitalityPreview,
  supportsDualForm = false,
): { label: string; value: string; hint?: string }[] {
  const lines = [
    {
      label: creationHpLabel(supportsDualForm, 'human'),
      value: preview.facadeHpValue,
      hint: preview.facadeHpRollHint,
    },
    {
      label: creationSdcLabel(supportsDualForm, 'human'),
      value: preview.facadeSdcValue,
      hint: preview.facadeSdcRollHint,
    },
    { label: 'P.P.E.', value: preview.ppeValue, hint: preview.ppeRollHint },
  ]
  if (preview.ispRollHint) {
    lines.push({
      label: creationIspLabel(supportsDualForm),
      value: preview.ispValue,
      hint: preview.ispRollHint,
    })
  }
  return lines
}
