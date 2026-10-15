/**
 * Join-table projected character name helpers.
 * Peers read {@link GmSeat.projectedCharacterName}; GM Hub keeps canonical
 * `character.name` from party.snapshot JSON / party observer.
 * Nightbane: projection follows {@link Character.presentedForm} + per-form alias lists.
 */

import {
  normalizePresentedForm,
  resolveTableProjectedName,
} from '../characterAliases'
import type { ActiveForm, Character } from '../../types'
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

function readPresentedForm(json: Partial<Character>): ActiveForm {
  const dual =
    Array.isArray(json.morphusAliases) ||
    json.presentedForm === 'morphus' ||
    json.presentedForm === 'primary' ||
    Boolean(
      json.identityProfile &&
        typeof json.identityProfile === 'object' &&
        (json.identityProfile as { morphus?: unknown }).morphus,
    )
  // Prefer explicit presentedForm; dual-form detection is soft (snapshot always stamps it).
  return normalizePresentedForm(json.presentedForm, dual || json.presentedForm === 'morphus')
}

/**
 * Peer-facing name from a party.snapshot payload.
 * Uses the presented form’s alias list + projected alias id; falls back to real name.
 */
export function resolveProjectedNameFromSnapshot(
  characterJson: unknown,
): string {
  const json = characterJson as Partial<Character> | null
  if (!json || typeof json !== 'object') return 'Unnamed'
  const form = readPresentedForm(json)
  return resolveTableProjectedName(
    {
      name: typeof json.name === 'string' ? json.name : '',
      aliases: Array.isArray(json.aliases) ? json.aliases : [],
      morphusAliases: Array.isArray(json.morphusAliases) ? json.morphusAliases : [],
      tableProjectedAliasId:
        typeof json.tableProjectedAliasId === 'string' ||
        json.tableProjectedAliasId === null
          ? json.tableProjectedAliasId
          : null,
      morphusTableProjectedAliasId:
        typeof json.morphusTableProjectedAliasId === 'string' ||
        json.morphusTableProjectedAliasId === null
          ? json.morphusTableProjectedAliasId
          : null,
      presentedForm: form,
    },
    undefined,
    form,
  )
}

/** Peer-facing label from a presence seat (after party.snapshot attach). */
export function peerFacingCharacterName(seat: Pick<GmSeat, 'projectedCharacterName' | 'characterId'>): string | null {
  if (!seat.characterId) return null
  const projected = seat.projectedCharacterName?.trim()
  if (projected) return projected
  return seat.characterId
}
