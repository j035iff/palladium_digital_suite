/**
 * Structured Notes content links — `[[kind:id|label]]`.
 * Outbound only (v1). Parse/serialize stays UI-agnostic (Pillar 9).
 */

export const GM_CONTENT_LINK_KINDS = [
  'npc',
  'place',
  'thing',
  'person',
  'pc',
  'note',
] as const

export type GmContentLinkKind = (typeof GM_CONTENT_LINK_KINDS)[number]

export type GmContentLinkRef = {
  kind: GmContentLinkKind
  id: string
  label: string
}

export type GmContentLinkSegment =
  | { type: 'text'; text: string }
  | { type: 'link'; ref: GmContentLinkRef; raw: string }

const LINK_RE = /\[\[([a-z]+):([^\]|]+)\|([^\]]+)\]\]/gi

export function isGmContentLinkKind(value: string): value is GmContentLinkKind {
  return (GM_CONTENT_LINK_KINDS as readonly string[]).includes(value)
}

export function serializeContentLink(ref: GmContentLinkRef): string {
  const kind = ref.kind
  const id = ref.id.trim()
  const label = ref.label.trim() || id
  return `[[${kind}:${id}|${label}]]`
}

export function parseContentLinkAt(
  text: string,
  startIndex: number,
): { ref: GmContentLinkRef; endIndex: number } | null {
  if (text[startIndex] !== '[') return null
  const slice = text.slice(startIndex)
  const match = /^\[\[([a-z]+):([^\]|]+)\|([^\]]+)\]\]/i.exec(slice)
  if (!match) return null
  const kindRaw = match[1]!.toLowerCase()
  if (!isGmContentLinkKind(kindRaw)) return null
  return {
    ref: {
      kind: kindRaw,
      id: match[2]!.trim(),
      label: match[3]!.trim(),
    },
    endIndex: startIndex + match[0].length,
  }
}

/** Split scratchpad into plain text + structured link segments. */
export function segmentContentLinks(text: string): GmContentLinkSegment[] {
  const segments: GmContentLinkSegment[] = []
  let cursor = 0
  LINK_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = LINK_RE.exec(text)) != null) {
    const kindRaw = match[1]!.toLowerCase()
    const full = match[0]
    const start = match.index
    if (start > cursor) {
      segments.push({ type: 'text', text: text.slice(cursor, start) })
    }
    if (isGmContentLinkKind(kindRaw)) {
      segments.push({
        type: 'link',
        raw: full,
        ref: {
          kind: kindRaw,
          id: match[2]!.trim(),
          label: match[3]!.trim(),
        },
      })
    } else {
      segments.push({ type: 'text', text: full })
    }
    cursor = start + full.length
  }
  if (cursor < text.length) {
    segments.push({ type: 'text', text: text.slice(cursor) })
  }
  if (segments.length === 0) {
    segments.push({ type: 'text', text })
  }
  return segments
}

/**
 * Insert a serialized link, replacing selected range (or appending at cursor).
 */
export function insertContentLink(
  text: string,
  ref: GmContentLinkRef,
  selection: { start: number; end: number },
): { text: string; cursor: number } {
  const start = Math.max(0, Math.min(selection.start, text.length))
  const end = Math.max(start, Math.min(selection.end, text.length))
  const selected = text.slice(start, end).trim()
  const label = ref.label.trim() || selected || ref.id
  const token = serializeContentLink({ ...ref, label })
  const next = `${text.slice(0, start)}${token}${text.slice(end)}`
  return { text: next, cursor: start + token.length }
}

export function contentLinkKindLabel(kind: GmContentLinkKind): string {
  switch (kind) {
    case 'npc':
      return 'NPC'
    case 'pc':
      return 'PC'
    case 'person':
      return 'Person'
    case 'place':
      return 'Place'
    case 'thing':
      return 'Thing'
    case 'note':
      return 'Note'
  }
}
