import { describe, expect, it } from 'vitest'
import {
  insertContentLink,
  isGmContentLinkKind,
  parseContentLinkAt,
  segmentContentLinks,
  serializeContentLink,
} from './contentLinks'

describe('contentLinks', () => {
  it('serializes structured refs', () => {
    expect(
      serializeContentLink({
        kind: 'npc',
        id: 'npc_1',
        label: 'Mira',
      }),
    ).toBe('[[npc:npc_1|Mira]]')
  })

  it('parses a link at an index', () => {
    const text = 'See [[place:place_1|Dock]] tonight.'
    const parsed = parseContentLinkAt(text, 4)
    expect(parsed?.ref).toEqual({
      kind: 'place',
      id: 'place_1',
      label: 'Dock',
    })
    expect(parsed?.endIndex).toBe(text.indexOf(' tonight'))
  })

  it('segments mixed scratchpad text', () => {
    const segments = segmentContentLinks(
      'Meet [[person:person_1|Kai]] at [[place:place_2|Pier]].',
    )
    expect(segments).toEqual([
      { type: 'text', text: 'Meet ' },
      {
        type: 'link',
        raw: '[[person:person_1|Kai]]',
        ref: { kind: 'person', id: 'person_1', label: 'Kai' },
      },
      { type: 'text', text: ' at ' },
      {
        type: 'link',
        raw: '[[place:place_2|Pier]]',
        ref: { kind: 'place', id: 'place_2', label: 'Pier' },
      },
      { type: 'text', text: '.' },
    ])
  })

  it('leaves unknown kinds as plain text', () => {
    const segments = segmentContentLinks('[[plot:x|Nope]]')
    expect(segments).toEqual([{ type: 'text', text: '[[plot:x|Nope]]' }])
    expect(isGmContentLinkKind('plot')).toBe(false)
  })

  it('inserts over a selection using the selection as label when needed', () => {
    const result = insertContentLink(
      'Talk to Mira later',
      { kind: 'npc', id: 'npc_9', label: '' },
      { start: 8, end: 12 },
    )
    expect(result.text).toBe('Talk to [[npc:npc_9|Mira]] later')
  })
})
