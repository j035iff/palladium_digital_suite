import type { Race } from '../../types'
import palladiumRaces from '../content/palladiumRaces.json'

/** Race / R.C.C. catalog — top-level array in `src/data/content/palladiumRaces.json`. */
export function loadRacesFromJson(): Race[] {
  return Array.isArray(palladiumRaces) ? (palladiumRaces as Race[]) : []
}
