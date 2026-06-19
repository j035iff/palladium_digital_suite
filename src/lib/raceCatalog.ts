import type { CatalogRace } from '../data/library/raceCatalogLoader'
import { isWhitelistedForHostGenre } from './genreGating'
import type { Race } from '../types'

export function raceCatalogGenreId(
  hostGenreId?: string | null,
  creationGenreId?: string | null,
): string {
  return (hostGenreId ?? creationGenreId ?? 'nightbane').toLowerCase()
}

export type RaceAudience = 'player' | 'npc' | 'gm_approval' | 'creature'

/** Default pool file when `raceAudience` is omitted on a row (authoring safety). */
export const RACE_POOL_FILE_AUDIENCE: Readonly<Record<string, RaceAudience>> = {
  'player.json': 'player',
  'npc.json': 'npc',
  'gm_approval.json': 'gm_approval',
  'creatures.json': 'creature',
}

export function normalizeRaceAudience(
  row: Race,
  poolAudience: RaceAudience,
): RaceAudience {
  return row.raceAudience ?? poolAudience
}

function matchesHostGenre(
  race: Race | CatalogRace,
  hostGenreId: string,
): boolean {
  const genre = hostGenreId.toLowerCase()
  if ('catalogGenreId' in race && race.catalogGenreId) {
    return race.catalogGenreId === genre
  }
  return isWhitelistedForHostGenre(race, hostGenreId)
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

/** Non-sentient animals and monsters — `creatures.json` pool only. */
export function isCreatureRacePool(race: Race): boolean {
  return race.raceAudience === 'creature'
}

export function raceAllowedInCharacterCreation(
  race: Race | CatalogRace,
  hostGenreId: string,
): boolean {
  if (!isPlayerRacePool(race)) return false
  return matchesHostGenre(race, hostGenreId)
}

export function listRacesForCharacterCreation(
  registry: readonly (Race | CatalogRace)[],
  hostGenreId: string,
): readonly Race[] {
  return registry
    .filter((r) => raceAllowedInCharacterCreation(r, hostGenreId))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function listNpcRaces(
  registry: readonly (Race | CatalogRace)[],
  hostGenreId: string,
): readonly Race[] {
  return registry
    .filter((r) => isNpcRacePool(r) && matchesHostGenre(r, hostGenreId))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function listGmApprovalRaces(
  registry: readonly (Race | CatalogRace)[],
  hostGenreId: string,
): readonly Race[] {
  return registry
    .filter(
      (r) => isGmApprovalRacePool(r) && matchesHostGenre(r, hostGenreId),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function listCreatureRaces(
  registry: readonly (Race | CatalogRace)[],
  hostGenreId: string,
): readonly Race[] {
  return registry
    .filter((r) => isCreatureRacePool(r) && matchesHostGenre(r, hostGenreId))
    .sort((a, b) => a.name.localeCompare(b.name))
}
