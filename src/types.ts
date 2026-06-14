/**
 * Palladium Digital Suite — core sheet types.
 * Grounded in docs/srs.md (Total Reconfiguration) and docs/combat_logic.md (scaling + P.S. tiers).
 */

import type { CreationPhase } from './lib/creationStep'
import type { ForgeAttrKey } from './lib/attributeKeys'
import type { CreationHandToHandTier } from './lib/creationHandToHandChoice'

/** Facade vs Morphus toggle drives which FormState is authoritative for mechanical values. */
export type ActiveForm = 'facade' | 'morphus'

/** Psychic Gate tier (psychic_gate.md). */
export type PsychicTier = 'none' | 'minor' | 'major' | 'master'

/** Major Psychic Gate: 8 from one pool vs 6 mixed across Sensitive/Physical/Healing. */
export type PsychicGateMajorAllocation = 'single_pool' | 'mixed_pools'

/** Character Creation Forge tabs (forge-character_creation.md). */
export type CharacterCreationForgeTabId =
  | 'tab1_configurator'
  | 'tab2_attributes'
  | 'tab3_psionic'
  | 'tab4_skills'
  | 'tab5_finalize'
  | 'tab6_traits'
  | 'tab7_abilities'
  | 'tab8_review'

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
 * Nightbane Core Rulebook P.S. scale (pp. 34–35) — Facade human vs Morphus supernatural.
 * Resolved from sheet {@link PhysicalStrengthStat.tier} and P.S. score at runtime.
 */
export type StrengthCategory = 'standard' | 'extraordinary' | 'supernatural'

/** One row of the supernatural hand-to-hand damage grid (page 35). */
export type SupernaturalDamageTableRow = {
  minPs: number
  /** Omitted on the final row — matches any P.S. at or above {@link minPs}. */
  maxPs?: number
  restrained: string
  full: string
  power: string
}

/** Catalog keys for {@link supernatural_strength.json} `baseThrowRanges`. */
export type ThrowObjectKind =
  | 'half_pound_object'
  | 'dart'
  | 'throwing_axe'
  | 'javelin'
  | 'spear'
  | 'knife'
  | 'sword'

export type WeaponThrowRangeEntry = {
  objectKind: ThrowObjectKind
  label: string
  rangeFeet: number
}

/** Standard / extraordinary: additive P.S. bonus on 1D3 unarmed. */
export type StandardHandToHandDamageProfile = {
  kind: 'standard'
  attributeDamageBonus: number
  unarmedDamageNotation: string
}

/** Supernatural: dice from damage table (power punch costs {@link powerPunchMeleeActions} APM). */
export type SupernaturalHandToHandDamageProfile = {
  kind: 'supernatural'
  restrainedPunch: string
  fullStrengthPunch: string
  powerPunch: string
  powerPunchMeleeActions: 2
}

export type HandToHandDamageProfile =
  | StandardHandToHandDamageProfile
  | SupernaturalHandToHandDamageProfile

/**
 * P.S.-derived capacities and throw ranges for the active form (Nightbane RPG pp. 34–35).
 */
export type StrengthCapacities = {
  strengthCategory: StrengthCategory
  carryingCapacityLbs: number
  liftingCapacityLbs: number
  /** Max distance (feet) a carried-weight object can be thrown. */
  maxWeightThrowDistanceFeet: number
  weaponThrowRanges: readonly WeaponThrowRangeEntry[]
  handToHandDamage: HandToHandDamageProfile
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
  type: 'ppe' | 'isp' | 'action' | 'other' | 'none'
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
 * Matches `sources[]` on palladium-skill, palladium-race, palladium-occ, and palladium-morphus schemas.
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

/** Which catalog pool owns this row (`content/races/*.json`). */
export type RaceAudience = 'player' | 'npc' | 'gm_approval'

/**
 * Library race / R.C.C. row in `content/races/*.json` (palladium-race.schema.json).
 */
export type Race = {
  id: string
  name: string
  description: string
  /** player = creation UI; npc = bestiary only; gm_approval = GM sign-off required. */
  raceAudience: RaceAudience
  /** Host-genre whitelist (falls back to {@link gameSystems} when omitted in JSON). */
  genresAvailable?: readonly string[]
  gameSystems: readonly string[]
  /** One or more book citations; use one entry per book when page numbers differ. */
  sources: readonly PalladiumSourceRef[]
  canPickOcc: boolean
  /**
   * Shadow O.C.C. — when {@link canPickOcc} is false, auto-mount this O.C.C. id for skills.
   */
  forcedOccId?: string
  lineage?: 'nightbane' | 'megaversal'
  /** When set, master forge Tab 6 hosts this sub-forge manifest (e.g. `morphus_forge_manifest`). */
  creationSubForgeId?: string
  defaultTraitIds?: readonly string[]
  attributes: RaceAttributeFormulas
  strengthCategory: RaceStrengthCategory
  vitals: RaceVitals
  psionics: RacePsionics
  occLimitations: RaceOccLimitations
  innateSkills: readonly RaceInnateSkillGrant[]
  innateBonuses: RaceInnateBonuses
  /** Racial or R.C.C. abilities not modeled as catalog skills. */
  classAbilities?: readonly OccClassAbility[]
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

/** Ancient vs modern weapon proficiency era (W.P. catalog split). */
export type WeaponProficiencyEra = 'ancient' | 'modern'

/** Open-choice grant in the automatic core package (e.g. W.P. of choice, pick N from categories). */
export type OccCoreSkillChoiceVoucher = {
  choiceCount: number
  bonusPercent: number
  allowedCategories?: readonly string[]
  allowedSkillIds?: readonly string[]
  /** Trait ids from skill_trait_registry.json (membership in skill_trait_lists/*.txt). */
  allowedSkillTraits?: readonly string[]
  label?: string
  /**
   * When set on a Weapon Proficiencies voucher, restricts picks to that era
   * (e.g. "Select any Modern Weapon Proficiency"). Omit to let the player choose.
   */
  weaponProficiencyEra?: WeaponProficiencyEra
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
  /** Related/secondary slots consumed per pick (default 1). Not professional-quality tiering. */
  selectionSlotCost?: number
  /** Per-skill slot costs overriding {@link OccCategoryAccessRule.selectionSlotCost}. */
  skillSpecificSelectionSlotCosts?: Readonly<Record<string, number>>
}

export type OccRelatedSkillCategoryMinimum = {
  categoryName: string
  minimumCount: number
  label?: string
}

export type OccRelatedSkillsOverride = {
  initialSlotsCount?: number
  startingSkillIds?: readonly string[]
  categoryRules?: readonly OccCategoryAccessRule[]
  categoryMinimums?: readonly OccRelatedSkillCategoryMinimum[]
}

/** Flat additive bonus or dice/formula string (e.g. `4D6+25`, `1D4`). */
export type OccStaticBonusValue = number | string

export type OccNumericBonusMap = Readonly<Record<string, OccStaticBonusValue>>

/** O.C.C.- or R.C.C.-unique ability not represented as a catalog skill (e.g. Recognize the Supernatural). */
export type OccClassAbilityPercentileProfile = {
  basePercent: number
  perLevelPercent: number
  skillId?: string
}

/** O.C.C.- or R.C.C.-unique ability not represented as a catalog skill (e.g. Recognize the Supernatural). */
export type OccClassAbility = {
  name: string
  description: string
  /** Structured percentile ability when the book gives base % + per-level growth. */
  percentileProfile?: OccClassAbilityPercentileProfile
}

export type OccSpecialization = {
  id: string
  name: string
  description: string
  staticBonuses?: OccStaticBonuses
  /** Branch-specific class abilities merged after baseline {@link PalladiumOcc.classAbilities}. */
  classAbilities?: readonly OccClassAbility[]
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
  /** Mandatory related-skill picks from specific categories (e.g. two Science). */
  categoryMinimums?: readonly OccRelatedSkillCategoryMinimum[]
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
  /** When set, tier is only selectable when alignment satisfies these rules. */
  alignmentRestrictions?: OccAlignmentRestrictions
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

export type TalentFormRequirement = 'morphus' | 'facade' | 'either'

export type TalentTier =
  | 'common'
  | 'elite'
  | 'uncommon'
  | 'rare'
  | 'very_rare'

export type TalentUsableInNightbaneForm =
  | 'morphus_only'
  | 'facade_only'
  | 'either_form'
  | 'both_forms_note_special'

export type TalentPpeEconomy = {
  permanentBurnToAcquire?: number | string
  baseActivation?: number | string | Record<string, unknown>
  notes?: string
  enhancement?: Record<string, unknown>
  activationTiers?: readonly Record<string, unknown>[]
}

export type TalentLimitations = {
  usableInNightbaneForm?: TalentUsableInNightbaneForm
  minimumCharacterLevelToAcquire?: number
  cannotAffect?: readonly string[]
  otherLimitations?: string
}

export type TalentRangeEntry = {
  summary: string
  kind?: string
  distanceValue?: number | string
  distanceUnit?: string
  distancePerLevel?: number
  lineOfSightRequired?: boolean
}

export type TalentDurationBlock = {
  summary?: string
  kind?: string
  durationValue?: number | string
  value?: number | string
}

export type TalentPrerequisite = {
  type: 'talent' | 'attribute_minimum' | 'level_minimum' | 'other_talent_any_of'
  talentId?: string
  talentIds?: readonly string[]
  attribute?: keyof CharacterAttributes
  minimum?: number
  level?: number
  label?: string
}

export type MagicKind =
  | 'invocation'
  | 'ritual'
  | 'ward'
  | 'circle'
  | 'enchantment'
  | 'summoning'
  | 'necromancy'
  | 'fleshsculpting'
  | 'other'

export type MagicPpeEconomy = {
  baseActivation?: number | string | Record<string, unknown>
  perLevel?: number | string
  perMinute?: number | string
  perTarget?: number | string
  notes?: string
  dynamicCosts?: readonly { trigger: string; costFormula: string }[]
  enhancement?: Record<string, unknown>
}

export type MagicLimitations = {
  selfOnly?: boolean
  cannotAffectSelf?: boolean
  lineOfSightRequired?: boolean
  lineOfVisionRequired?: boolean
  touchRequired?: boolean
  concentrationRequired?: boolean
  cancellableAtWill?: boolean
  cannotUseWhile?: readonly string[]
  otherLimitations?: string
}

export type MagicRangeEntry = {
  summary: string
  kind?: string
  distanceValue?: number | string
  distanceUnit?: string
  distancePerLevel?: number
  radiusValue?: number | string
}

export type MagicDurationBlock = {
  summary?: string
  kind?: string
  durationValue?: number | string
  perLevel?: string
}

export type MagicGenrePlacement = {
  genreId: string
  spellLevel?: number
  ppe?: MagicPpeEconomy
  notes?: string
}

export type MagicPrerequisite = {
  type:
    | 'spell'
    | 'attribute_minimum'
    | 'level_minimum'
    | 'other_spell_any_of'
    | 'occ'
    | 'other'
  spellId?: string
  spellIds?: readonly string[]
  attribute?: keyof CharacterAttributes
  minimum?: number
  level?: number
  label?: string
}

export type MorphusTablePrerequisites = {
  morphusTableIds?: readonly string[]
}

export type MorphusTableKind = 'category_hub' | 'morphus_trait_table'

export type MorphusTableSubtableRef = {
  id: string
  name: string
  tableFile: string
}

/** Flat, dice, or percent adjustment to any numeric metric. */
export type MorphusPolymorphicModifier = {
  flat?: number
  dice?: string
  percent?: number
  /**
   * When true, the resolver replaces the underlying base value entirely
   * instead of additive stacking.
   */
  isOverride?: boolean
  /** Conditional tier notes (e.g. floating balloon count penalties). */
  variableScaleConditions?: readonly string[]
}

export type MorphusNaturalWeaponLimbType =
  | 'claws'
  | 'pincers'
  | 'talons'
  | 'bite'
  | 'tail'
  | 'kick'
  | 'stomp'
  | 'head_butt'
  | 'beak'
  | 'misc_limbs'

export type MorphusPoisonProfile = {
  saveType: 'poison' | 'gas'
  failDamageFormula: string
  passDamageFormula: string
}

export type MorphusWeaponTrait =
  | 'indestructible'
  | 'disarm_immune'
  | 'infinite_ammo'
  | 'auto_returning'

export type MorphusWeaponDamageModifier = {
  percent?: number
  flat?: number
}

export type MorphusWeaponActivationResourceType = 'hp' | 'sdc' | 'ppe' | 'isp'

export type MorphusWeaponActivationCost = {
  resourceType: MorphusWeaponActivationResourceType
  value: number
}

export type MorphusNaturalWeapon = {
  limbType: MorphusNaturalWeaponLimbType
  label?: string
  damageFormula: string
  isAdditiveToHth: boolean
  reachFeet?: number
  weaponTraits?: readonly MorphusWeaponTrait[]
  damageModifier?: MorphusWeaponDamageModifier
  activationCost?: MorphusWeaponActivationCost
  poison?: MorphusPoisonProfile
}

export type MorphusGimmickRegenerationRule =
  | 'hourly'
  | 'daily'
  | 'per_24_hours'
  | 'per_transformation'

export type MorphusGimmickTraitFlag =
  | 'infinite_ammo'
  | 'fragile'
  | 'auto_returning'

export type MorphusGimmickInventoryItem = {
  /** Slug referenced by {@link MorphusSubTraitChoicesBudget.allowedChoicesPool}. */
  id?: string
  itemName: string
  sdc: number
  usageLimit?: number
  /** Dice formula for consumable count (e.g. 1D6+2). */
  usageLimitFormula?: string
  regenerationRule?: MorphusGimmickRegenerationRule
  effectFormula: string
  components?: readonly MorphusLimbDurability[]
  statModifiers?: MorphusStatModifiers
  skillGrants?: readonly MorphusSkillOverride[]
  traitFlags?: readonly MorphusGimmickTraitFlag[]
  activationCost?: MorphusWeaponActivationCost
  rangeFeet?: number
  customOneOffs?: readonly string[]
}

export type MorphusDisabledNaturalAttackTag =
  | 'kick'
  | 'bite'
  | 'head_butt'
  | 'tail'
  | 'claws'

export type MorphusLimbDestructionConditionOverrides = {
  statModifiers?: MorphusStatModifiers
  damageAffinities?: MorphusDamageAffinities
}

export type MorphusLimbDurability = {
  limbName: string
  quantity: MorphusPolymorphicModifier
  sdc: MorphusPolymorphicModifier
  hp?: MorphusPolymorphicModifier
  ar?: number
  calledShotPenalty?: number
  requiresCalledShot?: boolean
  destructionConditionOverrides?: MorphusLimbDestructionConditionOverrides
}

export type MorphusActivatedAbilityResetPeriod =
  | 'hourly'
  | 'daily'
  | 'per_encounter'

export type MorphusActivatedAbility = {
  abilityName: string
  chargesPerPeriod: number
  resetPeriod: MorphusActivatedAbilityResetPeriod
  durationFormula: string
  statModifiers?: MorphusStatModifiers
}

export type MorphusCombatInterceptAction =
  | 'parry_shadow_darkness'
  | 'parry_lasers_light'
  | 'bare_handed_melee_parry'
  | 'catch_intercept_projectiles'

export type MorphusSpecialCombatInterception = {
  interceptAction: MorphusCombatInterceptAction
  modifierFlat: number
}

export type MorphusStatModifiers = {
  iq?: MorphusPolymorphicModifier
  me?: MorphusPolymorphicModifier
  ma?: MorphusPolymorphicModifier
  ps?: MorphusPolymorphicModifier
  pp?: MorphusPolymorphicModifier
  pe?: MorphusPolymorphicModifier
  pb?: MorphusPolymorphicModifier
  spd?: MorphusPolymorphicModifier
  sdc?: MorphusPolymorphicModifier
  hp?: MorphusPolymorphicModifier
  ppe?: MorphusPolymorphicModifier
  hf?: MorphusPolymorphicModifier
  perception?: MorphusPolymorphicModifier
  apm?: MorphusPolymorphicModifier
  initiative?: MorphusPolymorphicModifier
  strike?: MorphusPolymorphicModifier
  parry?: MorphusPolymorphicModifier
  dodge?: MorphusPolymorphicModifier
  rollWithPunch?: MorphusPolymorphicModifier
  pullPunch?: MorphusPolymorphicModifier
  entangle?: MorphusPolymorphicModifier
  disarm?: MorphusPolymorphicModifier
  strikeWithGuns?: MorphusPolymorphicModifier
  bonusHthDamage?: MorphusPolymorphicModifier
  /** Relative A.R. shift (negative flat supported). */
  ar?: MorphusPolymorphicModifier
}

export type MorphusProgressionModifiers = {
  /** Additive change to normal per-level P.P.E gain (e.g. +3/level). */
  ppePerLevel?: MorphusPolymorphicModifier
  /** Additive change to normal per-level I.S.P gain. */
  ispPerLevel?: MorphusPolymorphicModifier
}

export type MorphusSaveModifiers = {
  magic?: number
  psionics?: number
  insanity?: number
  poison?: number
  gas?: number
  horrorFactor?: number
  disease?: number
  possession?: number
  mindControl?: number
  illusions?: number
  nightlordMagic?: number
  allSaves?: number
  nauseaVomiting?: number
  immunities?: readonly MorphusSaveImmunityType[]
  comaDeath?: MorphusPolymorphicModifier
}

export type MorphusSaveImmunityType =
  | 'magic'
  | 'psionics'
  | 'insanity'
  | 'poison'
  | 'gas'
  | 'horrorFactor'
  | 'disease'
  | 'possession'
  | 'mindControl'
  | 'illusions'
  | 'nightlordMagic'
  | 'allSaves'

export type MorphusJumpModifiers = {
  standingHeight?: MorphusPolymorphicModifier
  standingDistance?: MorphusPolymorphicModifier
  runningHeight?: MorphusPolymorphicModifier
  runningDistance?: MorphusPolymorphicModifier
}

export type MorphusWaterCombatModifiers = {
  strike?: MorphusPolymorphicModifier
  parry?: MorphusPolymorphicModifier
  dodge?: MorphusPolymorphicModifier
}

export type MorphusAquaticBuoyancy = 'sink' | 'float' | 'neutral'

export type MorphusAquaticTraits = {
  holdBreathDuration?: MorphusPolymorphicModifier
  canBreatheUnderwater?: boolean
  noBreathingRequired?: boolean
  depthToleranceFeet?: number
  waterCombatModifiers?: MorphusWaterCombatModifiers
  buoyancy?: MorphusAquaticBuoyancy
}

export type MorphusFlightCombatBonuses = {
  strike?: MorphusPolymorphicModifier
  parry?: MorphusPolymorphicModifier
  dodge?: MorphusPolymorphicModifier
  rollWithPunch?: MorphusPolymorphicModifier
}

export type MorphusFlightEngine = {
  flySpdAttribute?: MorphusPolymorphicModifier
  maxSpeedMph?: number
  maxAltitudeFeet?: number
  flightCombatBonuses?: MorphusFlightCombatBonuses
}

export type MorphusSurfaceType = 'hard_flat' | 'rough_uneven' | 'soft_fluid'

export type MorphusConditionalTerrainModifier = {
  surfaceTypes: readonly MorphusSurfaceType[]
  spdMultiplier: number
  skillModifiers?: MorphusSkillModifiers
}

export type MorphusStanceType =
  | 'mounted'
  | 'dismounted'
  | 'prone'
  | 'cloaked'
  | 'costumed'

export type MorphusConditionalStanceModifier = {
  stanceType: MorphusStanceType
  statModifiers: MorphusStatModifiers
}

export type MorphusPoolSharingRule =
  | 'independent'
  | 'fifty_fifty_split'
  | 'shared'

export type MorphusCompanionBlueprint = {
  entityName: string
  statModifiers?: MorphusStatModifiers
  poolSharingRule: MorphusPoolSharingRule
}

export type MorphusBurrowSubstrate = 'soil_dirt' | 'solid_rock' | 'concrete'

export type MorphusBurrowingEngine = {
  feetPerMeleeRound: number
  allowedSubstrates: readonly MorphusBurrowSubstrate[]
}

export type MorphusMobility = {
  jumpModifiers?: MorphusJumpModifiers
  /** Swim base source: default P.S.-derived, or explicit land-Spd-derived override. */
  swimSpeedBaseSource?: 'ps' | 'land_spd'
  swimSpeedBonus?: MorphusPolymorphicModifier
  aquaticTraits?: MorphusAquaticTraits
  flightEngine?: MorphusFlightEngine
  landLocomotion?: MorphusLandLocomotion
  conditionalTerrainModifiers?: readonly MorphusConditionalTerrainModifier[]
  conditionalStanceModifiers?: readonly MorphusConditionalStanceModifier[]
  burrowingEngine?: MorphusBurrowingEngine
  balanceModifierPercent?: number
  reachPercentBonus?: number
  jumpMultiplier?: number
  minimumJumpFeet?: number
  waterlogMinutesDice?: string
}

export type MorphusLandLocomotion = {
  /** Scale land movement speed (e.g. 0.5 for half speed). */
  spdMultiplier?: number
  /** Fixed land movement speed while constrained. */
  spdOverride?: number
  /** Scale P.P. while on land. */
  ppMultiplier?: number
  /** Fixed P.P. while on land. */
  ppOverride?: number
  /** Fixed APM while on land. */
  apmOverride?: number
  /** Optional movement mode label (e.g. crawl, slither). */
  mode?: 'normal' | 'crawl' | 'slither'
  note?: string
}

export type MorphusContactPoison = {
  saveType: 'poison' | 'gas'
  failDamageFormula: string
  passDamageFormula: string
  trigger: 'skin_contact'
  chancePercent?: number
  note?: string
}

export type MorphusCombatEffects = {
  contactPoison?: MorphusContactPoison
}

export type MorphusPerceptionSpecialties = {
  vision?: number
  smell?: number
  sound?: number
}

export type MorphusExternalSensoryObfuscation =
  | 'digital_photo_blur'
  | 'video_distortion'
  | 'biometric_scrambling'
  | 'scent_masking'

export type MorphusLightSensitivity = {
  daylightVisionMultiplier?: number
  perceptionVisionPenalty?: number
}

export type MorphusScentTracking = {
  enabled?: boolean
  baseSuccessPercent?: number
  perLevelIncrement?: number
  identifyOdorsModifierPercent?: number
  recognizeScentBasePercent?: number
  recognizeScentPerLevel?: number
  recognizeSpecificScentBasePercent?: number
  recognizeSpecificScentPerLevel?: number
  recognizeCommonScentBonusPercent?: number
}

export type MorphusTasteIdentification = {
  baseSuccessPercent?: number
  perLevelIncrement?: number
}

export type MorphusSensory = {
  nightvisionRangeFlatBonus?: number
  perceptionSpecialties?: MorphusPerceptionSpecialties
  telescopicVision?: boolean
  thermalVision?: boolean
  seeInvisible?: boolean
  sharpVision?: boolean
  sonarHearing?: boolean
  sharpHearing?: boolean
  invisibleToThermalImaging?: boolean
  externalSensoryObfuscation?: readonly MorphusExternalSensoryObfuscation[]
  peripheralVisionDegrees?: number
  lightSensitivity?: MorphusLightSensitivity
  scentTracking?: MorphusScentTracking
  prowlUnderwaterModifierPercent?: number
  darknessInvisibilityPercent?: number
  whisperHearingRangeFeet?: number
  hawkLikeDayVision?: boolean
  tasteIdentification?: MorphusTasteIdentification
}

export type MorphusSkillOverrideTargetType = 'skill_id' | 'category' | 'skill_trait'

export type MorphusSkillOverride = {
  targetType: MorphusSkillOverrideTargetType
  targetValue: string
  modifierPercent?: number
  isNegated?: boolean
  /**
   * Skill cannot be used in Morphus (sheet shows "Impossible").
   * Legacy: `isNegated` without `modifierPercent` is treated the same at runtime.
   */
  impossibleInMorphus?: boolean
  grantUnlearnedValue?: number
  /** Per-level increment on base % (e.g. Gymnast Build +4%/level). */
  perLevelIncrement?: number
}

export type MorphusCustomSystemRollLevelIntervalScaling = {
  levelInterval: number
  chanceBonus: number
}

export type MorphusCustomSystemRoll = {
  rollName: string
  baseSuccessChance: number
  levelIntervalScaling?: MorphusCustomSystemRollLevelIntervalScaling
}

export type MorphusSkillModifiers = {
  globalSkillModifier?: number
  specificSkillOverrides?: readonly MorphusSkillOverride[]
  customSystemRolls?: readonly MorphusCustomSystemRoll[]
}

/** Vulnerability tier multiplier (0 = none … 2 = double; 1.5 = increased). */
export type MorphusDamageAffinityMultiplier = 0 | 0.1 | 0.25 | 0.5 | 1 | 1.5 | 2

export type MorphusDamageAffinityType =
  | 'heat'
  | 'fire'
  | 'cold'
  | 'ice'
  | 'poison'
  | 'airborneToxins'
  | 'electricity'
  | 'lasers'
  | 'energy'
  | 'kinetic'
  | 'blunt'
  | 'explosives'
  | 'falling'
  | 'fatigue'
  | 'magic'
  | 'magicEnergy'
  | 'nightlordMagic'
  | 'water'
  | 'wood'
  | 'silver'
  | 'holyWeapons'
  | 'piercing'
  | 'pain'
  | 'light'
  | 'darknessPowers'

export type MorphusDamageAffinities = Partial<
  Record<MorphusDamageAffinityType, MorphusDamageAffinityMultiplier>
>

export type MorphusEffectDurationMultiplier = MorphusDamageAffinityMultiplier

export type MorphusMagicEffectDurationProfile = {
  effectMultiplier?: MorphusEffectDurationMultiplier
  durationMultiplier?: MorphusEffectDurationMultiplier
}

export type MorphusMagicInteractionModifiers = {
  incomingMagic?: MorphusMagicEffectDurationProfile
  incomingNightlordMagic?: MorphusMagicEffectDurationProfile
  incomingPsionics?: MorphusMagicEffectDurationProfile
}

export type MorphusWeaponClassBonuses = {
  melee?: MorphusPolymorphicModifier
  thrown?: MorphusPolymorphicModifier
  bow?: MorphusPolymorphicModifier
  guns?: MorphusPolymorphicModifier
  requiring_hands?: MorphusPolymorphicModifier
}

export type MorphusSubTraitChoicesBudget = {
  slotsAvailable?: number
  slotsFormula?: string
  allowedChoicesPool: readonly string[]
}

export type MorphusGimmickToySwitchControlType =
  | 'wind_up_key'
  | 'knob'
  | 'push_button'
  | 'pull_string'
  | 'lever'
  | 'switch'

export type MorphusGimmickToySwitchLocation =
  | 'back_wind_up_key'
  | 'chest'
  | 'arm_left'
  | 'arm_right'
  | 'leg_left'
  | 'leg_right'
  | 'hand_back_left'
  | 'hand_back_right'
  | 'neck'
  | 'head_side'
  | 'head_back'

export type MorphusGimmickToyEffectKind =
  | 'theme_music'
  | 'sings'
  | 'whistles'
  | 'loud_barking'
  | 'angry_growl'
  | 'loud_siren'
  | 'voice_change'
  | 'foreign_language'
  | 'mechanical_voice'
  | 'eyes_flashlight_yellow'
  | 'eyes_nightvision_green'
  | 'eyes_telescopic_white'
  | 'eyes_thermal_orange'
  | 'eyes_laser_red'
  | 'torso_blinking_lights'
  | 'quick_disguise_head_spin'
  | 'secret_compartment'
  | 'pop_apart_body'
  | 'missile_firing'
  | 'squirt_gun_finger'
  | 'flying_fist'
  | 'power_punch'
  | 'karate_chop'
  | 'karate_kick'
  | 'retractable_claws'
  | 'sword_arm'
  | 'fire_fist'
  | 'laser_fist'
  | 'running_action'
  | 'spinning_action'
  | 'dancing_action'
  | 'jumping_action'
  | 'kung_fu_leaping'
  | 'flying_action'
  | 'roller_blade_feet'
  | 'tank_tread_legs'
  | 'motorcycle_legs'
  | 'custom'

export type MorphusGimmickToyEffectResetPeriod =
  | 'per_use'
  | 'hourly'
  | 'daily'
  | 'per_encounter'

export type MorphusGimmickToySwitchEffect = {
  effectKind: MorphusGimmickToyEffectKind
  displayName?: string
  durationFormula?: string
  durationMeleeRounds?: number
  damageFormula?: string
  strikeBonus?: number
  parryBonus?: number
  dodgeBonus?: number
  disarmBonus?: number
  rangeFeet?: number
  horrorFactor?: number
  usesPerPeriod?: number
  resetPeriod?: MorphusGimmickToyEffectResetPeriod
  spdMultiplierWhileActive?: number
  statModifiersWhileActive?: MorphusStatModifiers
  sensoryWhileActive?: MorphusSensory
  mobilityWhileActive?: MorphusMobility
  naturalWeaponWhileActive?: MorphusNaturalWeapon
  notes?: string
}

export type MorphusGimmickToySwitchLayout = {
  windUpKeyOnBack?: boolean
  chestCountFormula?: string
  perArmCountFormula?: string
  perLegCountFormula?: string
  perHandBackCount?: number
  neckOrHeadSideCount?: number
  headBackCount?: number
}

export type MorphusGimmickToyAssignedSwitch = {
  label?: string
  bodyLocation: MorphusGimmickToySwitchLocation
  controlType?: MorphusGimmickToySwitchControlType
  effect?: MorphusGimmickToySwitchEffect
  effectRef?: string
}

export type MorphusGimmickToyPresetEffect = {
  id: string
  effect: MorphusGimmickToySwitchEffect
}

export type MorphusGimmickToySwitchBoard = {
  switchLayout: MorphusGimmickToySwitchLayout
  presetEffectCatalog: readonly MorphusGimmickToyPresetEffect[]
  assignedSwitches?: readonly MorphusGimmickToyAssignedSwitch[]
  disguiseImpossible?: boolean
  customClothingRequired?: boolean
  gmApprovalRequiredForCustom?: boolean
}

export type MorphusHandCapacityConstraints = {
  occupiesHands: number
  blocksTwoHandedWeapons: boolean
}

/**
 * Morphus characteristic row (`palladium-morphus.schema.json`).
 * Aggregated at runtime — see `morphusCharacteristicAggregation.ts`.
 */
export type MorphusCharacteristic = {
  id: string
  name: string
  tableCategory: string
  /** Game lines this row applies to (must align with sources[].gameSystem). */
  gameSystems?: readonly string[]
  /** Book + page citation(s) for this characteristic. */
  sources?: readonly PalladiumSourceRef[]
  description?: string
  statModifiers?: MorphusStatModifiers
  progressionModifiers?: MorphusProgressionModifiers
  /** Absolute natural A.R. from this trait (not a polymorphic modifier). */
  naturalAr?: number
  saveModifiers?: MorphusSaveModifiers
  mobility?: MorphusMobility
  sensory?: MorphusSensory
  skillModifiers?: MorphusSkillModifiers
  damageAffinities?: MorphusDamageAffinities
  magicInteractionModifiers?: MorphusMagicInteractionModifiers
  weaponClassBonuses?: MorphusWeaponClassBonuses
  heightModifier?: MorphusPolymorphicModifier
  weightModifier?: MorphusPolymorphicModifier
  naturalWeapons?: readonly MorphusNaturalWeapon[]
  limbDurability?: readonly MorphusLimbDurability[]
  subTraitChoicesBudget?: MorphusSubTraitChoicesBudget
  handCapacityConstraints?: MorphusHandCapacityConstraints
  /** Nested mount / companion entity (Ancient Warrior centaur, warhorse, etc.). */
  companionBlueprint?: MorphusCompanionBlueprint
  /**
   * Dynamic archetype wrapper — UI may swap visual skin and spawn ephemeral S.D.C. shields.
   */
  isPolymorphicTemplate?: boolean
  gimmickInventory?: readonly MorphusGimmickInventoryItem[]
  /** Wind-up keys and body switches with fixed toy-like effects (Survival Guide Biomechanical III). */
  gimmickToySwitches?: MorphusGimmickToySwitchBoard
  /** Natural limb attack types disabled while this trait is active. */
  disabledNaturalAttackTags?: readonly MorphusDisabledNaturalAttackTag[]
  activatedAbilities?: readonly MorphusActivatedAbility[]
  specialCombatInterceptions?: readonly MorphusSpecialCombatInterception[]
  combatEffects?: MorphusCombatEffects
  customOneOffs?: readonly string[]
  /** Main-table d100 band (01–00%) for Morphus Sub-Forge roll display. */
  percentile?: { min: number; max: number }
  /** Step-One router or section header — not a final Morphus look by itself. */
  entryRole?: 'trait' | 'table_router' | 'subtable_header'
  /** Inner percentile bands inside one trait row (Junk Golem body type, Mirror Man style, etc.). */
  variantPercentiles?: readonly MorphusVariantPercentile[]
  /** Multiple independent sub-table axes (e.g. B-Movie Alien Hands + Body Type). */
  independentSubRolls?: readonly MorphusIndependentSubRoll[]
  /** Roll on another Morphus table (e.g. Stuffed Animal → animal_form). */
  crossTableRoll?: MorphusCrossTableRoll
  /** @deprecated Prefer typed capability fields; kept for legacy rows. */
  morphusRules?: readonly MorphusEdgeCaseRule[]
  appearanceConstraints?: MorphusAppearanceConstraints
  combatContextModifiers?: readonly MorphusCombatContextModifier[]
  recoveryBehaviors?: readonly MorphusRecoveryBehavior[]
  conditionalPenalties?: readonly MorphusConditionalPenalty[]
  atWillAbilities?: readonly MorphusAtWillAbility[]
  playerChoices?: readonly MorphusPlayerChoice[]
  tableWorkflow?: MorphusTableWorkflow
  /** Opens Custom Trait Workshop when this router row is resolved. */
  customTraitResolution?: MorphusCustomTraitResolution
  livingWeaponRules?: MorphusLivingWeaponRules
  skillContextModifiers?: readonly MorphusSkillContextModifier[]
  disguiseLimits?: MorphusDisguiseLimits
}

export type MorphusVariantPercentile = {
  roll: string
  label: string
  description?: string
  statModifiers?: MorphusStatModifiers
  skillModifiers?: MorphusSkillModifiers
  sensory?: MorphusSensory
  mobility?: MorphusMobility
  combatEffects?: MorphusCombatEffects
  limbDurability?: readonly MorphusLimbDurability[]
  naturalWeapons?: readonly MorphusNaturalWeapon[]
  weightModifier?: MorphusPolymorphicModifier
  customOneOffs?: readonly string[]
}

export type MorphusIndependentSubRoll = {
  tableName: string
  options: readonly MorphusVariantPercentile[]
}

export type MorphusCrossTableRoll = {
  targetTableId: string
  targetTableName?: string
  note?: string
}

export type MorphusEdgeCaseRuleKind =
  | 'mirror_walk'
  | 'reform_after_destruction'
  | 'called_shot_defense'
  | 'environmental_vulnerability'
  | 'immobilization'
  | 'player_choice'
  | 'cross_reference'
  | 'combat_opponent_modifier'
  | 'weapon_living_part'
  | 'other'

export type MorphusEdgeCaseRule = {
  kind: MorphusEdgeCaseRuleKind
  summary: string
  params?: Record<string, unknown>
}

export type MorphusClothingFit =
  | 'oversized_required'
  | 'custom_required'
  | 'loose_required'
  | 'baggy_appearance'

export type MorphusAppearanceConstraints = {
  clothingFit?: MorphusClothingFit
  narrowOpeningAccess?: 'restricted' | 'enhanced'
  hideAmongContext?: string
  standMotionlessIndefinitely?: boolean
  customFootwearRequired?: boolean
  customClothingNote?: string
}

export type MorphusCombatContextCondition =
  | 'bright_light'
  | 'surprise_from_behind_or_side'
  | 'grappling'
  | 'grapple_defense'
  | 'physical_contact'
  | 'visual_engagement'
  | 'submersion'

export type MorphusCombatContextModifier = {
  condition: MorphusCombatContextCondition
  target?: 'opponent' | 'self'
  strike?: number
  parry?: number
  dodge?: number
  grapplingAffordance?: 'rope_grip_with_teeth'
  naturalArFlat?: number
  damagePerRound?: string
  horrorFactorFlat?: number
  blindChancePercent?: number
  opponentTrackingBonusPercent?: number
  note?: string
}

export type MorphusRecoveryTrigger =
  | 'destruction'
  | 'large_explosion'
  | 'submersion'
  | 'waterlog'

export type MorphusRecoveryBehavior = {
  trigger: MorphusRecoveryTrigger
  reformMinutesDice?: string
  lockoutHoursDice?: string
  globCountDice?: string
  residualSdcPercent?: number
  dryHoursDice?: string
  gardenHoseDamage?: string
  fireHoseDamage?: string
  note?: string
}

export type MorphusConditionalPenaltyTrigger =
  | 'cold_attack'
  | 'freezing_temperature'
  | 'rain_or_water_exposure'

export type MorphusConditionalPenalty = {
  trigger: MorphusConditionalPenaltyTrigger
  apmMultiplier?: number
  spdMultiplier?: number
  note?: string
}

export type MorphusAtWillAbilityId = 'mirror_walk' | 'stand_motionless' | 'other'

export type MorphusAtWillAbility = {
  id: MorphusAtWillAbilityId
  label: string
  note?: string
}

export type MorphusPlayerChoice = {
  label: string
  options: readonly string[]
  timing?: 'character_creation' | 'any'
}

/** Fields the Custom Trait Workshop may edit (expert panel respects this allow-list). */
export type MorphusCustomTraitAllowedField =
  | 'statModifiers'
  | 'saveModifiers'
  | 'skillModifiers'
  | 'atWillAbilities'
  | 'naturalWeapons'
  | 'sensory'
  | 'mobility'
  | 'customOneOffs'
  | 'naturalAr'
  | 'progressionModifiers'

/** Catalog flag on router rows that open the player/G.M. Custom Trait Workshop. */
export type MorphusCustomTraitResolution = {
  kind: 'player_gm_authored'
  requiresGmApproval?: boolean
  prompt?: string
  allowedFields?: readonly MorphusCustomTraitAllowedField[]
}

/** Runtime instance stored on the character — not authored in table JSON. */
export type MorphusCustomTraitInstance = {
  displayName: string
  description: string
  gmApproved: boolean
  statModifiers?: MorphusStatModifiers
  saveModifiers?: MorphusSaveModifiers
  skillModifiers?: MorphusSkillModifiers
  atWillAbilities?: readonly MorphusAtWillAbility[]
  naturalWeapons?: readonly MorphusNaturalWeapon[]
  sensory?: MorphusSensory
  mobility?: MorphusMobility
  customOneOffs?: readonly string[]
  naturalAr?: number
  progressionModifiers?: MorphusProgressionModifiers
}

/** Resolved Morphus trait slot during Sub-Forge (catalog id + optional custom overlay). */
export type MorphusTraitSlotResolution = {
  slotId: string
  catalogEntryId: string
  percentileRoll?: number
  branchChoice?: string
  customInstance?: MorphusCustomTraitInstance
}

export type MorphusTableWorkflow = {
  stepOneRollCount?: number
  excludeSelfFromReroll?: boolean
}

export type MorphusLivingWeaponRules = {
  sdcPerLevel?: number
  onlyDamagedWhenTargeted?: boolean
  vanishesWhenBothZero?: boolean
  preferredWeapon?: boolean
  hardToConceal?: boolean
}

export type MorphusSkillContext =
  | 'underwater'
  | 'darkness'
  | 'bright_light'
  | 'daylight'
  | 'well_lit'
  | 'costumed'

export type MorphusSkillContextModifier = {
  skillId: string
  modifierPercent: number
  context: MorphusSkillContext
}

export type MorphusDisguiseLimits = {
  similarSizeWeightOnly?: boolean
  cannotImpersonateIndividuals?: boolean
  skinColorRequiresMakeup?: boolean
  note?: string
}

/** Player-facing capability digest category (character sheet summary). */
export type MorphusCapabilityCategory =
  | 'senses'
  | 'movement'
  | 'combat'
  | 'defense'
  | 'skills'
  | 'appearance'
  | 'abilities'
  | 'recovery'
  | 'choices'
  | 'workflow'

export type MorphusCapabilityPolarity = 'bonus' | 'penalty' | 'neutral' | 'choice'

export type MorphusDerivedCapabilityLine = {
  category: MorphusCapabilityCategory
  label: string
  detail: string
  sourceTraitId: string
  sourceTraitName: string
  polarity: MorphusCapabilityPolarity
}

export type MorphusCapabilitySummary = {
  lines: readonly MorphusDerivedCapabilityLine[]
  byCategory: Readonly<Partial<Record<MorphusCapabilityCategory, readonly MorphusDerivedCapabilityLine[]>>>
}

/**
 * Morphus table document (`content/morphus/tables/*.json`, palladium-morphus-table.schema.json).
 * `category_hub` tables route to leaf `morphus_trait_table` files via `subtables`.
 */
export type PalladiumMorphusTable = {
  id: string
  kind: MorphusTableKind
  displayName: string
  description?: string
  parentTable: string | null
  subtables?: readonly MorphusTableSubtableRef[]
  /** Hub-level Step One rules (e.g. Disproportion roll twice on 91–00%). */
  tableWorkflow?: MorphusTableWorkflow
  entries: readonly MorphusCharacteristic[]
}

/** Morphus Sub-Forge dice roll spec (1D4, 1D4+2, etc.). */
export type MorphusForgeDiceRollSpec = {
  notation: string
  min: number
  max: number
}

export type MorphusForgeTableTarget = {
  tableId: string
  label: string
  rerollMultiRollResults?: boolean
  subtableIds?: readonly string[]
}

export type MorphusForgeSlotRequired = {
  kind: 'required'
  tableId: string
  label: string
  rerollMultiRollResults?: boolean
  subtableIds?: readonly string[]
}

export type MorphusForgeSlotChoice = {
  kind: 'choice'
  label?: string
  options: readonly MorphusForgeTableTarget[]
}

export type MorphusForgeSlotRepeat = {
  kind: 'repeat'
  count: number
  tableId: string
  label: string
  rerollMultiRollResults?: boolean
  subtableIds?: readonly string[]
}

export type MorphusForgeSlotCombinationPool = {
  kind: 'combination_pool'
  label?: string
  countRoll: MorphusForgeDiceRollSpec
  pool: readonly MorphusForgeTableTarget[]
}

export type MorphusForgeSlotCharacteristicsMultiplier = {
  kind: 'characteristics_multiplier'
  count: number
  mode: 'roll_or_select'
  rerollAbovePercentile: number
  label?: string
}

export type MorphusForgeSlotRequirement =
  | MorphusForgeSlotRequired
  | MorphusForgeSlotChoice
  | MorphusForgeSlotRepeat
  | MorphusForgeSlotCombinationPool
  | MorphusForgeSlotCharacteristicsMultiplier

export type MorphusForgeRoutingEntry = {
  id: string
  name: string
  percentile: { min: number; max: number }
  slotPlan: readonly MorphusForgeSlotRequirement[]
}

export type MorphusForgeRoutingRole =
  | 'appearance_archetype'
  | 'characteristics_router'

/**
 * Percentile routing table for Morphus Sub-Forge Tab 1 / nested characteristic rolls.
 * `content/morphus/forge/*.json`, palladium-morphus-forge-routing.schema.json.
 */
export type PalladiumMorphusForgeRoutingTable = {
  id: string
  kind: 'forge_routing_table'
  displayName: string
  description?: string
  forgeRole: MorphusForgeRoutingRole
  path2Entry?: {
    countRoll: MorphusForgeDiceRollSpec
    description: string
  }
  entries: readonly MorphusForgeRoutingEntry[]
}

export type MorphusForgeManifest = {
  id: string
  kind: 'forge_manifest'
  displayName: string
  description?: string
  path1: { routingTableId: string; routingTableFile: string }
  path2: {
    routingTableId: string
    routingTableFile: string
    countRoll: MorphusForgeDiceRollSpec
    description: string
  }
  traitTableDir: string
}

export type MorphusForgePath = 'appearance' | 'characteristics'

export type MorphusForgeSubTabId = 'crossroads' | 'trait_forge' | 'review'

/** Creation-time Morphus Sub-Forge progress (Tab 6 nested forge). */
export type MorphusForgeState = {
  activeSubTab?: MorphusForgeSubTabId
  subTabCompleted?: Partial<Record<MorphusForgeSubTabId, true>>
  subTabSnapshots?: Partial<Record<MorphusForgeSubTabId, string>>
  path?: MorphusForgePath
  /** Path 1 — appearance routing entry id from `appearance.json`. */
  appearanceEntryId?: string
  /** Path 2 — physical 1D4+2 result (3–6). */
  characteristicsPickCount?: number
  /** Nightbane base Morphus attribute bonuses applied to the morphus branch. */
  baseStatsApplied?: boolean
}

/** Player picks and dice inputs for Morphus Sub-Forge slot resolution. */
export type MorphusForgeSlotState = {
  /** Trait catalog entry id chosen at a slot path. */
  picks?: Readonly<Record<string, string>>
  /** Characteristics routing entry id (characteristics.json rows). */
  routingPicks?: Readonly<Record<string, string>>
  /** Selected table id for choice / combination-pool branch slots. */
  branchTableIds?: Readonly<Record<string, string>>
  /** Manual dice for combination_pool count rolls and similar. */
  diceValues?: Readonly<Record<string, number>>
  /** Sub-trait pool picks keyed by `${path}#${index}`. */
  subTraitPicks?: Readonly<Record<string, string>>
  /** Variant / independent sub-roll label picks keyed by path. */
  variantPicks?: Readonly<Record<string, string>>
  /** Custom trait workshop overlays keyed by slot path. */
  customInstances?: Readonly<Record<string, MorphusCustomTraitInstance>>
}

export type MorphusSlotNodeKind =
  | 'choice'
  | 'dice'
  | 'table'
  | 'characteristic'
  | 'sub_trait_choice'
  | 'variant_choice'
  | 'custom_trait'

export type MorphusSlotNodeStatus =
  | 'blocked'
  | 'ready'
  | 'complete'
  | 'incomplete_custom'

export type MorphusSlotPickOption = {
  id: string
  name: string
  band?: string
  description?: string
  /** Tables this pick routes into (characteristics rows, hubs, cross-table). */
  tableRoute?: string
  bonuses?: string[]
  penalties?: string[]
  /** Replaces bonus/penalty lists when modifiers depend on a variant pick. */
  modifierNote?: string
}

export type MorphusSlotNode = {
  path: string
  label: string
  kind: MorphusSlotNodeKind
  status: MorphusSlotNodeStatus
  tableId?: string
  options?: readonly { tableId: string; label: string }[]
  diceSpec?: MorphusForgeDiceRollSpec
  pickEntries?: readonly MorphusSlotPickOption[]
  resolvedEntryId?: string
  resolvedEntryName?: string
  customCatalogEntryId?: string
  blockReason?: string
  children: readonly MorphusSlotNode[]
}

export type SpellCaveatKind = 'focus' | 'target' | 'ppe' | 'ritual' | 'note'

export type SpellCaveat = {
  kind: SpellCaveatKind
  summary: string
  detail?: string
  sourcePage?: number
}

export type SpellAccessMetadata = {
  /** Wizard flesh-only cross-list eligibility (Fleshsculptor). */
  affectsFlesh?: boolean
  /** When a native-school row supersedes a borrowed catalog id for the same O.C.C. */
  replacesSpellId?: string
  /** Per-O.C.C.-kind caveats when borrowed (key = occ slug prefix, e.g. fleshsculptor). */
  borrowedCaveats?: Readonly<Record<string, readonly SpellCaveat[]>>
  /** Cross-list registry ids this spell belongs to (Mirrormage enumerated borrow). */
  crossLists?: readonly string[]
}

export type OccSpellAccessRule = {
  school: string
  accessType: 'only' | 'except'
  tagFilter?: readonly string[]
  spellIds?: readonly string[]
  crossListId?: string
  label?: string
  defaultCaveats?: readonly SpellCaveat[]
}

export type MagicCrossList = {
  label: string
  source?: string
  sourcePage?: number
  defaultCaveats?: readonly SpellCaveat[]
  spellIds: readonly string[]
  spellOverrides?: Readonly<
    Record<string, { caveats?: readonly SpellCaveat[] }>
  >
}

export type MagicCrossListsRef = {
  description?: string
  crossLists: Readonly<Record<string, MagicCrossList>>
}

/**
 * Magic invocation catalog row (`content/magic/<school>.json`, palladium-magic.schema.json).
 */
export type PalladiumMagicSpell = {
  id: string
  name: string
  description: string
  descriptionMorphus?: string
  gameSystems: readonly string[]
  sources: readonly PalladiumSourceRef[]
  /** School slug — matches `content/magic/<school>.json` basename and `magic_<school>_` id prefix. */
  school: string
  spellLevel: number
  magicKind?: MagicKind
  isRitual?: boolean
  spellStrengthBase?: 12 | 16
  tags?: readonly string[]
  spellAccess?: SpellAccessMetadata
  genrePlacements?: readonly MagicGenrePlacement[]
  ppe?: MagicPpeEconomy
  limitations?: MagicLimitations
  ranges?: readonly MagicRangeEntry[]
  range?: Record<string, unknown>
  duration?: MagicDurationBlock
  areaOfEffect?: Record<string, unknown>
  damage?: string | Record<string, unknown>
  healing?: Record<string, unknown>
  save?: unknown
  horrorFactor?: number
  reveals?: readonly string[]
  combatBonuses?: FeatureModifiers
  grantedModifiers?: Record<string, unknown>
  inflictedModifiers?: Record<string, unknown>
  /** Percentile outcome bands (e.g. Teleport arrival accuracy). */
  resolutionTable?: Record<string, unknown>
  /** Physical reagents required to cast (distinct from `ppe` and `permanentCosts`). */
  materialComponents?: Record<string, unknown>
  /** Irreversible maximum-pool sacrifices (distinct from `ppe` activation). */
  permanentCosts?: readonly Record<string, unknown>[]
  /** Persistent equippable items created on success (amulets, scrolls). */
  forgedOutputs?: readonly Record<string, unknown>[]
  /** Downtime ritual metadata (crafting duration, workspace, assistants). */
  ritualProfile?: Record<string, unknown>
  /** Construct or catalog creature spawn (`kind`: construct | creature). */
  spawnedPresence?: Record<string, unknown>
  /** Sheet-replacement metamorphosis while the spell is active. */
  formTransformation?: Record<string, unknown>
  /** @deprecated Prefer `spawnedPresence` with `kind: construct`. */
  summonedEntity?: Record<string, unknown>
  effectProfiles?: readonly Record<string, unknown>[]
  prerequisites?: readonly MagicPrerequisite[]
  incompatibleSpellIds?: readonly string[]
  notes?: string
  formRequirement?: TalentFormRequirement
  activation?: FeatureActivation
  durationType?: string
  pumpable?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Nightbane talent catalog row (`content/palladiumTalents.json`, palladium-talent.schema.json).
 */
export type PalladiumTalent = {
  id: string
  name: string
  description: string
  descriptionMorphus?: string
  gameSystems: readonly string[]
  sources: readonly PalladiumSourceRef[]
  talentTier?: TalentTier
  /** Slim-authoring alias for {@link talentTier}. */
  tier?: TalentTier
  tags?: readonly string[]
  formRequirement?: TalentFormRequirement
  ppe?: TalentPpeEconomy
  limitations?: TalentLimitations
  ranges?: readonly TalentRangeEntry[]
  duration?: TalentDurationBlock
  damage?: string | Record<string, unknown>
  areaOfEffect?: Record<string, unknown>
  prerequisites?: MorphusTablePrerequisites | readonly TalentPrerequisite[]
  incompatibleTalentIds?: readonly string[]
  notes?: string
  modifiers?: FeatureModifiers
  /** Percentile outcome bands for modal or conditional talents. */
  resolutionTable?: Record<string, unknown>
  /** Irreversible maximum-pool sacrifices (distinct from `ppe.permanentBurnToAcquire`). */
  permanentCosts?: readonly Record<string, unknown>[]
  spawnedPresence?: Record<string, unknown>
  formTransformation?: Record<string, unknown>
  materialComponents?: Record<string, unknown>
  forgedOutputs?: readonly Record<string, unknown>[]
  activation?: FeatureActivation
  save?: unknown
  [key: string]: unknown
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
  /** Per-save bonuses unlocked at character levels (values summed when level ≥ milestone). */
  levelGatedSaves?: Readonly<Record<string, Readonly<Record<string, number>>>>
}

export type OccSpellAcquisitionPolicy = 'open' | 'roadmap_only'

export type OccSupernaturalSelectionModePool = {
  kind: 'pool'
  selections: number
  categories: readonly string[]
}

export type OccSupernaturalSelectionModePerCategory = {
  kind: 'per_category'
  buckets: Readonly<Record<string, number>>
}

export type OccSupernaturalSelectionModeSingleCategory = {
  kind: 'single_category'
  selections: number
  categories: readonly string[]
}

export type OccSupernaturalSelectionMode =
  | OccSupernaturalSelectionModePool
  | OccSupernaturalSelectionModePerCategory
  | OccSupernaturalSelectionModeSingleCategory

export type OccSupernaturalCreationSelectionStep = {
  selectionsGained: number
  selectionMode: OccSupernaturalSelectionMode
  label?: string
}

export type OccSupernaturalPerLevelSelection = {
  fromLevel: number
  toLevel?: number
  selectionsGained: number
  selectionMode: OccSupernaturalSelectionMode
  label?: string
}

export type OccSupernaturalRuleOverrideLeyLine = {
  useGlobalDefault?: boolean
  rangeDurationNearLeyLineMultiplier?: number
  rangeDurationAtNexusMultiplier?: number
  damageAtNexusMultiplier?: number
  notes?: string
}

export type OccSupernaturalRuleOverrideMeditation = {
  useGlobalDefault?: boolean
  ispPerHour?: number
  sleepRestIspPerHour?: number
  notes?: string
}

export type OccSupernaturalRuleOverridePsychicApm = {
  useGlobalDefault?: boolean
  linkedToHandToHand?: boolean
  bonusTotalActions?: number
  additionalPsionicOnlyActions?: number
  notes?: string
}

export type OccSupernaturalRuleOverrides = {
  leyLine?: OccSupernaturalRuleOverrideLeyLine
  meditation?: OccSupernaturalRuleOverrideMeditation
  psychicApm?: OccSupernaturalRuleOverridePsychicApm
}

export type OccSupernaturalProgressionStep = {
  level: number
  selectionsGained: number
  categoryRestrictions?: readonly string[]
  selectionMode?: OccSupernaturalSelectionMode
}

export type OccSupernaturalEngineSelectionFields = {
  creationSelectionPlan?: readonly OccSupernaturalCreationSelectionStep[]
  perLevelSelection?: OccSupernaturalPerLevelSelection
}

export type OccPpeEngine = OccSupernaturalEngineSelectionFields & {
  baseFormula: string
  perLevelFormula: string
  spellStrengthProgression?: Readonly<Record<string, number>>
  progressionRoadmap: readonly OccSupernaturalProgressionStep[]
  /** School slugs this O.C.C. may learn natively (e.g. wizard, necromancy). Empty/omitted = no school gate. */
  magicSchools?: readonly string[]
  /** Cross-school borrow rules (e.g. Mirrormage wizard spells via mirror focus). */
  spellAccessRules?: readonly OccSpellAccessRule[]
  /** Auto-granted spells at creation; excluded from selection budget. */
  grantedAbilityIds?: readonly string[]
  /** open = Pursuit of Magic anytime; roadmap_only = intuitive picks only. */
  spellAcquisition?: OccSpellAcquisitionPolicy
}

export type OccIspSavingThrowClass = 'minor' | 'major' | 'master'

export type OccIspEngine = OccSupernaturalEngineSelectionFields & {
  baseFormula: string
  perLevelFormula: string
  savingThrowClass: OccIspSavingThrowClass
  progressionRoadmap: readonly OccSupernaturalProgressionStep[]
  /** Auto-granted psionics at creation; excluded from selection budget. */
  grantedAbilityIds?: readonly string[]
}

export type OccCustomAbilityEngine = OccSupernaturalEngineSelectionFields & {
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

/** Catalog id under `content/progression/xp_tables/` (legacy: `standard` | `psychic` | `borg`). */
export type OccXpTableId = string

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
 * Library O.C.C. catalog row (`content/occs/*.json`, palladium-occ.schema.json).
 * Alias: {@link OCC}.
 */
export type PalladiumOcc = {
  id: string
  name: string
  description: string
  /** Host-genre whitelist (falls back to {@link gameSystems} when omitted in JSON). */
  genresAvailable?: readonly string[]
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
  /** Unique O.C.C. abilities and special skills (book text summaries for creation preview). */
  classAbilities?: readonly OccClassAbility[]
  staticBonuses?: OccStaticBonuses
  ppeEngine?: OccPpeEngine
  ispEngine?: OccIspEngine
  customAbilityEngines?: readonly OccCustomAbilityEngine[]
  startingEquipment?: OccStartingEquipment
  finances?: OccFinances
  progression?: OccProgressionHooks
  baseStats?: OccBaseStatsDice
  /** When set, master forge Tab 6 hosts this sub-forge manifest (overrides race default). */
  creationSubForgeId?: string
  /** Configurator package summary notes (recommended attributes, prerequisites, etc.). */
  packageNotes?: readonly string[]
  /** O.C.C.-specific overrides to global psionic rules (ley line, meditation, psychic APM). */
  supernaturalRuleOverrides?: OccSupernaturalRuleOverrides
}

/** Alias for {@link PalladiumOcc} — full O.C.C. composition document. */
export type OCC = PalladiumOcc

/** Injected at runtime by genreTransformer when illegal for active hostGenreId. */
export type HostGenreRuntimeFlags = {
  isHostGenreLocked?: boolean
}

/** One related or secondary skill selection during character creation. */
export type CreationSkillPick = {
  /** Stable instance id (unique per pick, including multiple Language instances). */
  instanceId: string
  skillId: string
  /** User-defined language, instrument, literacy script, etc. (min 1 char when required). */
  specialization?: string
  /** Second skill slot spent for professional / tailoring tier (+category or rank bonus). */
  professionalQuality?: boolean
  /** Source skill that granted this pick free via conditionalRelatedSkills. */
  grantedBySkillId?: string
  /** Starting % from grantIfMissing (replaces book base for initial acquisition). */
  conditionalGrantStartingPercent?: number
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

/**
 * Persisted root record (docs/vision.md, master_flow.md).
 * Immutable creation stamp + dynamic host pointer; nested pools mirror {@link Character}.
 */
export type CharacterRootState = {
  id: string
  /** Stamped at file creation — native rules origin. */
  readonly creationGenreId: string
  /** Active viewport / GM room host ecosystem. */
  hostGenreId: string
} & Character

/** Sheet skill row after runtime genre middleware. */
export type DerivedSheetSkill = SheetSkill & HostGenreRuntimeFlags

export type DerivedFormState = Omit<FormState, 'skills'> & {
  skills: DerivedSheetSkill[]
}

/** UI-facing payload emitted by genreTransformer (read-only for presentation). */
export type DerivedActiveState = CharacterRootState & {
  facade: DerivedFormState
  morphus: DerivedFormState
}

export type DerivedInventoryItem = InventoryItem & HostGenreRuntimeFlags

/** Player-entered identity details (sheet header); height/weight feed movement engines. */
export type CharacterIdentityProfile = {
  sex: string
  age: string
  heightFeet: string
  heightInches: string
  weightLbs: string
  eyes: string
  hair: string
}

export type Character = {
  name: string
  /** Physical description and anthropometrics for leap/encumbrance and Morphus modifiers. */
  identityProfile?: CharacterIdentityProfile
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
  /** Library race id — `src/data/content/races/*.json` and the race registry. */
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
  /** After Spawn — creation chrome hidden; persisted (forge-character_creation.md Tab 7). */
  isFinalized?: boolean
  /** Psychic Gate tier chosen during creation (psychic_gate.md). */
  creationPsychicTier?: PsychicTier
  /** True after player explicitly picks a tier on Tab 3 (Forge gate). */
  creationPsychicTierChosen?: boolean
  /** Major tier only — 8 single-category vs 6 mixed pool picks. */
  creationPsychicGateMajorAllocation?: PsychicGateMajorAllocation
  /** Universal Forge — tab completion (Continue clicked). */
  creationForgeCompleted?: Readonly<
    Partial<Record<CharacterCreationForgeTabId, true>>
  >
  /** Snapshots at Continue for upstream conflict (yellow) detection. */
  creationForgeSnapshots?: Readonly<
    Partial<Record<CharacterCreationForgeTabId, string>>
  >
  creationForgeTab?: CharacterCreationForgeTabId
  /** Tab 6 trait sub-forge finalized (Morphus Review — Finalize Morphus clicked). */
  creationTraitForgeStubComplete?: boolean
  /** Nested Morphus / trait sub-forge state (creation only). */
  morphusForgeState?: MorphusForgeState
  /** Morphus Sub-Forge slot picks (Trait Forge tab). */
  morphusForgeSlotState?: MorphusForgeSlotState
  /** Spawn panel: player committed rolled H.P./S.D.C./P.P.E./I.S.P. */
  creationVitalityCommitted?: boolean
  /** Finalize tab — facade / single-form physical dice applied. */
  creationFacadeDiceFinalized?: boolean
  /** Traits tab — morphus vitality dice applied (Nightbane). */
  creationMorphusDiceFinalized?: boolean
  /** Step 3 — O.C.C. skill ids chosen in Skill Engine (mirrors sheet at Spawn). */
  creationOccSkillIds?: string[]
  /**
   * Step 3 — O.C.C. related skill picks (specialization + professional quality).
   * @deprecated Use {@link creationRelatedSkillPicks}; migrated on read.
   */
  creationRelatedSkillIds?: string[]
  /**
   * Step 3 — secondary skill picks (no O.C.C. category % bonus).
   * @deprecated Use {@link creationSecondarySkillPicks}; migrated on read.
   */
  creationSecondarySkillIds?: string[]
  /** Step 3 — O.C.C. related skill picks with optional specialization / professional tier. */
  creationRelatedSkillPicks?: readonly CreationSkillPick[]
  /** Step 3 — secondary skill picks with optional specialization / professional tier. */
  creationSecondarySkillPicks?: readonly CreationSkillPick[]
  /** O.C.C. core — Hand-to-Hand fighting style (defaults to none). */
  creationHandToHandTier?: CreationHandToHandTier
  /** Active creation phase (forge-character_creation.md / Forge engine). */
  creationPhase?: CreationPhase
  /** Phase I — eight manually entered pool values (physical dice). */
  creationAttributePool?: readonly (number | null)[]
  /** Phase I — rolled value slotted per attribute. */
  creationAttributeAssignments?: Partial<Record<ForgeAttrKey, number>>
  /** Phase I — pool index (0–7) assigned per attribute (disambiguates duplicate rolls). */
  creationAttributePoolSlots?: Partial<Record<ForgeAttrKey, number>>
  /** Phase I.2 — resolved O.C.C. variable dice (key = task id). */
  creationOccVariableResolutions?: Readonly<Record<string, number>>
  /**
   * Phase II — O.C.C. core voucher picks (voucher task id → slot picks).
   * Legacy saves may store plain skill id strings; migrated on read.
   */
  creationOccCoreVoucherPicks?: Readonly<
    Record<string, readonly (CreationSkillPick | string | null)[]>
  >
  /** Parameterized fixed O.C.C. core grants (skill id → pick with specialization). */
  creationOccGrantPickDetails?: Readonly<Record<string, CreationSkillPick>>
  /** Phase IV — manual dice results keyed by pending-dice id. */
  creationPendingDiceResolutions?: Readonly<Record<string, number>>
  /**
   * Active Morphus characteristic ids (Nightbane) — drives Morphus skill % modifiers
   * via `skillPercentResolution.ts`.
   */
  activeMorphusCharacteristicIds?: readonly string[]
  /** Sub-Forge trait slots (catalog + optional custom instance). Preferred over bare ids. */
  morphusTraitSlotResolutions?: readonly MorphusTraitSlotResolution[]
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
  /** Optional whitelist for cross-genre inventory lockout. */
  genresAvailable?: readonly string[]
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
