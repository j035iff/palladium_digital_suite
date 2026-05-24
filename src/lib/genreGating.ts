/** Asset rows that declare which host genres may use them at runtime. */
export type GenreWhitelistCarrier = {
  genresAvailable?: readonly string[]
  gameSystems?: readonly string[]
}

export function resolveGenresAvailable(
  row: GenreWhitelistCarrier | null | undefined,
): readonly string[] {
  if (!row) return []
  if (row.genresAvailable?.length) return row.genresAvailable
  if (row.gameSystems?.length) return row.gameSystems
  return []
}

export function isWhitelistedForHostGenre(
  row: GenreWhitelistCarrier | null | undefined,
  hostGenreId: string,
): boolean {
  const list = resolveGenresAvailable(row)
  if (!list.length) return true
  const host = hostGenreId.toLowerCase()
  return list.some((g) => g.toLowerCase() === host)
}

export function occMatchesAllTags(
  tags: readonly string[] | undefined,
  activeTags: readonly string[],
): boolean {
  if (!activeTags.length) return true
  const occTags = tags ?? []
  return activeTags.every((t) =>
    occTags.some((ot) => ot.toLowerCase() === t.toLowerCase()),
  )
}
