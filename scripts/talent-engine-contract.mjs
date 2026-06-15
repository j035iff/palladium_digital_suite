/**
 * Talent catalog ↔ engine contract (single source of truth for audit + ingest).
 *
 * Tier 1 — Chargen: consumed by talentCatalogLoader, talentSelectionGates,
 *   TalentsForgePanel, abilityLibrary, creation readiness.
 * Tier 2 — Play: stored for FeatureCard / combat resolution (partial / planned).
 *   Ingest during Pass B or when a batch explicitly includes play mechanics.
 */

/** Identity + catalog keys always allowed on a talent row. */
export const TALENT_IDENTITY_KEYS = [
  '$schema',
  'id',
  'name',
  'description',
  'descriptionMorphus',
  'gameSystems',
  'sources',
]

/** Tier 1 — required for a *complete* chargen-ready row (audit target after ingest). */
export const TALENT_TIER1_CHARGEN_KEYS = [
  'talentTier',
  'tier',
  'ppe',
  'limitations',
  'formRequirement',
  'prerequisites',
  'incompatibleTalentIds',
  'tags',
  'notes',
  'modifiers',
  'durationType',
  'ranges',
  'range',
  'duration',
  'areaOfEffect',
  'damage',
  'save',
  'activation',
  'pumpable',
]

/** Tier 1 shared / cross-tier structural blocks (also used at play time). */
export const TALENT_TIER1_SHARED_FEATURE_KEYS = [
  'combat',
  'resolutionTable',
  'permanentCosts',
  'spawnedPresence',
  'formTransformation',
  'materialComponents',
  'forgedOutputs',
]

/**
 * Tier 2 — play-mechanics blocks (schema-defined; not required for chargen).
 * Prefer these keys over ad-hoc top-level extensions during ingest Pass B.
 */
export const TALENT_TIER2_PLAY_KEYS = [
  'activationTime',
  'rangeMechanics',
  'createdObjects',
  'rangeAndArea',
  'penaltiesOnAffectedCharacters',
  'statusAlterations',
  'physicalCombatStatModifiers',
  'savingThrows',
  'physicalBonusesPenalties',
  'powerModes',
  'attacksAndDamage',
  'damageModifiersNote',
  'offensiveDamage',
  'mobilityBlocks',
  'statusEffects',
  'temporaryAbilitiesGranted',
  'combatMechanics',
  'vampiricResourceRecovery',
  'structureReinforcements',
  'grantedSkills',
  'passengerLimits',
  'recoveryStateUntilThreshold',
  'environmentalConstructs',
  'opponentConditionalModifiers',
  'retroactiveWindow',
  'jumpDistanceScaling',
  'passengerCompanionCapacity',
  'activationRequirements',
  'activationDamage',
  'alignmentGatedEffects',
  'bonusDamageVsNightlandsDenizens',
  'temporaryResourcePools',
  'environmentalAmplifiers',
  'reflectionMechanics',
  'attributeCost',
  'bonusesOnAlliedTargets',
  'attributeBurn',
  'comaHitPointBuffer',
  'skillsGranted',
  'penaltiesOnCaster',
  'healing',
  'objectsAffected',
  'swarmMechanics',
  'holdsAndEscapes',
  'damageTakenModifiers',
]

export const SCHEMA_TOP_LEVEL_KEYS = new Set([
  ...TALENT_IDENTITY_KEYS,
  ...TALENT_TIER1_CHARGEN_KEYS,
  ...TALENT_TIER1_SHARED_FEATURE_KEYS,
  ...TALENT_TIER2_PLAY_KEYS,
])

export const TALENT_ENGINE_CONTRACT = {
  tier1: {
    purpose: 'Character creation — picker, gates, PPE display, sources',
    consumers: [
      'talentCatalogLoader.palladiumTalentToFeature',
      'talentSelectionGates',
      'TalentsForgePanel',
      'creationAbilityBudget / abilityLibrary',
    ],
    completeRowRequires: {
      identity: TALENT_IDENTITY_KEYS.filter((k) => k !== '$schema'),
      tier: 'talentTier or tier (common | elite)',
      ppe: 'permanentBurnToAcquire + baseActivation',
      sources: 'at least one Dark Designs entry with pageNumber',
    },
  },
  tier2: {
    purpose: 'Active play — FeatureCard, combat, resource recovery (planned)',
    consumers: ['FeatureCard (display partial)', 'combat / feature engine (planned)'],
    keys: TALENT_TIER2_PLAY_KEYS,
  },
}

export function talentHasTier(talent) {
  const tier = talent.talentTier ?? talent.tier
  return typeof tier === 'string' && tier.length > 0
}

export function talentHasDarkDesignsSource(talent) {
  return (talent.sources ?? []).some(
    (s) =>
      typeof s?.reference === 'string' &&
      s.reference.toLowerCase().includes('dark designs') &&
      typeof s.pageNumber === 'number',
  )
}

export function talentPpeComplete(talent) {
  if (!talent.ppe) return false
  return (
    talent.ppe.permanentBurnToAcquire != null && talent.ppe.baseActivation != null
  )
}

/** True when row satisfies Tier 1 contract for chargen-ready ingest. */
export function isTier1ChargenComplete(talent) {
  return (
    Boolean(talent.id && talent.name && talent.description) &&
    Array.isArray(talent.gameSystems) &&
    talent.gameSystems.length > 0 &&
    Array.isArray(talent.sources) &&
    talent.sources.length > 0 &&
    talentHasTier(talent) &&
    talentPpeComplete(talent) &&
    talentHasDarkDesignsSource(talent)
  )
}

export function listSchemaDriftKeys(talent) {
  return Object.keys(talent).filter((k) => !SCHEMA_TOP_LEVEL_KEYS.has(k))
}

export function listTier2KeysPresent(talent) {
  return TALENT_TIER2_PLAY_KEYS.filter((k) => talent[k] != null)
}
