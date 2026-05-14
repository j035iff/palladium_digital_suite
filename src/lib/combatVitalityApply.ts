import { computeIsMDC } from './characterDerived'
import { resolveScaledDamageForPool } from './meleeCombat'
import type {
  ActiveForm,
  Character,
  CombatVitalityChange,
  VitalityFlashKind,
} from '../types'
import { getFormState } from '../types'

export type CombatVitalityDeltaResult = {
  next: Character
  flashKind: VitalityFlashKind
}

/**
 * Pure apply for H.P. / S.D.C. damage or healing on the active form (combat_logic.md §1).
 * Returns null when damage is blocked (S.D.C. vs M.D.C.).
 */
export function computeCombatVitalityDelta(
  prev: Character,
  activeForm: ActiveForm,
  change: CombatVitalityChange,
): CombatVitalityDeltaResult | null {
  const branch = getFormState(prev, activeForm)
  const targetMdc = computeIsMDC(branch)
  const poolKey = change.pool
  const pool = branch[poolKey]

  if (change.mode === 'heal') {
    const add = Math.max(0, Math.round(change.amount))
    const nextCurrent = Math.min(pool.maximum, pool.current + add)
    return {
      next: {
        ...prev,
        [activeForm]: {
          ...branch,
          [poolKey]: { ...pool, current: nextCurrent },
        },
      },
      flashKind: 'heal',
    }
  }

  const raw = Math.max(0, Math.round(change.amount))
  const scaled = resolveScaledDamageForPool(raw, {
    tagAsMd: change.damageScale === 'md',
    targetIsMdc: targetMdc,
  })

  if (scaled.blocked) {
    return null
  }

  let poolToUse: 'hitPoints' | 'structuralDamageCapacity' = poolKey
  if (change.damageScale === 'md' && !targetMdc) {
    poolToUse = 'hitPoints'
  }

  const targetPool = branch[poolToUse]
  const nextCurrent = Math.max(0, targetPool.current - scaled.applied)
  return {
    next: {
      ...prev,
      [activeForm]: {
        ...branch,
        [poolToUse]: { ...targetPool, current: nextCurrent },
      },
    },
    flashKind: 'damage',
  }
}

/**
 * S.D.C.-priority combat: damage applies to structural (S.D.C.) first, then H.P.;
 * healing fills S.D.C. to max first, then H.P. Uses S.D.C. damage scaling only
 * (combat_logic.md §1 — M.D. UI off; infrastructure still respects M.D.C. immunity).
 */
export function computeSdcPriorityCascadeDelta(
  prev: Character,
  activeForm: ActiveForm,
  opts: { mode: 'damage' | 'heal'; amount: number },
): CombatVitalityDeltaResult | null {
  const branch = getFormState(prev, activeForm)
  const sdc = branch.structuralDamageCapacity
  const hp = branch.hitPoints
  const amount = Math.max(0, Math.round(opts.amount))
  if (amount <= 0) return null

  if (opts.mode === 'damage') {
    const targetMdc = computeIsMDC(branch)
    const scaled = resolveScaledDamageForPool(amount, {
      tagAsMd: false,
      targetIsMdc: targetMdc,
    })
    if (scaled.blocked) return null

    let remaining = scaled.applied
    let sdcCur = sdc.current
    let hpCur = hp.current

    const fromSdc = Math.min(sdcCur, remaining)
    sdcCur -= fromSdc
    remaining -= fromSdc

    const fromHp = Math.min(hpCur, remaining)
    hpCur -= fromHp

    return {
      next: {
        ...prev,
        [activeForm]: {
          ...branch,
          structuralDamageCapacity: { ...sdc, current: sdcCur },
          hitPoints: { ...hp, current: hpCur },
        },
      },
      flashKind: 'damage',
    }
  }

  let add = amount
  let sdcCur = sdc.current
  let hpCur = hp.current

  const sdcGap = sdc.maximum - sdcCur
  const healSdc = Math.min(sdcGap, add)
  sdcCur += healSdc
  add -= healSdc

  const hpGap = hp.maximum - hpCur
  const healHp = Math.min(hpGap, add)
  hpCur += healHp

  return {
    next: {
      ...prev,
      [activeForm]: {
        ...branch,
        structuralDamageCapacity: { ...sdc, current: sdcCur },
        hitPoints: { ...hp, current: hpCur },
      },
    },
    flashKind: 'heal',
  }
}
