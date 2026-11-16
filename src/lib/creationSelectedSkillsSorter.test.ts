import { describe, expect, it } from 'vitest'
import type { CreationSkillPick } from '../types'
import {
  CREATION_SELECTED_SKILLS_SORTER_ALL,
  CREATION_SELECTED_SKILLS_SORTER_LANGUAGE_LITERACY,
  CREATION_SELECTED_SKILLS_SORTER_LORE,
  CREATION_SELECTED_SKILLS_SORTER_WEAPON_PROFICIENCIES,
  creationSelectedSkillMatchesSorter,
  listCreationSelectedSkillSorterOptions,
  resolveCreationSelectedSkillSorterCategory,
} from './creationSelectedSkillsSorter'

function pick(
  skillId: string,
  opts?: Partial<CreationSkillPick>,
): CreationSkillPick {
  return {
    instanceId: opts?.instanceId ?? `inst-${skillId}`,
    skillId,
    ...opts,
  }
}

describe('resolveCreationSelectedSkillSorterCategory', () => {
  it('uses selectionCategory for multi-category skills (Rogue vs Espionage)', () => {
    expect(
      resolveCreationSelectedSkillSorterCategory(
        pick('skill_pick_pockets', { selectionCategory: 'Rogue' }),
      ),
    ).toBe('Rogue')
    expect(
      resolveCreationSelectedSkillSorterCategory(
        pick('skill_pick_pockets', { selectionCategory: 'Espionage' }),
      ),
    ).toBe('Espionage')
  })

  it('does not invent Espionage when Rogue was the selection lane', () => {
    const category = resolveCreationSelectedSkillSorterCategory(
      pick('skill_pick_pockets', { selectionCategory: 'Rogue' }),
    )
    expect(category).toBe('Rogue')
    expect(category).not.toBe('Espionage')
  })

  it('combines Language and Literacy', () => {
    expect(
      resolveCreationSelectedSkillSorterCategory(pick('skill_language')),
    ).toBe(CREATION_SELECTED_SKILLS_SORTER_LANGUAGE_LITERACY)
    expect(
      resolveCreationSelectedSkillSorterCategory(pick('skill_literacy')),
    ).toBe(CREATION_SELECTED_SKILLS_SORTER_LANGUAGE_LITERACY)
  })

  it('peels Lore out of Technical', () => {
    expect(
      resolveCreationSelectedSkillSorterCategory(pick('skill_lore_magic')),
    ).toBe(CREATION_SELECTED_SKILLS_SORTER_LORE)
    expect(
      resolveCreationSelectedSkillSorterCategory(
        pick('skill_computer_operation'),
      ),
    ).toBe('Technical')
  })

  it('combines Ancient and Modern W.P.s', () => {
    expect(
      resolveCreationSelectedSkillSorterCategory(
        pick('wp_sword', { selectionCategory: 'WP: Ancient' }),
      ),
    ).toBe(CREATION_SELECTED_SKILLS_SORTER_WEAPON_PROFICIENCIES)
    expect(
      resolveCreationSelectedSkillSorterCategory(
        pick('wp_automatic_pistol', { selectionCategory: 'WP: Modern' }),
      ),
    ).toBe(CREATION_SELECTED_SKILLS_SORTER_WEAPON_PROFICIENCIES)
  })
})

describe('creationSelectedSkillMatchesSorter', () => {
  it('All matches every pick', () => {
    expect(
      creationSelectedSkillMatchesSorter(
        pick('skill_prowl', { selectionCategory: 'Rogue' }),
        CREATION_SELECTED_SKILLS_SORTER_ALL,
      ),
    ).toBe(true)
    expect(
      creationSelectedSkillMatchesSorter(pick('skill_lore_vampires'), null),
    ).toBe(true)
  })

  it('filters by resolved sorter category', () => {
    const rogue = pick('skill_prowl', { selectionCategory: 'Rogue' })
    expect(creationSelectedSkillMatchesSorter(rogue, 'Rogue')).toBe(true)
    expect(creationSelectedSkillMatchesSorter(rogue, 'Physical')).toBe(false)
    expect(
      creationSelectedSkillMatchesSorter(
        pick('skill_lore_magic'),
        CREATION_SELECTED_SKILLS_SORTER_LORE,
      ),
    ).toBe(true)
    expect(
      creationSelectedSkillMatchesSorter(
        pick('skill_lore_magic'),
        'Technical',
      ),
    ).toBe(false)
  })
})

describe('listCreationSelectedSkillSorterOptions', () => {
  it('starts with All and omits empty categories', () => {
    const options = listCreationSelectedSkillSorterOptions([
      pick('skill_prowl', { selectionCategory: 'Rogue' }),
      pick('skill_language'),
      pick('wp_sword'),
      pick('skill_lore_religion'),
    ])
    expect(options[0]).toEqual({
      value: CREATION_SELECTED_SKILLS_SORTER_ALL,
      label: 'All',
    })
    expect(options.map((o) => o.value)).toEqual([
      CREATION_SELECTED_SKILLS_SORTER_ALL,
      CREATION_SELECTED_SKILLS_SORTER_LANGUAGE_LITERACY,
      'Rogue',
      CREATION_SELECTED_SKILLS_SORTER_LORE,
      CREATION_SELECTED_SKILLS_SORTER_WEAPON_PROFICIENCIES,
    ])
    expect(options.map((o) => o.value)).not.toContain('Espionage')
    expect(options.map((o) => o.value)).not.toContain('WP: Ancient')
    expect(options.map((o) => o.value)).not.toContain('Technical')
  })

  it('lists Technical when a non-lore Technical skill is selected', () => {
    const options = listCreationSelectedSkillSorterOptions([
      pick('skill_computer_operation'),
      pick('skill_lore_magic'),
    ])
    expect(options.map((o) => o.value)).toEqual([
      CREATION_SELECTED_SKILLS_SORTER_ALL,
      'Technical',
      CREATION_SELECTED_SKILLS_SORTER_LORE,
    ])
  })
})
