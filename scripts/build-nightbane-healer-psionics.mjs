/**
 * Nightbane healer psionics (RPG pp. 83–84).
 * Cleans legacy [cite: N] markers and refreshes Nightbane RPG rows.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPsionicsFromDir } from './lib/psionics-catalog-fs.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const psionicsDir = join(root, 'src/data/content/psionics')

/** Healer-section row ids (printed pp. 83–84). Suggestion lives on sensitive.json. */
export const NIGHTBANE_HEALER_IDS = [
  'psionic_deaden_pain',
  'psionic_exorcism',
  'psionic_healing_touch',
  'psionic_impervious_to_cold_healer',
  'psionic_impervious_to_fire_healer',
  'psionic_increased_healing',
  'psionic_induce_pain',
  'psionic_induce_sleep',
  'psionic_psychic_diagnosis',
  'psionic_psychic_purification',
  'psionic_psychic_surgery',
  'psionic_resist_fatigue_healer',
]

const CITE_RE = /\s*\[cite:\s*[^\]]+\]/gi

/** @param {unknown} value */
function stripCites(value) {
  if (typeof value === 'string') return value.replace(CITE_RE, '').replace(/\s{2,}/g, ' ').trim()
  if (Array.isArray(value)) return value.map(stripCites)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripCites(v)]))
  }
  return value
}

/** @param {object} row */
function sanitizeHealerRow(row) {
  const next = stripCites(structuredClone(row))
  next.name = String(next.name).replace(CITE_RE, '').trim()
  if (next.baseSkill?.notes) {
    next.baseSkill.notes = next.baseSkill.notes.replace(/\s+/g, ' ').trim()
  }
  return next
}

/** @returns {object[]} */
export function buildNightbaneHealerPsionics() {
  const catalog = loadPsionicsFromDir(psionicsDir)
  const byId = new Map(catalog.map((row) => [row.id, row]))
  return NIGHTBANE_HEALER_IDS.map((id) => {
    const row = byId.get(id)
    if (!row) throw new Error(`Missing catalog row for ${id}`)
    return sanitizeHealerRow(row)
  })
}

/** Suggestion healer placement — must remain on sensitive.json primary file. */
export function assertSuggestionHealerDualPlacement() {
  const suggestion = loadPsionicsFromDir(psionicsDir).find((r) => r.id === 'psionic_suggestion')
  if (!suggestion) throw new Error('Missing psionic_suggestion')
  const healer = suggestion.genrePlacements?.find(
    (p) => p.genreId === 'nightbane' && p.category === 'healer',
  )
  if (!healer) throw new Error('psionic_suggestion missing nightbane healer genrePlacement')
  const hasHealerSource = suggestion.sources?.some(
    (s) => s.reference === 'Nightbane RPG' && s.pageNumber === 84,
  )
  if (!hasHealerSource) throw new Error('psionic_suggestion missing Nightbane RPG p. 84 source')
  return suggestion
}

if (process.argv[1]?.endsWith('build-nightbane-healer-psionics.mjs')) {
  const rows = buildNightbaneHealerPsionics()
  assertSuggestionHealerDualPlacement()
  console.log(`Built ${rows.length} Nightbane healer psionics`)
  for (const row of rows) {
    const page = row.sources?.[0]?.pageNumber
    console.log(`  ${row.id} — ${row.name} (p.${page})`)
  }
  console.log('  psionic_suggestion — dual sensitive+healer (sensitive.json)')
}
