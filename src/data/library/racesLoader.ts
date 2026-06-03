import type { Race } from '../../types'
import { PALLADIUM_RACE_CATALOG } from './raceCatalogLoader'

/** Full race catalog — merged from `content/races/*.json` pools. */
export function loadRacesFromJson(): Race[] {
  return [...PALLADIUM_RACE_CATALOG]
}
