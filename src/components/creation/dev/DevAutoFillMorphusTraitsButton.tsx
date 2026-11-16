import { useCharacter } from '../../../context/CharacterContext'
import { creationTraitsTabVisible } from '../../../lib/creationChromeGates'
import { DevForgeShortcutButton } from './DevForgeShortcutButton'

export function DevAutoFillMorphusTraitsButton({
  variant = 'panel',
}: {
  variant?: 'panel' | 'header'
}) {
  const { activeRace, activeOcc, devAutoFillMorphusTraits } = useCharacter()

  if (
    !import.meta.env.DEV ||
    !devAutoFillMorphusTraits ||
    !creationTraitsTabVisible(activeRace, activeOcc)
  ) {
    return null
  }

  return (
    <DevForgeShortcutButton
      variant={variant}
      label={variant === 'header' ? 'Auto-fill Traits' : 'Auto-select Morphus Traits (Path 1)'}
      title="Dev: Path 1 + random appearance archetype + random legal category picks"
      onClick={() => devAutoFillMorphusTraits()}
    />
  )
}
