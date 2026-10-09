import { describe, expect, it } from 'vitest'
import { characterFixture } from '../data/characterFixture'
import {
  buildLiveBonusesOverlay,
  formatLiveBonusesOverlayPrimary,
  OVERLAY_SITUATIONAL_TARGET_FOOTNOTE,
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

  it('keeps exactly the fixed ten SAVING THROWS cards', () => {
    const view = buildLiveBonusesOverlay(characterFixture, 'primary', 15, false)
    expect(view.fixedSaveCards).toHaveLength(10)
    expect(view.fixedSaveCards.map((c) => c.id)).toEqual([
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
    expect(view.fixedSaveCards.every((c) => c.outline === 'save')).toBe(true)
    expect(view.fixedSaveCards.find((c) => c.id === 'magic')?.footnotes).toEqual([
      { label: 'Spell', text: '12+' },
      { label: 'Ritual', text: '16+' },
    ])
    expect(view.fixedSaveCards.find((c) => c.id === 'horror_factor')?.footnotes).toEqual([
      OVERLAY_SITUATIONAL_TARGET_FOOTNOTE,
    ])
    expect(view.fixedSaveCards.find((c) => c.id === 'coma_death')?.footnotes).toEqual([
      OVERLAY_SITUATIONAL_TARGET_FOOTNOTE,
    ])
    // Illusions / Possession — no SoT TN yet; omit bottom target.
    expect(view.fixedSaveCards.find((c) => c.id === 'illusions')?.footnotes).toEqual([])
    expect(view.fixedSaveCards.find((c) => c.id === 'possession')?.footnotes).toEqual([])
    expect(view.fixedSaveCards.find((c) => c.id === 'disease')?.footnotes).toEqual([
      { label: '', text: '14+' },
    ])
    expect(view.fixedSaveCards.find((c) => c.id === 'psionics')?.footnotes).toEqual([
      { label: '', text: '15+' },
    ])
  })

  it('hides the dynamic extras row when there are no extra saves', () => {
    const view = buildLiveBonusesOverlay(characterFixture, 'primary', 15, false)
    expect(view.extraSaveCards).toEqual([])
  })

  it('shows empty dash when attribute bonuses are zero (never +0)', () => {
    const view = buildLiveBonusesOverlay(characterFixture, 'primary', 15, false)
    const perception = view.bonusCards.find((c) => c.id === 'perception')
    expect(formatLiveBonusesOverlayPrimary(perception!.primary)).toBe('—')
    const magic = view.fixedSaveCards.find((c) => c.id === 'magic')
    expect(formatLiveBonusesOverlayPrimary(magic!.primary)).toBe('—')
  })

  it('marks Nightbane mind control Immune on the overlay (engine wording)', () => {
    const nightbane = {
      ...characterFixture,
      lineage: 'nightbane' as const,
      raceId: 'race_nightbane',
    }
    const view = buildLiveBonusesOverlay(nightbane, 'primary', 15, true)
    const mind = view.fixedSaveCards.find((c) => c.id === 'mind_control')
    expect(mind?.primary).toEqual({ kind: 'special', text: 'Immune' })
  })

  it('always pins Save vs Becoming first on the Nightbane extras row', () => {
    const nightbane = {
      ...characterFixture,
      lineage: 'nightbane' as const,
      raceId: 'race_nightbane',
      primary: {
        ...characterFixture.primary,
        attributes: {
          ...characterFixture.primary.attributes,
          // High P.E. also surfaces Harmful Drugs as a later extra.
          pe: 17,
        },
      },
    }
    const view = buildLiveBonusesOverlay(nightbane, 'primary', 15, true)
    expect(view.extraSaveCards.length).toBeGreaterThanOrEqual(1)
    expect(view.extraSaveCards[0]?.id).toBe('vs_becoming')
    expect(view.extraSaveCards[0]?.label).toBe('Save vs Becoming')
    const drugsIdx = view.extraSaveCards.findIndex((c) => c.id === 'harmful_drugs')
    if (drugsIdx >= 0) {
      expect(drugsIdx).toBeGreaterThan(0)
    }
  })

  it('shows the Nightbane extras row with only Becoming when no other extras', () => {
    const nightbane = {
      ...characterFixture,
      lineage: 'nightbane' as const,
      raceId: 'race_nightbane',
    }
    const view = buildLiveBonusesOverlay(nightbane, 'primary', 15, true)
    expect(view.extraSaveCards.map((c) => c.id)).toEqual(['vs_becoming'])
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
    const coma = view.fixedSaveCards.find((c) => c.id === 'coma_death')
    expect(formatLiveBonusesOverlayPrimary(coma!.primary)).toBe('+5%')
    // High P.E. also surfaces Harmful Drugs (registry extra with PE bonus).
    expect(view.extraSaveCards.some((c) => c.id === 'harmful_drugs')).toBe(true)
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
    const disease = view.fixedSaveCards.find((c) => c.id === 'disease')
    expect(disease?.primary).toEqual({ kind: 'special', text: 'Impervious' })
  })
})
