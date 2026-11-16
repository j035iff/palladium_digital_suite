import { useCharacter } from '../../../context/CharacterContext'
import { DevForgeShortcutButton } from './DevForgeShortcutButton'

export function DevAutoFillIdentityButton({
  variant = 'panel',
}: {
  variant?: 'panel' | 'header'
}) {
  const { devAutoFillIdentityDetails } = useCharacter()

  if (!import.meta.env.DEV || !devAutoFillIdentityDetails) {
    return null
  }

  return (
    <DevForgeShortcutButton
      variant={variant}
      label={
        variant === 'header' ? 'Auto-fill details' : 'Auto-fill character details'
      }
      title="Dev: fill name, identity profile, and alignment when missing"
      onClick={() => devAutoFillIdentityDetails()}
    />
  )
}
