import type { Character, PalladiumOcc, Race } from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { formatOccSdcRollHint } from './creationOccBonuses'
import {
  creationHpLabel,
  creationIspLabel,
  creationSdcLabel,
} from './creationFormLabels'
import { formatHpDiceRollHint, formatVitalDiceRollHint } from './ledgerVitalFormula'
import {
  buildAttrFormulaLedgerFields,
  dualFormPpeLedgerFormulaOpts,
  resolveIspCreationFormula,
  resolvePpeCreationFormula,
} from './ledgerVitalFormula'

const UNASSIGNED = '—'

export type CreationVitalityPreview = {
  /** Resolved H.P. line value (— until P.E. is assigned, then P.E. score + dice). */
  primaryHpValue: string
  /** Race H.P. roll template shown under H.P. once a race is selected. */
  primaryHpRollHint: string | undefined
  /** S.D.C. stays — during creation; resolved at Spawn. */
  primarySdcValue: string
  /** Race/O.C.C. S.D.C. dice once both are selected. */
  primarySdcRollHint: string | undefined
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

/** Human-readable race H.P. roll dice only (e.g. `Race: +1D6/level`). */
export function formatRaceHpRollHint(hpFormula?: string): string {
  return formatHpDiceRollHint(hpFormula) ?? ''
}

/** Read-only vitality formulas for the Live Ledger before spawn dice are entered. */
export function creationVitalityPreview(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts?: {
    psychicTier?: string
    assignments?: Partial<Record<ForgeAttrKey, number>>
    supportsDualForm?: boolean
  },
): CreationVitalityPreview {
  const assignments =
    opts?.assignments ?? character.creationAttributeAssignments ?? {}
  const showIsp =
    opts?.psychicTier !== 'none' || character.psychicGateBypassed === true

  const primaryHpRollHint = race
    ? formatRaceHpRollHint(race.vitals?.hpFormula)
    : undefined
  const hpFormula = race ? (race.vitals?.hpFormula ?? 'PE + 1D6') : null
  const primaryHpValue = buildAttrFormulaLedgerFields(hpFormula, assignments, {
    hintOverride: primaryHpRollHint,
  }).value

  const primarySdcValue = UNASSIGNED
  const primarySdcRollHint =
    race && occ && isCreationOccSelected(occ)
      ? formatOccSdcRollHint(race, occ, character)
      : undefined

  const ppeFormula =
    race && occ && isCreationOccSelected(occ)
      ? resolvePpeCreationFormula(race, occ)
      : null
  const primaryPe =
    assignments.pe ?? character.primary.attributes.pe
  const ppeFields = buildAttrFormulaLedgerFields(ppeFormula, assignments, {
    perLevelFormula: occ?.ppeEngine?.perLevelFormula,
    ...(opts?.supportsDualForm
      ? dualFormPpeLedgerFormulaOpts(primaryPe)
      : {}),
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
      ? formatVitalDiceRollHint({
          formulaSources: { occ: ispFormula.base },
          perLevelFormula: ispFormula.perLevel,
        })
      : `O.C.C.: 1D6 (after attributes assigned)`
    : undefined
  const ispFields = ispFormula
    ? buildAttrFormulaLedgerFields(ispFormula.base, assignments, {
        perLevelFormula: ispFormula.perLevel,
        hintOverride: ispRollHint,
      })
    : null
  const ispValue = showIsp ? (ispFields?.value ?? UNASSIGNED) : UNASSIGNED

  return {
    primaryHpValue,
    primaryHpRollHint,
    primarySdcValue,
    primarySdcRollHint,
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
      label: creationHpLabel(supportsDualForm, 'primary'),
      value: preview.primaryHpValue,
      hint: preview.primaryHpRollHint,
    },
    {
      label: creationSdcLabel(supportsDualForm, 'primary'),
      value: preview.primarySdcValue,
      hint: preview.primarySdcRollHint,
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
