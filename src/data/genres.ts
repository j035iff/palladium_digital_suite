/** Canonical setting / genre slugs (Setting-First Paradigm). */
export type GenreId = 'nightbane' | 'rifts' | 'palladium_fantasy'

export type GenreManifestEntry = {
  id: GenreId
  label: string
  description: string
  /** Shown in create menu; false = coming soon (visible, not selectable). */
  playable?: boolean
  /** Emoji / symbol for launcher menu rows. */
  icon?: string
}

/** Playable settings for new character creation (Setting-First gate). */
export const GENRE_MANIFEST: readonly GenreManifestEntry[] = [
  {
    id: 'nightbane',
    label: 'Nightbane',
    description: 'Dark fantasy modern — Facade and Morphus forms, psychic matrices.',
    playable: true,
    icon: '🌙',
  },
  {
    id: 'rifts',
    label: 'Rifts',
    description: 'Post-apocalyptic megaversal — M.D.C. scaling and techno-wizardry.',
    playable: true,
    icon: '🎲',
  },
  {
    id: 'palladium_fantasy',
    label: 'Palladium Fantasy',
    description: 'Classic fantasy O.C.C.s, skills, and percentile systems.',
    playable: true,
    icon: '🐉',
  },
] as const

/** Extended launcher menu (includes roadmap rows — deduped, no repeats). */
export const LAUNCHER_CREATE_OPTIONS: readonly {
  id: GenreId | string
  label: string
  icon: string
  playable: boolean
  description?: string
}[] = [
  ...GENRE_MANIFEST.map((g) => ({
    id: g.id,
    label: g.label,
    icon: g.icon ?? '•',
    playable: g.playable !== false,
    description: g.description,
  })),
  {
    id: 'rifts_aftermath',
    label: 'Rifts (Aftermath)',
    icon: '🎲',
    playable: false,
    description: 'Roadmap — not yet wired to a genre manifest.',
  },
  {
    id: 'fantasy_generic',
    label: 'Fantasy (Generic)',
    icon: '💀',
    playable: false,
  },
  {
    id: 'scifi_generic',
    label: 'Sci-Fi (Generic)',
    icon: '👽',
    playable: false,
  },
] as const

export function formatGenreSlug(slug: string): string {
  return getGenreManifest(slug)?.label ?? slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getGenreManifest(id: string): GenreManifestEntry | undefined {
  return GENRE_MANIFEST.find((g) => g.id === id)
}

export function isGenreId(value: string): value is GenreId {
  return GENRE_MANIFEST.some((g) => g.id === value)
}
