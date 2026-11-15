import type { PalladiumSourceRef } from '../types'

/** One citation line: "Nightbane RPG, p. 24" */
export function formatPalladiumSourceRef(source: PalladiumSourceRef): string {
  return `${source.reference}, p. ${source.pageNumber}`
}

/**
 * Book citation that tolerates a missing/zero page until ingest fills it
 * (sheet header / XP overlay rollovers — Joe 2026-11-15).
 */
export function formatPalladiumSourceCitation(
  source: Pick<PalladiumSourceRef, 'reference'> & {
    pageNumber?: number | null
  },
): string {
  const ref = source.reference?.trim()
  if (!ref) return ''
  const page = source.pageNumber
  if (page == null || !Number.isFinite(page) || page <= 0) return ref
  return `${ref}, p. ${page}`
}

/** Join multiple book citations for subtitles and tooltips. */
export function formatPalladiumSources(
  sources: readonly PalladiumSourceRef[] | undefined,
): string {
  if (!sources?.length) return ''
  return sources.map(formatPalladiumSourceRef).join(' · ')
}
