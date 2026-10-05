/**
 * Join-table projected character name helpers.
 * Peers read {@link GmSeat.projectedCharacterName}; GM Hub keeps canonical
 * `character.name` from party.snapshot JSON / party observer.
 */

import { resolveTableProjectedName } from '../characterAliases'
import type { Character } from '../../types'
import type { GmSeat } from './sessionPresence'

/** Canonical name for GM Hub / history / At-the-table cards. */
export function resolveGmCanonicalCharacterName(
  characterJson: unknown,
  fallbackId?: string,
): string {
  const json = characterJson as { name?: unknown } | null
  if (json && typeof json.name === 'string' && json.name.trim()) {
    return json.name.trim()
  }
  return (fallbackId ?? 'Character').trim() || 'Character'
}

/**
 * Peer-facing name from a party.snapshot payload.
 * Uses aliases + tableProjectedAliasId on the save; falls back to real name.
 */
export function resolveProjectedNameFromSnapshot(
  characterJson: unknown,
): string {
  const json = characterJson as Partial<Character> | null
  if (!json || typeof json !== 'object') return 'Unnamed'
  return resolveTableProjectedName({
    name: typeof json.name === 'string' ? json.name : '',
    aliases: Array.isArray(json.aliases) ? json.aliases : [],
    tableProjectedAliasId:
      typeof json.tableProjectedAliasId === 'string' ||
      json.tableProjectedAliasId === null
        ? json.tableProjectedAliasId
        : null,
  })
}

/** Peer-facing label from a presence seat (after party.snapshot attach). */
export function peerFacingCharacterName(seat: Pick<GmSeat, 'projectedCharacterName' | 'characterId'>): string | null {
  if (!seat.characterId) return null
  const projected = seat.projectedCharacterName?.trim()
  if (projected) return projected
  return seat.characterId
}
