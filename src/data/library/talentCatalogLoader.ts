import type {
  ActiveForm,
  Feature,
  FeatureActivation,
  FeatureActivationCost,
  PalladiumTalent,
  TalentUsableInNightbaneForm,
} from '../../types'
import palladiumTalents from '../content/palladiumTalents.json'

function loadTalentCatalog(): readonly PalladiumTalent[] {
  const rows = palladiumTalents as unknown
  return Array.isArray(rows) ? (rows as PalladiumTalent[]) : []
}

function formFromLimitations(
  usable?: TalentUsableInNightbaneForm,
): ActiveForm | undefined {
  if (usable === 'facade_only') return 'facade'
  if (usable === 'morphus_only') return 'morphus'
  return undefined
}

function resolveFormRequirement(row: PalladiumTalent): ActiveForm | undefined {
  const explicit = row.formRequirement
  if (explicit === 'facade' || explicit === 'morphus') {
    return explicit
  }
  return formFromLimitations(row.limitations?.usableInNightbaneForm)
}

function ppeActivationCost(base: unknown): FeatureActivationCost | undefined {
  if (base == null) return undefined
  if (typeof base === 'number') return { type: 'ppe', value: base }
  if (typeof base === 'string') return { type: 'ppe', value: base }
  if (typeof base === 'object') {
    const block = base as Record<string, unknown>
    const summary =
      typeof block.relativeToSummary === 'string'
        ? block.relativeToSummary
        : typeof block.summary === 'string'
          ? block.summary
          : 'Variable P.P.E.'
    return { type: 'ppe', value: summary }
  }
  return undefined
}

function buildActivation(row: PalladiumTalent): FeatureActivation | undefined {
  if (row.activation) {
    const cost =
      row.activation.cost?.type === 'none' ? undefined : row.activation.cost
    return { ...row.activation, cost }
  }

  const cost = ppeActivationCost(row.ppe?.baseActivation)
  if (!cost && !row.duration?.summary && !row.ranges?.length) return undefined

  const range =
    row.ranges?.[0]?.summary ??
    (typeof row.range === 'object' && row.range && 'summary' in row.range
      ? String((row.range as { summary?: string }).summary ?? '')
      : undefined)

  return {
    cost,
    range: range || undefined,
    duration: row.duration?.summary,
    save:
      typeof row.save === 'string'
        ? row.save
        : row.save && typeof row.save === 'object' && 'summary' in row.save
          ? String((row.save as { summary?: string }).summary ?? '')
          : undefined,
  }
}

/** Map a catalog row to the runtime {@link Feature} composer shape. */
export function palladiumTalentToFeature(row: PalladiumTalent): Feature {
  const form = resolveFormRequirement(row)
  const tier = row.talentTier ?? row.tier

  return {
    identity: {
      id: row.id,
      name: row.name,
      description: row.description,
      descriptionMorphus: row.descriptionMorphus,
      system: 'trait',
    },
    requirement: form != null ? { form } : undefined,
    modifiers: row.modifiers,
    activation: buildActivation(row),
    metadata: {
      pickBucket: 'talent',
      tier,
      tags: row.tags,
      ppe: row.ppe,
      limitations: row.limitations,
      ranges: row.ranges,
      duration: row.duration,
      damage: row.damage,
      prerequisites: row.prerequisites,
      incompatibleTalentIds: row.incompatibleTalentIds,
      notes: row.notes,
      durationType:
        row.duration?.kind === 'melee_round'
          ? 'melee'
          : row.duration?.kind === 'instant'
            ? 'instant'
            : 'narrative',
    },
  }
}

/** Nightbane talent catalog — `src/data/content/palladiumTalents.json`. */
export const PALLADIUM_TALENT_CATALOG: readonly PalladiumTalent[] = loadTalentCatalog()

export const TALENT_FEATURES: Feature[] = PALLADIUM_TALENT_CATALOG.map(
  palladiumTalentToFeature,
)

export function getPalladiumTalentById(id: string): PalladiumTalent | undefined {
  return PALLADIUM_TALENT_CATALOG.find((t) => t.id === id)
}

export function getTalentFeatureById(id: string): Feature | undefined {
  return TALENT_FEATURES.find((f) => f.identity.id === id)
}

export function listPalladiumTalentsForGameSystem(
  gameSystem: string,
): readonly PalladiumTalent[] {
  const g = gameSystem.toLowerCase()
  return PALLADIUM_TALENT_CATALOG.filter((t) =>
    t.gameSystems.some((x) => x.toLowerCase() === g),
  )
}
