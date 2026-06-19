import { describe, expect, it } from 'vitest'
import { getLibraryOccById, getRaceById } from '../data/library/registry'
import {
  buildConfiguratorPackageSummary,
  OCC_PACKAGE_SECTION_ORDER,
  packageItemText,
} from './configuratorPackageSummary'

function sectionItemTexts(
  section: { items: readonly { kind?: string; text?: string; label?: string; detail?: string }[] | readonly string[] } | undefined,
): string[] {
  return (section?.items ?? []).map((item) =>
    typeof item === 'string' ? item : packageItemText(item),
  )
}

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
    expect(sectionItemTexts(core).some((line) => line.includes('Intelligence'))).toBe(true)
    expect(sectionItemTexts(core).some((line) => line.includes('W.P. of choice'))).toBe(true)

    const allowances = summary.sections.find((s) => s.id === 'occ-skill-allowances')
    expect(
      sectionItemTexts(allowances).some((line) =>
        line.includes('6 O.C.C. related skill choices at creation'),
      ),
    ).toBe(true)
    expect(sectionItemTexts(allowances).some((line) => line.includes('at level'))).toBe(false)
    expect(sectionItemTexts(allowances).some((line) => line.match(/Espionage —/))).toBe(true)
    assertSectionOrder(occSectionIds(summary.sections), OCC_PACKAGE_SECTION_ORDER)

    const wp = summary.sections.find((s) => s.id === 'occ-wp')
    expect(wp?.items.length).toBeGreaterThan(0)
  })

  it('includes race heading when a race is selected', () => {
    const human = getRaceById('race_human')
    const summary = buildConfiguratorPackageSummary(human, undefined, null)
    expect(summary.sections.find((s) => s.id === 'race-heading')?.title).toBe('Human')
  })

  it('shows N/A for race supernatural abilities when the race grants none', () => {
    const human = getRaceById('race_human')
    const summary = buildConfiguratorPackageSummary(human, undefined, null)
    const supernatural = summary.sections.find((s) => s.id === 'race-supernatural')
    expect(supernatural?.items).toEqual(['N/A'])
    expect(supernatural?.items.some((line) => line.includes('P.P.E.'))).toBe(false)
  })

  it('groups racial hit points and S.D.C. under Vitals', () => {
    const human = getRaceById('race_human')
    const summary = buildConfiguratorPackageSummary(human, undefined, null)
    const vitals = summary.sections.find((s) => s.id === 'race-vitals')
    expect(vitals?.title).toBe('Vitals')
    expect(vitals?.items).toContain('H.P.: PE + 1D6')
    expect(vitals?.items).toContain('S.D.C.: Per OCC and Skills')
    expect(summary.sections.find((s) => s.id === 'race-bonuses')?.items).toEqual(['N/A'])
  })

  it('lists racial saves and other bonuses together under Bonuses', () => {
    const nightbane = getRaceById('race_nightbane')
    const summary = buildConfiguratorPackageSummary(nightbane, undefined, null)
    const bonuses = summary.sections.find((s) => s.id === 'race-bonuses')
    expect(bonuses?.title).toBe('Bonuses')
    const lines = sectionItemTexts(bonuses)
    expect(lines.some((line) => line.includes('Save vs magic'))).toBe(true)
    expect(lines.some((line) => line.includes('Save vs disease'))).toBe(true)
    expect(summary.sections.find((s) => s.id === 'race-combat')).toBeUndefined()
    expect(summary.sections.find((s) => s.id === 'race-non-combat')).toBeUndefined()
  })

  it('shows fixed racial S.D.C. when the race specifies a flat value', () => {
    const nightbane = getRaceById('race_nightbane')
    const summary = buildConfiguratorPackageSummary(nightbane, undefined, null)
    const vitals = summary.sections.find((s) => s.id === 'race-vitals')
    expect(vitals?.items).toContain('S.D.C.: 30')
  })

  it('shows N/A for Nightbane race supernatural abilities instead of P.P.E.', () => {
    const nightbane = getRaceById('race_nightbane')
    const summary = buildConfiguratorPackageSummary(nightbane, undefined, null)
    const supernatural = summary.sections.find((s) => s.id === 'race-supernatural')
    expect(supernatural?.items).toEqual(['N/A'])
    expect(supernatural?.items.some((line) => line.includes('P.P.E.'))).toBe(false)
  })

  it('lists innate psionics for supernatural races', () => {
    const guardian = getRaceById('race_guardian')
    const summary = buildConfiguratorPackageSummary(guardian, undefined, null)
    const supernatural = summary.sections.find((s) => s.id === 'race-supernatural')
    expect(supernatural?.items[0]).toBe('Psionic')
    expect(supernatural?.items.some((line) => line.startsWith('I.S.P.:'))).toBe(true)
    expect(supernatural?.items.some((line) => line.includes('P.P.E.'))).toBe(false)
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
    const lines = sectionItemTexts(abilities)
    expect(lines.some((line) => line.includes('Anti-Supernatural'))).toBe(true)
    expect(lines.some((line) => line.includes('Combat Bonuses'))).toBe(false)
    expect(lines.some((line) => line.includes('Physical Bonuses'))).toBe(false)
  })

  it('shows N/A for Psychic P.C.C. specialized abilities when only class boilerplate is present', () => {
    const occ = getLibraryOccById('occ_psychic_pcc')
    const summary = buildConfiguratorPackageSummary(getRaceById('race_human'), occ, null)
    const abilities = summary.sections.find((s) => s.id === 'occ-special-abilities')
    expect(sectionItemTexts(abilities)).toEqual(['N/A'])
  })

  it('lists Psychic P.C.C. granted psionics and picks without spell or default rule noise', () => {
    const occ = getLibraryOccById('occ_psychic_pcc')
    const summary = buildConfiguratorPackageSummary(getRaceById('race_human'), occ, null)
    const supernatural = summary.sections.find((s) => s.id === 'occ-supernatural')
    const lines = sectionItemTexts(supernatural)
    expect(packageItemText(supernatural!.items[0])).toBe('Psionic')
    expect(lines).toContain('Abilities at 1st Level')
    expect(lines).toContain('See Aura')
    expect(lines).toContain('Sense Evil')
    expect(lines).toContain('Meditation')
    expect(lines).toContain('Presence Sense')
    expect(lines).toContain('Choice of: 2 Sensitive; 2 Physical; 2 Healing')
    expect(lines).toContain(
      'Additional psionic per level: 1 from any mix of Sensitive, Physical, Healing',
    )
    expect(lines.some((line) => line.includes('spell'))).toBe(false)
    expect(lines.some((line) => line.includes('Ley line'))).toBe(false)
    expect(lines.some((line) => line.includes('Meditation:'))).toBe(false)
    expect(lines.some((line) => line.includes('Psychic APM'))).toBe(false)
    expect(lines.some((line) => line.includes('Magic'))).toBe(false)
    expect(lines.some((line) => line.includes('+ 1 from'))).toBe(false)
  })

  it('groups I.S.P. and psionic picks under Supernatural abilities for P.A.B. Psychic Agent', () => {
    const occ = getLibraryOccById('occ_pab_psychic_agent')
    const summary = buildConfiguratorPackageSummary(getRaceById('race_human'), occ, null)
    const supernatural = summary.sections.find((s) => s.id === 'occ-supernatural')
    const lines = sectionItemTexts(supernatural)
    expect(packageItemText(supernatural!.items[0])).toBe('Psionic')
    expect(lines.some((line) => line.startsWith('I.S.P.:'))).toBe(true)
    expect(lines).toContain('Abilities at 1st Level')
    expect(lines.some((line) => line.startsWith('Choice of:'))).toBe(true)
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
