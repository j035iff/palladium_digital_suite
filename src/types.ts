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

/** Universal Feature system — composition schema (skills are separate library rows; reference by id elsewhere). */
export type FeatureSystem = 'magic' | 'psionic' | 'trait' | 'skill'

export type FeatureRequirement = {
  /** Modifiers apply only while this form is active. */
  form: ActiveForm
}

export type FeatureIdentity = {
  id: string
  name: string
  description: string
  descriptionMorphus?: string
  system: FeatureSystem
}

export type FeatureActivationCost = {
  type: 'ppe' | 'isp' | 'action' | 'other'
  value: number | string
}

export type FeatureActivation = {
  cost?: FeatureActivationCost
  range?: string
  duration?: string
  save?: string
}

export type FeatureModifiers = Record<string, number>

export type FeatureMetadata = Record<string, unknown>

export type Feature = {
  identity: FeatureIdentity
  activation?: FeatureActivation
  modifiers?: FeatureModifiers
  metadata?: FeatureMetadata
  /** When set, passive {@link modifiers} apply only while {@link FeatureRequirement.form} is active. */
  requirement?: FeatureRequirement
}

/**
 * Book + page citation for library catalog rows (skills, races, weapon proficiencies).
 * Matches `sources[]` on palladium-skill.schema.json and palladium-race.schema.json.
 */
export type PalladiumSourceRef = {
  gameSystem: string
  reference: string
  pageNumber: number
}

/** Physical power scale on a race / R.C.C. row (`palladium-race.schema.json`). */
export type RaceStrengthCategory =
  | 'standard'
  | 'extraordinary'
  | 'superhuman'
  | 'supernatural'

/** All eight attribute roll formulas at creation (e.g. "3D6"). */
export type RaceAttributeFormulas = Record<
  'iq' | 'me' | 'ma' | 'ps' | 'pp' | 'pe' | 'pb' | 'spd',
  string
>

export type RaceSdcConditionalConfig = {
  strategy: 'conditional_by_occ_tags'
  defaultFormula: string
  conditionalOverrides: readonly { tags: readonly string[]; formula: string }[]
}

/** Flat dice string or O.C.C.-tag conditional S.D.C. block. */
export type RaceSdcDefinition = string | RaceSdcConditionalConfig

export type RaceVitals = {
  hpFormula: string
  sdc?: RaceSdcDefinition
  /** Starting racial P.P.E. (dice notation or fixed value). */
  averageStandardPpe?: string | number
  /** @deprecated Use {@link averageStandardPpe}. */
  basePpe?: string | number
}

export type RacePsionicCapability = 'standard' | 'none' | 'innate'

export type RacePsionics = {
  capabilityType: RacePsionicCapability
  naturalIspFormula?: string
}

export type RaceOccLimitations = {
  forbiddenCategories?: readonly string[]
  forbiddenOccIds?: readonly string[]
  allowedOccIds?: readonly string[]
}

export type RaceInnateSkillGrant = {
  skillId: string
  basePercent?: number
  bonusPercent?: number
}

export type RaceInnateBonuses = {
  modifiers?: FeatureModifiers
  activation?: FeatureActivation
  metadata?: FeatureMetadata
}

export type RaceDemographicRange = {
  min: number
  max: number
  unit: string
}

export type RaceDemographics = {
  averageHeight?: string | RaceDemographicRange
  averageWeight?: string | RaceDemographicRange
  averageLifespan?: string
  alignmentTendencies?: readonly string[]
  excludedAlignments?: readonly string[]
}

/**
 * Library race / R.C.C. row in `content/palladiumRaces.json` (palladium-race.schema.json).
 */
export type Race = {
  id: string
  name: string
  description: string
  gameSystems: readonly string[]
  /** One or more book citations; use one entry per book when page numbers differ. */
  sources: readonly PalladiumSourceRef[]
  canPickOcc: boolean
  lineage?: 'nightbane' | 'megaversal'
  defaultTraitIds?: readonly string[]
  attributes: RaceAttributeFormulas
  strengthCategory: RaceStrengthCategory
  vitals: RaceVitals
  psionics: RacePsionics
  occLimitations: RaceOccLimitations
  innateSkills: readonly RaceInnateSkillGrant[]
  innateBonuses: RaceInnateBonuses
  demographics: RaceDemographics
}

/** Expandable O.C.C. grouping slug (`palladium-occ.schema.json` occType). */
export type OccTypeSlug = string

export type OccAttributeRequirements = Partial<Record<ScalarAttributeKey, number>>

export type OccAlignmentRestrictions = {
  allowed?: readonly string[]
  forbidden?: readonly string[]
}

export type OccRaceRestrictions = {
  allowed?: readonly string[]
  forbidden?: readonly string[]
}

export type OccCoreSkillGrant = {
  skillId: string
  bonusPercent: number
  basePercent?: number
}

/** Open-choice grant in the automatic core package (e.g. W.P. of choice, pick N from categories). */
export type OccCoreSkillChoiceVoucher = {
  choiceCount: number
  bonusPercent: number
  allowedCategories?: readonly string[]
  allowedSkillIds?: readonly string[]
  label?: string
}

export type OccCoreSkillEntry = OccCoreSkillGrant | OccCoreSkillChoiceVoucher

export type OccCategoryAccessType = 'any' | 'none' | 'only' | 'except'

export type OccCategoryAccessRule = {
  categoryName: string
  accessType: OccCategoryAccessType
  exceptions?: readonly string[]
  bonusPercent: number
  /** Per-skill % that supersedes {@link OccCategoryAccessRule.bonusPercent} for listed ids. */
  skillSpecificOverrides?: Readonly<Record<string, number>>
}

export type OccRelatedSkillsOverride = {
  initialSlotsCount?: number
  startingSkillIds?: readonly string[]
  categoryRules?: readonly OccCategoryAccessRule[]
}

/** Flat additive bonus or dice/formula string (e.g. `4D6+25`, `1D4`). */
export type OccStaticBonusValue = number | string

export type OccNumericBonusMap = Readonly<Record<string, OccStaticBonusValue>>

export type OccSpecialization = {
  id: string
  name: string
  description: string
  staticBonuses?: OccStaticBonuses
  /** When set, replaces baseline {@link PalladiumOcc.startingEquipment} for this branch. */
  startingEquipment?: OccStartingEquipment
  /** Field-wise override of baseline {@link PalladiumOcc.finances}. */
  finances?: OccFinances
  /** When set, replaces baseline {@link PalladiumOcc.occSkillsCore} for this branch. */
  occSkillsCore?: readonly OccCoreSkillEntry[]
  occRelatedSkills?: OccRelatedSkillsOverride
  wpRules?: OccWpRules
  handToHandRules?: OccHandToHandRules
}

export type OccRelatedSkills = {
  initialSlotsCount: number
  startingSkillIds?: readonly string[]
  categoryRules: readonly OccCategoryAccessRule[]
}

export type OccSecondarySkills = {
  initialSlotsCount: number
  forbiddenCategories: readonly string[]
}

export type OccLevelUpSkillChoice = {
  levelUnlocked: number
  quantity: number
  poolSource: 'related' | 'secondary'
}

export type OccWpRules = {
  coreWps: readonly string[]
  forbiddenWps: readonly string[]
}

export type OccHandToHandUpgradePath = {
  targetSkillId: string
  electiveSlotCost: number
}

export type OccHandToHandRules = {
  /**
   * Hand-to-Hand catalog id (`hth_none`, `hth_basic`, …) or sheet skill (`hand_to_hand_basic`, …).
   * Omitted in JSON → normalized to `hth_none`. **null** = no automatic style; player must buy a tier.
   */
  defaultSkillId: string | null
  upgradePaths: readonly OccHandToHandUpgradePath[]
}

/** Kick damage unlocked at a Hand-to-Hand level row (palladium-hth.schema.json). */
export type HandToHandKickAttack = {
  damageFormula: string
  description?: string
}

/** Body throw / flip maneuver payload at a level row. */
export type HandToHandBodyThrowFlip = {
  damageFormula: string
  effects?: readonly string[]
}

/** One incremental unlock row at a printed Hand-to-Hand level. */
export type HandToHandProgressionLevel = {
  attacks?: number
  /** Extra actions per melee — alias for {@link HandToHandProgressionLevel.attacks}. */
  apm?: number
  strike?: number
  parry?: number
  dodge?: number
  initiative?: number
  pullPunch?: number
  rollWithPunch?: number
  damage?: number
  entangle?: number
  disarm?: number
  pairedWeapons?: boolean
  kickAttack?: HandToHandKickAttack
  bodyThrowFlip?: HandToHandBodyThrowFlip
  criticalStrikeWindow?: readonly number[]
  knockoutStunWindow?: readonly number[]
  deathBlowWindow?: readonly number[]
  criticalStrikeFromBehind?: boolean
  knockoutFromBehind?: boolean
  jumpKick?: boolean
  leapAttack?: boolean
  fromBehindDamageMultiplier?: number
}

/** Authoring keys are level strings `"1"`…`"15"`; engines normalize to numeric levels. */
export type HandToHandProgressionMap = Record<string, HandToHandProgressionLevel>

/**
 * Hand-to-Hand combat skill catalog row (`content/palladiumHandToHand.json`, palladium-hth.schema.json).
 */
export type HandToHandSkill = {
  id: string
  name: string
  description: string
  /** Melee actions spent per attack maneuver; omitted styles default to 1 in engines. */
  attackApmCost?: number
  gameSystems?: readonly string[]
  sources?: readonly PalladiumSourceRef[]
  progression: HandToHandProgressionMap
}

/** Absolute combat standing after summing Hand-to-Hand levels 1…character level. */
export type AccumulatedHandToHandBonuses = {
  attacks: number
  strike: number
  parry: number
  dodge: number
  initiative: number
  pullPunch: number
  rollWithPunch: number
  damage: number
  entangle: number
  disarm: number
  pairedWeapons: boolean
  kickAttack?: HandToHandKickAttack
  bodyThrowFlip?: HandToHandBodyThrowFlip
  criticalStrikeWindow?: readonly number[]
  knockoutStunWindow?: readonly number[]
  deathBlowWindow?: readonly number[]
  criticalStrikeFromBehind: boolean
  knockoutFromBehind: boolean
  jumpKick: boolean
  leapAttack: boolean
  /** From-behind damage multiplier; baseline 2 until a level row overrides (e.g. Expert 13 → 3). */
  fromBehindDamageMultiplier: number
}

export type OccStaticBonuses = {
  attributes?: OccNumericBonusMap
  vitals?: OccNumericBonusMap
  combat?: OccNumericBonusMap
  saves?: OccNumericBonusMap
}

export type OccSupernaturalProgressionStep = {
  level: number
  selectionsGained: number
  categoryRestrictions?: readonly string[]
}

export type OccPpeEngine = {
  baseFormula: string
  perLevelFormula: string
  spellStrengthProgression?: Readonly<Record<string, number>>
  progressionRoadmap: readonly OccSupernaturalProgressionStep[]
}

export type OccIspSavingThrowClass = 'minor' | 'major' | 'master'

export type OccIspEngine = {
  baseFormula: string
  perLevelFormula: string
  savingThrowClass: OccIspSavingThrowClass
  progressionRoadmap: readonly OccSupernaturalProgressionStep[]
}

export type OccCustomAbilityEngine = {
  engineId: string
  label: string
  baseFormula?: string
  perLevelFormula?: string
  progressionRoadmap: readonly OccSupernaturalProgressionStep[]
}

export type OccStartingEquipment = {
  weapons?: readonly string[]
  armor?: readonly string[]
  miscellaneous?: readonly string[]
}

export type OccFinances = {
  startingCashFormula?: string
  blackMarketAssets?: string
}

export type OccXpTableId = 'standard' | 'psychic' | 'borg'

export type OccSkillSlotPolicy =
  | { kind: 'fixed'; multiplier: number }
  | {
      kind: 'psychic_tier'
      majorMultiplier: number
      defaultMultiplier?: number
    }

export type OccProgressionHooks = {
  xpTableId?: OccXpTableId
  characterOccCategory?: 'psychic' | 'standard'
  psychicGateBypassed?: boolean
  relatedSkillSlotPolicy?: OccSkillSlotPolicy
  occSkillSlotBudget?: number
  occRelatedSkillSlotBudget?: number
  creationAbilityBudget?: {
    spellSlots: number
    psionicSlots: number
    talentSlots: number
  }
  startingSpellLevelCap?: number
}

export type OccBaseStatsDice = {
  hpDice?: string
  sdcDice?: string
  ppeDice?: string
  ispDice?: string
}

/**
 * Library O.C.C. catalog row (`content/palladiumOccs.json`, palladium-occ.schema.json).
 * Alias: {@link OCC}.
 */
export type PalladiumOcc = {
  id: string
  name: string
  description: string
  gameSystems: readonly string[]
  sources: readonly PalladiumSourceRef[]
  occType: OccTypeSlug
  tags: readonly string[]
  attributeRequirements?: OccAttributeRequirements
  alignmentRestrictions?: OccAlignmentRestrictions
  raceRestrictions?: OccRaceRestrictions
  occSkillsCore: readonly OccCoreSkillEntry[]
  occRelatedSkills: OccRelatedSkills
  secondarySkills: OccSecondarySkills
  levelUpSkillChoices?: readonly OccLevelUpSkillChoice[]
  wpRules: OccWpRules
  handToHandRules: OccHandToHandRules
  /** Sub-class branches; selection stored on {@link Character.occSpecializationId}. */
  specializations?: readonly OccSpecialization[]
  staticBonuses?: OccStaticBonuses
  ppeEngine?: OccPpeEngine
  ispEngine?: OccIspEngine
  customAbilityEngines?: readonly OccCustomAbilityEngine[]
  startingEquipment?: OccStartingEquipment
  finances?: OccFinances
  progression?: OccProgressionHooks
  baseStats?: OccBaseStatsDice
}

/** Alias for {@link PalladiumOcc} — full O.C.C. composition document. */
export type OCC = PalladiumOcc

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
  /** Library race id — `src/data/content/palladiumRaces.json` and the race registry. */
  raceId?: string
  /**
   * When true, the Psychic Gate step is bypassed for setting integrity (e.g. Nightbane; psychic_gate.md §1).
   */
  psychicGateBypassed?: boolean
  /** O.C.C. skill pick budget (creation; skill_selection.md). */
  occSkillSlotBudget?: number
  /** O.C.C. related skill pick budget before psychic tax (psychic_gate.md §2). */
  occRelatedSkillSlotBudget?: number
  /** Selected {@link OccSpecialization.id} when the O.C.C. defines sub-class branches. */
  occSpecializationId?: string | null
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
  /** Nightbane-only: Talent costs and supernatural pick UX; mirrors `raceId` nightbane in the library. */
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
 * Ranged fire mode — ammo cost, strike penalty, optional damage scale (combat_logic.md).
 * {@link ammoCost} of -1 means empty the current magazine (Wild / full auto).
 */
export type FireMode = {
  id: string
  name: string
  /** Rounds consumed from payload; -1 = entire current magazine. */
  ammoCost: number
  strikeModifier: number
  damageMultiplier?: number
}

/**
 * Carried weapon — strike card + optional magazine (combat_logic.md, master_flow.md).
 */
export interface Weapon extends Item {
  itemType: 'weapon'
  /** e.g. "Handguns", "Swords", "Heavy" */
  category: string
  /** Sheet label for the matching weapon proficiency (e.g. "WP Sword", "W.P. Energy Pistol"). */
  wpCategory?: string
  /**
   * Per-item combat tweaks (balanced hilt +1 strike, enchanted guard +1 parry, etc.).
   * Known keys strike, parry, throw; other keys add to melee strike totals with a titled line.
   */
  weaponSpecificModifiers?: Record<string, number>
  /** Intrinsic weapon strike modifier on d20. */
  strikeBonus: number
  /** Damage dice string (e.g. "2d6", "1d4+2"). */
  damage: string
  /** Magazine / battery — ranged only; melee weapons omit. */
  payload?: { current: number; max: number }
  /** Ranged firing modes; defaults applied in HUD when omitted. */
  fireModes?: FireMode[]
  /**
   * Shared reserve pool key (e.g. "9mm", "12 Gauge", ".45 ACP").
   * Maps to {@link CharacterContext} `ammoReserves`.
   */
  ammoCategory?: string
  /** @deprecated Use {@link ammoCategory}. */
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
