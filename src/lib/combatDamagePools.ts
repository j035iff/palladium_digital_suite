/**
 * Combat Vitals damage-capacity pools — absorb order left → right.
 * Plan: shields → armor → S.D.C. → H.P. (M.D.C. replaces S.D.C.+H.P.).
 * Engine always drains pools in the current left→right order unless direct-to-HP.
 */

import { computeIsMDC } from './characterDerived'
import { resolveScaledDamageForPool } from './meleeCombat'
import type {
  ActiveForm,
  Armor,
  Character,
  InventoryItem,
  VitalityFlashKind,
} from '../types'
import { getFormState } from '../types'

/** Stable pool ids used for drag-reorder persistence (Familiar Surface — not shown raw). */
export type CombatDamagePoolId =
  | 'shield'
  | 'armor'
  | 'sdc'
  | 'hp'
  | 'mdc'
  | `shield:${string}`

export const DEFAULT_COMBAT_ABSORB_ORDER: readonly CombatDamagePoolId[] = [
  'shield',
  'armor',
  'sdc',
  'hp',
] as const

export type CombatDamagePoolKind =
  | 'shield'
  | 'armor'
  | 'sdc'
  | 'hp'
  | 'mdc'

export type CombatDamagePoolCard = {
  id: CombatDamagePoolId
  kind: CombatDamagePoolKind
  /** Player-facing label (Familiar Surface). */
  label: string
  current: number
  maximum: number
  /** Natural A.R. shown on S.D.C. / H.P. cards when present. */
  naturalAr: number | null
  /** Equipped armor A.R. (armor card only). */
  armorAr: number | null
  /** Armor display name when kind === 'armor'. */
  armorName: string | null
  armorWeightLbs: number | null
  armorMorphusCompatible: boolean | null
  armorHumanSized: boolean | null
  /** Shield / future ephemeral pools. */
  shieldName: string | null
}

export type CombatDamagePoolsSnapshot = {
  pools: CombatDamagePoolCard[]
  /** Effective left→right order among currently visible pools. */
  order: CombatDamagePoolId[]
  isMdc: boolean
}

export type ActiveCombatShield = {
  id: string
  name: string
  current: number
  maximum: number
}

/**
 * Active shields / force fields for absorb cards.
 * No runtime shield track yet — returns empty (cards stay dynamic).
 */
export function listActiveCombatShields(
  _character: Character,
  _activeForm: ActiveForm,
): ActiveCombatShield[] {
  return []
}

function getEquippedArmor(
  items: InventoryItem[],
  equippedArmorId: string | null,
): Armor | null {
  if (!equippedArmorId) return null
  const found = items.find((i) => i.id === equippedArmorId)
  return found && found.itemType === 'armor' ? found : null
}

function shieldPoolId(shieldId: string): CombatDamagePoolId {
  return `shield:${shieldId}`
}

/** S.D.C. / H.P. / M.D.C. — pinned after front pools; not drag-reorderable (Joe 2026-10-19). */
export function isFixedCombatBodyPool(id: CombatDamagePoolId): boolean {
  return id === 'sdc' || id === 'hp' || id === 'mdc'
}

export function isFrontCombatAbsorbPool(id: CombatDamagePoolId): boolean {
  return !isFixedCombatBodyPool(id)
}

function fixedBodyTail(
  visibleIds: readonly CombatDamagePoolId[],
): CombatDamagePoolId[] {
  const visible = new Set(visibleIds)
  if (visible.has('mdc')) return ['mdc']
  const tail: CombatDamagePoolId[] = []
  if (visible.has('sdc')) tail.push('sdc')
  if (visible.has('hp')) tail.push('hp')
  return tail
}

/**
 * Normalize a persisted / dragged order against pools that exist now.
 * Front pools (shields / armor) follow preferred order; S.D.C.→H.P. (or M.D.C.)
 * always pin at the end in fixed order.
 */
export function normalizeCombatAbsorbOrder(
  preferred: readonly string[] | null | undefined,
  visibleIds: readonly CombatDamagePoolId[],
): CombatDamagePoolId[] {
  const visible = new Set(visibleIds)
  const frontDefault = visibleIds.filter(isFrontCombatAbsorbPool)
  const out: CombatDamagePoolId[] = []
  const seen = new Set<string>()

  for (const raw of preferred ?? []) {
    const id = raw as CombatDamagePoolId
    if (!visible.has(id) || isFixedCombatBodyPool(id)) continue
    if (seen.has(id)) continue
    out.push(id)
    seen.add(id)
  }

  for (const id of frontDefault) {
    if (seen.has(id)) continue
    out.push(id)
    seen.add(id)
  }

  for (const id of fixedBodyTail(visibleIds)) {
    out.push(id)
  }

  return out
}

/**
 * Default visible pool id list for the active form (before user reorder).
 * Shields (when present) → armor (when equipped with S.D.C.) → body pools.
 */
export function defaultVisibleCombatPoolIds(opts: {
  shields: readonly ActiveCombatShield[]
  armor: Armor | null
  isMdc: boolean
}): CombatDamagePoolId[] {
  const ids: CombatDamagePoolId[] = []
  for (const s of opts.shields) {
    if (s.maximum > 0 && s.current > 0) ids.push(shieldPoolId(s.id))
  }
  if (opts.armor && opts.armor.currentSdc > 0) {
    ids.push('armor')
  }
  if (opts.isMdc) {
    ids.push('mdc')
  } else {
    ids.push('sdc', 'hp')
  }
  return ids
}

/**
 * Build ordered damage-capacity cards for Combat → Vitals.
 */
export function buildCombatDamagePools(opts: {
  character: Character
  activeForm: ActiveForm
  inventory: InventoryItem[]
  equippedArmorId: string | null
  /** Morphus / innate Natural A.R. (shown on S.D.C. and H.P.). */
  naturalAr: number | null
  /** Persisted or in-session absorb order preference. */
  absorbOrder?: readonly string[] | null
}): CombatDamagePoolsSnapshot {
  const branch = getFormState(opts.character, opts.activeForm)
  const isMdc = computeIsMDC(branch)
  const shields = listActiveCombatShields(opts.character, opts.activeForm)
  const armor = getEquippedArmor(opts.inventory, opts.equippedArmorId)
  const armorLive = armor && armor.currentSdc > 0 ? armor : null

  const visibleIds = defaultVisibleCombatPoolIds({
    shields,
    armor: armorLive,
    isMdc,
  })
  const order = normalizeCombatAbsorbOrder(opts.absorbOrder, visibleIds)

  const byId = new Map<CombatDamagePoolId, CombatDamagePoolCard>()

  for (const s of shields) {
    if (!(s.maximum > 0 && s.current > 0)) continue
    const id = shieldPoolId(s.id)
    byId.set(id, {
      id,
      kind: 'shield',
      label: s.name,
      current: s.current,
      maximum: s.maximum,
      naturalAr: null,
      armorAr: null,
      armorName: null,
      armorWeightLbs: null,
      armorMorphusCompatible: null,
      armorHumanSized: null,
      shieldName: s.name,
    })
  }

  if (armorLive) {
    byId.set('armor', {
      id: 'armor',
      kind: 'armor',
      label: armorLive.name,
      current: armorLive.currentSdc,
      maximum: armorLive.maxSdc,
      naturalAr: null,
      armorAr: armorLive.ar,
      armorName: armorLive.name,
      armorWeightLbs: armorLive.weightLbs,
      armorMorphusCompatible: armorLive.morphusCompatible,
      armorHumanSized: armorLive.humanSized ?? null,
      shieldName: null,
    })
  }

  const nat = opts.naturalAr != null && opts.naturalAr > 0 ? opts.naturalAr : null

  if (isMdc) {
    const sdc = branch.structuralDamageCapacity
    const hp = branch.hitPoints
    const sdcMdc = sdc.scaling === 'mdc'
    const hpMdc = hp.scaling === 'mdc'
    // Single M.D.C. card: aggregate mdc-scaled fields (schema may still hold both).
    let current = 0
    let maximum = 0
    if (sdcMdc) {
      current += sdc.current
      maximum += sdc.maximum
    }
    if (hpMdc) {
      current += hp.current
      maximum += hp.maximum
    }
    if (!sdcMdc && !hpMdc) {
      current = sdc.current
      maximum = sdc.maximum
    }
    byId.set('mdc', {
      id: 'mdc',
      kind: 'mdc',
      label: 'M.D.C.',
      current,
      maximum,
      naturalAr: nat,
      armorAr: null,
      armorName: null,
      armorWeightLbs: null,
      armorMorphusCompatible: null,
      armorHumanSized: null,
      shieldName: null,
    })
  } else {
    byId.set('sdc', {
      id: 'sdc',
      kind: 'sdc',
      label: 'S.D.C.',
      current: branch.structuralDamageCapacity.current,
      maximum: branch.structuralDamageCapacity.maximum,
      naturalAr: nat,
      armorAr: null,
      armorName: null,
      armorWeightLbs: null,
      armorMorphusCompatible: null,
      armorHumanSized: null,
      shieldName: null,
    })
    byId.set('hp', {
      id: 'hp',
      kind: 'hp',
      label: 'H.P.',
      current: branch.hitPoints.current,
      maximum: branch.hitPoints.maximum,
      naturalAr: nat,
      armorAr: null,
      armorName: null,
      armorWeightLbs: null,
      armorMorphusCompatible: null,
      armorHumanSized: null,
      shieldName: null,
    })
  }

  const pools = order
    .map((id) => byId.get(id))
    .filter((p): p is CombatDamagePoolCard => p != null)

  return { pools, order, isMdc }
}

/**
 * Reorder helper for drag-and-drop among **front** pools only (shields / armor).
 * S.D.C. / H.P. / M.D.C. stay pinned at the end — moves involving them are no-ops.
 */
export function moveCombatPoolInOrder(
  order: readonly CombatDamagePoolId[],
  fromId: CombatDamagePoolId,
  toIndex: number,
): CombatDamagePoolId[] {
  if (isFixedCombatBodyPool(fromId)) return [...order]
  const targetId = order[toIndex]
  if (targetId != null && isFixedCombatBodyPool(targetId)) return [...order]

  const front = order.filter(isFrontCombatAbsorbPool)
  const from = front.indexOf(fromId)
  if (from < 0) return [...order]

  const targetFrontIndex = targetId != null ? front.indexOf(targetId) : -1
  const clamped =
    targetFrontIndex >= 0
      ? targetFrontIndex
      : Math.max(0, Math.min(toIndex, front.length - 1))

  const nextFront = [...front]
  nextFront.splice(from, 1)
  nextFront.splice(clamped, 0, fromId)
  return normalizeCombatAbsorbOrder(nextFront, order)
}

export type OrderedVitalityApplyOpts = {
  mode: 'damage' | 'heal'
  amount: number
  /**
   * Damage only: skip left pools and apply only to H.P. (or M.D.C. body when MDC).
   * Heal: restore only H.P. / M.D.C. body. Wins over {@link bypassArmor}.
   */
  directToHitPoints?: boolean
  /**
   * Damage only: skip the equipped **artificial** armor pool and start L→R at
   * whatever is to its right. Does **not** affect Natural A.R. (display-only on
   * body cards). No-op when no armor card is present.
   */
  bypassArmor?: boolean
  /** Preferred absorb order (normalized against live pools). */
  absorbOrder?: readonly string[] | null
  /** When true and armor is equipped, {@link attackRoll} vs armor A.R. (classic gate). */
  useAttackRollVsArmor?: boolean
  attackRoll?: number
}

export type OrderedVitalityApplyResult = {
  nextCharacter: Character
  nextInventory: InventoryItem[]
  flashKind: VitalityFlashKind
  /** Which pool(s) took damage (HUD pulse). */
  sdcDamageRouting?: 'armor' | 'body' | 'split'
}

function patchArmorSdc(
  items: InventoryItem[],
  armorId: string,
  nextCurrent: number,
): InventoryItem[] {
  return items.map((it) => {
    if (it.itemType !== 'armor' || it.id !== armorId) return it
    const a = it as Armor
    const clamped = Math.max(0, Math.min(a.maxSdc, Math.round(nextCurrent)))
    return { ...a, currentSdc: clamped }
  })
}

function armorAcceptsArGate(armor: Armor): boolean {
  return armor.currentSdc > 0
}

/**
 * Apply damage/heal through ordered pools (L→R), or direct-to-HP / classic A.R. gate.
 */
export function applyOrderedCombatVitality(
  character: Character,
  activeForm: ActiveForm,
  inventory: InventoryItem[],
  equippedArmorId: string | null,
  opts: OrderedVitalityApplyOpts,
  naturalAr: number | null = null,
): OrderedVitalityApplyResult | null {
  const amount = Math.max(0, Math.round(opts.amount))
  if (amount <= 0) return null

  const snapshot = buildCombatDamagePools({
    character,
    activeForm,
    inventory,
    equippedArmorId,
    naturalAr,
    absorbOrder: opts.absorbOrder,
  })
  const armor = getEquippedArmor(inventory, equippedArmorId)
  const armorForGate = armor && armorAcceptsArGate(armor) ? armor : null

  // Classic A.R. gate (Resolve combat) — only when explicitly requested.
  if (
    opts.mode === 'damage' &&
    !opts.directToHitPoints &&
    opts.useAttackRollVsArmor === true &&
    armorForGate &&
    typeof opts.attackRoll === 'number' &&
    Number.isFinite(opts.attackRoll)
  ) {
    const roll = opts.attackRoll
    if (roll < armorForGate.ar) {
      const absorb = Math.min(amount, armorForGate.currentSdc)
      const overflow = amount - absorb
      let nextInv = inventory
      if (absorb > 0) {
        nextInv = patchArmorSdc(
          inventory,
          armorForGate.id,
          armorForGate.currentSdc - absorb,
        )
      }
      if (overflow <= 0) {
        return {
          nextCharacter: character,
          nextInventory: nextInv,
          flashKind: 'damage',
          sdcDamageRouting: 'armor',
        }
      }
      const body = applyBodyDamageCascade(character, activeForm, overflow, {
        directToHitPoints: false,
        order: snapshot.order,
      })
      return body
        ? {
            nextCharacter: body.nextCharacter,
            nextInventory: nextInv,
            flashKind: 'damage',
            sdcDamageRouting: 'split',
          }
        : {
            nextCharacter: character,
            nextInventory: nextInv,
            flashKind: 'damage',
            sdcDamageRouting: 'armor',
          }
    }
    // Roll ≥ A.R. → body only (armor skipped for this hit).
    const body = applyBodyDamageCascade(character, activeForm, amount, {
      directToHitPoints: false,
      order: snapshot.order.filter((id) => id !== 'armor' && !id.startsWith('shield')),
    })
    return body
      ? {
          nextCharacter: body.nextCharacter,
          nextInventory: inventory,
          flashKind: 'damage',
          sdcDamageRouting: 'body',
        }
      : null
  }

  if (opts.mode === 'heal') {
    return applyHealThroughOrder(character, activeForm, inventory, equippedArmorId, {
      amount,
      directToHitPoints: Boolean(opts.directToHitPoints),
      order: snapshot.order,
    })
  }

  // Damage: L→R soak (direct-to-HP wins; else optional skip of equipped armor only).
  const damageOrder =
    opts.bypassArmor && !opts.directToHitPoints
      ? snapshot.order.filter((id) => id !== 'armor')
      : snapshot.order

  return applyDamageThroughOrder(character, activeForm, inventory, equippedArmorId, {
    amount,
    directToHitPoints: Boolean(opts.directToHitPoints),
    order: damageOrder,
    isMdc: snapshot.isMdc,
  })
}

function applyBodyDamageCascade(
  character: Character,
  activeForm: ActiveForm,
  amount: number,
  opts: { directToHitPoints: boolean; order: readonly CombatDamagePoolId[] },
): OrderedVitalityApplyResult | null {
  return applyDamageThroughOrder(
    character,
    activeForm,
    /* inventory unused for body-only */ [],
    null,
    {
      amount,
      directToHitPoints: opts.directToHitPoints,
      order: opts.order.filter((id) => id === 'sdc' || id === 'hp' || id === 'mdc'),
      isMdc: opts.order.includes('mdc'),
      inventoryPassthrough: true,
    },
  )
}

function applyDamageThroughOrder(
  character: Character,
  activeForm: ActiveForm,
  inventory: InventoryItem[],
  equippedArmorId: string | null,
  opts: {
    amount: number
    directToHitPoints: boolean
    order: readonly CombatDamagePoolId[]
    isMdc: boolean
    inventoryPassthrough?: boolean
  },
): OrderedVitalityApplyResult | null {
  const branch = getFormState(character, activeForm)
  const targetMdc = computeIsMDC(branch)
  const scaled = resolveScaledDamageForPool(opts.amount, {
    tagAsMd: false,
    targetIsMdc: targetMdc,
  })
  if (scaled.blocked) return null

  let remaining = scaled.applied
  let sdcCur = branch.structuralDamageCapacity.current
  let hpCur = branch.hitPoints.current
  let nextInv = inventory
  let hitArmor = false
  let hitBody = false

  const armor = equippedArmorId
    ? getEquippedArmor(inventory, equippedArmorId)
    : null

  const sequence = opts.directToHitPoints
    ? opts.isMdc
      ? (['mdc'] as CombatDamagePoolId[])
      : (['hp'] as CombatDamagePoolId[])
    : [...opts.order]

  for (const id of sequence) {
    if (remaining <= 0) break

    if (id === 'armor' && armor && armor.currentSdc > 0) {
      const live = getEquippedArmor(nextInv, armor.id) ?? armor
      const absorb = Math.min(remaining, live.currentSdc)
      if (absorb > 0) {
        nextInv = patchArmorSdc(nextInv, live.id, live.currentSdc - absorb)
        remaining -= absorb
        hitArmor = true
      }
      continue
    }

    if (id.startsWith('shield:')) {
      // No mutable shield track yet — skip (Radical Visibility: card absent when empty).
      continue
    }

    if (id === 'sdc') {
      const absorb = Math.min(remaining, sdcCur)
      sdcCur -= absorb
      remaining -= absorb
      if (absorb > 0) hitBody = true
      continue
    }

    if (id === 'hp') {
      const absorb = Math.min(remaining, hpCur)
      hpCur -= absorb
      remaining -= absorb
      if (absorb > 0) hitBody = true
      continue
    }

    if (id === 'mdc') {
      // Drain mdc-scaled structural first, then mdc-scaled H.P. (single card, dual fields).
      const sdcMdc = branch.structuralDamageCapacity.scaling === 'mdc'
      const hpMdc = branch.hitPoints.scaling === 'mdc'
      if (sdcMdc) {
        const absorb = Math.min(remaining, sdcCur)
        sdcCur -= absorb
        remaining -= absorb
        if (absorb > 0) hitBody = true
      }
      if (remaining > 0 && hpMdc) {
        const absorb = Math.min(remaining, hpCur)
        hpCur -= absorb
        remaining -= absorb
        if (absorb > 0) hitBody = true
      } else if (remaining > 0 && !sdcMdc && !hpMdc) {
        const absorb = Math.min(remaining, sdcCur)
        sdcCur -= absorb
        remaining -= absorb
        if (absorb > 0) hitBody = true
        if (remaining > 0) {
          const fromHp = Math.min(remaining, hpCur)
          hpCur -= fromHp
          remaining -= fromHp
          if (fromHp > 0) hitBody = true
        }
      }
    }
  }

  const routing: 'armor' | 'body' | 'split' | undefined = hitArmor
    ? hitBody
      ? 'split'
      : 'armor'
    : hitBody
      ? 'body'
      : undefined

  return {
    nextCharacter: {
      ...character,
      [activeForm]: {
        ...branch,
        structuralDamageCapacity: {
          ...branch.structuralDamageCapacity,
          current: sdcCur,
        },
        hitPoints: { ...branch.hitPoints, current: hpCur },
      },
    },
    nextInventory: opts.inventoryPassthrough ? inventory : nextInv,
    flashKind: 'damage',
    ...(routing ? { sdcDamageRouting: routing } : {}),
  }
}

function applyHealThroughOrder(
  character: Character,
  activeForm: ActiveForm,
  inventory: InventoryItem[],
  _equippedArmorId: string | null,
  opts: {
    amount: number
    directToHitPoints: boolean
    order: readonly CombatDamagePoolId[]
  },
): OrderedVitalityApplyResult | null {
  const branch = getFormState(character, activeForm)
  let add = opts.amount
  let sdcCur = branch.structuralDamageCapacity.current
  let hpCur = branch.hitPoints.current

  // Heal restores body / M.D.C. pools only — armor and shields are not auto-repaired.
  const bodyOrder = opts.directToHitPoints
    ? opts.order.includes('mdc')
      ? (['mdc'] as CombatDamagePoolId[])
      : (['hp'] as CombatDamagePoolId[])
    : opts.order.filter((id) => id === 'sdc' || id === 'hp' || id === 'mdc')

  for (const id of bodyOrder) {
    if (add <= 0) break
    if (id === 'sdc') {
      const gap = branch.structuralDamageCapacity.maximum - sdcCur
      const heal = Math.min(gap, add)
      sdcCur += heal
      add -= heal
      continue
    }
    if (id === 'hp') {
      const gap = branch.hitPoints.maximum - hpCur
      const heal = Math.min(gap, add)
      hpCur += heal
      add -= heal
      continue
    }
    if (id === 'mdc') {
      const sdcMdc = branch.structuralDamageCapacity.scaling === 'mdc'
      const hpMdc = branch.hitPoints.scaling === 'mdc'
      if (sdcMdc) {
        const gap = branch.structuralDamageCapacity.maximum - sdcCur
        const heal = Math.min(gap, add)
        sdcCur += heal
        add -= heal
      }
      if (add > 0 && hpMdc) {
        const gap = branch.hitPoints.maximum - hpCur
        const heal = Math.min(gap, add)
        hpCur += heal
        add -= heal
      }
    }
  }

  return {
    nextCharacter: {
      ...character,
      [activeForm]: {
        ...branch,
        structuralDamageCapacity: {
          ...branch.structuralDamageCapacity,
          current: sdcCur,
        },
        hitPoints: { ...branch.hitPoints, current: hpCur },
      },
    },
    nextInventory: inventory,
    flashKind: 'heal',
  }
}
