import { useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { getAbilityById } from '../../data/abilityLibrary'
import { getSkillById } from '../../data/skillLibrary'
import {
  assessTab7SpawnBlockers,
  buildCharacterCreationForgeContext,
} from '../../lib/forgeNavigation/characterCreationForge'
import { PALLADIUM_ALIGNMENT_VALUES } from '../../lib/configuratorMatrix'
import {
  configuratorAlignmentLabel,
  effectiveConfiguratorAlignment,
} from '../../lib/configuratorMatrix'
import { DevAutoRollPendingDiceButton } from './dev/DevAutoRollPendingDiceButton'
import { PendingDiceResolutionPanel } from './PendingDiceResolutionPanel'
import {
  formatCreationSkillPickLabel,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from '../../lib/creationSkillPicks'

function tierLabel(t: string): string {
  if (t === 'none') return 'None'
  if (t === 'minor') return 'Minor'
  if (t === 'major') return 'Major'
  if (t === 'master') return 'Master'
  return t
}

export function SpawnConfirmModal({
  open,
  onGoBack,
  onConfirm,
}: {
  open: boolean
  onGoBack: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="spawn-confirm-title"
    >
      <div className="max-w-md rounded-xl border-2 border-amber-500/80 bg-slate-950 p-6 text-center shadow-2xl">
        <h2
          id="spawn-confirm-title"
          className="text-lg font-black uppercase tracking-wide text-amber-200"
        >
          Lock character?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">
          Confirming will <strong>lock in</strong> this character&apos;s framework.
          You will not be able to change creation-level choices afterward.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onGoBack}
            className="rounded-lg border-2 border-slate-500 px-4 py-2 text-sm font-bold uppercase text-slate-200 hover:border-slate-300"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black uppercase text-white hover:bg-emerald-500"
          >
            Spawn character
          </button>
        </div>
      </div>
    </div>
  )
}

export function CreationReviewFinalize({
  onSpawnConfirm,
}: {
  onSpawnConfirm: (finalize: () => void) => void
}) {
  const {
    character,
    rawCharacter,
    activeRace,
    effectiveOcc,
    psychicTier,
    finalizeCharacter,
    setAlignment,
  } = useCharacter()

  const [confirmOpen, setConfirmOpen] = useState(false)

  const forgeCtx = useMemo(
    () =>
      buildCharacterCreationForgeContext(
        { ...character, creationGenreId: rawCharacter.creationGenreId },
        activeRace,
        effectiveOcc ?? undefined,
        psychicTier,
      ),
    [character, rawCharacter.creationGenreId, activeRace, effectiveOcc, psychicTier],
  )

  const blockers = useMemo(
    () => assessTab7SpawnBlockers(forgeCtx),
    [forgeCtx],
  )

  const currentAlignment = effectiveConfiguratorAlignment(character.facade.alignment)

  const occIds = character.creationOccSkillIds ?? []
  const relPicks = getCreationRelatedPicks(character)
  const secPicks = getCreationSecondaryPicks(character)
  const abilityIds = character.selectedAbilities ?? []

  const handleSpawnClick = () => {
    if (blockers.length > 0) return
    setConfirmOpen(true)
  }

  const handleConfirmSpawn = () => {
    setConfirmOpen(false)
    onSpawnConfirm(finalizeCharacter)
  }

  return (
    <section aria-labelledby="forge-tab-page-heading">
      <p className="mb-4 max-w-3xl text-sm leading-snug text-slate-600">
        Enter your physical die results, choose alignment, then spawn to lock the record
        (forge-character_creation.md Tab 7). The Live Ledger updates as you enter rolls.
      </p>

      <DevAutoRollPendingDiceButton />

      <div className="mb-4">
        <PendingDiceResolutionPanel />
      </div>

      <div className="mb-4 rounded-lg border border-blue-200 bg-white p-4">
        <h3 className="mb-2 text-xs font-bold uppercase opacity-80">
          Alignment (required to spawn)
        </h3>
        <p className="mb-3 text-xs text-slate-600">
          Tab 1 alignment is optional for Continue; you must choose one here before
          spawning.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PALLADIUM_ALIGNMENT_VALUES.map((alignment) => {
            const selected = currentAlignment === alignment
            return (
              <li key={alignment}>
                <button
                  type="button"
                  onClick={() => setAlignment(alignment)}
                  className={`w-full rounded-lg border-2 px-3 py-2 text-left text-sm font-semibold transition ${
                    selected
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300'
                  }`}
                  aria-pressed={selected}
                >
                  {configuratorAlignmentLabel(alignment)}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mb-4 rounded-lg border border-blue-200 bg-white p-4">
        <h3 className="mb-2 text-xs font-bold uppercase opacity-80">Summary</h3>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase opacity-70">Psychic tier</dt>
            <dd className="font-mono">{tierLabel(psychicTier)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase opacity-70">O.C.C. skills</dt>
            <dd className="text-xs">
              {occIds.map((id) => getSkillById(id)?.name ?? id).join(', ') || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase opacity-70">Related skills</dt>
            <dd className="text-xs">
              {relPicks
                .map((p) =>
                  formatCreationSkillPickLabel(p, getSkillById(p.skillId)?.name),
                )
                .join(', ') || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase opacity-70">Secondary skills</dt>
            <dd className="text-xs">
              {secPicks
                .map((p) =>
                  formatCreationSkillPickLabel(p, getSkillById(p.skillId)?.name),
                )
                .join(', ') || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase opacity-70">Abilities</dt>
            <dd className="text-xs">
              {abilityIds.map((id) => getAbilityById(id)?.name ?? id).join(', ') || '—'}
            </dd>
          </div>
        </dl>
      </div>

      {blockers.length > 0 ? (
        <div
          className="mb-4 rounded-lg border-2 border-amber-500/70 bg-amber-50 p-4 text-sm text-amber-950"
          role="alert"
        >
          <p className="mb-2 font-bold uppercase tracking-wide">Resolve before spawn</p>
          <ul className="list-inside list-disc space-y-1">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        disabled={blockers.length > 0}
        onClick={handleSpawnClick}
        className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        Spawn character
      </button>

      <SpawnConfirmModal
        open={confirmOpen}
        onGoBack={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSpawn}
      />
    </section>
  )
}
