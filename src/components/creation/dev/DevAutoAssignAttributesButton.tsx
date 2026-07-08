import { useCharacter } from '../../../context/CharacterContext'
import { DevForgeShortcutButton } from './DevForgeShortcutButton'

export function DevAutoAssignAttributesButton({
  variant = 'panel',
}: {
  variant?: 'panel' | 'header'
}) {
  const { devAutoRollAndAssignAllAttributes } = useCharacter()

  if (!import.meta.env.DEV || !devAutoRollAndAssignAllAttributes) {
    return null
  }

  return (
    <DevForgeShortcutButton
      variant={variant}
      label={variant === 'header' ? 'Auto attributes' : 'Auto-roll and assign all attributes'}
      title="Dev: roll and assign all attribute pool values"
      onClick={() => devAutoRollAndAssignAllAttributes()}
    />
  )
}
