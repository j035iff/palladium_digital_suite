import { describe, expect, it } from 'vitest'
import {
  listCreationSkillLibrary,
  matchesSkillBookCategoryFilter,
  sortCreationSkillLibraryResults,
} from './creationSkillCatalog'

describe('creationSkillCatalog electrical category', () => {
  it('only maps Basic Electronics, Computer Repair, and Electrical Engineer to Electrical', () => {
    const lib = listCreationSkillLibrary('nightbane')
    const electrical = lib.filter((s) =>
      matchesSkillBookCategoryFilter(s, 'Electrical'),
    )
    expect(electrical.map((s) => s.name).sort()).toEqual([
      'Basic Electronics',
      'Computer Repair',
      'Electrical Engineer',
    ])
  })

  it('does not tag Computer Operation as Electrical', () => {
    const lib = listCreationSkillLibrary('nightbane')
    const compOp = lib.find((s) => s.id === 'skill_computer_operation')
    expect(compOp).toBeDefined()
    expect(matchesSkillBookCategoryFilter(compOp!, 'Electrical')).toBe(false)
  })
})

describe('creationSkillCatalog technical pinning', () => {
  it('pins Language and Literacy to the top of Technical results', () => {
    const lib = listCreationSkillLibrary('nightbane')
    const technical = lib.filter((s) =>
      matchesSkillBookCategoryFilter(s, 'Technical'),
    )
    const sorted = sortCreationSkillLibraryResults(technical, 'Technical')
    expect(sorted[0]?.id).toBe('skill_language')
    expect(sorted[1]?.id).toBe('skill_literacy')
  })
})
