import { describe, expect, it } from 'vitest'
import type { Character, Weapon } from '../types'
import {
  computeWeaponDamageProfile,
  computeWeaponProfileBonuses,
  selectWeaponStrikeProfileForFireMode,
  weaponReceivesMeleePsDamageBonus,
} from './weaponBonuses'
import { createEmptyAccumulatedHandToHandBonuses } from '../utils/combatCalculator'

function weapon(partial: Partial<Weapon> & Pick<Weapon, 'id' | 'name'>): Weapon {
  return {
    itemType: 'weapon',
    weightLbs: 3,
    category: 'Swords',
    strikeBonus: 0,
    damage: '2D6',
    isEquipped: true,
    ...partial,
  }
}

function characterWithWp(
  skillIds: string[],
  level: number,
  ppScore = 10,
  opts?: { psScore?: number; psTier?: 'normal' | 'supernatural' },
): Character {
  return {
    level,
    primary: {
      skills: skillIds.map((id) => ({
        id,
        catalogSkillId: id,
        name: id,
        level: 1,
        restricted: false,
      })),
      attributes: {
        iq: { score: 10, tier: 'normal' },
        me: { score: 10, tier: 'normal' },
        ma: { score: 10, tier: 'normal' },
        ps: {
          score: opts?.psScore ?? 10,
          tier: opts?.psTier ?? 'normal',
        },
        pp: { score: ppScore, tier: 'normal' },
        pe: { score: 10, tier: 'normal' },
        pb: { score: 10, tier: 'normal' },
        spd: { score: 10, tier: 'normal' },
      },
    },
    morphus: { skills: [] },
  } as unknown as Character
}

describe('computeWeaponProfileBonuses — W.P. level tiers', () => {
  it('adds W.P. Sword level bonuses to equipped sword strike/parry', () => {
    const sword = weapon({
      id: 'long-sword-1',
      name: 'Long Sword',
      linkedWpSkillId: 'wp_sword',
      wpCategory: 'W.P. Sword',
    })
    const withWp = characterWithWp(['wp_sword'], 3)
    const withoutWp = characterWithWp([], 3)
    const emptyHth = createEmptyAccumulatedHandToHandBonuses()

    const owned = computeWeaponProfileBonuses(withWp, 'primary', sword, emptyHth)
    const missing = computeWeaponProfileBonuses(
      withoutWp,
      'primary',
      sword,
      emptyHth,
    )

    const wpStrike = owned.strike.lines.find((l) => l.key === 'wp')
    const wpParry = owned.parry.lines.find((l) => l.key === 'wp')
    expect(wpStrike).toEqual({
      key: 'wp',
      label: 'W.P. Sword',
      amount: 2,
    })
    expect(wpParry).toEqual({
      key: 'wp',
      label: 'W.P. Sword',
      amount: 2,
    })
    expect(missing.strike.lines.some((l) => l.key === 'wp')).toBe(false)
    expect(missing.parry.lines.some((l) => l.key === 'wp')).toBe(false)
    expect(owned.wpSkillDisplayName).toBe('W.P. Sword')
    // Level 1 sword is only +1/+1 — prove level ladder, not a flat presence flag.
    const level1 = computeWeaponProfileBonuses(
      characterWithWp(['wp_sword'], 1),
      'primary',
      sword,
      emptyHth,
    )
    expect(level1.strike.lines.find((l) => l.key === 'wp')?.amount).toBe(1)
  })

  it('uses strikeWhenThrown for throwable W.P. Battle Axe throw profile', () => {
    const axe = weapon({
      id: 'axe-1',
      name: 'Battle Axe',
      linkedWpSkillId: 'wp_battle_axe',
      wpCategory: 'W.P. Battle Axe',
      category: 'Axes',
      throwable: true,
    })
    const char = characterWithWp(['wp_battle_axe'], 3)
    const profile = computeWeaponProfileBonuses(
      char,
      'primary',
      axe,
      createEmptyAccumulatedHandToHandBonuses(),
    )
    expect(profile.throw).toBeTruthy()
    const throwWp = profile.throw!.lines.find((l) => l.key === 'wp')
    expect(throwWp?.amount).toBe(1)
    const strikeWp = profile.strike.lines.find((l) => l.key === 'wp')
    expect(strikeWp?.amount).toBe(1)
  })

  it('applies modern aimed vs burst ladders for automatic pistol', () => {
    const pistol = weapon({
      id: 'pistol-1',
      name: '9mm Auto',
      linkedWpSkillId: 'wp_automatic_pistol',
      wpCategory: 'W.P. Automatic Pistol',
      category: 'Handguns',
      payload: { current: 12, max: 12 },
      fireModes: [
        { id: 'single', name: 'Single', ammoCost: 1, strikeModifier: 0 },
        { id: 'short_burst', name: 'Short Burst', ammoCost: 3, strikeModifier: -1 },
        { id: 'wild', name: 'Wild/Full Auto', ammoCost: -1, strikeModifier: -6 },
      ],
    })
    const char = characterWithWp(['wp_automatic_pistol'], 4)
    const profile = computeWeaponProfileBonuses(char, 'primary', pistol)

    expect(profile.burstStrike).toBeTruthy()
    expect(profile.strike.lines.find((l) => l.key === 'wp')?.amount).toBe(4)
    expect(profile.burstStrike!.lines.find((l) => l.key === 'wp')?.amount).toBe(2)

    const aimed = selectWeaponStrikeProfileForFireMode(profile, {
      id: 'single',
      name: 'Single',
      ammoCost: 1,
      strikeModifier: 0,
    })
    const burst = selectWeaponStrikeProfileForFireMode(profile, {
      id: 'short_burst',
      name: 'Short Burst',
      ammoCost: 3,
      strikeModifier: -1,
    })
    const wild = selectWeaponStrikeProfileForFireMode(profile, {
      id: 'wild',
      name: 'Wild/Full Auto',
      ammoCost: -1,
      strikeModifier: -6,
    })
    expect(aimed.lines.find((l) => l.key === 'wp')?.amount).toBe(4)
    expect(burst.lines.find((l) => l.key === 'wp')?.amount).toBe(2)
    expect(wild.lines.some((l) => l.key === 'wp')).toBe(false)
  })

  it('does not apply W.P. when weaponProficiencyEligible is false', () => {
    const misc = weapon({
      id: 'misc-1',
      name: 'Improvised',
      linkedWpSkillId: 'wp_sword',
      weaponProficiencyEligible: false,
    })
    const char = characterWithWp(['wp_sword'], 7)
    const profile = computeWeaponProfileBonuses(char, 'primary', misc)
    expect(profile.strike.lines.some((l) => l.key === 'wp')).toBe(false)
  })
})

describe('computeWeaponDamageProfile — P.S. / HtH / W.P. flats', () => {
  it('appends exceptional P.S. + HtH style to melee Dam (flag absent = ON)', () => {
    const sword = weapon({
      id: 'long-sword-1',
      name: 'Long Sword',
      damage: '2D6',
      linkedWpSkillId: 'wp_sword',
      category: 'Large Swords',
    })
    const char = characterWithWp([], 3, 10, { psScore: 20 })
    const hth = { ...createEmptyAccumulatedHandToHandBonuses(), damage: 2 }
    const profile = computeWeaponDamageProfile(char, 'primary', sword, hth)
    expect(profile.notation).toBe('2D6+5+2')
    expect(profile.appliesPsDamageBonus).toBe(true)
    expect(weaponReceivesMeleePsDamageBonus(sword)).toBe(true)
  })

  it('supernatural P.S. appends full-punch table string (Joe: 1D8+3D6+9 at SN 24)', () => {
    const knife = weapon({
      id: 'knife-1',
      name: 'Knife',
      damage: '1D8',
      category: 'Knives',
      throwable: true,
    })
    const char = characterWithWp([], 1, 10, {
      psScore: 24,
      psTier: 'supernatural',
    })
    const profile = computeWeaponDamageProfile(
      char,
      'primary',
      knife,
      createEmptyAccumulatedHandToHandBonuses(),
    )
    expect(profile.notation).toBe('1D8+3D6+9')
  })

  it('includes W.P. damageBonusFlat in Dam', () => {
    const whip = weapon({
      id: 'whip-1',
      name: 'Whip',
      damage: '1D6',
      linkedWpSkillId: 'wp_whip',
      wpCategory: 'W.P. Whip',
      category: 'Whips',
    })
    const char = characterWithWp(['wp_whip'], 4, 10, { psScore: 10 })
    const profile = computeWeaponDamageProfile(
      char,
      'primary',
      whip,
      createEmptyAccumulatedHandToHandBonuses(),
    )
    expect(profile.notation).toBe('1D6+1')
    expect(profile.lines.some((l) => l.key === 'wp')).toBe(true)
  })

  it('skips P.S. when forge addsPsDamageBonus is explicitly false (HtH still applies)', () => {
    const sword = weapon({
      id: 'sword-off',
      name: 'Long Sword',
      damage: '2D6',
      category: 'Large Swords',
      forgeProperties: { editorDraft: { addsPsDamageBonus: false } },
    })
    const char = characterWithWp([], 1, 10, { psScore: 20 })
    const hth = { ...createEmptyAccumulatedHandToHandBonuses(), damage: 2 }
    const profile = computeWeaponDamageProfile(char, 'primary', sword, hth)
    expect(profile.notation).toBe('2D6+2')
    expect(profile.appliesPsDamageBonus).toBe(false)
  })

  it('does not add P.S. to firearms, thrown darts, or arrow/bolt ammo', () => {
    const pistol = weapon({
      id: 'pistol-1',
      name: '9mm',
      damage: '3D6',
      category: 'Handguns',
      payload: { current: 12, max: 12 },
    })
    const dart = weapon({
      id: 'dart-1',
      name: 'Dart',
      damage: '1D4',
      category: 'Thrown',
      throwable: true,
    })
    const arrows = weapon({
      id: 'arrows-1',
      name: 'Arrows (Short Bow)',
      damage: '1D6',
      category: 'Missile',
    })
    const char = characterWithWp([], 1, 10, { psScore: 20 })
    const hth = { ...createEmptyAccumulatedHandToHandBonuses(), damage: 2 }
    expect(computeWeaponDamageProfile(char, 'primary', pistol, hth).notation).toBe(
      '3D6',
    )
    expect(computeWeaponDamageProfile(char, 'primary', dart, hth).notation).toBe(
      '1D4',
    )
    expect(
      computeWeaponDamageProfile(char, 'primary', arrows, hth).notation,
    ).toBe('1D6')
  })

  it('bows get Flat P.S. only (no S.N. punch)', () => {
    const bow = weapon({
      id: 'bow-1',
      name: 'Short Bow',
      damage: '1D6',
      category: 'Missile',
      linkedWpSkillId: 'wp_archery',
    })
    const std = characterWithWp([], 1, 10, { psScore: 20 })
    const sn = characterWithWp([], 1, 10, {
      psScore: 24,
      psTier: 'supernatural',
    })
    const hth = createEmptyAccumulatedHandToHandBonuses()
    const stdProfile = computeWeaponDamageProfile(std, 'primary', bow, hth)
    expect(stdProfile.notation).toBe('1D6+5')
    expect(stdProfile.appliesFlatPs).toBe(true)
    expect(stdProfile.appliesSupernaturalPunch).toBe(false)
    const snProfile = computeWeaponDamageProfile(sn, 'primary', bow, hth)
    expect(snProfile.notation).toBe('1D6+9')
    expect(snProfile.appliesSupernaturalPunch).toBe(false)
  })

  it('whips and crossbows get neither Flat nor S.N.', () => {
    const whip = weapon({
      id: 'whip-1',
      name: 'Bull Whip',
      damage: '1D6',
      category: 'Whips',
    })
    const xbow = weapon({
      id: 'xbow-1',
      name: 'Cross Bow',
      damage: '2D6',
      category: 'Missile',
    })
    const char = characterWithWp([], 1, 10, { psScore: 20 })
    const hth = createEmptyAccumulatedHandToHandBonuses()
    expect(computeWeaponDamageProfile(char, 'primary', whip, hth).notation).toBe(
      '1D6',
    )
    expect(computeWeaponDamageProfile(char, 'primary', xbow, hth).notation).toBe(
      '2D6',
    )
  })

  it('applies Flat+SN-eligible melee categories (chart SoT)', () => {
    const char = characterWithWp([], 1, 10, { psScore: 20 })
    const hth = createEmptyAccumulatedHandToHandBonuses()
    const cases: Array<{ name: string; category: string; damage: string }> = [
      { name: 'Short Sword', category: 'Short Swords', damage: '2D4' },
      { name: 'Long Sword', category: 'Large Swords', damage: '2D6' },
      { name: 'Battle Axe', category: 'Axes', damage: '2D6' },
      { name: 'Mace', category: 'Blunt', damage: '1D8' },
      { name: 'Nunchaku', category: 'Chain', damage: '1D8' },
      { name: 'Bo Staff', category: 'Staves', damage: '1D8' },
      { name: 'Spear', category: 'Spears', damage: '1D6' },
      { name: 'Knife', category: 'Knives', damage: '1D6' },
      { name: 'Halberd', category: 'Pole Arms', damage: '3D6' },
    ]
    for (const c of cases) {
      const w = weapon({
        id: `cov-${c.category}`,
        name: c.name,
        category: c.category,
        damage: c.damage,
      })
      const profile = computeWeaponDamageProfile(char, 'primary', w, hth)
      expect(profile.appliesPsDamageBonus, c.category).toBe(true)
      expect(profile.appliesFlatPs, c.category).toBe(true)
      expect(profile.appliesSupernaturalPunch, c.category).toBe(true)
      expect(profile.notation, c.category).toBe(`${c.damage}+5`)
      expect(weaponReceivesMeleePsDamageBonus(w), c.category).toBe(true)
    }
  })

  it('thrown axe/knife: melee gets Flat+SN; thrown delivery Flat only', () => {
    const axe = weapon({
      id: 'throwing-axe',
      name: 'Axe, Throwing',
      category: 'Axes',
      damage: '1D6',
      throwable: true,
    })
    const sn = characterWithWp([], 1, 10, {
      psScore: 24,
      psTier: 'supernatural',
    })
    const hth = createEmptyAccumulatedHandToHandBonuses()
    const melee = computeWeaponDamageProfile(sn, 'primary', axe, hth, 'melee')
    expect(melee.notation).toBe('1D6+3D6+9')
    expect(melee.appliesSupernaturalPunch).toBe(true)
    const thrown = computeWeaponDamageProfile(sn, 'primary', axe, hth, 'thrown')
    expect(thrown.notation).toBe('1D6+9')
    expect(thrown.appliesFlatPs).toBe(true)
    expect(thrown.appliesSupernaturalPunch).toBe(false)
  })

  it('shuriken: Flat P.S. only (never S.N. punch)', () => {
    const star = weapon({
      id: 'shuriken-1',
      name: 'Shuriken',
      category: 'Thrown',
      damage: '1D4',
      throwable: true,
    })
    const sn = characterWithWp([], 1, 10, {
      psScore: 24,
      psTier: 'supernatural',
    })
    const profile = computeWeaponDamageProfile(
      sn,
      'primary',
      star,
      createEmptyAccumulatedHandToHandBonuses(),
    )
    expect(profile.delivery).toBe('thrown')
    expect(profile.notation).toBe('1D4+9')
    expect(profile.appliesSupernaturalPunch).toBe(false)
  })

  it('shield bash Flat+SN; thrown shield Flat only', () => {
    const shield = weapon({
      id: 'shield-1',
      name: 'Round Shield',
      category: 'Shields',
      damage: '1D4',
      isShield: true,
      throwable: true,
    })
    const sn = characterWithWp([], 1, 10, {
      psScore: 24,
      psTier: 'supernatural',
    })
    const hth = createEmptyAccumulatedHandToHandBonuses()
    expect(
      computeWeaponDamageProfile(sn, 'primary', shield, hth, 'melee').notation,
    ).toBe('1D4+3D6+9')
    expect(
      computeWeaponDamageProfile(sn, 'primary', shield, hth, 'thrown').notation,
    ).toBe('1D4+9')
  })
})
