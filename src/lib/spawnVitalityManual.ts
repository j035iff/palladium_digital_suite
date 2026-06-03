import type { Character, PalladiumOcc, Race } from '../types'
import { deriveSdcHpMaximums } from './derivedVitality'
import type { SpawnVitalityRolls } from './spawnFinalVitality'

/**
 * Build final vitality pools from manually entered dice results (Pillar 5 — no auto-roll).
 */
export function computeSpawnVitalityFromResolutions(
  character: Character,
  race: Race | undefined,
  _occ: PalladiumOcc | undefined,
  resolutions: Readonly<Record<string, number>>,
  opts: {
    supportsDualForm: boolean
    psychicTier: string
  },
): SpawnVitalityRolls {
  const f = character.facade.attributes
  const m = character.morphus.attributes
  const pe = f.pe
  const me = f.me

  const hpDie = resolutions['vitality.facade_hp_die'] ?? 0
  const facadeHp = Math.max(4, pe + hpDie)

  let facadeSdc: number
  const sdcRoll = resolutions['vitality.facade_sdc']
  if (sdcRoll != null && race?.vitals?.sdc != null) {
    facadeSdc = Math.max(4, sdcRoll)
  } else {
    const sdcDie = resolutions['vitality.facade_sdc_die'] ?? 0
    const base = deriveSdcHpMaximums(f).sdcMaximum
    facadeSdc = Math.max(4, base + sdcDie)
  }

  const ppeDie = resolutions['vitality.ppe_die'] ?? 0
  const ppeMax = Math.max(0, me + pe + ppeDie)

  const showIsp =
    opts.psychicTier !== 'none' || character.psychicGateBypassed === true
  const ispDie = showIsp ? (resolutions['vitality.isp_die'] ?? 0) : 0
  const morphusIspMax = showIsp ? Math.max(0, me + ispDie) : 0

  if (opts.supportsDualForm) {
    const morphHpDie = resolutions['vitality.morphus_hp_die'] ?? 0
    const morphSdcDie = resolutions['vitality.morphus_sdc_die'] ?? 0
    const morphusHp = Math.max(10, m.pe * 3 + morphHpDie * 4)
    const morphusSdc = Math.max(20, m.pe * 4 + m.ps.score * 2 + morphSdcDie * 8)
    return {
      facadeHp,
      facadeSdc,
      morphusHp,
      morphusSdc,
      ppeMax,
      morphusIspMax: showIsp ? Math.max(0, m.me + ispDie) : 0,
    }
  }

  return {
    facadeHp,
    facadeSdc,
    morphusHp: facadeHp,
    morphusSdc: facadeSdc,
    ppeMax,
    morphusIspMax: morphusIspMax,
  }
}

export function vitalityPreviewLines(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  resolutions: Readonly<Record<string, number>>,
  opts: { supportsDualForm: boolean; psychicTier: string },
): { label: string; value: string }[] {
  const rolls = computeSpawnVitalityFromResolutions(
    character,
    race,
    occ,
    resolutions,
    opts,
  )
  const lines = [
    { label: 'Facade H.P. max', value: String(rolls.facadeHp) },
    { label: 'Facade S.D.C. max', value: String(rolls.facadeSdc) },
    { label: 'P.P.E. max', value: String(rolls.ppeMax) },
  ]
  if (opts.supportsDualForm) {
    lines.push(
      { label: 'Morphus H.P. max', value: String(rolls.morphusHp) },
      { label: 'Morphus S.D.C. max', value: String(rolls.morphusSdc) },
      { label: 'Morphus I.S.P. max', value: String(rolls.morphusIspMax) },
    )
  } else if (rolls.morphusIspMax > 0) {
    lines.push({ label: 'I.S.P. max', value: String(rolls.morphusIspMax) })
  }
  return lines
}
