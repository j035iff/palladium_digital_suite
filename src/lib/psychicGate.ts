import type { FormState, PsychicTier } from '../types'

/** Standard-entry d100 bands (psychic_gate.md §1 example: 01–10 Master, 11–25 Major, …). */
export const STANDARD_PSYCHIC_TEST_BANDS: ReadonlyArray<{
  max: number
  tier: PsychicTier
}> = [
  { max: 10, tier: 'master' },
  { max: 25, tier: 'major' },
  { max: 50, tier: 'minor' },
  { max: 100, tier: 'none' },
]

export function rollD100(): number {
  return 1 + Math.floor(Math.random() * 100)
}

export function tierFromTestPotential(roll: number): PsychicTier {
  const r = Math.min(100, Math.max(1, Math.floor(roll)))
  const band = STANDARD_PSYCHIC_TEST_BANDS.find((b) => r <= b.max)
  return band?.tier ?? 'none'
}

export function saveVsPsionicsForTier(tier: PsychicTier): 15 | 12 | 10 {
  if (tier === 'none') return 15
  if (tier === 'master') return 10
  return 12
}

/** Major psionic tax: O.C.C. related skill slots × 0.5 (floor at use site; psychic_gate.md §2). */
export function skillSlotMultiplierForTier(tier: PsychicTier): number {
  return tier === 'major' ? 0.5 : 1
}

/** I.S.P. base maximum = M.E. + one die roll (psychic_gate.md §3). */
export function rollIspBaseDie(): number {
  return 1 + Math.floor(Math.random() * 6)
}

export function getStandardPsychicTestBandRows(): ReadonlyArray<{
  lo: number
  hi: number
  tier: PsychicTier
}> {
  const rows: { lo: number; hi: number; tier: PsychicTier }[] = []
  let lo = 1
  for (const b of STANDARD_PSYCHIC_TEST_BANDS) {
    rows.push({ lo, hi: b.max, tier: b.tier })
    lo = b.max + 1
  }
  return rows
}

export function applyPsychicTierToFormState(
  form: FormState,
  tier: PsychicTier,
): FormState {
  if (tier === 'none') {
    return { ...form, isp: { current: 0, maximum: 0 } }
  }
  const die = rollIspBaseDie()
  const max = form.attributes.me + die
  return { ...form, isp: { current: max, maximum: max } }
}
