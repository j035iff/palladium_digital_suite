import type {

  Feature,

  FeatureActivation,

  FeatureActivationCost,

  PalladiumMagicSpell,

} from '../../types'

import {

  listMaterialComponentChecklist,

  resolveForgedOutputs,

  resolveMaterialRequirements,

  spellIsDowntimeRitual,

} from '../../lib/magicFeatureCrafting'

import { normalizeMagicSchool, resolveMagicSchool } from '../../lib/magicSchool'



const magicModules = import.meta.glob('../content/magic/*.json', {

  eager: true,

  import: 'default',

}) as Record<string, readonly PalladiumMagicSpell[]>



function schoolSlugFromModulePath(modulePath: string): string {

  const match = modulePath.match(/\/([^/]+)\.json$/)

  return match ? match[1] : ''

}



function loadMagicCatalog(): readonly PalladiumMagicSpell[] {

  const rows: PalladiumMagicSpell[] = []

  for (const [path, moduleRows] of Object.entries(magicModules)) {

    const fileSchool = schoolSlugFromModulePath(path)

    const list = Array.isArray(moduleRows) ? moduleRows : []

    for (const row of list) {

      const school = resolveMagicSchool(row, fileSchool)

      if (!school) continue

      rows.push({ ...row, school })

    }

  }

  return rows.sort((a, b) => a.id.localeCompare(b.id))

}



function resolveDurationType(

  row: PalladiumMagicSpell,

): 'instant' | 'melee' | 'narrative' | 'permanent' | 'concentration' {

  const explicit = row.durationType

  if (

    explicit === 'instant' ||

    explicit === 'melee' ||

    explicit === 'narrative' ||

    explicit === 'permanent' ||

    explicit === 'concentration'

  ) {

    return explicit

  }

  const kind = (row.duration as { kind?: string } | undefined)?.kind

  if (kind === 'instant') return 'instant'

  if (kind === 'melee_round') return 'melee'

  if (kind === 'permanent') return 'permanent'

  return 'narrative'

}



function ppeActivationCost(

  ppe: PalladiumMagicSpell['ppe'],

): FeatureActivationCost | undefined {

  if (ppe == null || typeof ppe !== 'object') return undefined

  const block = ppe as Record<string, unknown>

  const base = block.baseActivation

  if (base === 'none') return { type: 'none', value: 0 }

  if (typeof base === 'number') return { type: 'ppe', value: base }

  if (typeof base === 'string' && base.length > 0) return { type: 'ppe', value: base }

  return undefined

}



function buildActivation(row: PalladiumMagicSpell): FeatureActivation | undefined {

  const cost = ppeActivationCost(row.ppe)

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

export function palladiumMagicToFeature(row: PalladiumMagicSpell): Feature {

  const school = normalizeMagicSchool(row.school)

  return {

    identity: {

      id: row.id,

      name: row.name,

      description: row.description,

      descriptionMorphus: row.descriptionMorphus,

      system: 'magic',

    },

    activation: buildActivation(row),

    modifiers: row.combatBonuses,

    metadata: {

      pickBucket: 'magic',

      durationType: resolveDurationType(row),

      school,

      level: row.spellLevel,

      spellLevel: row.spellLevel,

      magicKind: row.magicKind,

      isRitual: row.isRitual === true,

      isDowntimeRitual: spellIsDowntimeRitual(row),

      ppe: row.ppe,

      range: row.range,

      duration: row.duration,

      save: row.save,

      limitations: row.limitations,

      grantedModifiers: row.grantedModifiers,

      inflictedModifiers: row.inflictedModifiers,

      resolutionTable: row.resolutionTable,

      permanentCosts: row.permanentCosts,

      materialComponents: resolveMaterialRequirements(row),

      materialChecklist: listMaterialComponentChecklist(row),

      forgedOutputs: resolveForgedOutputs(row),

      ritualProfile: row.ritualProfile,

      spawnedPresence: row.spawnedPresence,

      formTransformation: row.formTransformation,

      effectProfiles: row.effectProfiles,

      sources: row.sources,

      gameSystems: row.gameSystems,

      genrePlacements: row.genrePlacements,

    },

  }

}



/** All magic school catalogs — one JSON array per file under `src/data/content/magic/`. */

export const PALLADIUM_MAGIC_CATALOG: readonly PalladiumMagicSpell[] = loadMagicCatalog()



export const MAGIC_FEATURES: Feature[] = PALLADIUM_MAGIC_CATALOG.map(palladiumMagicToFeature)



export function getPalladiumMagicSpellById(id: string): PalladiumMagicSpell | undefined {

  return PALLADIUM_MAGIC_CATALOG.find((row) => row.id === id)

}



export function getMagicFeatureById(id: string): Feature | undefined {

  return MAGIC_FEATURES.find((f) => f.identity.id === id)

}



export function listPalladiumMagicForGameSystem(

  gameSystem: string,

): readonly PalladiumMagicSpell[] {

  const g = gameSystem.toLowerCase()

  return PALLADIUM_MAGIC_CATALOG.filter((row) =>

    row.gameSystems.some((sys) => sys.toLowerCase() === g),

  )

}

/** Distinct school slugs present in the catalog for a game system. */
export function listMagicSchoolIdsForGameSystem(gameSystem: string): string[] {
  const schools = new Set(
    listPalladiumMagicForGameSystem(gameSystem).map((row) =>
      normalizeMagicSchool(row.school),
    ),
  )
  return [...schools].sort((a, b) => a.localeCompare(b))
}

export function listPalladiumMagicForSchool(

  gameSystem: string,

  school: string,

): readonly PalladiumMagicSpell[] {

  const normalized = normalizeMagicSchool(school)

  return listPalladiumMagicForGameSystem(gameSystem).filter(

    (row) => normalizeMagicSchool(row.school) === normalized,

  )

}



export function listPalladiumMagicByMaxLevel(

  gameSystem: string,

  maxSpellLevel: number,

  school?: string,

): readonly PalladiumMagicSpell[] {

  const base = school

    ? listPalladiumMagicForSchool(gameSystem, school)

    : listPalladiumMagicForGameSystem(gameSystem)

  return base.filter((row) => row.spellLevel <= maxSpellLevel)

}



export function formatMagicPpeCost(row: PalladiumMagicSpell): string {

  const ppe = row.ppe as Record<string, unknown> | undefined

  if (!ppe) return '—'

  const base = ppe.baseActivation

  if (base === 'none') return 'No P.P.E.'

  if (typeof base === 'number') return `${base} P.P.E.`

  if (typeof base === 'string') return base

  return 'Varies'

}


