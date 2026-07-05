import type { CharacterAttributes } from '../types'
import type { PalladiumOcc } from '../types'
import type { Race } from '../types'
import { deriveSdcHpMaximums } from './derivedVitality'
import { rollNdS, rollDiceNotation } from './diceNotation'
import { buildSdcStatBonusDetails } from './ledgerStatBonuses'
import {
  hitPointsPerLevelDiceFormula,
  resolvePpeCreationFormula,
} from './ledgerVitalFormula'
import {
  MORPHUS_HIT_POINTS_FORMULA,
  MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA,
  MORPHUS_SDC_BONUS_DICE,
} from './morphusNightbaneBase'
import {
  resolveHitPointsFromSchema,
  resolveVitalFormulaFlat,
} from './vitalStatEngine'
import {
  resolveMorphusSdcFlatDerivedStat,
  resolveSdcFlatDerivedStat,
} from './creationStatEngine'

export type { SpawnVitalityRolls } from './spawnVitalityTypes'

/**
 * Facade H.P. maximum at Spawn — schema formula + physical dice (unified engine).
 */
export function rollPrimaryHpMaximum(pe: number, race?: Race): number {
  const formula = race?.vitals?.hpFormula ?? 'PE + 1D6'
  const levelDice = hitPointsPerLevelDiceFormula(formula)
  const diceTotal = levelDice ? rollDiceNotation(levelDice) : 0
  return Math.max(
    4,
    resolveHitPointsFromSchema({
      hpFormula: formula,
      assignments: { pe },
      attrScores: { pe },
      enteredDiceTotal: diceTotal,
    }).total,
  )
}

/**
 * Facade S.D.C. maximum — race vitals + O.C.C. via Tier-2 engine + rolled dice.
 */
export function rollPrimarySdcMaximum(
  attrs: CharacterAttributes,
  opts?: { race?: Race; occ?: PalladiumOcc; skillIds?: readonly string[] },
): number {
  if (opts?.race?.vitals?.sdc != null) {
    const details = buildSdcStatBonusDetails(
      opts.race,
      opts.occ,
      null,
      opts?.skillIds ?? [],
      {},
    )
    let diceTotal = 0
    for (const group of details.diceGroups) {
      for (const contribution of group.contributions) {
        diceTotal += rollDiceNotation(contribution.notation)
      }
    }
    return Math.max(
      4,
      resolveSdcFlatDerivedStat({
        flatVitalTerms: details.flatVitalTerms,
        skillFlats: details.skillFlats,
      }).total + diceTotal,
    )
  }
  const base = deriveSdcHpMaximums(attrs).sdcMaximum
  return Math.max(4, base + rollNdS(1, 6))
}

/**
 * P.P.E. pool maximum — race + O.C.C. formula via unified engine + dice.
 */
export function rollPpeMaximum(
  me: number,
  pe: number,
  race?: Race,
  occ?: PalladiumOcc,
): number {
  const formula = resolvePpeCreationFormula(race, occ)
  if (!formula?.trim()) {
    return Math.max(8, me + pe + rollNdS(2, 6))
  }
  let diceTotal = 0
  for (const part of formula.split('+')) {
    const term = part.trim()
    if (/^(\d+)?D\d+/i.test(term)) {
      diceTotal += rollDiceNotation(term)
    }
  }
  const flat = resolveVitalFormulaFlat(formula, { pe, me }, { pe, me }).total
  return Math.max(0, flat + diceTotal)
}

/**
 * I.S.P. pool maximum — psychic_gate.md §3: M.E. + OCC formula dice via engine.
 */
export function rollIspMaximum(me: number, occ?: PalladiumOcc): number {
  const formula = occ?.ispEngine?.baseFormula?.trim()
  if (!formula) return Math.max(0, me + rollNdS(1, 6))
  let diceTotal = 0
  for (const part of formula.split('+')) {
    const term = part.trim()
    if (/^(\d+)?D\d+/i.test(term)) {
      diceTotal += rollDiceNotation(term)
    }
  }
  const flat = resolveVitalFormulaFlat(formula, { me }, { me }).total
  return Math.max(0, flat + diceTotal)
}

/** Morphus H.P. — Nightbane morphus profile formula via unified engine. */
export function rollMorphusHpMaximum(pe: number): number {
  const levelDice = MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA
  const diceTotal = levelDice ? rollDiceNotation(levelDice) : 0
  return Math.max(
    10,
    resolveHitPointsFromSchema({
      hpFormula: MORPHUS_HIT_POINTS_FORMULA,
      assignments: { pe },
      attrScores: { pe },
      enteredDiceTotal: diceTotal,
    }).total,
  )
}

/** Morphus S.D.C. — Facade carryover pattern simplified for auto-roll legacy path. */
export function rollMorphusSdcMaximum(pe: number): number {
  const facadeApprox = Math.max(4, pe + rollNdS(1, 6))
  const morphusDice = rollDiceNotation(MORPHUS_SDC_BONUS_DICE)
  return Math.max(
    20,
    resolveMorphusSdcFlatDerivedStat({
      facadeSdcTotal: facadeApprox,
      traitFlats: [],
    }).total + morphusDice,
  )
}
