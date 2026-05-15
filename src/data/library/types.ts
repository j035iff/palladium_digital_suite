import type { CharacterOcc, PsychicTier, XPTable } from '../../types'

export type Race = {
  id: string
  name: string
  description: string
  lineage?: 'nightbane' | 'megaversal'
  defaultTraitIds?: string[]
}

export type OccSkillSlotPolicy =
  | { kind: 'fixed'; multiplier: number }
  | {
      kind: 'psychic_tier'
      majorMultiplier: number
      defaultMultiplier?: number
    }

export type LibraryOCC = {
  id: string
  name: string
  xpTableId: 'standard' | 'psychic' | 'borg'
  category: CharacterOcc['category']
  skillSlotPolicy: OccSkillSlotPolicy
  baseStats: {
    hpDice: string
    sdcDice: string
    ppeDice?: string
    ispDice?: string
  }
  startingOccSkillIds: string[]
  startingRelatedSkillIds: string[]
  occSkillSlotBudget?: number
  occRelatedSkillSlotBudget?: number
  creationAbilityBudget?: {
    spellSlots: number
    psionicSlots: number
    talentSlots: number
  }
  startingSpellLevelCap?: number
  psychicGateBypassed?: boolean
}

export function resolveSkillSlotMultiplier(
  policy: OccSkillSlotPolicy,
  psychicTier: PsychicTier,
): number {
  if (policy.kind === 'fixed') return policy.multiplier
  if (psychicTier === 'major') return policy.majorMultiplier
  return policy.defaultMultiplier ?? 1
}

export function snapshotLibraryOcc(
  def: LibraryOCC,
  xpTable: XPTable,
): CharacterOcc {
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    xpTable: { floors: [...xpTable.floors] },
  }
}
