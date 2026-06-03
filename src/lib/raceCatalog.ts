import { isWhitelistedForHostGenre } from './genreGating'
import type { Race } from '../types'

export type RaceAudience = 'player' | 'npc' | 'gm_approval'

/** Default pool file when `raceAudience` is omitted on a row (authoring safety). */
export const RACE_POOL_FILE_AUDIENCE: Readonly<Record<string, RaceAudience>> = {
  'player.json': 'player',
  'npc.json': 'npc',
  'gm_approval.json': 'gm_approval',
}

export function normalizeRaceAudience(
  row: Race,
  poolAudience: RaceAudience,
): RaceAudience {
  return row.raceAudience ?? poolAudience
}

/** Player character creation — standard selectable races. */
export function isPlayerRacePool(race: Race): boolean {
  return race.raceAudience === 'player'
}

/** Bestiary / enemy stat blocks — not offered in player creation. */
export function isNpcRacePool(race: Race): boolean {
  return race.raceAudience === 'npc'
}

/** Requires explicit GM approval before a player may select (future UX hook). */
export function isGmApprovalRacePool(race: Race): boolean {
  return race.raceAudience === 'gm_approval'
}

export function raceAllowedInCharacterCreation(
  race: Race,
  hostGenreId: string,
): boolean {
  if (!isPlayerRacePool(race)) return false
  return isWhitelistedForHostGenre(race, hostGenreId)
}

export function listRacesForCharacterCreation(
  registry: readonly Race[],
  hostGenreId: string,
): readonly Race[] {
  return registry
    .filter((r) => raceAllowedInCharacterCreation(r, hostGenreId))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function listNpcRaces(
  registry: readonly Race[],
  hostGenreId: string,
): readonly Race[] {
  return registry
    .filter((r) => isNpcRacePool(r) && isWhitelistedForHostGenre(r, hostGenreId))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function listGmApprovalRaces(
  registry: readonly Race[],
  hostGenreId: string,
): readonly Race[] {
  return registry
    .filter(
      (r) => isGmApprovalRacePool(r) && isWhitelistedForHostGenre(r, hostGenreId),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}
