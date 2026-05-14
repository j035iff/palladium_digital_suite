import { computeSdcPriorityCascadeDelta } from './combatVitalityApply'
import type {
  ActiveForm,
  Armor,
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
}

export type InventoryVitalityApplyResult = {
  nextCharacter: Character
  nextInventory: InventoryItem[]
  flashKind: VitalityFlashKind
} | null

function patchArmorSdc(
  items: InventoryItem[],
  armorId: string,
  nextCurrent: number,
): InventoryItem[] {
  return items.map((it) => {
    if (it.itemType !== 'armor' || it.id !== armorId) return it
    const clamped = Math.max(0, Math.min(it.maxSDC, Math.round(nextCurrent)))
    return {
      ...it,
      currentSDC: clamped,
      destroyed: clamped <= 0,
    }
  })
}

function getEquippedArmor(
  items: InventoryItem[],
  equippedArmorId: string | null,
): Armor | null {
  if (!equippedArmorId) return null
  const found = items.find((i) => i.id === equippedArmorId)
  return found && found.itemType === 'armor' ? found : null
}

/** A.R. gate applies only while the suit still has S.D.C. integrity. */
function armorAcceptsArGate(armor: Armor): boolean {
  return armor.currentSDC > 0 && armor.destroyed !== true
}

/**
 * S.D.C.-first vitality plus optional armor routing (strike roll below A.R. depletes armor S.D.C. first).
 */
export function applyInventoryAwareSdcVitality(
  character: Character,
  activeForm: ActiveForm,
  inventory: InventoryItem[],
  equippedArmorId: string | null,
  opts: InventoryVitalityApplyOpts,
): InventoryVitalityApplyResult | null {
  const amount = Math.max(0, Math.round(opts.amount))
  if (amount <= 0) return null

  if (opts.mode === 'heal') {
    const r = computeSdcPriorityCascadeDelta(character, activeForm, {
      mode: 'heal',
      amount,
    })
    return r
      ? {
          nextCharacter: r.next,
          nextInventory: inventory,
          flashKind: r.flashKind,
        }
      : null
  }

  const armor = getEquippedArmor(inventory, equippedArmorId)
  const armorForGate = armor && armorAcceptsArGate(armor) ? armor : null
  const useRoll =
    Boolean(armorForGate) &&
    opts.useAttackRollVsArmor === true &&
    typeof opts.attackRoll === 'number' &&
    Number.isFinite(opts.attackRoll)

  if (useRoll && armorForGate) {
    const roll = opts.attackRoll as number
    if (roll < armorForGate.ar) {
      const absorb = Math.min(amount, armorForGate.currentSDC)
      const overflow = amount - absorb
      let nextInv = inventory
      if (absorb > 0) {
        nextInv = patchArmorSdc(
          inventory,
          armorForGate.id,
          armorForGate.currentSDC - absorb,
        )
      }
      if (overflow <= 0) {
        return {
          nextCharacter: character,
          nextInventory: nextInv,
          flashKind: 'damage',
        }
      }
      const body = computeSdcPriorityCascadeDelta(character, activeForm, {
        mode: 'damage',
        amount: overflow,
      })
      return body
        ? {
            nextCharacter: body.next,
            nextInventory: nextInv,
            flashKind: 'damage',
          }
        : {
            nextCharacter: character,
            nextInventory: nextInv,
            flashKind: 'damage',
          }
    }
  }

  const body = computeSdcPriorityCascadeDelta(character, activeForm, {
    mode: 'damage',
    amount,
  })
  return body
    ? {
        nextCharacter: body.next,
        nextInventory: inventory,
        flashKind: body.flashKind,
      }
    : null
}
