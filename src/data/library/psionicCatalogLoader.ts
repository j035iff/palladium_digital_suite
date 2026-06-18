import type {
  Feature,
  FeatureActivation,
  FeatureActivationCost,
} from '../../types'
import type { PalladiumPsionicCatalogEntry } from './catalogTypes'

const psionicModules = import.meta.glob('../content/psionics/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, PalladiumPsionicCatalogEntry[]>

function loadPsionicCatalog(): readonly PalladiumPsionicCatalogEntry[] {
  const byId = new Map<string, PalladiumPsionicCatalogEntry>()
  for (const [path, rows] of Object.entries(psionicModules)) {
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      if (!row?.id) continue
      if (byId.has(row.id)) {
        throw new Error(
          `Duplicate psionic id "${row.id}" in catalog (e.g. ${path})`,
        )
      }
      byId.set(row.id, row)
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function resolveDurationType(
  row: PalladiumPsionicCatalogEntry,
): 'instant' | 'melee' | 'narrative' {
  const explicit = row.durationType
  if (explicit === 'instant' || explicit === 'melee' || explicit === 'narrative') {
    return explicit
  }
  const kind = (row.duration as { kind?: string } | undefined)?.kind
  if (kind === 'instant') return 'instant'
  if (kind === 'melee_round') return 'melee'
  return 'narrative'
}

function ispActivationCost(
  isp: PalladiumPsionicCatalogEntry['isp'],
): FeatureActivationCost | undefined {
  if (isp == null || typeof isp !== 'object') return undefined
  const block = isp as Record<string, unknown>
  const base = block.baseActivation
  if (base === 'none') return { type: 'none', value: 0 }
  if (typeof base === 'number') return { type: 'isp', value: base }
  if (typeof base === 'string' && base.length > 0) return { type: 'isp', value: base }
  return undefined
}

function buildActivation(row: PalladiumPsionicCatalogEntry): FeatureActivation | undefined {
  const cost = ispActivationCost(row.isp)
  const range =
    typeof row.range === 'object' && row.range && 'summary' in row.range
      ? String((row.range as { summary?: string }).summary ?? '')
      : typeof row.range === 'string'
        ? row.range
        : undefined
  const duration =
    typeof row.duration === 'object' && row.duration && 'summary' in row.duration
      ? String((row.duration as { summary?: string }).summary ?? '')
      : undefined
  const save =
    typeof row.save === 'string'
      ? row.save
      : row.save && typeof row.save === 'object' && 'summary' in row.save
        ? String((row.save as { summary?: string }).summary ?? '')
        : undefined

  if (!cost && !range && !duration && !save) return undefined
  return { cost, range: range || undefined, duration, save }
}

/** Map a catalog row to the runtime {@link Feature} composer shape. */
export function palladiumPsionicToFeature(
  row: PalladiumPsionicCatalogEntry,
): Feature {
  return {
    identity: {
      id: row.id,
      name: row.name,
      description: row.description,
      descriptionMorphus: row.descriptionMorphus,
      system: 'psionic',
    },
    activation: buildActivation(row),
    modifiers: row.combatBonuses as Record<string, number> | undefined,
    metadata: {
      pickBucket: 'psionic',
      durationType: resolveDurationType(row),
      genrePlacements: row.genrePlacements,
      innateStarter: row.innateStarter === true,
      isp: row.isp,
      range: row.range,
      duration: row.duration,
      save: row.save,
      limitations: row.limitations,
      subAbilities: row.subAbilities,
      healing: row.healing,
      damage: row.damage,
      backlash: row.backlash,
      grantedModifiers: row.grantedModifiers,
      inflictedModifiers: row.inflictedModifiers,
      sources: row.sources,
      gameSystems: row.gameSystems,
    },
  }
}

/** Palladium psionic catalog — `src/data/content/psionics/<category>.json`. */
export const PALLADIUM_PSIONIC_CATALOG: readonly PalladiumPsionicCatalogEntry[] =
  loadPsionicCatalog()

export const PSIONIC_FEATURES: Feature[] = PALLADIUM_PSIONIC_CATALOG.map(
  palladiumPsionicToFeature,
)

export function getPalladiumPsionicById(
  id: string,
): PalladiumPsionicCatalogEntry | undefined {
  return PALLADIUM_PSIONIC_CATALOG.find((row) => row.id === id)
}

export function getPsionicFeatureById(id: string): Feature | undefined {
  return PSIONIC_FEATURES.find((f) => f.identity.id === id)
}

export function getPsionicPlacementForGenre(
  row: PalladiumPsionicCatalogEntry,
  genreId: string,
): PalladiumPsionicCatalogEntry['genrePlacements'][number] | undefined {
  const g = genreId.toLowerCase()
  return row.genrePlacements.find((p) => p.genreId.toLowerCase() === g)
}

/** Powers pickable in creation for a genre (has a genrePlacements row). */
export function listPalladiumPsionicsForGenre(
  genreId: string,
): readonly PalladiumPsionicCatalogEntry[] {
  const g = genreId.toLowerCase()
  return PALLADIUM_PSIONIC_CATALOG.filter((row) =>
    row.gameSystems.some((sys) => sys.toLowerCase() === g) ||
    row.genrePlacements.some((p) => p.genreId.toLowerCase() === g),
  )
}

export function listPalladiumPsionicsForGenreCategory(
  genreId: string,
  category: string,
): readonly PalladiumPsionicCatalogEntry[] {
  const g = genreId.toLowerCase()
  const c = category.toLowerCase()
  return listPalladiumPsionicsForGenre(genreId).filter((row) =>
    row.genrePlacements.some(
      (p) => p.genreId.toLowerCase() === g && p.category.toLowerCase() === c,
    ),
  )
}

const PSIONIC_POOL_CATEGORY_ORDER = [
  'sensitive',
  'physical',
  'healer',
  'healing',
  'super',
] as const

/** Category ids present in the catalog for a genre, in standard pool order. */
export function listPsionicCategoryIdsForGenre(
  genreId: string,
): readonly string[] {
  const g = genreId.toLowerCase()
  const inCatalog = new Set<string>()
  for (const row of listPalladiumPsionicsForGenre(genreId)) {
    for (const placement of row.genrePlacements) {
      if (placement.genreId.toLowerCase() === g) {
        inCatalog.add(placement.category)
      }
    }
  }
  return PSIONIC_POOL_CATEGORY_ORDER.filter((id) => inCatalog.has(id))
}

export function formatPsionicIspCost(
  row: PalladiumPsionicCatalogEntry,
  genreId: string,
): string {
  const placement = getPsionicPlacementForGenre(row, genreId)
  const isp = (placement?.isp ?? row.isp) as Record<string, unknown> | undefined
  if (!isp) return '—'
  const base = isp.baseActivation
  if (base === 'none') return 'No I.S.P.'
  if (typeof base === 'number') return `${base} I.S.P.`
  if (typeof base === 'string') return base
  return 'Varies'
}
