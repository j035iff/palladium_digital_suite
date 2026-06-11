import { describe, expect, it } from 'vitest'
import type { PalladiumOcc, Race } from '../types'
import {
  createDefaultConfiguratorFilterRoot,
  createDefaultConfiguratorGroupFilterRoot,
  evaluateConfiguratorFilter,
  formatConfiguratorFilterExpression,
  isConfiguratorFilterActive,
  listConfiguratorBookCategories,
  newFilterGroupNode,
  newFilterNotNode,
  newFilterPredicateNode,
} from './configuratorFilterExpression'

const human: Race = {
  id: 'race_human',
  name: 'Human',
} as Race

const psychicOcc = {
  id: 'occ_psychic',
  name: 'Psychic Agent',
  tags: ['psychic', 'tactical'],
} as unknown as PalladiumOcc

const magicOcc = {
  id: 'occ_magic',
  name: 'Sorcerer',
  tags: ['magic', 'combat'],
} as unknown as PalladiumOcc

const assassinOcc = {
  id: 'occ_ada_assassin_specialist',
  name: 'Assassination Specialist',
  tags: ['assassin', 'tactical'],
} as unknown as PalladiumOcc

describe('configuratorFilterExpression', () => {
  it('evaluates (psychic OR magic) AND combat for O.C.C. context', () => {
    const expr = newFilterGroupNode('and', [
      newFilterGroupNode('or', [
        newFilterPredicateNode('occ', 'psychic'),
        newFilterPredicateNode('occ', 'magic'),
      ]),
      newFilterPredicateNode('occ', 'combat'),
    ])
    expect(formatConfiguratorFilterExpression(expr)).toBe(
      '(OCC: psychic OR OCC: magic) AND OCC: combat',
    )
    expect(evaluateConfiguratorFilter({ occ: magicOcc }, expr)).toBe(true)
    expect(evaluateConfiguratorFilter({ occ: psychicOcc }, expr)).toBe(false)
  })

  it('evaluates Race: Human AND OCC: assassin against matrix context', () => {
    const expr = newFilterGroupNode('and', [
      newFilterPredicateNode('race', 'race_human'),
      newFilterPredicateNode('occ', 'assassin'),
    ])
    expect(
      formatConfiguratorFilterExpression(expr, {
        raceLabelById: new Map([['race_human', 'Human']]),
      }),
    ).toBe('Race: Human AND OCC: assassin')

    expect(
      evaluateConfiguratorFilter({ race: human, occ: assassinOcc }, expr),
    ).toBe(true)
    expect(
      evaluateConfiguratorFilter({ race: human, occ: psychicOcc }, expr),
    ).toBe(false)
    expect(
      evaluateConfiguratorFilter({ race: human, occ: magicOcc }, expr),
    ).toBe(false)
  })

  it('passes race predicates when race is absent from context', () => {
    const expr = newFilterPredicateNode('race', 'race_human')
    expect(evaluateConfiguratorFilter({ occ: assassinOcc }, expr)).toBe(true)
  })

  it('evaluates NOT psychic', () => {
    const expr = newFilterNotNode(newFilterPredicateNode('occ', 'psychic'))
    expect(evaluateConfiguratorFilter({ occ: psychicOcc }, expr)).toBe(false)
    expect(evaluateConfiguratorFilter({ occ: magicOcc }, expr)).toBe(true)
  })

  it('treats empty root as inactive', () => {
    const empty = newFilterGroupNode('and', [])
    expect(isConfiguratorFilterActive(empty)).toBe(false)
    expect(evaluateConfiguratorFilter({ occ: psychicOcc }, empty)).toBe(true)
  })

  it('evaluates Book: Between the Shadows against catalog sources', () => {
    const human: Race = {
      id: 'race_human',
      name: 'Human',
      sources: [{ gameSystem: 'nightbane', reference: 'Nightbane RPG', pageNumber: 24 }],
    } as Race
    const btsOcc = {
      id: 'occ_bts',
      name: 'BtS Agent',
      sources: [
        { gameSystem: 'nightbane', reference: 'Between the Shadows', pageNumber: 30 },
      ],
    } as unknown as PalladiumOcc
    const coreOcc = {
      id: 'occ_core',
      name: 'Core Agent',
      sources: [{ gameSystem: 'nightbane', reference: 'Nightbane RPG', pageNumber: 90 }],
    } as unknown as PalladiumOcc
    const expr = newFilterPredicateNode('book', 'between_the_shadows')

    expect(evaluateConfiguratorFilter({ occ: btsOcc }, expr)).toBe(true)
    expect(evaluateConfiguratorFilter({ occ: coreOcc }, expr)).toBe(false)
    expect(
      evaluateConfiguratorFilter(
        { race: human, occ: btsOcc, focus: 'occ' },
        expr,
      ),
    ).toBe(true)
    expect(
      evaluateConfiguratorFilter(
        { race: human, occ: btsOcc, focus: 'race' },
        expr,
      ),
    ).toBe(false)
    expect(
      evaluateConfiguratorFilter(
        { race: human, occ: coreOcc, focus: 'occ' },
        expr,
      ),
    ).toBe(false)
  })

  it('lists unique book categories from pool sources', () => {
    const books = listConfiguratorBookCategories([
      {
        sources: [{ gameSystem: 'nightbane', reference: 'Between the Shadows', pageNumber: 1 }],
      },
      {
        sources: [
          { gameSystem: 'nightbane', reference: 'Between the Shadows (WB1)', pageNumber: 2 },
        ],
      },
      {
        sources: [{ gameSystem: 'nightbane', reference: 'Nightbane RPG', pageNumber: 3 }],
      },
    ])
    expect(books.map((b) => b.label).sort()).toEqual([
      'Between the Shadows',
      'Nightbane RPG',
    ])
  })

  it('creates a default editable root', () => {
    const root = createDefaultConfiguratorFilterRoot()
    expect(root.kind).toBe('group')
    expect(isConfiguratorFilterActive(root)).toBe(false)
  })

  it('creates a default group filter root with nested OR group', () => {
    const root = createDefaultConfiguratorGroupFilterRoot()
    expect(root.kind).toBe('group')
    expect(root.kind === 'group' && root.children[0]?.kind).toBe('group')
    expect(
      root.kind === 'group' && root.children[0]?.kind === 'group'
        ? root.children[0].op
        : null,
    ).toBe('or')
    expect(isConfiguratorFilterActive(root)).toBe(false)
  })
})
