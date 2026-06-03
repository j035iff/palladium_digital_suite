import { useMemo } from 'react'
import { OccSelector } from './OccSelector'
import { AttributeForge } from './AttributeForge'
import { PsychicGate } from './PsychicGate'
import { SkillEngine } from './SkillEngine'
import { AbilitySelection } from './AbilitySelection'
import { CreationReviewFinalize } from './CreationReviewFinalize'
import { OccVariableBonusPhase } from './OccVariableBonusPhase'
import { CreationAttributeHeader } from './CreationAttributeHeader'
import { LiveLedger } from './LiveLedger'
import { useCharacter } from '../../context/CharacterContext'
import {
  buildCreationFlowContext,
  canAdvanceFromPhase,
  creationPhaseLabel,
  defaultCreationPhase,
  nextCreationPhase,
  normalizeCreationPhase,
  orderedCreationPhases,
  prevCreationPhase,
  type CreationPhase,
} from '../../lib/creationStep'
import { assessCreationReviewBlockers } from '../../lib/creationReadiness'

function MorphusPlaceholder() {
  return (
    <section aria-labelledby="morphus-phase-heading">
      <h2
        id="morphus-phase-heading"
        className="mb-2 text-sm font-semibold uppercase tracking-wide text-violet-300"
      >
        Phase II.5: Morphus Forge
      </h2>
      <p className="max-w-2xl text-sm text-violet-200/90">
        Nightbane Morphus generation is handled by a dedicated subsystem (see morphus
        spec). Continue when your table picks are ready — full forge UI ships in a
        follow-up stream.
      </p>
    </section>
  )
}

function PhaseBody({ phase }: { phase: CreationPhase }) {
  switch (phase) {
    case 'configurator':
      return <OccSelector />
    case 'attributes':
      return <AttributeForge />
    case 'occVariableBonus':
      return <OccVariableBonusPhase />
    case 'psychicGate':
      return <PsychicGate />
    case 'skills':
      return <SkillEngine />
    case 'morphus':
      return <MorphusPlaceholder />
    case 'abilities':
      return <AbilitySelection />
    case 'review':
      return (
        <CreationReviewFinalize
          onSpawnConfirm={(finalize) => {
            finalize()
          }}
        />
      )
    default:
      return null
  }
}

export function CreationFlowShell({
  onSpawnFinalize,
}: {
  onSpawnFinalize?: (finalize: () => void) => void
}) {
  const {
    character,
    rawCharacter,
    activeRace,
    effectiveOcc,
    creationGenreId,
    setCreationPhase,
  } = useCharacter()

  const flowCtx = useMemo(
    () =>
      buildCreationFlowContext(
        character,
        activeRace,
        effectiveOcc ?? undefined,
        creationGenreId,
      ),
    [character, activeRace, effectiveOcc, creationGenreId],
  )

  const phase = normalizeCreationPhase(
    rawCharacter.creationPhase ?? defaultCreationPhase(),
    flowCtx,
  )

  const phases = orderedCreationPhases(flowCtx)
  const phaseIndex = phases.indexOf(phase)

  const advanceCheck = canAdvanceFromPhase(
    phase,
    character,
    activeRace,
    effectiveOcc ?? undefined,
    flowCtx,
  )

  const reviewBlockers = assessCreationReviewBlockers({
    ...character,
    creationGenreId,
  })
  const canOpenReview = reviewBlockers.length === 0

  const goNext = () => {
    const next = nextCreationPhase(phase, flowCtx)
    if (next && advanceCheck.ok) setCreationPhase(next)
  }

  const goBack = () => {
    const prev = prevCreationPhase(phase, flowCtx)
    if (prev) setCreationPhase(prev)
  }

  const goReview = () => {
    if (canOpenReview) setCreationPhase('review')
  }

  return (
    <div className="space-y-6">
      <CreationAttributeHeader />

      <nav
        aria-label="Creation phases"
        className="flex flex-wrap items-center gap-2 border-b border-dashed border-slate-300 pb-3 dark:border-violet-800"
      >
        {phases.map((p, i) => {
          const active = p === phase
          const done = i < phaseIndex
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                if (p === 'review' && !canOpenReview) return
                if (i <= phaseIndex || (p === 'review' && canOpenReview)) {
                  setCreationPhase(p)
                }
              }}
              disabled={p === 'review' && !canOpenReview && p !== phase}
              title={creationPhaseLabel(p)}
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                active
                  ? 'bg-blue-600 text-white'
                  : done
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {creationPhaseLabel(p)}
            </button>
          )
        })}
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {phase === 'review' ? (
            <CreationReviewFinalize
              onSpawnConfirm={(finalize) => {
                if (onSpawnFinalize) onSpawnFinalize(finalize)
                else finalize()
              }}
            />
          ) : (
            <PhaseBody phase={phase} />
          )}
        </div>
        <LiveLedger />
      </div>

      {phase !== 'review' ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-dashed pt-4">
          {phaseIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="rounded-lg border-2 border-slate-400 px-4 py-2 text-xs font-bold uppercase text-slate-700 hover:border-slate-600 dark:text-slate-200"
            >
              Back
            </button>
          ) : null}

          {phase === 'configurator' ? (
            <button
              type="button"
              disabled={!advanceCheck.ok}
              title={advanceCheck.blockers.join(' ')}
              onClick={() => setCreationPhase('attributes')}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Determine attributes
            </button>
          ) : (
            <button
              type="button"
              disabled={!advanceCheck.ok}
              title={advanceCheck.blockers.join(' ')}
              onClick={goNext}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Continue
            </button>
          )}

          {!advanceCheck.ok && advanceCheck.blockers.length ? (
            <ul className="text-xs text-amber-700 dark:text-amber-300">
              {advanceCheck.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            disabled={!canOpenReview}
            title={canOpenReview ? 'Open review screen' : reviewBlockers.join(' ')}
            onClick={goReview}
            className="ml-auto rounded-lg border-2 border-emerald-600 px-4 py-2 text-xs font-bold uppercase text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-400 disabled:text-slate-400 dark:text-emerald-200"
          >
            Review &amp; finalize
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Use phase pills above to return to earlier steps without losing data.
        </p>
      )}
    </div>
  )
}
