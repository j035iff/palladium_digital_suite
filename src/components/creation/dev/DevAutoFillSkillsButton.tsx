import { useCharacter } from '../../../context/CharacterContext'
import { DevForgeShortcutButton } from './DevForgeShortcutButton'

export function DevAutoFillSkillsButton({
  variant = 'panel',
}: {
  variant?: 'panel' | 'header'
}) {
  const { devAutoFillAllSkillSelections } = useCharacter()

  if (!import.meta.env.DEV || !devAutoFillAllSkillSelections) {
    return null
  }

  return (
    <DevForgeShortcutButton
      variant={variant}
      label={variant === 'header' ? 'Auto-fill skills' : 'Auto-fill all skill selections'}
      title="Dev: fill O.C.C., related, secondary, and Hand-to-Hand picks"
      onClick={() => devAutoFillAllSkillSelections()}
    />
  )
}
