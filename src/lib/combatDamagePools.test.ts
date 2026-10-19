import { describe, expect, it } from 'vitest'
import {
  applyOrderedCombatVitality,
  buildCombatDamagePools,
  DEFAULT_COMBAT_ABSORB_ORDER,
  moveCombatPoolInOrder,
  normalizeCombatAbsorbOrder,
} from './combatDamagePools'
import type { Armor, Character, InventoryItem } from '../types'

function baseCharacter(overrides?: Partial<Character['primary']>): Character {
  return {
    id: 'c1',
    name: 'Test',
    creationGenreId: 'nightbane',
    hostGenreId: 'nightbane',
    ppe: { current: 10, maximum: 10 },
    primary: {
      alignment: 'Principled',
      hitPoints: { current: 30, maximum: 30, scaling: 'sdc_hp' },
      structuralDamageCapacity: {
        current: 50,
        maximum: 50,
        scaling: 'sdc_hp',
      },
      isp: { current: 0, maximum: 0 },
      attributes: {
        iq: 12,
        me: 12,
        ma: 12,
        ps: { score: 12, tier: 'standard' },
        pp: 12,
        pe: 12,
        pb: 12,
        spd: 12,
      },
      skills: [],
      ...overrides,
    },
    morphus: {
      alignment: 'Principled',
      hitPoints: { current: 30, maximum: 30, scaling: 'sdc_hp' },
      structuralDamageCapacity: {
        current: 50,
        maximum: 50,
        scaling: 'sdc_hp',
      },
      isp: { current: 0, maximum: 0 },
      attributes: {
        iq: 12,
        me: 12,
        ma: 12,
        ps: { score: 12, tier: 'standard' },
        pp: 12,
        pe: 12,
        pb: 12,
        spd: 12,
      },
      skills: [],
    },
  } as unknown as Character
}

const sampleArmor: Armor = {
  id: 'armor_1',
  name: 'Hard Armor',
  weightLbs: 20,
  itemType: 'armor',
  ar: 14,
  maxSdc: 40,
  currentSdc: 40,
  isEquipped: true,
  morphusCompatible: true,
}

describe('combatDamagePools', () => {
  it('defaults absorb order shields → armor → sdc → hp', () => {
    expect(DEFAULT_COMBAT_ABSORB_ORDER).toEqual([
      'shield',
      'armor',
      'sdc',
      'hp',
    ])
  })

  it('builds S.D.C. + H.P. cards with Natural A.R. on both; armor when equipped', () => {
    const snap = buildCombatDamagePools({
      character: baseCharacter(),
      activeForm: 'primary',
      inventory: [sampleArmor],
      equippedArmorId: sampleArmor.id,
      naturalAr: 10,
    })
    expect(snap.pools.map((p) => p.id)).toEqual(['armor', 'sdc', 'hp'])
    expect(snap.pools.find((p) => p.id === 'sdc')?.naturalAr).toBe(10)
    expect(snap.pools.find((p) => p.id === 'hp')?.naturalAr).toBe(10)
    expect(snap.pools.find((p) => p.id === 'armor')?.armorAr).toBe(14)
  })

  it('omits armor card when none equipped; always keeps sdc+hp for SDC characters', () => {
    const snap = buildCombatDamagePools({
      character: baseCharacter(),
      activeForm: 'primary',
      inventory: [],
      equippedArmorId: null,
      naturalAr: null,
    })
    expect(snap.pools.map((p) => p.id)).toEqual(['sdc', 'hp'])
  })

  it('replaces sdc+hp with a single M.D.C. card when form is MDC', () => {
    const snap = buildCombatDamagePools({
      character: baseCharacter({
        hitPoints: { current: 45, maximum: 80, scaling: 'mdc' },
        structuralDamageCapacity: {
          current: 120,
          maximum: 200,
          scaling: 'mdc',
        },
      }),
      activeForm: 'primary',
      inventory: [],
      equippedArmorId: null,
      naturalAr: null,
    })
    expect(snap.isMdc).toBe(true)
    expect(snap.pools.map((p) => p.id)).toEqual(['mdc'])
    expect(snap.pools[0]?.current).toBe(165)
    expect(snap.pools[0]?.maximum).toBe(280)
  })

  it('pins S.D.C.→H.P. after front pools; only front pools drag', () => {
    expect(
      normalizeCombatAbsorbOrder(['hp', 'missing', 'sdc'], ['sdc', 'hp']),
    ).toEqual(['sdc', 'hp'])
    expect(
      normalizeCombatAbsorbOrder(['hp', 'armor', 'sdc'], ['armor', 'sdc', 'hp']),
    ).toEqual(['armor', 'sdc', 'hp'])
    // Attempt to drag H.P. — no-op
    expect(moveCombatPoolInOrder(['armor', 'sdc', 'hp'], 'hp', 0)).toEqual([
      'armor',
      'sdc',
      'hp',
    ])
    // Drag armor past body pools — ignored; SDC/HP stay pinned
    expect(moveCombatPoolInOrder(['armor', 'sdc', 'hp'], 'armor', 2)).toEqual([
      'armor',
      'sdc',
      'hp',
    ])
  })

  it('applies damage left → right through armor then S.D.C. then H.P.', () => {
    const inv: InventoryItem[] = [{ ...sampleArmor }]
    const r = applyOrderedCombatVitality(
      baseCharacter(),
      'primary',
      inv,
      sampleArmor.id,
      { mode: 'damage', amount: 55 },
    )
    expect(r).not.toBeNull()
    const armor = r!.nextInventory.find((i) => i.id === sampleArmor.id) as Armor
    expect(armor.currentSdc).toBe(0)
    expect(r!.nextCharacter.primary.structuralDamageCapacity.current).toBe(35)
    expect(r!.nextCharacter.primary.hitPoints.current).toBe(30)
    expect(r!.sdcDamageRouting).toBe('split')
  })

  it('directToHitPoints bypasses armor and S.D.C.', () => {
    const inv: InventoryItem[] = [{ ...sampleArmor }]
    const r = applyOrderedCombatVitality(
      baseCharacter(),
      'primary',
      inv,
      sampleArmor.id,
      { mode: 'damage', amount: 10, directToHitPoints: true },
    )
    expect(r).not.toBeNull()
    const armor = r!.nextInventory.find((i) => i.id === sampleArmor.id) as Armor
    expect(armor.currentSdc).toBe(40)
    expect(r!.nextCharacter.primary.structuralDamageCapacity.current).toBe(50)
    expect(r!.nextCharacter.primary.hitPoints.current).toBe(20)
  })

  it('bypassArmor skips equipped armor only and drains S.D.C. next', () => {
    const inv: InventoryItem[] = [{ ...sampleArmor }]
    const r = applyOrderedCombatVitality(
      baseCharacter(),
      'primary',
      inv,
      sampleArmor.id,
      { mode: 'damage', amount: 10, bypassArmor: true },
    )
    expect(r).not.toBeNull()
    const armor = r!.nextInventory.find((i) => i.id === sampleArmor.id) as Armor
    expect(armor.currentSdc).toBe(40)
    expect(r!.nextCharacter.primary.structuralDamageCapacity.current).toBe(40)
    expect(r!.nextCharacter.primary.hitPoints.current).toBe(30)
  })

  it('bypassArmor is a no-op when no equipped armor is present', () => {
    const r = applyOrderedCombatVitality(
      baseCharacter(),
      'primary',
      [],
      null,
      { mode: 'damage', amount: 10, bypassArmor: true },
    )
    expect(r!.nextCharacter.primary.structuralDamageCapacity.current).toBe(40)
    expect(r!.nextCharacter.primary.hitPoints.current).toBe(30)
  })

  it('directToHitPoints wins over bypassArmor', () => {
    const inv: InventoryItem[] = [{ ...sampleArmor }]
    const r = applyOrderedCombatVitality(
      baseCharacter(),
      'primary',
      inv,
      sampleArmor.id,
      { mode: 'damage', amount: 5, bypassArmor: true, directToHitPoints: true },
    )
    const armor = r!.nextInventory.find((i) => i.id === sampleArmor.id) as Armor
    expect(armor.currentSdc).toBe(40)
    expect(r!.nextCharacter.primary.structuralDamageCapacity.current).toBe(50)
    expect(r!.nextCharacter.primary.hitPoints.current).toBe(25)
  })

  it('ignores preferred H.P.-before-S.D.C. — body pools stay S.D.C. then H.P.', () => {
    const r = applyOrderedCombatVitality(
      baseCharacter(),
      'primary',
      [],
      null,
      { mode: 'damage', amount: 10, absorbOrder: ['hp', 'sdc'] },
    )
    expect(r!.nextCharacter.primary.structuralDamageCapacity.current).toBe(40)
    expect(r!.nextCharacter.primary.hitPoints.current).toBe(30)
  })

  it('heals S.D.C. then H.P.; directToHitPoints heals H.P. only', () => {
    const damaged = baseCharacter({
      hitPoints: { current: 10, maximum: 30, scaling: 'sdc_hp' },
      structuralDamageCapacity: {
        current: 20,
        maximum: 50,
        scaling: 'sdc_hp',
      },
    })
    const healBody = applyOrderedCombatVitality(damaged, 'primary', [], null, {
      mode: 'heal',
      amount: 25,
    })
    expect(healBody!.nextCharacter.primary.structuralDamageCapacity.current).toBe(
      45,
    )
    expect(healBody!.nextCharacter.primary.hitPoints.current).toBe(10)

    const healHp = applyOrderedCombatVitality(damaged, 'primary', [], null, {
      mode: 'heal',
      amount: 5,
      directToHitPoints: true,
    })
    expect(healHp!.nextCharacter.primary.hitPoints.current).toBe(15)
    expect(healHp!.nextCharacter.primary.structuralDamageCapacity.current).toBe(
      20,
    )
  })

  it('A.R. gate: roll below A.R. depletes armor first', () => {
    const inv: InventoryItem[] = [{ ...sampleArmor }]
    const r = applyOrderedCombatVitality(
      baseCharacter(),
      'primary',
      inv,
      sampleArmor.id,
      {
        mode: 'damage',
        amount: 5,
        useAttackRollVsArmor: true,
        attackRoll: 10,
      },
    )
    const armor = r!.nextInventory.find((i) => i.id === sampleArmor.id) as Armor
    expect(armor.currentSdc).toBe(35)
    expect(r!.nextCharacter.primary.structuralDamageCapacity.current).toBe(50)
    expect(r!.sdcDamageRouting).toBe('armor')
  })
})
