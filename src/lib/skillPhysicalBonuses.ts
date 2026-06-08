import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'

export const PHYSICAL_COMBAT_BONUS_KEYS = [
  'strike',
  'parry',
  'dodge',
  'rollWithImpact',
  'pullPunch',
  'apm',
] as const

export type PhysicalCombatBonusKey = (typeof PHYSICAL_COMBAT_BONUS_KEYS)[number]

export type PhysicalSkillCombatAgg = {
  combat: Partial<Record<PhysicalCombatBonusKey, number>>
  sources: Map<string, string[]>
}

export function aggregatePhysicalSkillCombatBonuses(
  skillIds: readonly string[],
): PhysicalSkillCombatAgg {
  const combat: Partial<Record<PhysicalCombatBonusKey, number>> = {}
  const sources = new Map<string, string[]>()

  const addSource = (bucket: string, skillName: string) => {
    const list = sources.get(bucket) ?? []
    if (!list.includes(skillName)) list.push(skillName)
    sources.set(bucket, list)
  }

  for (const skillId of skillIds) {
    const entry = getPalladiumSkillCatalogEntryById(skillId)
    const name = entry?.name ?? skillId
    const bonuses = (entry as { physicalSkillBonuses?: Record<string, unknown> })
      ?.physicalSkillBonuses
    if (!bonuses) continue

    for (const [key, raw] of Object.entries(bonuses)) {
      if (
        typeof raw === 'number' &&
        Number.isFinite(raw) &&
        (PHYSICAL_COMBAT_BONUS_KEYS as readonly string[]).includes(key)
      ) {
        const k = key as PhysicalCombatBonusKey
        combat[k] = (combat[k] ?? 0) + raw
        addSource(k, name)
      }
    }
  }

  return { combat, sources }
}
