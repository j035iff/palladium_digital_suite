import { useCharacter } from '../../../context/CharacterContext'
import { DevForgeShortcutButton } from './DevForgeShortcutButton'

export function DevAutoFillAbilitiesButton({
  variant = 'panel',
}: {
  variant?: 'panel' | 'header'
}) {
  const { devAutoFillAllAbilitySelections } = useCharacter()

  if (!import.meta.env.DEV || !devAutoFillAllAbilitySelections) {
    return null
  }

  return (
    <DevForgeShortcutButton
      variant={variant}
      label={variant === 'header' ? 'Auto-fill abilities' : 'Auto-select all abilities'}
      title="Dev: randomly fill legal spell, psionic, and talent picks (respects gates/prereqs)"
      onClick={() => devAutoFillAllAbilitySelections()}
    />
  )
}
