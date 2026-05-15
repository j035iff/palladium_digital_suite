import type { Race } from './types'
import racesBundle from './races.json'

type RacesFile = { races: unknown[] }

export function loadRacesFromJson(): Race[] {
  const data = racesBundle as RacesFile
  return Array.isArray(data.races) ? (data.races as Race[]) : []
}
