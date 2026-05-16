import type { PalladiumSourceRef } from '../types'

/** One citation line: "Nightbane RPG, p. 24" */
export function formatPalladiumSourceRef(source: PalladiumSourceRef): string {
  return `${source.reference}, p. ${source.pageNumber}`
}

/** Join multiple book citations for subtitles and tooltips. */
export function formatPalladiumSources(
  sources: readonly PalladiumSourceRef[] | undefined,
): string {
  if (!sources?.length) return ''
  return sources.map(formatPalladiumSourceRef).join(' · ')
}
