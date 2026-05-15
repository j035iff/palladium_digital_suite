import type { CharacterOcc, PsychicTier, XPTable } from '../../types'

/** Scalar attribute roll notation on a race template (e.g. "3D6"). */
export type RaceAttributeFormulas = Partial<
  Record<'iq' | 'me' | 'ma' | 'ps' | 'pp' | 'pe' | 'pb' | 'spd', string>
>

export type RaceSdcConditionalConfig = {
  strategy: 'conditional_by_occ_tags'
  defaultFormula: string
  conditionalOverrides: readonly { tags: readonly string[]; formula: string }[]
}

/** Either a plain dice string ("3D6", "1D4*10") or a conditional O.C.C.-tag rule block. */
export type RaceSdcDefinition = string | RaceSdcConditionalConfig

export type RaceVitals = {
  basePpe?: string | number
  baseIsp?: string | number
  /** Reserved for future HP convergence (e.g. "PE + 1D6"). */
  hpFormula?: string
  /** Structural S.D.C. baseline for Facade (and shared race pool where applicable). */
  sdc?: RaceSdcDefinition
}

export type Race = {
  id: string
  name: string
  description: string
  lineage?: 'nightbane' | 'megaversal'
  defaultTraitIds?: string[]
  /** Optional rolled attribute templates for chargen / data library. */
  attributes?: RaceAttributeFormulas
  /** Vitality dice and conditional S.D.C. rules. */
  vitals?: RaceVitals
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
  /** Tags drive race vitals conditionals (e.g. military, police, athletic). */
  tags?: readonly string[]
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
