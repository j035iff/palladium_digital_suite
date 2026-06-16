import { useCharacter } from '../../../context/CharacterContext'

export function DevSkipToMorphusButton() {
  const { devSkipToMorphusCreation } = useCharacter()

  if (!import.meta.env.DEV || !devSkipToMorphusCreation) {
    return null
  }

  return (
    <div className="mb-4 rounded-lg border border-dashed border-amber-500/80 bg-amber-50/80 p-3 dark:bg-amber-950/30">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
        Dev only — not in production builds
      </p>
      <button
        type="button"
        onClick={() => devSkipToMorphusCreation()}
        className="rounded-md border border-amber-600 bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-200 dark:border-amber-500 dark:bg-amber-900/60 dark:text-amber-50 dark:hover:bg-amber-900"
      >
        Skip to Morphus (Nightbane Basic)
      </button>
      <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-100/80">
        Sets Nightbane + Basic Skill Package, auto-fills attributes and skills,
        rolls facade dice, and opens the Morphus Sub-Forge.
      </p>
    </div>
  )
}
