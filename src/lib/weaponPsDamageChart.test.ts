import { describe, expect, it } from 'vitest'
import type { Weapon } from '../types'
import {
  resolveDefaultWeaponDamageDelivery,
  resolveWeaponPsChartEligibility,
  resolveWeaponPsChartFamily,
} from './weaponPsDamageChart'

function weapon(partial: Partial<Weapon> & Pick<Weapon, 'id' | 'name'>): Weapon {
  return {
    itemType: 'weapon',
    weightLbs: 3,
    category: 'Misc',
    strikeBonus: 0,
    damage: '1D6',
    isEquipped: true,
    ...partial,
  }
}

describe('resolveWeaponPsChartFamily', () => {
  it('maps catalog categories to chart families', () => {
    expect(
      resolveWeaponPsChartFamily(
        weapon({ id: '1', name: 'Long Sword', category: 'Large Swords' }),
      ),
    ).toBe('swords')
    expect(
      resolveWeaponPsChartFamily(
        weapon({ id: '2', name: 'Halberd', category: 'Pole Arms' }),
      ),
    ).toBe('polearms')
    expect(
      resolveWeaponPsChartFamily(
        weapon({ id: '3', name: 'Sai', category: 'Knives' }),
      ),
    ).toBe('forked')
    expect(
      resolveWeaponPsChartFamily(
        weapon({ id: '4', name: 'Short Bow', category: 'Missile' }),
      ),
    ).toBe('bows')
    expect(
      resolveWeaponPsChartFamily(
        weapon({ id: '5', name: 'Cross Bow', category: 'Missile' }),
      ),
    ).toBe('crossbows')
    expect(
      resolveWeaponPsChartFamily(
        weapon({ id: '6', name: 'Blow Gun', category: 'Missile' }),
      ),
    ).toBe('blowguns')
    expect(
      resolveWeaponPsChartFamily(
        weapon({ id: '7', name: 'Sling', category: 'Missile' }),
      ),
    ).toBe('slings_bolas')
    expect(
      resolveWeaponPsChartFamily(
        weapon({ id: '8', name: 'Shuriken', category: 'Thrown', throwable: true }),
      ),
    ).toBe('thrown_discs_stars')
    expect(
      resolveWeaponPsChartFamily(
        weapon({ id: '9', name: 'Bull Whip', category: 'Whips' }),
      ),
    ).toBe('whips')
  })

  it('leaves Misc uncharted; Dart and Arrows/Bolts are explicit neither families', () => {
    expect(
      resolveWeaponPsChartFamily(
        weapon({ id: 'm', name: 'Frying Pan', category: 'Miscellaneous' }),
      ),
    ).toBe('uncharted')
    expect(
      resolveWeaponPsChartFamily(
        weapon({ id: 'd', name: 'Dart', category: 'Thrown', throwable: true }),
      ),
    ).toBe('thrown_dart')
    expect(
      resolveWeaponPsChartFamily(
        weapon({
          id: 'a',
          name: 'Arrows (Short Bow)',
          category: 'Missile',
        }),
      ),
    ).toBe('arrow_bolt_ammo')
    expect(
      resolveWeaponPsChartFamily(
        weapon({ id: 'b', name: 'Bolts', category: 'Missile' }),
      ),
    ).toBe('arrow_bolt_ammo')
  })
})

describe('resolveWeaponPsChartEligibility', () => {
  it('axes: melee both; thrown Flat only', () => {
    const axe = weapon({
      id: 'a',
      name: 'Axe, Throwing',
      category: 'Axes',
      throwable: true,
    })
    expect(resolveWeaponPsChartEligibility(axe, 'melee')).toMatchObject({
      flatPs: true,
      supernaturalPunch: true,
    })
    expect(resolveWeaponPsChartEligibility(axe, 'thrown')).toMatchObject({
      flatPs: true,
      supernaturalPunch: false,
    })
  })

  it('bows default to projectile Flat-only', () => {
    const bow = weapon({ id: 'b', name: 'Long Bow', category: 'Missile' })
    expect(resolveDefaultWeaponDamageDelivery(bow)).toBe('projectile')
    expect(resolveWeaponPsChartEligibility(bow)).toMatchObject({
      flatPs: true,
      supernaturalPunch: false,
      hthStyleFlat: false,
    })
  })

  it('Dart and Arrows/Bolts get neither Flat nor S.N. (Joe rulings)', () => {
    const dart = weapon({
      id: 'd',
      name: 'Dart',
      category: 'Thrown',
      throwable: true,
    })
    const arrows = weapon({
      id: 'a',
      name: 'Arrows (Short Bow)',
      category: 'Missile',
    })
    expect(resolveWeaponPsChartEligibility(dart)).toMatchObject({
      family: 'thrown_dart',
      flatPs: false,
      supernaturalPunch: false,
    })
    expect(resolveWeaponPsChartEligibility(arrows)).toMatchObject({
      family: 'arrow_bolt_ammo',
      flatPs: false,
      supernaturalPunch: false,
    })
  })

  it('pure energy blades are neither; Rune/TW exception deferred', () => {
    const plain = weapon({ id: 'p1', name: 'Psi-Sword', category: 'Misc' })
    const labeled = weapon({
      id: 'p2',
      name: 'Psi-Sword',
      category: 'Misc',
      forgeProperties: { qualityLabel: 'Rune' },
    })
    expect(resolveWeaponPsChartFamily(plain)).toBe('pure_energy_psi')
    expect(resolveWeaponPsChartFamily(labeled)).toBe('pure_energy_psi')
    expect(resolveWeaponPsChartEligibility(labeled, 'melee')).toMatchObject({
      flatPs: false,
      supernaturalPunch: false,
    })
  })
})
