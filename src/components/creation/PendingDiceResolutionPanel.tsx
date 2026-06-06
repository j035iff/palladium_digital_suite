import { useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  listPendingDiceEntries,
  pendingDiceResolutionsComplete,
  type PendingDiceEntry,
} from '../../lib/pendingDiceLedger'
import { vitalityPreviewLines } from '../../lib/spawnVitalityManual'

function resolvedCount(
  pending: readonly PendingDiceEntry[],
  resolutions: Readonly<Record<string, number>>,
): number {
  return pending.filter((e) => {
    const v = resolutions[e.id]
    return (
      typeof v === 'number' &&
      Number.isFinite(v) &&
      v >= e.min &&
      v <= e.max
    )
  }).length
}

function PendingDiceInput({
  entry,
  value,
  onChange,
  compact,
}: {
  entry: PendingDiceEntry
  value: number | undefined
  onChange: (value: number) => void
  compact?: boolean
}) {
  const invalid =
    value != null && (value < entry.min || value > entry.max || !Number.isFinite(value))
  const done =
    value != null &&
    Number.isFinite(value) &&
    value >= entry.min &&
    value <= entry.max

  const inputClass = compact
    ? `w-16 rounded border px-1.5 py-1 font-mono text-xs ${
        invalid ? 'border-rose-500' : done ? 'border-emerald-500' : 'border-slate-300'
      }`
    : `w-28 rounded-lg border-2 px-3 py-2 text-center font-mono text-lg font-bold tabular-nums ${
        invalid
          ? 'border-rose-500'
          : done
            ? 'border-emerald-500'
            : 'border-blue-400'
      }`

  return (
    <input
      type="number"
      inputMode="numeric"
      min={entry.min}
      max={entry.max}
      placeholder={`${entry.min}–${entry.max}`}
      aria-label={`${entry.label} — enter ${entry.notation} result`}
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return
        const n = Number(raw)
        if (Number.isFinite(n)) onChange(n)
      }}
      className={inputClass}
    />
  )
}

export function PendingDiceResolutionPanel({
  showCommit = false,
  onBeforeCommit,
  variant = 'full',
}: {
  showCommit?: boolean
  /** Return false to block commit (e.g. invalid O.C.C. variable picks). */
  onBeforeCommit?: () => boolean
  variant?: 'full' | 'compact'
}) {
  const {
    character,
    activeRace,
    effectiveOcc,
    psychicTier,
    supportsDualForm,
    setCreationPendingDiceResolution,
    commitVitalityFromPendingDice,
  } = useCharacter()

  const pending = useMemo(
    () =>
      listPendingDiceEntries(character, activeRace, effectiveOcc ?? undefined, {
        supportsDualForm,
        psychicTier,
      }),
    [character, activeRace, effectiveOcc, supportsDualForm, psychicTier],
  )

  const resolutions = character.creationPendingDiceResolutions ?? {}
  const diceComplete = pendingDiceResolutionsComplete(pending, resolutions)
  const entered = resolvedCount(pending, resolutions)

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

  const handleCommit = () => {
    if (!diceComplete) return
    if (onBeforeCommit?.() === false) return
    commitVitalityFromPendingDice()
  }

  if (pending.length === 0) {
    return (
      <p className="text-xs text-slate-500" role="status">
        No pending dice for this build.
      </p>
    )
  }

  if (variant === 'compact') {
    return (
      <ul className="space-y-2 text-xs">
        {pending.map((entry) => {
          const v = resolutions[entry.id]
          const done =
            v != null && v >= entry.min && v <= entry.max && Number.isFinite(v)
          return (
            <li
              key={entry.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1.5 ${
                done
                  ? 'border-emerald-400/60 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-white/10'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{entry.label}</p>
                <p className="font-mono text-[10px] opacity-70">
                  {entry.notation} ({entry.min}–{entry.max})
                </p>
              </div>
              <PendingDiceInput
                entry={entry}
                value={v}
                compact
                onChange={(n) => setCreationPendingDiceResolution(entry.id, n)}
              />
            </li>
          )
        })}
        <li className="pt-1 text-[10px] opacity-70" role="status">
          {entered}/{pending.length} rolls entered
          {showCommit ? ' — commit vitality on Review & Spawn' : ''}
        </li>
      </ul>
    )
  }

  return (
    <div className="rounded-lg border-2 border-blue-300 bg-white p-4 shadow-sm dark:border-blue-700 dark:bg-slate-950">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-wide text-blue-900 dark:text-blue-100">
          Physical die results
        </h3>
        <p className="font-mono text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
          {entered}/{pending.length} entered
        </p>
      </div>
      <p className="mb-4 text-xs leading-snug text-slate-600 dark:text-slate-300">
        Roll your physical dice for H.P., S.D.C., P.P.E., I.S.P., and any skill or
        O.C.C. bonuses below, then enter the results (Pillar 5 — physical dice first).
      </p>
      <ul className="space-y-3">
        {pending.map((entry) => {
          const v = resolutions[entry.id]
          return (
            <li
              key={entry.id}
              className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3 last:border-0 dark:border-white/10"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{entry.label}</p>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400">
                  Roll {entry.notation} → enter {entry.min}–{entry.max}
                </p>
                {entry.hint ? (
                  <p className="text-[10px] text-slate-500">{entry.hint}</p>
                ) : null}
              </div>
              <PendingDiceInput
                entry={entry}
                value={v}
                onChange={(n) => setCreationPendingDiceResolution(entry.id, n)}
              />
            </li>
          )
        })}
      </ul>
      {preview.length > 0 ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/50">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide opacity-70">
            Vitality preview
          </p>
          <div className="grid gap-1 font-mono text-xs sm:grid-cols-2">
            {preview.map((line) => (
              <p key={line.label}>
                {line.label}: <strong>{line.value}</strong>
              </p>
            ))}
          </div>
        </div>
      ) : null}
      {showCommit ? (
        <>
          <button
            type="button"
            disabled={!diceComplete}
            onClick={handleCommit}
            className="mt-4 rounded-md bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Commit vitality to character
          </button>
          {character.creationVitalityCommitted ? (
            <p className="mt-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
              Vitality committed — ready to spawn when all checks pass.
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Commit writes H.P., S.D.C., P.P.E., and I.S.P. from your rolls above.
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}
