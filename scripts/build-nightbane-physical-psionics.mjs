/**
 * Nightbane physical psionics (RPG pp. 77–83; Alter Aura through Total Recall).
 * Export for ingest merge; preserves existing Pass B encoding where present.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPsionicsFromDir } from './lib/psionics-catalog-fs.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const psionicsDir = join(root, 'src/data/content/psionics')

const source = (page) => ({
  gameSystem: 'nightbane',
  reference: 'Nightbane RPG',
  pageNumber: page,
})

/** Nightbane RPG physical section row ids in book order. */
export const NIGHTBANE_PHYSICAL_IDS = [
  'psionic_alter_aura',
  'psionic_bio_manipulation',
  'psionic_death_trance_physical',
  'psionic_ectoplasm',
  'psionic_electrokinesis',
  'psionic_hydrokinesis',
  'psionic_impervious_to_cold',
  'psionic_impervious_to_fire_heat',
  'psionic_impervious_to_poison_toxin',
  'psionic_levitation',
  'psionic_pyrokinesis',
  'psionic_resist_fatigue',
  'psionic_resist_hunger',
  'psionic_resist_thirst',
  'psionic_summon_inner_strength',
  'psionic_telekinesis',
  'psionic_total_recall',
]

/** @returns {Record<string, object>} patches keyed by id (Pass A fields + placement fixes). */
function passAPatches() {
  return {
    psionic_alter_aura: {
      sourcePage: 77,
      description:
        'A truly unique power that many psychic investigators claim is impossible and does not exist. Only a handful of physical psychics can manipulate their physical energy in such a way that it changes their aura. The altered aura will send the wrong message to those who can see auras. Alterations include: general level of experience can seem much lower (level 1 or 2) or much higher (2D4 levels higher); conceal psychic powers; conceal base P.P.E. (seem much lower); conceal magic.',
      isp: { baseActivation: 2 },
      range: { summary: 'Self' },
      duration: {
        summary: 'One hour per each level of experience.',
        kind: 'hour',
        perLevel: '1 hour',
      },
      save: { summary: 'None', saveKind: 'none' },
      limitations: { selfOnly: true },
    },
    psionic_total_recall: {
      sources: [source(77), source(83)],
      description:
        'The character remembers every word he reads. Specific blocks of information can be recalled in perfect detail at will. Each block costs 3 I.S.P. to recall in absolute detail. If all I.S.P. have been expended the memory is fuzzy — roll percentile for clarity.',
      isp: { baseActivation: 2, notes: 'Each block of information costs 3 I.S.P. to recall in absolute detail.' },
      range: { summary: 'Self' },
      duration: { summary: 'Permanent', kind: 'permanent' },
      limitations: { selfOnly: true },
      genrePlacements: [
        { genreId: 'nightbane', category: 'physical' },
        { genreId: 'nightbane', category: 'sensitive' },
      ],
      resolutionTable: {
        rollKind: 'd100',
        label: 'Recall clarity when I.S.P. is exhausted',
        resolutionTrigger: { when: 'on_duration_end', rollKind: 'd100' },
        entries: [
          {
            effect: 'Remembered in full detail, word for word.',
            percentile: { min: 1, max: 50 },
          },
          {
            effect: 'Details are forgotten, but the full essence of the ideas are clear.',
            percentile: { min: 51, max: 80 },
          },
          {
            effect: 'Can only recall the most basic concepts; no details nor strong comprehension.',
            percentile: { min: 81, max: 100 },
          },
        ],
      },
    },
  }
}

function applyPatch(row, patch) {
  const { sourcePage, sources, ...rest } = patch
  const next = { ...row, ...rest }
  if (sources != null) {
    next.sources = sources
  } else if (sourcePage != null) {
    next.sources = [source(sourcePage)]
  }
  if (!next.gameSystems) next.gameSystems = ['nightbane']
  if (!next.genrePlacements?.length) {
    next.genrePlacements = [{ genreId: 'nightbane', category: 'physical' }]
  }
  return next
}

/** @param {{ sensitiveTotalRecall?: object }} [options] */
export function buildNightbanePhysicalPsionics(options = {}) {
  const catalog = loadPsionicsFromDir(psionicsDir)
  const byId = new Map(catalog.map((row) => [row.id, row]))
  const patches = passAPatches()

  const rows = []
  for (const id of NIGHTBANE_PHYSICAL_IDS) {
    let row = byId.get(id)
    if (!row && id === 'psionic_total_recall' && options.sensitiveTotalRecall) {
      row = structuredClone(options.sensitiveTotalRecall)
    }
    if (!row) {
      throw new Error(`Missing catalog row for ${id}`)
    }
    row = structuredClone(row)
    if (patches[id]) {
      row = applyPatch(row, patches[id])
    } else {
      row.genrePlacements = [{ genreId: 'nightbane', category: 'physical' }]
    }
    rows.push(row)
  }
  return rows
}

if (process.argv[1]?.endsWith('build-nightbane-physical-psionics.mjs')) {
  const sensitive = loadPsionicsFromDir(psionicsDir).find((r) => r.id === 'psionic_total_recall')
  const rows = buildNightbanePhysicalPsionics({ sensitiveTotalRecall: sensitive })
  console.log(`Built ${rows.length} Nightbane physical psionics`)
  for (const row of rows) {
    console.log(`  ${row.id} — ${row.name} (p.${row.sources?.[0]?.pageNumber})`)
  }
}
