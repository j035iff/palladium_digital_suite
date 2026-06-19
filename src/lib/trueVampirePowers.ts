import trueVampirePowersDoc from '../data/content/races/nightbane/utils/true_vampire_powers.json'
import type { OccClassAbility, Race } from '../types'

export const TRUE_VAMPIRE_POWERS_MODULE_ID = 'nightbane_true_vampire' as const

export const TRUE_VAMPIRE_RACE_IDS = [
  'race_master_vampire',
  'race_secondary_vampire',
  'race_wild_vampire',
] as const

export type TrueVampirePowersModule = {
  id: string
  name: string
  description: string
  gameSystems: readonly string[]
  sources: readonly { gameSystem: string; reference: string; pageNumber: number }[]
  excludedRaceIds: readonly string[]
  psionicGrantIds: readonly string[]
  psionicNotes?: string
  classAbilities: readonly OccClassAbility[]
}

export const TRUE_VAMPIRE_POWERS_MODULE =
  trueVampirePowersDoc as TrueVampirePowersModule

export function raceUsesTrueVampirePowersModule(race: Race): boolean {
  if (TRUE_VAMPIRE_POWERS_MODULE.excludedRaceIds.includes(race.id)) {
    return false
  }
  const moduleId = race.innateBonuses?.metadata?.trueVampirePowersModuleId
  if (moduleId === TRUE_VAMPIRE_POWERS_MODULE_ID) return true
  return (TRUE_VAMPIRE_RACE_IDS as readonly string[]).includes(race.id)
}

/** Merge shared true-vampire classAbilities after race-specific entries (dedupe by name). */
export function applyTrueVampirePowerModule(race: Race): Race {
  if (!raceUsesTrueVampirePowersModule(race)) return race

  const existing = [...(race.classAbilities ?? [])]
  const names = new Set(existing.map((entry) => entry.name))
  for (const shared of TRUE_VAMPIRE_POWERS_MODULE.classAbilities) {
    if (names.has(shared.name)) continue
    existing.push(shared)
    names.add(shared.name)
  }

  return { ...race, classAbilities: existing }
}

export function trueVampirePsionicGrantIds(): readonly string[] {
  return TRUE_VAMPIRE_POWERS_MODULE.psionicGrantIds
}
