import { applyOrderedCombatVitality } from './combatDamagePools'
import type {
  ActiveForm,
  Character,
  InventoryItem,
  VitalityFlashKind,
} from '../types'

export type InventoryVitalityApplyOpts = {
  mode: 'damage' | 'heal'
  amount: number
  /** When true and armor is equipped, {@link attackRoll} is compared to armor A.R. */
  useAttackRollVsArmor?: boolean
  /** Strike / attack total to compare against equipped armor A.R. */
  attackRoll?: number
  /** Skip left pools — apply only to H.P. (or M.D.C. body). */
  directToHitPoints?: boolean
  /** Current Vitals absorb order (left → right). */
  absorbOrder?: readonly string[] | null
  naturalAr?: number | null
}

export type InventoryVitalityApplyResult = {
  nextCharacter: Character
  nextInventory: InventoryItem[]
  flashKind: VitalityFlashKind
  /** Which pool(s) received S.D.C. damage (drives HUD highlight). */
  sdcDamageRouting?: 'armor' | 'body' | 'split'
} | null

/**
 * Inventory-aware vitality — ordered absorb pools (Combat Vitals) + optional A.R. gate.
 */
export function applyInventoryAwareSdcVitality(
  character: Character,
  activeForm: ActiveForm,
  inventory: InventoryItem[],
  equippedArmorId: string | null,
  opts: InventoryVitalityApplyOpts,
): InventoryVitalityApplyResult | null {
  return applyOrderedCombatVitality(
    character,
    activeForm,
    inventory,
    equippedArmorId,
    {
      mode: opts.mode,
      amount: opts.amount,
      useAttackRollVsArmor: opts.useAttackRollVsArmor,
      attackRoll: opts.attackRoll,
      directToHitPoints: opts.directToHitPoints,
      absorbOrder: opts.absorbOrder,
    },
    opts.naturalAr ?? null,
  )
}
