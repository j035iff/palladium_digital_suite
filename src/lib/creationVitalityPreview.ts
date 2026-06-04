import type { Character, PalladiumOcc, Race } from '../types'
import { deriveSdcHpMaximums } from './derivedVitality'
import { occFlatVitalBonus } from './creationOccBonuses'
import {
  creationHpLabel,
  creationIspLabel,
  creationSdcLabel,
} from './creationFormLabels'

export type CreationVitalityPreview = {
  facadeHpHint: string
  facadeSdcHint: string
  ppeHint: string
  ispHint: string | null
}

/** Read-only vitality formulas for the Live Ledger before spawn dice are entered. */
export function creationVitalityPreview(
  character: Character,
  _race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts?: { psychicTier?: string },
): CreationVitalityPreview {
  const f = character.facade.attributes
  const { sdcMaximum } = deriveSdcHpMaximums(f)
  const occSdc = occFlatVitalBonus(
    occ,
    character.occSpecializationId,
    'sdc',
    character.creationOccVariableResolutions ?? {},
  )
  const showIsp =
    opts?.psychicTier !== 'none' || character.psychicGateBypassed === true

  return {
    facadeHpHint: `P.E. ${f.pe} + 1D6 (min 4) → ~${Math.max(4, f.pe + 1)}–${f.pe + 6}`,
    facadeSdcHint:
      occSdc > 0
        ? `Derived ~${sdcMaximum} + O.C.C. +${occSdc} + race dice at spawn`
        : `Derived ~${sdcMaximum} + race / spawn dice`,
    ppeHint: `M.E. ${f.me} + P.E. ${f.pe} + 2D6`,
    ispHint: showIsp ? `M.E. ${f.me} + 1D6` : null,
  }
}

export function creationVitalityPreviewLines(
  preview: CreationVitalityPreview,
  supportsDualForm = false,
): { label: string; value: string }[] {
  const lines = [
    {
      label: creationHpLabel(supportsDualForm, 'human'),
      value: preview.facadeHpHint,
    },
    {
      label: creationSdcLabel(supportsDualForm, 'human'),
      value: preview.facadeSdcHint,
    },
    { label: 'P.P.E.', value: preview.ppeHint },
  ]
  if (preview.ispHint) {
    lines.push({
      label: creationIspLabel(supportsDualForm),
      value: preview.ispHint,
    })
  }
  return lines
}
