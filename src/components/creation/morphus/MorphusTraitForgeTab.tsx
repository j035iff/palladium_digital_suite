import {
  resolveMorphusForgeState,
  selectedAppearanceEntry,
} from '../../../lib/morphusForgeNavigation'
import { path2CharacteristicsCountValid } from '../../../lib/morphusSlotResolution'
import { MorphusSlotResolutionPanel } from './MorphusSlotResolutionPanel'

type Props = {
  morphusForgeState: ReturnType<typeof resolveMorphusForgeState>
}

export function MorphusTraitForgeTab({ morphusForgeState }: Props) {
  const state = morphusForgeState
  const appearanceEntry = selectedAppearanceEntry(state)

  if (!state.path) {
    return (
      <p className="text-sm text-amber-200" role="alert">
        Complete the Crossroads tab first — choose Path 1 or Path 2.
      </p>
    )
  }

  if (state.path === 'characteristics' && !path2CharacteristicsCountValid(state)) {
    return (
      <p className="text-sm text-amber-200" role="alert">
        Enter your Path 2 characteristic count on the Crossroads tab first.
      </p>
    )
  }

  if (state.path === 'characteristics') {
    return (
      <div className="space-y-6">
        <p className="max-w-2xl text-sm text-violet-100/90">
          Resolve {state.characteristicsPickCount} Characteristics selection
          {state.characteristicsPickCount === 1 ? '' : 's'} for your Personality Crafter form.
        </p>
        <MorphusSlotResolutionPanel morphusForgeState={state} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-violet-200/90">
        Resolve trait slots for <strong>{appearanceEntry?.name ?? 'your archetype'}</strong>.
        Pick from each list — no d100 entry required.
      </p>
      <MorphusSlotResolutionPanel morphusForgeState={state} />
    </div>
  )
}
