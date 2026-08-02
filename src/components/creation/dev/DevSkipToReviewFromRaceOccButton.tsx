import { useCharacter } from '../../../context/CharacterContext'
import { DevForgeShortcutButton } from './DevForgeShortcutButton'

export function DevSkipToReviewFromRaceOccButton({
  variant = 'panel',
}: {
  variant?: 'panel' | 'header'
}) {
  const { devSkipToReviewFromRaceOcc } = useCharacter()

  if (!import.meta.env.DEV || !devSkipToReviewFromRaceOcc) {
    return null
  }

  return (
    <DevForgeShortcutButton
      variant={variant}
      label={variant === 'header' ? 'Skip → Review' : 'Auto-complete → Review & Spawn'}
      title="Dev: current race/O.C.C. through Review & Spawn (Morphus, spells, psionics when needed)"
      onClick={() => devSkipToReviewFromRaceOcc()}
    />
  )
}
