import { useMemo } from 'react'
import { useCharacter } from '../../../context/CharacterContext'
import { deriveMorphusSlotResolutionView } from '../../../lib/morphusSlotResolution'
import type { MorphusForgeState } from '../../../types'
import { MorphusSlotNodeView } from './MorphusSlotNodeView'

type Props = {
  morphusForgeState: MorphusForgeState
}

export function MorphusSlotResolutionPanel({ morphusForgeState }: Props) {
  const { character, morphusForgeSlotActions } = useCharacter()

  const view = useMemo(
    () => deriveMorphusSlotResolutionView(morphusForgeState, character.morphusForgeSlotState),
    [morphusForgeState, character.morphusForgeSlotState],
  )

  if (view.nodes.length === 0) {
    return (
      <p className="text-sm text-violet-300/80">
        Complete Crossroads selections first — an appearance archetype or Path 2 characteristic
        count is required before slots appear.
      </p>
    )
  }

  return (
    <section className="space-y-4" aria-labelledby="morphus-slot-resolution-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3
            id="morphus-slot-resolution-heading"
            className="text-sm font-bold uppercase tracking-wide text-violet-200"
          >
            Trait slots
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-violet-300/80">
            Pick-only resolution — choose from each list in order. Nested tables and combinations
            expand automatically below your selection.
          </p>
        </div>
        <p
          className={`text-xs font-bold uppercase tracking-wide ${
            view.complete ? 'text-emerald-400' : 'text-amber-300'
          }`}
          role="status"
        >
          {view.complete ? 'All slots resolved' : `${view.blockers.length} slot(s) remaining`}
        </p>
      </div>

      <div className="space-y-3">
        {view.nodes.map((node) => (
          <MorphusSlotNodeView
            key={node.path}
            node={node}
            actions={morphusForgeSlotActions}
            slotState={character.morphusForgeSlotState}
          />
        ))}
      </div>
    </section>
  )
}
