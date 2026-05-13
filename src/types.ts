/**
 * Palladium Digital Suite — core sheet types.
 * Grounded in docs/srs.md (Total Reconfiguration) and docs/combat_logic.md (scaling + P.S. tiers).
 */

/** Facade vs Morphus toggle drives which FormState is authoritative for mechanical values. */
export type ActiveForm = 'facade' | 'morphus'

/**
 * Damage / durability scaling tier (docs/combat_logic.md §1).
 * Drives UI treatment: S.D.C./H.P. vs M.D.C. (100× rule, invulnerability flags at runtime).
 */
export type DamageScalingMode = 'sdc_hp' | 'mdc'

/**
 * P.S. power tier for Megaversal carry bonuses and damage logic (docs/combat_logic.md §2).
 */
export type PhysicalStrengthTier =
  | 'standard'
  | 'augmented'
  | 'robotic'
  | 'supernatural'

/** I.Q., M.E., M.A., P.P., P.E., P.B., Spd. — scalar attributes. */
export type ScalarAttributeKey =
  | 'iq'
  | 'me'
  | 'ma'
  | 'pp'
  | 'pe'
  | 'pb'
  | 'spd'

export type ScalarAttributes = Record<ScalarAttributeKey, number>

/**
 * P.S. bundles score + tier so the engine can apply the correct damage and carry multiples.
 */
export type PhysicalStrengthStat = {
  score: number
  tier: PhysicalStrengthTier
}

/**
 * All eight attributes: seven scalars plus structured P.S.
 */
export type CharacterAttributes = ScalarAttributes & {
  ps: PhysicalStrengthStat
}

/**
 * Hit Points or structural pools tagged with S.D.C./H.P. vs M.D.C. scaling for the Vitality Header.
 */
export type VitalityPool = {
  current: number
  maximum: number
  scaling: DamageScalingMode
}

export type SheetSkill = {
  id: string
  name: string
  /** When true, skill is shown but unusable (docs/vision.md Pillar 8). */
  restricted: boolean
  /** Shown in UI / tooltip — cite gating from docs/skill_selection.md */
  restrictionReason?: string
}

/**
 * Per-form mechanical layer: swaps on Facade ↔ Morphus (docs/srs.md §1).
 * Shared across forms: only XP and PPE on Character.
 */
export type FormState = {
  attributes: CharacterAttributes
  hitPoints: VitalityPool
  structuralDamageCapacity: VitalityPool
  alignment: string
  skills: SheetSkill[]
  /** ISP can differ by form; PPE remains on Character. */
  isp: { current: number; maximum: number }
}

export type Character = {
  name: string
  level: number
  /** Shared — does not swap with form (docs/srs.md §1). */
  xp: number
  /** Shared — does not swap with form (docs/srs.md §1). */
  ppe: { current: number; maximum: number }
  facade: FormState
  morphus: FormState
}

export function getFormState(
  character: Character,
  activeForm: ActiveForm,
): FormState {
  return activeForm === 'facade' ? character.facade : character.morphus
}
