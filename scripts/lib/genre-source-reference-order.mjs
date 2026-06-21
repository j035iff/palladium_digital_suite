/**
 * Genre master list for ordering sources[] when a row cites multiple books.
 *
 * Data: src/data/source/ingest-briefs/utils/genre-source-reference-order.json
 * Docs: docs/ingest/brief-format.md § Multi-book source order
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const orderPath = join(
  repoRoot,
  'src/data/source/ingest-briefs/utils/genre-source-reference-order.json',
)

let cachedOrderDoc = null

function loadOrderDoc() {
  if (!cachedOrderDoc) {
    cachedOrderDoc = JSON.parse(readFileSync(orderPath, 'utf8'))
  }
  return cachedOrderDoc
}

/** @returns {string[]} ordered bookKey slugs for genre, or null when no list exists */
export function getGenreBookKeys(genreId) {
  const books = loadOrderDoc().genres?.[genreId]?.books
  if (!books?.length) return null
  return books.map((b) => b.bookKey)
}

export function hasGenreReferenceOrder(genreId) {
  return getGenreBookKeys(genreId) != null
}

/** @returns {{ bookKey: string, title: string, defaultReference: string, referenceAliases: string[] }[] | null} */
export function getGenreReferenceOrder(genreId) {
  const genre = loadOrderDoc().genres?.[genreId]
  if (!genre?.books?.length) return null
  return genre.books
}

function normalizeReference(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[®™]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildAliasRankMap(genreId) {
  const books = getGenreReferenceOrder(genreId)
  if (!books) return null

  const rankByAlias = new Map()
  for (let rank = 0; rank < books.length; rank++) {
    const book = books[rank]
    const aliases = new Set([
      book.title,
      book.defaultReference,
      ...(book.referenceAliases ?? []),
    ])
    for (const alias of aliases) {
      rankByAlias.set(normalizeReference(alias), rank)
    }
  }
  return rankByAlias
}

/**
 * Rank for sorting sources[].reference (lower = earlier in master list).
 * Unknown references sort after all known books, stable by original index.
 */
export function referenceRank(genreId, reference) {
  const rankByAlias = buildAliasRankMap(genreId)
  if (!rankByAlias) return Number.POSITIVE_INFINITY
  return rankByAlias.get(normalizeReference(reference)) ?? Number.POSITIVE_INFINITY
}

/** Sort sources[] by genre master list; preserves relative order for ties / unknown refs. */
export function sortSourcesByGenreReferenceOrder(genreId, sources) {
  if (!Array.isArray(sources) || sources.length < 2) return sources
  if (!hasGenreReferenceOrder(genreId)) return sources

  return sources
    .map((source, index) => ({ source, index }))
    .sort((a, b) => {
      const rankA = referenceRank(genreId, a.source.reference)
      const rankB = referenceRank(genreId, b.source.reference)
      if (rankA !== rankB) return rankA - rankB
      return a.index - b.index
    })
    .map(({ source }) => source)
}

/** Human-readable warning when a genre ingest starts without a master list. */
export function missingGenreReferenceOrderMessage(genreId) {
  return (
    `No genre source reference order for "${genreId}". ` +
    `Before ingesting multi-book rows, ask the user for the canonical book order and add it to ` +
    `src/data/source/ingest-briefs/utils/genre-source-reference-order.json`
  )
}

/** @returns {string | null} warning text, or null when list exists or genre omitted */
export function genreReferenceOrderWarning(brief) {
  if (!brief?.genre) return null
  if (hasGenreReferenceOrder(brief.genre)) return null
  return missingGenreReferenceOrderMessage(brief.genre)
}
