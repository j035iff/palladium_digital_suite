import { describe, expect, it } from 'vitest'
import {
  addCharacterAlias,
  coerceTableProjectedAliasId,
  listTableProjectionOptions,
  normalizeAliases,
  removeCharacterAlias,
  renameCharacterAlias,
  resolveTableProjectedName,
  TABLE_PROJECTED_REAL_NAME_ID,
} from './characterAliases'

describe('characterAliases', () => {
  it('normalizes and CRUD aliases', () => {
    expect(normalizeAliases(undefined)).toEqual([])
    expect(normalizeAliases([{ id: 'a1', name: '  Shadow  ' }])).toEqual([
      { id: 'a1', name: 'Shadow' },
    ])
    expect(normalizeAliases([{ id: '', name: 'x' } as never])).toEqual([])

    const added = addCharacterAlias([], 'Nightblade', 'a1')
    expect(added).toEqual([{ id: 'a1', name: 'Nightblade' }])
    expect(addCharacterAlias(added, '   ')).toEqual(added)

    const renamed = renameCharacterAlias(added, 'a1', 'Blade')
    expect(renamed[0]?.name).toBe('Blade')
    expect(removeCharacterAlias(renamed, 'a1')).toEqual([])
  })

  it('resolves table projected name with real-name default', () => {
    const character = {
      name: 'Rook',
      aliases: [{ id: 'a1', name: 'Crow' }],
      tableProjectedAliasId: null as string | null,
    }
    expect(resolveTableProjectedName(character)).toBe('Rook')
    expect(
      resolveTableProjectedName(character, TABLE_PROJECTED_REAL_NAME_ID),
    ).toBe('Rook')
    expect(resolveTableProjectedName(character, 'a1')).toBe('Crow')
    expect(resolveTableProjectedName(character, 'missing')).toBe('Rook')
  })

  it('lists join picker options and coerces stale projection ids', () => {
    const options = listTableProjectionOptions({
      name: 'Rook',
      aliases: [{ id: 'a1', name: 'Crow' }],
    })
    expect(options[0]).toMatchObject({
      id: TABLE_PROJECTED_REAL_NAME_ID,
      isRealName: true,
      label: 'Rook',
    })
    expect(options[1]).toMatchObject({ id: 'a1', label: 'Crow', isRealName: false })

    expect(coerceTableProjectedAliasId([{ id: 'a1', name: 'Crow' }], 'a1')).toBe(
      'a1',
    )
    expect(coerceTableProjectedAliasId([{ id: 'a1', name: 'Crow' }], 'gone')).toBe(
      null,
    )
  })
})
