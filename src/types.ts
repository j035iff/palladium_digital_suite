/**
 * Palladium Digital Suite — core sheet types.
 * Grounded in docs/srs.md (Total Reconfiguration) and docs/combat_logic.md (scaling + P.S. tiers).
 */

/** Facade vs Morphus toggle drives which FormState is authoritative for mechanical values. */
export type ActiveForm = 'facade' | 'morphus'

/** Psychic Gate tier (psychic_gate.md). */
export type PsychicTier = 'none' | 'minor' | 'major' | 'master'

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
  /**
   * O.C.C. / picked skill base % on d100 (skill engine). When omitted, Quick Roll uses a neutral sheet default.
   */
  basePercent?: number
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

/**
 * Cumulative XP thresholds for sheet levels 1..LEVEL_CAP (see src/data/xpTables.ts).
 * {@link floors}[i] is the minimum lifetime XP required to **be** level i + 1 (index 0 → level 1 at 0 XP).
 */
export type XPTable = {
  readonly floors: readonly number[]
}

/**
 * O.C.C. / R.C.C. package bound to the character — progression uses {@link xpTable} only (no separate xp kind).
 */
export type CharacterOcc = {
  id: string
  name: string
  xpTable: XPTable
  /** Psychic-class O.C.C.s lock the Psychic Gate (psychic_gate.md). */
  category: 'psychic' | 'standard'
}

/** Logged XP award for Identity header history (Pillar 6). */
export type XpGainEvent = {
  id: string
  amount: number
  label: string
  atMs: number
}

export type Character = {
  name: string
  /**
   * Character tier (1..15). Sheet level; ritual modal advances this when XP thresholds are met
   * (master_flow.md progression).
   */
  level: number
  /**
   * Lifetime cumulative experience points. Governs earned tier vs {@link level} until level-up
   * rituals are resolved (xpTables.ts).
   */
  xp: number
  /** Shared — does not swap with form (docs/srs.md §1). */
  ppe: { current: number; maximum: number }
  /** O.C.C. / R.C.C. package: display name, psychic lock, and fixed XP thresholds. */
  occ: CharacterOcc
  /**
   * When true, the Psychic Gate step is bypassed for setting integrity (e.g. Nightbane; psychic_gate.md §1).
   */
  psychicGateBypassed?: boolean
  /** O.C.C. skill pick budget (creation; skill_selection.md). */
  occSkillSlotBudget?: number
  /** O.C.C. related skill pick budget before psychic tax (psychic_gate.md §2). */
  occRelatedSkillSlotBudget?: number
  /**
   * Creation / Step 4: picked supernatural ability ids (sn_abilities_selection.md).
   * Persisted via localStorage for refresh survival.
   */
  selectedAbilities?: string[]
  /**
   * O.C.C. supernatural pick budgets for creation (e.g. spells known cap).
   */
  creationAbilityBudget?: {
    spellSlots: number
    psionicSlots: number
    talentSlots: number
  }
  /** Starting spell level ceiling (Pillar 8 — higher spell levels locked/hidden). */
  startingSpellLevelCap?: number
  /** Nightbane lineage drives Talent cost UI (P.P.E. + activation). */
  lineage?: 'nightbane' | 'megaversal'
  /** After Spawn — creation chrome hidden; persisted (character_creation.md §5). */
  isFinalized?: boolean
  /** Spawn panel: player committed rolled H.P./S.D.C./P.P.E./I.S.P. */
  creationVitalityCommitted?: boolean
  /** Step 3 — O.C.C. skill ids chosen in Skill Engine (mirrors sheet at Spawn). */
  creationOccSkillIds?: string[]
  /** Step 3 — O.C.C. related skill ids. */
  creationRelatedSkillIds?: string[]
  facade: FormState
  morphus: FormState
}

/** Live combat — active melee-duration powers (combat_logic.md §3). */
export type ActiveMeleeDuration = {
  abilityId: string
  roundsRemaining: number
}

export type AttacksPerMeleeState = {
  current: number
  max: number
}

/** Carried object — weight drives encumbrance (attribute_and_stat.md §4). */
export interface Item {
  id: string
  name: string
  weightLbs: number
  itemType: 'gear' | 'armor' | 'weapon'
}

/**
 * Body armor with A.R. and armor S.D.C. track (Armory + combat HUD A.R. gate).
 * {@link morphusCompatible}: when false, Morphus bulk exceeds Facade-fit gear (Total Reconfiguration sizing).
 * At {@link currentSdc} 0 the suit is **Ruined** — no A.R. gate; replace to regain protection (combat_logic.md).
 */
export interface Armor extends Item {
  itemType: 'armor'
  /** Armor Rating — attack totals below this route damage to {@link currentSdc} first. */
  ar: number
  maxSdc: number
  currentSdc: number
  /** Exactly one carried armor may be true; mirrors equipped selection in {@link CharacterContext}. */
  isEquipped: boolean
  morphusCompatible: boolean
  /** Human / Facade silhouette — warn in Morphus (tight or restricted fit; Pillar 7). */
  humanSized?: boolean
}

/**
 * Carried weapon — strike card + optional magazine (combat_logic.md, master_flow.md).
 */
export interface Weapon extends Item {
  itemType: 'weapon'
  /** e.g. "Handguns", "Swords", "Heavy" */
  category: string
  /** Intrinsic weapon strike modifier on d20. */
  strikeBonus: number
  /** Damage dice string (e.g. "2d6", "1d4+2"). */
  damage: string
  /** Magazine / battery — ranged only; melee weapons omit. */
  payload?: { current: number; max: number }
  /**
   * Spare ammo category for reload (defaults to {@link category}).
   * Maps to {@link CharacterContext} `ammoPools` (Handguns, Rifles, …).
   */
  ammoPoolKey?: string
  /** If set and unlocked on the sheet, W.P. skill % feeds the strike engine. */
  linkedWpSkillId?: string
  /** True when assigned to primary or secondary combat slot. */
  isEquipped: boolean
}

export interface GearItem extends Item {
  itemType: 'gear'
}

export type InventoryItem = GearItem | Armor | Weapon

/** Pillar 6 — vitality header pulse; combat HUD uses {@link CombatHudDamagePulse} for armor vs body hits. */
export type VitalityFlashKind = 'none' | 'damage' | 'heal'

/** High-contrast pulse on Tactical HUD after S.D.C. damage routing (A.R. gate). */
export type CombatHudDamagePulse = 'none' | 'armor' | 'body' | 'split'

/** Pillar 6 — tactical narrative / console line (reload failures, etc.). */
export type CombatNarrativeEntry = {
  id: string
  message: string
  atMs: number
  tone?: 'info' | 'failure' | 'success'
}

export type CombatVitalityChange = {
  pool: 'hitPoints' | 'structuralDamageCapacity'
  amount: number
  mode: 'damage' | 'heal'
  /** For damage only — Mega-Damage tag vs S.D.C. scaling (combat_logic.md §1). */
  damageScale: 'sdc' | 'md'
}

export function getFormState(
  character: Character,
  activeForm: ActiveForm,
): FormState {
  return activeForm === 'facade' ? character.facade : character.morphus
}
