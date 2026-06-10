import { occIsNaturalPsychicClass } from './creationPhases'
import type { FormState, PalladiumOcc, PsychicTier } from '../types'

/** Standard-entry d100 bands — Master is O.C.C.-only, never from this roll (psychic_gate.md §1). */
export const STANDARD_PSYCHIC_TEST_BANDS: ReadonlyArray<{
  max: number
  tier: PsychicTier
}> = [
  { max: 9, tier: 'major' },
  { max: 25, tier: 'minor' },
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

function rollDice(count: number, sides = 6): number {
  let sum = 0
  for (let i = 0; i < count; i++) {
    sum += 1 + Math.floor(Math.random() * sides)
  }
  return sum
}

/** Authoring / ledger I.S.P. formula for Psychic Gate tiers (psychic_gate.md §3). */
export function psychicGateIspFormula(
  tier: PsychicTier,
): { base: string; perLevel?: string } | null {
  if (tier === 'minor') return { base: 'ME + 2D6', perLevel: '1D6' }
  if (tier === 'major') return { base: 'ME + 4D6', perLevel: '1D6+1' }
  if (tier === 'master') return { base: 'ME + 1D6' }
  return null
}

export function psychicGateIspFormulaHint(tier: PsychicTier): string | null {
  const formula = psychicGateIspFormula(tier)
  if (!formula) return null
  if (formula.perLevel) {
    return `${formula.base} (+${formula.perLevel}/level)`
  }
  return formula.base
}

/** Rolled I.S.P. bonus dice added to M.E. when a tier is confirmed at creation. */
export function rollPsychicGateIspBonus(tier: PsychicTier): number {
  if (tier === 'minor') return rollDice(2)
  if (tier === 'major') return rollDice(4)
  return rollDice(1)
}

/** @deprecated Use {@link rollPsychicGateIspBonus}. */
export function rollIspBaseDie(): number {
  return rollPsychicGateIspBonus('master')
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

/**
 * Creation-time psionic pick budget from Psychic Gate tier (psychic_gate.md §2).
 * Psychic-class O.C.C.s use their ispEngine roadmap instead.
 */
export function psychicGateCreationPsionicSlots(
  tier: PsychicTier,
  occ?: PalladiumOcc,
): number {
  if (occ && occIsNaturalPsychicClass(occ)) return 0
  if (tier === 'minor') return 2
  if (tier === 'major') return 8
  return 0
}

export function applyPsychicTierToFormState(
  form: FormState,
  tier: PsychicTier,
): FormState {
  if (tier === 'none') {
    return { ...form, isp: { current: 0, maximum: 0 } }
  }
  const die = rollPsychicGateIspBonus(tier)
  const max = form.attributes.me + die
  return { ...form, isp: { current: max, maximum: max } }
}
