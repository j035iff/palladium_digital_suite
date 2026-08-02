import { useCharacter } from '../../../context/CharacterContext'
import { DevForgeShortcutButton } from './DevForgeShortcutButton'

export function DevSkipToReviewFromMorphusButton({
  variant = 'panel',
}: {
  variant?: 'panel' | 'header'
}) {
  const { devSkipToReviewFromMorphus } = useCharacter()

  if (!import.meta.env.DEV || !devSkipToReviewFromMorphus) {
    return null
  }

  return (
    <DevForgeShortcutButton
      variant={variant}
      label={variant === 'header' ? 'Skip → Review' : 'Auto Morphus → Review & Spawn'}
      title="Dev: fill Morphus traits, talent, identity, roll Morphus dice, jump to Review & Spawn"
      onClick={() => devSkipToReviewFromMorphus()}
    />
  )
}
