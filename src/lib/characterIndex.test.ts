import { describe, expect, it } from 'vitest'
import {
  formatCharacterIndexLabel,
  isCharacterIndexInProgress,
  resolveCharacterIndexRowDisplay,
  type CharacterIndexEntry,
} from './characterIndex'

const baseEntry = (): CharacterIndexEntry => ({
  id: 'char_1',
  name: 'Rook',
  creationGenreId: 'nightbane',
  hostGenreId: 'nightbane',
  updatedAtMs: 0,
})

describe('characterIndex', () => {
  it('uses inProgress flag when present on index rows', () => {
    expect(isCharacterIndexInProgress({ ...baseEntry(), inProgress: true })).toBe(
      true,
    )
    expect(isCharacterIndexInProgress({ ...baseEntry(), inProgress: false })).toBe(
      false,
    )
  })

  it('formats portal main row without genre prefix', () => {
    const entry: CharacterIndexEntry = {
      ...baseEntry(),
      raceName: 'Human',
      occName: 'P.A.B. Field Agent',
      occSpecializationName: '',
    }
    expect(resolveCharacterIndexRowDisplay(entry)).toEqual({
      genreLabel: 'Nightbane',
      mainLabel: 'Rook - Human - P.A.B. Field Agent',
      fullLabel: 'Nightbane Rook - Human - P.A.B. Field Agent',
    })
  })

  it('appends O.C.C. specialization as a fourth segment', () => {
    const entry: CharacterIndexEntry = {
      id: 'char_2',
      name: 'Morgan',
      creationGenreId: 'nightbane',
      hostGenreId: 'nightbane',
      updatedAtMs: 0,
      raceName: 'Most Nightbane',
      occName: 'Spook Squad',
      occSpecializationName: 'Team Epsilon',
    }
    expect(resolveCharacterIndexRowDisplay(entry).mainLabel).toBe(
      'Morgan - Most Nightbane - Spook Squad - Team Epsilon',
    )
    expect(formatCharacterIndexLabel(entry)).toBe(
      'Nightbane Morgan - Most Nightbane - Spook Squad - Team Epsilon',
    )
  })
})
