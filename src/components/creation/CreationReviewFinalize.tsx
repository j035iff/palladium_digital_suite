import { useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { getAbilityById } from '../../data/abilityLibrary'
import { getSkillById } from '../../data/skillLibrary'
import {
  assessTab7SpawnBlockers,
  buildCharacterCreationForgeContext,
} from '../../lib/forgeNavigation/characterCreationForge'
import { PALLADIUM_ALIGNMENTS } from '../../lib/creationStep'
import {
  configuratorAlignmentLabel,
  effectiveConfiguratorAlignment,
} from '../../lib/configuratorMatrix'
import {
  listPendingDiceEntries,
  pendingDiceResolutionsComplete,
} from '../../lib/pendingDiceLedger'
import { vitalityPreviewLines } from '../../lib/spawnVitalityManual'
import { validateOccVariableResolution } from '../../lib/occVariableBonus'
import { listOccVariableBonusTasks } from '../../lib/occVariableBonus'

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
    supportsDualForm,
    setCreationPendingDiceResolution,
    commitVitalityFromPendingDice,
    finalizeCharacter,
    setAlignment,
  } = useCharacter()

  const [confirmOpen, setConfirmOpen] = useState(false)

  const pending = useMemo(
    () =>
      listPendingDiceEntries(character, activeRace, effectiveOcc ?? undefined, {
        supportsDualForm,
        psychicTier,
      }),
    [character, activeRace, effectiveOcc, supportsDualForm, psychicTier],
  )

  const resolutions = character.creationPendingDiceResolutions ?? {}

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

  const diceComplete = pendingDiceResolutionsComplete(pending, resolutions)
  const preview = useMemo(
    () =>
      diceComplete
        ? vitalityPreviewLines(character, activeRace, effectiveOcc ?? undefined, resolutions, {
            supportsDualForm,
            psychicTier,
          })
        : [],
    [
      diceComplete,
      character,
      activeRace,
      effectiveOcc,
      resolutions,
      supportsDualForm,
      psychicTier,
    ],
  )

  const occIds = character.creationOccSkillIds ?? []
  const relIds = character.creationRelatedSkillIds ?? []
  const abilityIds = character.selectedAbilities ?? []

  const handleCommitVitality = () => {
    if (!diceComplete) return
    for (const task of listOccVariableBonusTasks(
      effectiveOcc ?? undefined,
      character.occSpecializationId,
    )) {
      const v = character.creationOccVariableResolutions?.[task.id]
      if (v != null && !validateOccVariableResolution(task, v)) return
    }
    commitVitalityFromPendingDice()
  }

  const handleSpawnClick = () => {
    if (blockers.length > 0) return
    setConfirmOpen(true)
  }

  const handleConfirmSpawn = () => {
    setConfirmOpen(false)
    onSpawnConfirm(finalizeCharacter)
  }

  return (
    <section aria-labelledby="review-heading">
      <h2
        id="review-heading"
        className="mb-1 text-sm font-semibold uppercase tracking-wide text-blue-800"
      >
        Phase IV: Review &amp; Spawn
      </h2>
      <p className="mb-4 max-w-3xl text-sm leading-snug text-slate-600">
        Resolve every pending dice from your Live Ledger, commit vitality pools, then
        spawn to lock the record (forge-character_creation.md Tab 7).
      </p>

      <div className="mb-4 rounded-lg border border-blue-200 bg-white p-4">
        <h3 className="mb-2 text-xs font-bold uppercase opacity-80">
          Alignment (required to spawn)
        </h3>
        <p className="mb-3 text-xs text-slate-600">
          Tab 1 alignment is optional for Continue; you must choose one here before
          spawning.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PALLADIUM_ALIGNMENTS.map((alignment) => {
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
              {relIds.map((id) => getSkillById(id)?.name ?? id).join(', ') || '—'}
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

      <div className="mb-4 rounded-lg border border-blue-200 bg-white p-4">
        <h3 className="mb-2 text-xs font-bold uppercase opacity-80">
          Manual dice resolution
        </h3>
        <ul className="space-y-3">
          {pending.map((entry) => {
            const v = resolutions[entry.id]
            const invalid =
              v != null && (v < entry.min || v > entry.max || !Number.isFinite(v))
            return (
              <li
                key={entry.id}
                className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{entry.label}</p>
                  <p className="font-mono text-xs text-slate-600">
                    {entry.notation} ({entry.min}–{entry.max})
                  </p>
                  {entry.hint ? (
                    <p className="text-[10px] text-slate-500">{entry.hint}</p>
                  ) : null}
                </div>
                <input
                  type="number"
                  min={entry.min}
                  max={entry.max}
                  value={v ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') return
                    const n = Number(raw)
                    if (Number.isFinite(n)) {
                      setCreationPendingDiceResolution(entry.id, n)
                    }
                  }}
                  className={`w-24 rounded border px-2 py-1.5 font-mono text-sm ${
                    invalid ? 'border-rose-500' : 'border-slate-300'
                  }`}
                />
              </li>
            )
          })}
        </ul>
        {preview.length > 0 ? (
          <div className="mt-4 grid gap-1 font-mono text-xs sm:grid-cols-2">
            {preview.map((line) => (
              <p key={line.label}>
                {line.label}: <strong>{line.value}</strong>
              </p>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          disabled={!diceComplete}
          onClick={handleCommitVitality}
          className="mt-4 rounded-md bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Commit vitality to character
        </button>
        {character.creationVitalityCommitted ? (
          <p className="mt-2 text-xs font-semibold text-teal-600">
            Vitality committed — ready to spawn when all checks pass.
          </p>
        ) : null}
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
