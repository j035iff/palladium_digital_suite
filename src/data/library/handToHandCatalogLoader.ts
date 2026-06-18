import type { HandToHandSkill } from '../../types'
import handToHandCatalog from '../content/skills/hand_to_hand.json'

function loadHandToHandCatalog(): readonly HandToHandSkill[] {
  const rows = handToHandCatalog as unknown
  return Array.isArray(rows) ? (rows as HandToHandSkill[]) : []
}

/** Hand-to-Hand catalog — top-level array in `src/data/content/skills/hand_to_hand.json`. */
export const HAND_TO_HAND_CATALOG: readonly HandToHandSkill[] = loadHandToHandCatalog()

export function getHandToHandSkillById(id: string): HandToHandSkill | undefined {
  return HAND_TO_HAND_CATALOG.find((s) => s.id === id)
}

export function listHandToHandSkillIds(): readonly string[] {
  return HAND_TO_HAND_CATALOG.map((s) => s.id)
}

export function listHandToHandSkillsForGameSystem(
  gameSystem: string,
): readonly HandToHandSkill[] {
  const g = gameSystem.toLowerCase()
  return HAND_TO_HAND_CATALOG.filter(
    (s) => !s.gameSystems?.length || s.gameSystems.some((x) => x.toLowerCase() === g),
  )
}
