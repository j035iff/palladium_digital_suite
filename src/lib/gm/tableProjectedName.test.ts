import { describe, expect, it } from 'vitest'
import {
  peerFacingCharacterName,
  resolveGmCanonicalCharacterName,
  resolveProjectedNameFromSnapshot,
} from './tableProjectedName'
import { seatOverlayLines } from './hubTableChrome'

describe('tableProjectedName', () => {
  it('keeps GM canonical name on real character.name', () => {
    expect(
      resolveGmCanonicalCharacterName({
        name: 'Rook',
        aliases: [{ id: 'a1', name: 'Crow' }],
        tableProjectedAliasId: 'a1',
      }),
    ).toBe('Rook')
  })

  it('resolves peer projection from snapshot aliases', () => {
    expect(
      resolveProjectedNameFromSnapshot({
        name: 'Rook',
        aliases: [{ id: 'a1', name: 'Crow' }],
        tableProjectedAliasId: 'a1',
      }),
    ).toBe('Crow')
    expect(
      resolveProjectedNameFromSnapshot({
        name: 'Rook',
        aliases: [{ id: 'a1', name: 'Crow' }],
        tableProjectedAliasId: null,
      }),
    ).toBe('Rook')
  })

  it('peer roster uses seat projection; GM map wins when provided', () => {
    const seat = {
      displayName: 'Ada',
      characterId: 'char_1',
      projectedCharacterName: 'Crow',
    }
    expect(peerFacingCharacterName(seat)).toBe('Crow')
    expect(seatOverlayLines(seat)).toEqual({
      playerLine: 'Ada',
      characterLine: 'Crow',
    })
    expect(seatOverlayLines(seat, { char_1: 'Rook' })).toEqual({
      playerLine: 'Ada',
      characterLine: 'Rook',
    })
  })
})
