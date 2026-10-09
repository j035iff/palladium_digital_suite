import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import {
  buildLiveBonusesOverlay,
  formatLiveBonusesOverlayPrimary,
} from './liveBonusesOverlay'

describe('buildLiveBonusesOverlay', () => {
  it('orders BONUSES cards to match the mock', () => {
    const view = buildLiveBonusesOverlay(characterFixture, 'primary', 15, false)
    expect(view.bonusCards.map((c) => c.id)).toEqual([
      'perception',
      'trust_intimidate',
      'charm_impress',
      'base_skill',
      'base_me',
      'base_ps_damage',
      'base_pp',
      'base_pe',
    ])
    expect(view.bonusCards.every((c) => c.outline === 'bonus')).toBe(true)
  })

  it('keeps the fixed ten SAVING THROWS cards then optional extras', () => {
    const view = buildLiveBonusesOverlay(characterFixture, 'primary', 15, false)
    const fixed = view.saveCards.slice(0, 10)
    expect(fixed.map((c) => c.id)).toEqual([
      'magic',
      'horror_factor',
      'poison_toxins',
      'disease',
      'coma_death',
      'psionics',
      'illusions',
      'insanity',
      'possession',
      'mind_control',
    ])
    expect(fixed.every((c) => c.outline === 'save')).toBe(true)
    expect(fixed.find((c) => c.id === 'magic')?.footnotes).toEqual([
      { label: 'Spell', text: '12+' },
      { label: 'Ritual', text: '16+' },
    ])
    expect(fixed.find((c) => c.id === 'horror_factor')?.footnotes).toEqual([])
    expect(fixed.find((c) => c.id === 'psionics')?.footnotes).toEqual([
      { label: '', text: '15+' },
    ])
  })

  it('shows empty dash when attribute bonuses are zero (fixture human)', () => {
    const view = buildLiveBonusesOverlay(characterFixture, 'primary', 15, false)
    const perception = view.bonusCards.find((c) => c.id === 'perception')
    expect(formatLiveBonusesOverlayPrimary(perception!.primary)).toBe('—')
  })

  it('marks Nightbane mind control Immune', () => {
    const nightbane = {
      ...characterFixture,
      lineage: 'nightbane' as const,
      raceId: 'race_nightbane',
    }
    const view = buildLiveBonusesOverlay(nightbane, 'primary', 15, true)
    const mind = view.saveCards.find((c) => c.id === 'mind_control')
    expect(mind?.primary).toEqual({ kind: 'special', text: 'Immune' })
  })

  it('surfaces high-attribute bonuses as signed / percent primaries', () => {
    const high = {
      ...characterFixture,
      primary: {
        ...characterFixture.primary,
        attributes: {
          ...characterFixture.primary.attributes,
          iq: 17,
          me: 17,
          ma: 17,
          ps: { score: 20, tier: 'standard' as const },
          pp: 17,
          pe: 17,
          pb: 17,
        },
      },
    }
    const view = buildLiveBonusesOverlay(high, 'primary', 12, false)
    expect(
      formatLiveBonusesOverlayPrimary(
        view.bonusCards.find((c) => c.id === 'perception')!.primary,
      ),
    ).toBe('+1')
    expect(
      formatLiveBonusesOverlayPrimary(
        view.bonusCards.find((c) => c.id === 'trust_intimidate')!.primary,
      ),
    ).toBe('45%')
    expect(
      formatLiveBonusesOverlayPrimary(
        view.bonusCards.find((c) => c.id === 'base_skill')!.primary,
      ),
    ).toBe('+3%')
    expect(
      formatLiveBonusesOverlayPrimary(
        view.bonusCards.find((c) => c.id === 'base_ps_damage')!.primary,
      ),
    ).toBe('+5')
    const coma = view.saveCards.find((c) => c.id === 'coma_death')
    expect(formatLiveBonusesOverlayPrimary(coma!.primary)).toBe('+5%')
  })

  it('marks P.E. 30+ disease as Impervious', () => {
    const tank = {
      ...characterFixture,
      primary: {
        ...characterFixture.primary,
        attributes: {
          ...characterFixture.primary.attributes,
          pe: 30,
        },
      },
    }
    const view = buildLiveBonusesOverlay(tank, 'primary', 15, false)
    const disease = view.saveCards.find((c) => c.id === 'disease')
    expect(disease?.primary).toEqual({ kind: 'special', text: 'Impervious' })
  })
})
