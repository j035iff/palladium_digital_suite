/**
 * Campaign PC history — unique spawned characters that have sat at this
 * campaign’s table. Persists on `GmSessionRecord` (localStorage only).
 * Summaries rebuild via {@link buildPartyObserverSlice} (Unified Path).
 */

import type { CharacterRootState } from '../../types'
import type { GmCampaignPcHistoryEntry, GmSessionRecord } from './sessionTypes'

function touch(session: GmSessionRecord): GmSessionRecord {
  return { ...session, updatedAtMs: Date.now() }
}

function isCharacterRootish(value: unknown): value is CharacterRootState {
  if (value == null || typeof value !== 'object') return false
  const row = value as Partial<CharacterRootState>
  return (
    typeof row.id === 'string' &&
    typeof row.creationGenreId === 'string' &&
    typeof row.hostGenreId === 'string'
  )
}

/** Review & Spawn complete — drafts may sit at the table but never enter history. */
export function isSpawnedCharacterJson(value: unknown): boolean {
  return isCharacterRootish(value) && value.isFinalized === true
}

export function emptyCampaignPcHistory(): GmCampaignPcHistoryEntry[] {
  return []
}

function isHistoryEntry(value: unknown): value is GmCampaignPcHistoryEntry {
  if (value == null || typeof value !== 'object') return false
  const row = value as Partial<GmCampaignPcHistoryEntry>
  return (
    typeof row.characterId === 'string' &&
    typeof row.characterName === 'string' &&
    typeof row.lastSeenAtMs === 'number' &&
    typeof row.gmComment === 'string' &&
    isCharacterRootish(row.characterJson)
  )
}

/** Older campaign saves may omit history — default []. */
export function hydrateCampaignPcHistory(
  session: GmSessionRecord,
): GmSessionRecord {
  const raw = (session as GmSessionRecord & { campaignPcHistory?: unknown })
    .campaignPcHistory
  const campaignPcHistory = Array.isArray(raw)
    ? (raw as unknown[]).filter(isHistoryEntry)
    : []
  return { ...session, campaignPcHistory }
}

export function findCampaignPcHistoryEntry(
  session: GmSessionRecord,
  characterId: string,
): GmCampaignPcHistoryEntry | undefined {
  return (session.campaignPcHistory ?? []).find(
    (row) => row.characterId === characterId,
  )
}

/**
 * Upsert latest snapshot for a spawned character that joined this campaign.
 * Preserves existing `gmComment`. No-op for drafts / non-finalized JSON.
 */
export function upsertCampaignPcHistory(
  session: GmSessionRecord,
  input: {
    characterId: string
    characterJson: unknown
    playerLabel?: string | null
    lastSeenAtMs?: number
  },
): GmSessionRecord {
  if (!isSpawnedCharacterJson(input.characterJson)) return session
  const characterJson = input.characterJson
  const characterId = input.characterId.trim() || characterJson.id
  if (!characterId) return session
  const characterName =
    typeof characterJson.name === 'string' && characterJson.name.trim()
      ? characterJson.name.trim()
      : characterId
  const lastSeenAtMs = input.lastSeenAtMs ?? Date.now()
  const playerLabel =
    typeof input.playerLabel === 'string' && input.playerLabel.trim()
      ? input.playerLabel.trim()
      : null
  const existing = findCampaignPcHistoryEntry(session, characterId)
  const nextEntry: GmCampaignPcHistoryEntry = {
    characterId,
    characterName,
    playerLabel: playerLabel ?? existing?.playerLabel ?? null,
    lastSeenAtMs,
    gmComment: existing?.gmComment ?? '',
    characterJson,
  }
  const without = (session.campaignPcHistory ?? []).filter(
    (row) => row.characterId !== characterId,
  )
  return touch({
    ...session,
    campaignPcHistory: [nextEntry, ...without],
  })
}

export function setCampaignPcHistoryComment(
  session: GmSessionRecord,
  characterId: string,
  gmComment: string,
): GmSessionRecord {
  const rows = session.campaignPcHistory ?? []
  if (!rows.some((row) => row.characterId === characterId)) return session
  return touch({
    ...session,
    campaignPcHistory: rows.map((row) =>
      row.characterId === characterId
        ? { ...row, gmComment }
        : row,
    ),
  })
}

/** Removes the history row only — does not affect live seats or character saves. */
export function deleteCampaignPcHistoryEntry(
  session: GmSessionRecord,
  characterId: string,
): GmSessionRecord {
  const rows = session.campaignPcHistory ?? []
  if (!rows.some((row) => row.characterId === characterId)) return session
  return touch({
    ...session,
    campaignPcHistory: rows.filter((row) => row.characterId !== characterId),
  })
}

/** Dropdown label: character name; player name secondary when known. */
export function campaignPcHistoryOptionLabel(
  entry: GmCampaignPcHistoryEntry,
): string {
  const name = entry.characterName.trim() || entry.characterId
  if (entry.playerLabel?.trim()) {
    return `${name} (${entry.playerLabel.trim()})`
  }
  return name
}
