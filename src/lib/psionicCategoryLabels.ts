import psionicGenreCategories from '../data/content/psionic_genre_categories.json'

type GenreCategoryRef = {
  id: string
  label: string
}

const genres = psionicGenreCategories.genres as Record<
  string,
  { categories?: readonly GenreCategoryRef[] }
>

function normalizeCategoryLabel(label: string, categoryId: string): string {
  if (categoryId === 'super') return 'Super/Master Abilities'
  return label
    .replace(/^Psychic\s+/i, '')
    .replace(/\s+Psionics$/i, ' Abilities')
}

export function psionicCategoryLabel(
  genreId: string,
  categoryId: string,
): string {
  const categories = genres[genreId]?.categories ?? []
  const match = categories.find((c) => c.id === categoryId)
  const raw = match?.label ?? categoryId
  return normalizeCategoryLabel(raw, categoryId)
}

/** Filter chip label (same normalization as {@link psionicCategoryLabel}). */
export function psionicCategoryFilterLabel(
  genreId: string,
  categoryId: string,
): string {
  return psionicCategoryLabel(genreId, categoryId)
}

export function psionicCategoriesForGenre(
  genreId: string,
): readonly GenreCategoryRef[] {
  return genres[genreId]?.categories ?? []
}
