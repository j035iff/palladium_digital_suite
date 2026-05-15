import type { FeatureModifiers } from '../types'
import { getSkillById } from '../data/library/skills'

export function aggregateSkillModifiers(
  skillIds: readonly string[],
): FeatureModifiers {
  const out: FeatureModifiers = {}
  for (const id of skillIds) {
    const s = getSkillById(id)
    if (!s?.modifiers) continue
    for (const [key, val] of Object.entries(s.modifiers)) {
      out[key] = (out[key] ?? 0) + val
    }
  }
  return out
}
