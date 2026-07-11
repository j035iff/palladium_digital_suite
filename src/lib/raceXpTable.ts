import type { OccXpTableId, Race } from '../types'

const HUMAN_EQUIVALENT_XP_TABLE: OccXpTableId = 'nightbane_core_doppleganger'

function readRaceMetadataXpTableId(race: Race): string | undefined {
  const meta = race.innateBonuses?.metadata
  if (!meta || typeof meta !== 'object') return undefined
  const xpTableId = (meta as Record<string, unknown>).xpTableId
  return typeof xpTableId === 'string' && xpTableId.trim() ? xpTableId.trim() : undefined
}

/**
 * XP progression table for a race (Nightbane core p. 233 human column = Doppleganger table).
 * Prefer `innateBonuses.metadata.xpTableId` when the race row defines one.
 */
export function raceXpTableId(race: Race | undefined): OccXpTableId {
  if (!race) return HUMAN_EQUIVALENT_XP_TABLE
  const fromMeta = readRaceMetadataXpTableId(race)
  if (fromMeta) return fromMeta
  if (race.id === 'race_human') return HUMAN_EQUIVALENT_XP_TABLE
  return HUMAN_EQUIVALENT_XP_TABLE
}
