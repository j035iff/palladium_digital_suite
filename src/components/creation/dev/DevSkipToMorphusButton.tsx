import { useCharacter } from '../../../context/CharacterContext'
import { DevForgeShortcutButton } from './DevForgeShortcutButton'

export function DevSkipToMorphusButton({
  variant = 'panel',
}: {
  variant?: 'panel' | 'header'
}) {
  const { devSkipToMorphusCreation } = useCharacter()

  if (!import.meta.env.DEV || !devSkipToMorphusCreation) {
    return null
  }

  if (variant === 'header') {
    return (
      <DevForgeShortcutButton
        variant="header"
        label="Skip → Morphus"
        title="Dev: Nightbane Basic through facade dice, jump to Morphus Sub-Forge"
        onClick={() => devSkipToMorphusCreation()}
      />
    )
  }

  return (
    <div className="mb-4 rounded-lg border border-dashed border-amber-500/80 bg-amber-50/80 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
        Dev only — not in production builds
      </p>
      <DevForgeShortcutButton
        variant="panel"
        label="Skip to Morphus (Nightbane Basic)"
        onClick={() => devSkipToMorphusCreation()}
      />
      <p className="mt-2 text-xs text-amber-900/80">
        Sets Nightbane + Basic Skill Package, auto-fills attributes and skills,
        rolls facade dice, and opens the Morphus Sub-Forge.
      </p>
    </div>
  )
}
