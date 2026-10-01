/**
 * Placeholder entity store for Notes content links (v1).
 * Stub rows so navigation works before full People/Places/Things CRUD.
 */

import { createGmId } from './sessionId'
import {
  GM_CONTENT_LINK_KINDS,
  type GmContentLinkKind,
} from './contentLinks'
import type { GmPlaceholderEntity, GmSessionRecord } from './sessionTypes'

export type { GmPlaceholderEntity }

export function emptyPlaceholders(): GmPlaceholderEntity[] {
  return []
}

export function hydratePlaceholders(
  session: GmSessionRecord,
): GmSessionRecord {
  const raw = (session as GmSessionRecord & {
    placeholders?: unknown
  }).placeholders
  const placeholders = Array.isArray(raw)
    ? (raw as GmPlaceholderEntity[]).filter(isPlaceholderEntity)
    : []
  return { ...session, placeholders }
}

function isPlaceholderEntity(value: unknown): value is GmPlaceholderEntity {
  if (value == null || typeof value !== 'object') return false
  const row = value as Partial<GmPlaceholderEntity>
  return (
    typeof row.id === 'string' &&
    typeof row.kind === 'string' &&
    typeof row.name === 'string' &&
    typeof row.notes === 'string' &&
    typeof row.createdAtMs === 'number'
  )
}

export function createPlaceholderEntity(input: {
  kind: GmContentLinkKind
  name: string
  notes?: string
  linkedNpcId?: string
}): GmPlaceholderEntity {
  const name = input.name.trim() || 'Untitled'
  return {
    id: createGmId(input.kind),
    kind: input.kind,
    name,
    notes: input.notes?.trim() ?? '',
    linkedNpcId: input.linkedNpcId,
    createdAtMs: Date.now(),
  }
}

export function addPlaceholder(
  session: GmSessionRecord,
  entity: GmPlaceholderEntity,
): GmSessionRecord {
  const current = hydratePlaceholders(session)
  if (current.placeholders.some((row) => row.id === entity.id)) {
    return current
  }
  return {
    ...current,
    placeholders: [entity, ...current.placeholders],
    updatedAtMs: Date.now(),
  }
}

export function patchPlaceholder(
  session: GmSessionRecord,
  id: string,
  patch: Partial<Pick<GmPlaceholderEntity, 'name' | 'notes' | 'linkedNpcId'>>,
): GmSessionRecord {
  const current = hydratePlaceholders(session)
  let changed = false
  const placeholders = current.placeholders.map((row) => {
    if (row.id !== id) return row
    changed = true
    return {
      ...row,
      ...patch,
      name: patch.name != null ? patch.name.trim() || row.name : row.name,
      notes: patch.notes != null ? patch.notes : row.notes,
    }
  })
  if (!changed) return current
  return { ...current, placeholders, updatedAtMs: Date.now() }
}

export function removePlaceholder(
  session: GmSessionRecord,
  id: string,
): GmSessionRecord {
  const current = hydratePlaceholders(session)
  const placeholders = current.placeholders.filter((row) => row.id !== id)
  if (placeholders.length === current.placeholders.length) return current
  return { ...current, placeholders, updatedAtMs: Date.now() }
}

export function placeholdersOfKind(
  session: GmSessionRecord,
  kind: GmContentLinkKind,
): GmPlaceholderEntity[] {
  return hydratePlaceholders(session).placeholders.filter(
    (row) => row.kind === kind,
  )
}

export function findPlaceholder(
  session: GmSessionRecord,
  kind: GmContentLinkKind,
  id: string,
): GmPlaceholderEntity | undefined {
  return hydratePlaceholders(session).placeholders.find(
    (row) => row.kind === kind && row.id === id,
  )
}

export type GmResolvedContentTarget =
  | {
      status: 'ok'
      kind: GmContentLinkKind
      id: string
      name: string
      source: 'placeholder' | 'npc' | 'pc'
    }
  | {
      status: 'missing'
      kind: GmContentLinkKind
      id: string
      label: string
      reason: string
    }

/**
 * Resolve a Notes link against placeholders + live NPCs / party PCs.
 */
export function resolveContentLinkTarget(
  session: GmSessionRecord,
  kind: GmContentLinkKind,
  id: string,
  label: string,
  opts: { partyNamesById?: ReadonlyMap<string, string> } = {},
): GmResolvedContentTarget {
  const stub = findPlaceholder(session, kind, id)
  if (stub) {
    return {
      status: 'ok',
      kind,
      id: stub.id,
      name: stub.name,
      source: 'placeholder',
    }
  }

  if (kind === 'npc') {
    const npc = session.npcs.find((row) => row.instanceId === id)
    if (npc) {
      return {
        status: 'ok',
        kind: 'npc',
        id: npc.instanceId,
        name: npc.displayName,
        source: 'npc',
      }
    }
  }

  if (kind === 'pc') {
    if (session.partyCharacterIds.includes(id)) {
      const name = opts.partyNamesById?.get(id) ?? label
      return {
        status: 'ok',
        kind: 'pc',
        id,
        name,
        source: 'pc',
      }
    }
  }

  const kindLabel =
    kind === 'npc'
      ? 'NPC'
      : kind === 'pc'
        ? 'PC'
        : kind.charAt(0).toUpperCase() + kind.slice(1)
  return {
    status: 'missing',
    kind,
    id,
    label: label.trim() || id,
    reason: `No ${kindLabel} “${label.trim() || id}” on this campaign — target missing or deleted.`,
  }
}

export type GmLinkableEntityHit = {
  kind: GmContentLinkKind
  id: string
  name: string
  source: 'placeholder' | 'npc' | 'pc'
}

/** Case-insensitive name search across placeholders (+ live NPCs/PCs for those kinds). */
export function searchLinkableEntities(
  session: GmSessionRecord,
  kind: GmContentLinkKind,
  query: string,
  opts: {
    partyNamesById?: ReadonlyMap<string, string>
  } = {},
): Array<{ id: string; name: string; source: 'placeholder' | 'npc' | 'pc' }> {
  const q = query.trim().toLowerCase()
  const rows: Array<{
    id: string
    name: string
    source: 'placeholder' | 'npc' | 'pc'
  }> = []

  for (const stub of placeholdersOfKind(session, kind)) {
    if (!q || stub.name.toLowerCase().includes(q)) {
      rows.push({ id: stub.id, name: stub.name, source: 'placeholder' })
    }
  }

  if (kind === 'npc') {
    for (const npc of session.npcs) {
      if (rows.some((row) => row.id === npc.instanceId)) continue
      if (!q || npc.displayName.toLowerCase().includes(q)) {
        rows.push({
          id: npc.instanceId,
          name: npc.displayName,
          source: 'npc',
        })
      }
    }
  }

  if (kind === 'pc') {
    for (const characterId of session.partyCharacterIds) {
      if (rows.some((row) => row.id === characterId)) continue
      const name = opts.partyNamesById?.get(characterId) ?? characterId
      if (!q || name.toLowerCase().includes(q)) {
        rows.push({ id: characterId, name, source: 'pc' })
      }
    }
  }

  return rows
}

/**
 * Cross-kind search for `@` mention typeahead (Pillar 9 — one pipeline).
 * Prefers names that start with the query, then includes substring hits.
 */
export function searchAllLinkableEntities(
  session: GmSessionRecord,
  query: string,
  opts: {
    partyNamesById?: ReadonlyMap<string, string>
    kinds?: readonly GmContentLinkKind[]
    limit?: number
  } = {},
): GmLinkableEntityHit[] {
  const kinds = opts.kinds ?? GM_CONTENT_LINK_KINDS
  const limit = opts.limit ?? 40
  const q = query.trim().toLowerCase()
  const hits: GmLinkableEntityHit[] = []

  for (const kind of kinds) {
    for (const row of searchLinkableEntities(session, kind, query, opts)) {
      hits.push({ kind, id: row.id, name: row.name, source: row.source })
    }
  }

  hits.sort((a, b) => {
    const aName = a.name.toLowerCase()
    const bName = b.name.toLowerCase()
    const aStarts = q !== '' && aName.startsWith(q) ? 0 : 1
    const bStarts = q !== '' && bName.startsWith(q) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts
    const byName = aName.localeCompare(bName)
    if (byName !== 0) return byName
    return a.kind.localeCompare(b.kind)
  })

  return hits.slice(0, limit)
}
