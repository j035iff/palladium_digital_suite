import { useCharacter } from '../../../context/CharacterContext'
import {
  isMorphusForgeReviewDiceComplete,
  resolveMorphusForgeState,
  selectedAppearanceEntry,
} from '../../../lib/morphusForgeNavigation'
import { PendingDiceResolutionPanel } from '../PendingDiceResolutionPanel'
import { MorphusCustomTraitSlotsPanel } from './MorphusCustomTraitSlotsPanel'
import { SelectedMorphusTraitsPanel } from './SelectedMorphusTraitsPanel'

type Props = {
  morphusForgeState: ReturnType<typeof resolveMorphusForgeState>
  onFinalize: () => void
}

export function MorphusReviewTab({ morphusForgeState, onFinalize }: Props) {
  const {
    character,
    activeRace,
    effectiveOcc,
    psychicTier,
    supportsDualForm,
    setTraitForgeStubComplete,
  } = useCharacter()

  const state = morphusForgeState
  const entry = selectedAppearanceEntry(state)
  const finalized = character.creationTraitForgeStubComplete === true
  const diceReady = isMorphusForgeReviewDiceComplete(character, {
    supportsDualForm,
    psychicTier,
    race: activeRace,
    occ: effectiveOcc ?? undefined,
  })

  const handleFinalize = () => {
    if (!diceReady) return
    // Stub first so master Tab 6 validate sees Complete, then parent marks Green + advances.
    setTraitForgeStubComplete(true)
    onFinalize()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-violet-700/50 bg-slate-950/40 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-violet-300">
          Morphus summary
        </h3>
        <dl className="mt-2 grid gap-2 text-sm text-violet-100/90 sm:grid-cols-2">
          <div>
            <dt className="text-violet-400">Path</dt>
            <dd className="font-medium">
              {state.path === 'appearance'
                ? 'Path 1 — Appearance'
                : state.path === 'characteristics'
                  ? 'Path 2 — Personality Crafter'
                  : '—'}
            </dd>
          </div>
          {state.path === 'appearance' && entry ? (
            <div>
              <dt className="text-violet-400">Archetype</dt>
              <dd className="font-medium">{entry.name}</dd>
            </div>
          ) : null}
          {state.path === 'characteristics' && state.characteristicsPickCount != null ? (
            <div>
              <dt className="text-violet-400">Characteristics picks</dt>
              <dd className="font-medium">{state.characteristicsPickCount}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-3 text-xs text-violet-400/90">
          Inspect selected traits below. Enter Morphus vitality dice, then{' '}
          <strong>Finalize Morphus</strong> to mark master Tab 6 complete and continue — no
          second Continue click required.
        </p>
      </section>

      <SelectedMorphusTraitsPanel morphusForgeState={state} embedded />

      <PendingDiceResolutionPanel scope="morphus" variant="compact" />

      <MorphusCustomTraitSlotsPanel />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleFinalize}
          disabled={finalized || !diceReady}
          className="rounded-lg border-2 border-emerald-500 bg-emerald-900/40 px-4 py-2 text-xs font-bold uppercase text-emerald-50 hover:bg-emerald-900/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {finalized ? 'Morphus finalized' : 'Finalize Morphus'}
        </button>
        {!diceReady ? (
          <span className="text-xs text-amber-200">Enter all Morphus vitality dice first.</span>
        ) : finalized ? (
          <span className="text-xs text-emerald-200/90">
            Master Tab 6 is complete. Changing slots or dice returns it to incomplete.
          </span>
        ) : (
          <span className="text-xs text-violet-300/90">
            Finalize marks Tab 6 Green and opens the next master step.
          </span>
        )}
      </div>
    </div>
  )
}
