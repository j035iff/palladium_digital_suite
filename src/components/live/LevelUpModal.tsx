import { useMemo, useState } from 'react'
import type { Character } from '../../types'
import {
  LEVEL_CAP,
  supernaturalAlertsForLevel,
} from '../../data/xpTables'
import { summarizeSkillImprovementsForLevel } from '../../lib/levelUpSkillSummary'
import { rollD6 } from '../../lib/meleeDice'

export type LevelUpModalProps = {
  open: boolean
  morphus: boolean
  character: Character
  /** New sheet level this ritual completes (was level − 1). */
  targetLevel: number
  onConfirm: (hpRoll: number) => void
}

/**
 * Level-up ritual: H.P. die, skill summary, supernatural pending alerts. Theming follows active form
 * (Facade blue vs Morphus void).
 */
export function LevelUpModal({
  open,
  morphus,
  character,
  targetLevel,
  onConfirm,
}: LevelUpModalProps) {
  const [hpRoll, setHpRoll] = useState<number | null>(null)

  const prevLevel = targetLevel - 1
  const skillRows = useMemo(
    () =>
      summarizeSkillImprovementsForLevel(character, prevLevel, targetLevel, {
        maxRows: 6,
        form: 'primary',
      }),
    [character, prevLevel, targetLevel],
  )
  const morphSkillRows = useMemo(
    () =>
      summarizeSkillImprovementsForLevel(character, prevLevel, targetLevel, {
        maxRows: 4,
        form: 'morphus',
      }),
    [character, prevLevel, targetLevel],
  )
  const alerts = useMemo(
    () => supernaturalAlertsForLevel(character, targetLevel),
    [character, targetLevel],
  )

  const shell = morphus
    ? 'border-violet-400/90 bg-gradient-to-b from-violet-950 via-slate-950 to-black text-violet-50 shadow-[0_0_60px_rgba(76,29,149,0.85)]'
    : 'border-blue-500 bg-gradient-to-b from-white via-blue-50/95 to-white text-slate-900 shadow-[0_0_40px_rgba(37,99,235,0.35)]'
  const title = morphus ? 'Void ascension' : 'Level up'
  const accent = morphus ? 'text-amber-300' : 'text-blue-700'

  if (!open) return null

  return (
    <div
      className="pds-level-up-overlay fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
    >
      <div
        className={`pds-level-up-card relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-4 p-6 ${shell}`}
      >
        <div
          className={`pointer-events-none absolute inset-0 rounded-xl opacity-40 ${
            morphus ? 'pds-level-up-void-pulse' : 'pds-level-up-primary-pulse'
          }`}
          aria-hidden
        />
        <div className="relative">
          <p
            id="level-up-title"
            className={`text-center text-xs font-black uppercase tracking-[0.35em] ${accent}`}
          >
            {title}
          </p>
          <h2 className="mt-2 text-center text-3xl font-black tracking-tight">
            Level {targetLevel}
            {targetLevel >= LEVEL_CAP ? (
              <span className="mt-1 block text-sm font-bold uppercase tracking-wide opacity-90">
                Maximum tier
              </span>
            ) : null}
          </h2>
          <p
            className={`mt-2 text-center text-sm font-semibold ${
              morphus ? 'text-violet-200' : 'text-slate-600'
            }`}
          >
            Resolve this ritual to lock your new tier. H.P. growth uses a physical d6 (Pillar 5).
          </p>

          <section className="mt-6 space-y-3">
            <h3
              className={`text-[11px] font-black uppercase tracking-wider ${
                morphus ? 'text-violet-300' : 'text-blue-900'
              }`}
            >
              H.P. growth
            </h3>
            <p className={`text-xs ${morphus ? 'text-violet-200/90' : 'text-slate-600'}`}>
              Roll 1d6 and add the result to <strong>maximum and current H.P.</strong> on both Facade and
              Morphus tracks.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={
                  morphus
                    ? 'rounded-lg border-2 border-amber-400/90 bg-violet-900 px-4 py-2 text-sm font-black uppercase tracking-wide text-amber-200 hover:bg-violet-800'
                    : 'rounded-lg border-2 border-blue-700 bg-blue-600 px-4 py-2 text-sm font-black uppercase tracking-wide text-white hover:bg-blue-500'
                }
                onClick={() => setHpRoll(rollD6())}
              >
                Roll for H.P. (1d6)
              </button>
              {hpRoll != null ? (
                <span
                  className={`font-mono text-lg font-black tabular-nums ${
                    morphus ? 'text-amber-300' : 'text-blue-800'
                  }`}
                >
                  Rolled: {hpRoll}
                </span>
              ) : null}
            </div>
          </section>

          <section className="mt-6">
            <h3
              className={`mb-2 text-[11px] font-black uppercase tracking-wider ${
                morphus ? 'text-violet-300' : 'text-blue-900'
              }`}
            >
              Summary of improvements
            </h3>
            <p className={`mb-2 text-xs ${morphus ? 'text-violet-200/85' : 'text-slate-600'}`}>
              O.C.C. skill curve gains +5% quick-roll tier from this level (I.Q. bonus unchanged;
              attribute_and_stat.md).
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className={`rounded-lg border-2 p-2 ${
                  morphus ? 'border-violet-600/80 bg-slate-950/80' : 'border-blue-200 bg-white/90'
                }`}
              >
                <p className={`mb-1 text-[10px] font-bold uppercase ${accent}`}>Facade skills</p>
                <ul className="space-y-1 text-[11px]">
                  {skillRows.length === 0 ? (
                    <li className={morphus ? 'text-violet-400' : 'text-slate-500'}>No tracked % rows.</li>
                  ) : (
                    skillRows.map((r) => (
                      <li key={r.id} className="flex justify-between gap-2 font-mono">
                        <span className="min-w-0 truncate">{r.name}</span>
                        <span className="shrink-0 tabular-nums">
                          {r.before}% → {r.after}%{' '}
                          <span className={morphus ? 'text-emerald-400' : 'text-emerald-700'}>
                            (+{r.delta}%)
                          </span>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div
                className={`rounded-lg border-2 p-2 ${
                  morphus ? 'border-violet-600/80 bg-slate-950/80' : 'border-blue-200 bg-white/90'
                }`}
              >
                <p className={`mb-1 text-[10px] font-bold uppercase ${accent}`}>Morphus skills</p>
                <ul className="space-y-1 text-[11px]">
                  {morphSkillRows.length === 0 ? (
                    <li className={morphus ? 'text-violet-400' : 'text-slate-500'}>No tracked % rows.</li>
                  ) : (
                    morphSkillRows.map((r) => (
                      <li key={r.id} className="flex justify-between gap-2 font-mono">
                        <span className="min-w-0 truncate">{r.name}</span>
                        <span className="shrink-0 tabular-nums">
                          {r.before}% → {r.after}%{' '}
                          <span className={morphus ? 'text-emerald-400' : 'text-emerald-700'}>
                            (+{r.delta}%)
                          </span>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </section>

          {alerts.length > 0 ? (
            <section className="mt-6 rounded-lg border-2 border-amber-500/80 bg-amber-950/30 p-3">
              <h3 className="text-[11px] font-black uppercase tracking-wide text-amber-200">
                Pending selection
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs font-semibold text-amber-100">
                {alerts.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              disabled={hpRoll == null}
              className={
                hpRoll == null
                  ? 'cursor-not-allowed rounded-lg border-2 border-slate-500 px-5 py-2.5 text-sm font-black uppercase opacity-40'
                  : morphus
                    ? 'rounded-lg border-2 border-violet-300 bg-violet-700 px-5 py-2.5 text-sm font-black uppercase text-white hover:bg-violet-600'
                    : 'rounded-lg border-2 border-blue-800 bg-blue-700 px-5 py-2.5 text-sm font-black uppercase text-white hover:bg-blue-600'
              }
              onClick={() => {
                if (hpRoll == null) return
                onConfirm(hpRoll)
                setHpRoll(null)
              }}
            >
              Confirm level {targetLevel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
