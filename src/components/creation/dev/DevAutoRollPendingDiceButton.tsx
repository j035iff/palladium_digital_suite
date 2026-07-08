import { useCharacter } from '../../../context/CharacterContext'
import { DevForgeShortcutButton } from './DevForgeShortcutButton'

export function DevAutoRollPendingDiceButton({
  variant = 'panel',
}: {
  variant?: 'panel' | 'header'
}) {
  const { devAutoRollAllPendingDice } = useCharacter()

  if (!import.meta.env.DEV || !devAutoRollAllPendingDice) {
    return null
  }

  return (
    <DevForgeShortcutButton
      variant={variant}
      label={variant === 'header' ? 'Auto-roll dice' : 'Roll all pending dice fields'}
      title="Dev: fill every pending physical dice field with random valid results"
      onClick={() => devAutoRollAllPendingDice()}
    />
  )
}
