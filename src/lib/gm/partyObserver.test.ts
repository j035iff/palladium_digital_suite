import { describe, expect, it } from 'vitest'
import { characterFixture } from '../../data/characterFixture'
import { ensureCharacterRoot } from '../characterRoot'
import { buildPartyObserverSlice } from './partyObserver'

describe('GM party observer', () => {
  it('projects host-genre view without rewriting creationGenreId', () => {
    const raw = ensureCharacterRoot(characterFixture, {
      creationGenreId: 'rifts',
      hostGenreId: 'rifts',
    })
    const slice = buildPartyObserverSlice(
      raw,
      'nightbane',
      'disable_non_native',
      'primary',
    )
    expect(slice.creationGenreId).toBe('rifts')
    expect(slice.hostGenreId).toBe('nightbane')
    expect(slice.crossGenre).toBe(true)
    expect(slice.conversionNote).toMatch(/locked/i)
    expect(slice.conversionNote).toMatch(/save file is unchanged/i)
    expect(slice.maxApm).toBeGreaterThan(0)
    expect(slice.saveSummaries.length).toBeGreaterThan(0)
    expect(slice.attributes.iq).toBeGreaterThan(0)
    expect(slice.hthSkillName === null || typeof slice.hthSkillName === 'string').toBe(
      true,
    )
    expect(Array.isArray(slice.abilities)).toBe(true)
    expect(typeof slice.ppeMax).toBe('number')
    expect(typeof slice.ispMax).toBe('number')
  })

  it('apply_conversion still refuses to claim structural mapping exists', () => {
    const raw = ensureCharacterRoot(characterFixture, {
      creationGenreId: 'rifts',
      hostGenreId: 'rifts',
    })
    const slice = buildPartyObserverSlice(
      raw,
      'nightbane',
      'apply_conversion',
      'primary',
    )
    expect(slice.conversionNote).toMatch(/not implemented/i)
  })
})
