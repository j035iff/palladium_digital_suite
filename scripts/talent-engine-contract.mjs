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
      form:
        'limitations.usableInNightbaneForm defaults to morphus_only; use limitations.formUsage when rules differ by target or phase',
    },
  },
  tier2: {
    purpose: 'Active play — FeatureCard, combat, resource recovery (planned)',
    consumers: ['FeatureCard (display partial)', 'combat / feature engine (planned)'],
    keys: TALENT_TIER2_PLAY_KEYS,
  },
}

/** Default when prose does not allow Facade use — see `inferTalentUsableInNightbaneForm`. */
export const TALENT_DEFAULT_USABLE_FORM = 'morphus_only'

/** Concatenate catalog text scanned for Facade / Morphus form rules during ingest. */
export function collectTalentFormEvidenceText(talent) {
  const baseActivation = talent.ppe?.baseActivation
  const activationSummary =
    baseActivation != null && typeof baseActivation === 'object'
      ? baseActivation.summary
      : undefined

  return [
    talent.name,
    talent.description,
    talent.descriptionMorphus,
    talent.notes,
    talent.limitations?.otherLimitations,
    talent.limitations?.formUsage
      ? JSON.stringify(talent.limitations.formUsage)
      : undefined,
    talent.formRequirement,
    talent.ppe?.notes,
    activationSummary,
  ]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ')
}

export function talentImpliesBothFormsSpecial(talent, text = collectTalentFormEvidenceText(talent)) {
  if (talent.limitations?.formUsage?.byTarget || talent.limitations?.formUsage?.phases?.ongoingUse) {
    return true
  }
  if (
    talent.limitations?.usableInNightbaneForm === 'both_forms_note_special' ||
    talent.limitations?.usableInNightbaneForm === 'varies_by_scope'
  ) {
    return true
  }
  if (/activation requires morphus form only/i.test(text)) {
    return false
  }
  if (/feign death on self.*facade or morphus.*debilitate opponent.*morphus/i.test(text)) {
    return true
  }
  if (
    /on self:.*facade or morphus.*on others:.*morphus form only/i.test(text)
  ) {
    return true
  }
  if (/planting the seed requires morphus.*after.*(?:facade or morphus)/i.test(text)) {
    return true
  }
  if (/must be in morphus form to plant;\s*subsequent abilities usable in facade or morphus/i.test(text)) {
    return true
  }
  if (
    /can be used in facade form.*(?:but|must|however).*(?:morphus|morphus form)/i.test(text)
  ) {
    return true
  }
  if (/different (?:rules|effects|limitations).*facade.*morphus/i.test(text)) {
    return true
  }
  return false
}

export function talentImpliesFacadeOnly(talent, text = collectTalentFormEvidenceText(talent)) {
  if (/activation requires morphus form/i.test(text)) {
    return false
  }
  if (/\bfacade form only\b/i.test(text)) return true
  if (/\bonly (?:in|works in|available in|usable in) facade\b/i.test(text)) return true
  if (/\bwhile in facade form\b/i.test(text)) return true
  if (/\bin facade form to\b/i.test(text)) return true
  if (/\b(?:heal|reshape) facade\b/i.test(talent.name ?? '')) return true
  return false
}

export function talentImpliesEitherOrFacadeUse(
  talent,
  text = collectTalentFormEvidenceText(talent),
) {
  if (/double(?:s|d)?\s+(?:the\s+)?(?:total\s+)?(?:activation\s+)?(?:cost|p\.p\.e\.).*facade/i.test(text)) {
    return true
  }
  if (/\b(?:used|use(?:d|able)?)\s+in\s+facade\s+form\b/i.test(text)) return true
  if (/\bif used in facade form\b/i.test(text)) return true
  if (/\bcan be used in facade form\b/i.test(text)) return true
  if (/\bin facade or morphus\b/i.test(text)) return true
  if (/\b(?:usable|available|works) in (?:either|both)\b/i.test(text)) return true
  if (/\bif killed in facade\b/i.test(text)) return true
  return false
}

/**
 * Infer `limitations.usableInNightbaneForm` from catalog prose.
 * **Default: morphus_only** unless Facade / either-form use is stated in the row text.
 */
export function inferTalentUsableInNightbaneForm(talent) {
  const formUsage = talent.limitations?.formUsage
  if (formUsage?.byTarget) {
    return 'varies_by_scope'
  }
  if (formUsage?.phases) {
    const activation = formUsage.phases.activation
    const ongoing = formUsage.phases.ongoingUse
    if (activation && !ongoing && activation.form === 'morphus_only') {
      return 'morphus_only'
    }
    return 'varies_by_scope'
  }

  const text = collectTalentFormEvidenceText(talent)
  if (talentImpliesBothFormsSpecial(talent, text)) return 'both_forms_note_special'
  if (talentImpliesFacadeOnly(talent, text)) return 'facade_only'
  if (talentImpliesEitherOrFacadeUse(talent, text)) return 'either_form'
  return TALENT_DEFAULT_USABLE_FORM
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
