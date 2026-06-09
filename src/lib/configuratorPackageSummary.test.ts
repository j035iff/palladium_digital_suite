import { describe, expect, it } from 'vitest'
import { getLibraryOccById, getRaceById } from '../data/library/registry'
import {
  buildConfiguratorPackageSummary,
  OCC_PACKAGE_SECTION_ORDER,
} from './configuratorPackageSummary'

function occSectionIds(
  sections: ReturnType<typeof buildConfiguratorPackageSummary>['sections'],
): string[] {
  const start = sections.findIndex((s) => s.id === 'occ-heading')
  if (start < 0) return []
  return sections.slice(start + 1).map((s) => s.id)
}

function assertSectionOrder(present: string[], canonical: readonly string[]): void {
  const ordered = canonical.filter((id) => present.includes(id))
  const indices = ordered.map((id) => present.indexOf(id))
  expect(indices).toEqual([...indices].sort((a, b) => a - b))
}

describe('buildConfiguratorPackageSummary', () => {
  it('lists O.C.C. core skills and allowances for Ex-Government Agent', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_ex_government_agent')
    const summary = buildConfiguratorPackageSummary(human, occ, null)

    const core = summary.sections.find((s) => s.id === 'occ-core-skills')
    expect(core?.items.some((line) => line.includes('Intelligence'))).toBe(true)
    expect(core?.items.some((line) => line.includes('W.P. of choice'))).toBe(true)

    const allowances = summary.sections.find((s) => s.id === 'occ-skill-allowances')
    expect(
      allowances?.items.some((line) => line.includes('6 O.C.C. related skill choices at creation')),
    ).toBe(true)
    expect(allowances?.items.some((line) => line.includes('at level'))).toBe(false)
    expect(allowances?.items.some((line) => line.match(/Espionage —/))).toBe(true)
    assertSectionOrder(occSectionIds(summary.sections), OCC_PACKAGE_SECTION_ORDER)

    const wp = summary.sections.find((s) => s.id === 'occ-wp')
    expect(wp?.items.length).toBeGreaterThan(0)
  })

  it('includes race heading when a race is selected', () => {
    const human = getRaceById('race_human')
    const summary = buildConfiguratorPackageSummary(human, undefined, null)
    expect(summary.sections.find((s) => s.id === 'race-heading')?.title).toBe('Human')
  })

  it('lists Recognize the Supernatural for Pandora Project Researcher', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_pandora_project_researcher')
    const summary = buildConfiguratorPackageSummary(human, occ, null)
    const abilities = summary.sections.find((s) => s.id === 'occ-special-abilities')
    expect(abilities?.items.some((line) => line.includes('Recognize the Supernatural'))).toBe(
      true,
    )
  })

  it('lists anti-supernatural training for Team Epsilon Inner Circle', () => {
    const human = getRaceById('race_human')
    const occ = getLibraryOccById('occ_team_epsilon_trooper')
    const summary = buildConfiguratorPackageSummary(human, occ, 'occ_epsilon_inner_circle')
    const abilities = summary.sections.find((s) => s.id === 'occ-special-abilities')
    expect(abilities?.items.some((line) => line.includes('Anti-Supernatural'))).toBe(true)
    expect(abilities?.items.some((line) => line.includes('Combat Bonuses'))).toBe(true)
  })

  it('groups I.S.P. and psionic picks under Supernatural abilities for P.A.B. Psychic Agent', () => {
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const summary = buildConfiguratorPackageSummary(getRaceById('race_human'), occ, null)
    const supernatural = summary.sections.find((s) => s.id === 'occ-supernatural')
    expect(supernatural?.items[0]).toBe('Psionic')
    expect(supernatural?.items.some((line) => line.startsWith('I.S.P.:'))).toBe(true)
    expect(
      supernatural?.items.some((line) => line.includes('psionic power')),
    ).toBe(true)
    expect(summary.sections.find((s) => s.id === 'occ-vitals')).toBeUndefined()
  })

  it('puts S.D.C. at the top of combat bonuses for Team Epsilon Inner Circle', () => {
    const occ = getLibraryOccById('occ_team_epsilon_trooper')
    const summary = buildConfiguratorPackageSummary(
      getRaceById('race_human'),
      occ,
      'occ_epsilon_inner_circle',
    )
    const combat = summary.sections.find((s) => s.id === 'occ-combat')
    expect(combat?.items[0]).toMatch(/S\.D\.C\./)
  })

  it('shows category access for Pandora Project Researcher', () => {
    const occ = getLibraryOccById('occ_pandora_project_researcher')
    const summary = buildConfiguratorPackageSummary(getRaceById('race_human'), occ, null)
    const allowances = summary.sections.find((s) => s.id === 'occ-skill-allowances')
    expect(allowances?.items.some((line) => line.includes('Espionage —'))).toBe(true)
    expect(allowances?.items.some((line) => line.includes('Military — None'))).toBe(true)
    expect(allowances?.items.some((line) => line.includes('8 O.C.C. related'))).toBe(true)
  })

  it('loads P.A.B. Field Agent from Between the Shadows', () => {
    const occ = getLibraryOccById('occ_pab_field_agent')
    expect(occ?.name).toBe('P.A.B. Field Agent')
    const summary = buildConfiguratorPackageSummary(getRaceById('race_human'), occ, null)
    const abilities = summary.sections.find((s) => s.id === 'occ-special-abilities')
    expect(abilities?.items.some((line) => line.includes('Anti-Supernatural'))).toBe(true)
    const core = summary.sections.find((s) => s.id === 'occ-core-skills')
    expect(core?.items.some((line) => line.includes('Lore: Nightbane'))).toBe(true)
    const nonCombat = summary.sections.find((s) => s.id === 'occ-non-combat')
    expect(nonCombat?.items.some((line) => line.includes('Perception'))).toBe(true)
    const combat = summary.sections.find((s) => s.id === 'occ-combat')
    expect(combat?.items.some((line) => line.includes('Perception'))).toBe(false)
  })
})
