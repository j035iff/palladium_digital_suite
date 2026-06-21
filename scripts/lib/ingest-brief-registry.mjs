/**
 * Content-type metadata for ingest briefs.
 * Single source for batch sizes, playbooks, validation commands, and required options.
 */

/** @typedef {'A' | 'B'} IngestPass */

/**
 * @typedef {object} ContentTypeDef
 * @property {string} playbook
 * @property {string} label
 * @property {Record<IngestPass, { default: number, max?: number, min?: number }>} batchSize
 * @property {string} itemField
 * @property {string[]} validateCommands
 * @property {Record<string, 'required' | 'optional'>} options
 * @property {Record<IngestPass, string>} defaultScope
 * @property {string} [specialMode]
 */

/** @type {Record<string, ContentTypeDef>} */
export const INGEST_CONTENT_TYPES = {
  skills: {
    playbook: 'docs/ingest/skills.md',
    label: 'Skills',
    batchSize: { A: { default: 6, min: 1 }, B: { default: 3, max: 4, min: 1 } },
    itemField: 'skills',
    validateCommands: ['validate:schemas', 'audit:skills'],
    options: { category: 'optional', genre: 'required' },
    defaultScope: { A: 'catalog-only', B: 'include mechanics' },
  },
  hth: {
    playbook: 'docs/ingest/hth.md',
    label: 'Hand-to-Hand',
    batchSize: { A: { default: 1, min: 1 }, B: { default: 1, min: 1 } },
    itemField: 'handToHand',
    validateCommands: ['validate:schemas'],
    options: { genre: 'required' },
    defaultScope: { A: 'progression-only', B: 'include O.C.C. links' },
  },
  weapon_proficiencies: {
    playbook: 'docs/ingest/weapon_proficiencies.md',
    label: 'Weapon Proficiencies',
    batchSize: { A: { default: 2, max: 3, min: 1 }, B: { default: 1, min: 1 } },
    itemField: 'wps',
    validateCommands: ['validate:schemas'],
    options: { category: 'required', genre: 'required' },
    defaultScope: { A: 'catalog-only', B: 'bundle update' },
  },
  magic: {
    playbook: 'docs/ingest/magic.md',
    label: 'Magic',
    batchSize: { A: { default: 4, min: 1 }, B: { default: 2, max: 3, min: 1 } },
    itemField: 'spells',
    validateCommands: ['validate:schemas'],
    options: { school: 'required', genre: 'required' },
    defaultScope: { A: 'catalog-only', B: 'include mechanics' },
  },
  psionics: {
    playbook: 'docs/ingest/psionics.md',
    label: 'Psionics',
    batchSize: { A: { default: 4, min: 1 }, B: { default: 2, max: 3, min: 1 } },
    itemField: 'powers',
    validateCommands: ['validate:schemas'],
    options: { category: 'required', genre: 'required' },
    defaultScope: { A: 'catalog-only', B: 'include mechanics' },
  },
  occs: {
    playbook: 'docs/ingest/occs.md',
    label: 'O.C.C.s',
    batchSize: { A: { default: 1, min: 1 }, B: { default: 1, min: 1 } },
    itemField: 'occs',
    validateCommands: ['validate:schemas'],
    options: { genre: 'required', pairedRcc: 'optional', xpTablePages: 'optional' },
    defaultScope: { A: 'composition-only', B: 'include deep modules' },
  },
  races: {
    playbook: 'docs/ingest/races.md',
    label: 'Races',
    batchSize: { A: { default: 1, min: 1 }, B: { default: 1, min: 1 } },
    itemField: 'races',
    validateCommands: ['validate:schemas'],
    options: { audience: 'required', genre: 'required', pairedShadowOcc: 'optional' },
    defaultScope: { A: 'composition-only', B: 'include deep modules' },
  },
  xp_tables: {
    playbook: 'docs/ingest/xp_tables.md',
    label: 'XP Tables',
    batchSize: { A: { default: 1, min: 1 }, B: { default: 1, min: 1 } },
    itemField: 'tables',
    validateCommands: ['validate:schemas'],
    options: { bookFile: 'required', genre: 'required', occIds: 'optional' },
    defaultScope: { A: 'catalog-only', B: 'book bundle hygiene' },
  },
  talents: {
    playbook: 'docs/ingest/talents.md',
    label: 'Talents',
    batchSize: { A: { default: 4, min: 1 }, B: { default: 2, max: 3, min: 1 } },
    itemField: 'talents',
    validateCommands: ['validate:schemas', 'audit:talents'],
    options: { pool: 'optional' },
    defaultScope: { A: 'chargen-only', B: 'include play mechanics' },
  },
  morphus: {
    playbook: 'docs/ingest/morphus.md',
    label: 'Morphus',
    batchSize: { A: { default: 3, min: 1 }, B: { default: 1, max: 2, min: 1 } },
    itemField: 'traits',
    validateCommands: ['validate:schemas', 'validate:morphus'],
    options: {
      table: 'required',
      section: 'optional',
      tableCategory: 'optional',
      mode: 'optional',
      tableHeading: 'optional',
      targetJson: 'optional',
      books: 'optional',
    },
    defaultScope: { A: 'catalog-only', B: 'include mechanics' },
    specialMode: 'table_pipeline',
  },
  encounters: {
    playbook: 'docs/ingest/encounters.md',
    label: 'Encounter Archetypes',
    batchSize: { A: { default: 5, min: 1, max: 8 }, B: { default: 1, min: 1 } },
    itemField: 'archetypes',
    validateCommands: ['validate:schemas'],
    options: { section: 'required', genre: 'required' },
    defaultScope: { A: 'composition-only', B: 'GM module hooks' },
  },
}

export const INGEST_BRIEF_VERSION = 1

export const VALID_GENRES = [
  'nightbane',
  'rifts',
  'palladium_fantasy',
  'heroes_unlimited',
  'robotech',
  'after_the_bomb',
]

export function getContentType(type) {
  const def = INGEST_CONTENT_TYPES[type]
  if (!def) {
    throw new Error(
      `Unknown contentType "${type}". Valid: ${Object.keys(INGEST_CONTENT_TYPES).join(', ')}`,
    )
  }
  return def
}

export function defaultBatchSize(type, pass) {
  const def = getContentType(type)
  const p = pass === 'B' ? 'B' : 'A'
  return def.batchSize[p].default
}

/** @returns {IngestPass[]} */
export function resolvePassPhases(briefPass) {
  if (briefPass === 'AB') return ['A', 'B']
  return [briefPass === 'B' ? 'B' : 'A']
}

export function isPhasedAbRun(brief) {
  return brief.pass === 'AB'
}

export function formatPageRange(pages) {
  if (pages == null) return ''
  if (typeof pages === 'string') return pages
  const start = pages.start ?? pages.from
  const end = pages.end ?? pages.to ?? start
  if (start == null) return ''
  return start === end ? `p. ${start}` : `pp. ${start}–${end}`
}

export function chunkItems(items, size) {
  const list = items.filter(Boolean)
  const chunks = []
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size))
  }
  return chunks
}
