import { lazy, Suspense, useEffect } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  buildLiveSheetXpVialModel,
  formatLiveSheetXpAmount,
  formatLiveSheetXpChartRange,
  resolveLiveSheetXpTableCatalog,
} from '../../lib/liveSheetXpOverlay'

const DevGrantXpControls = import.meta.env.DEV
  ? lazy(() =>
      import('./dev/DevGrantXpControls').then((m) => ({
        default: m.DevGrantXpControls,
      })),
    )
  : null

type Props = {
  morphusActive: boolean
  onClose: () => void
}

/**
 * Level / XP overlay — vertical vial + 1–15 chart + book cite.
 * Read-only except DEV Add XP at bottom (ruling #17–20).
 * Same overlay chrome pattern as strip overlays (Escape / backdrop).
 */
export function LiveSheetLevelOverlay({ morphusActive, onClose }: Props) {
  const { character, activeRace, effectiveOcc, xpHistory } = useCharacter()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const catalog = resolveLiveSheetXpTableCatalog({
    libraryOcc: effectiveOcc,
    race: activeRace,
  })
  const model = buildLiveSheetXpVialModel({
    level: character.level,
    totalXp: character.xp,
    table: character.occ.xpTable,
    catalog,
  })

  const fillColor = morphusActive ? '#7c3aed' : '#1e3a8a'
  const trackBorder = morphusActive ? 'border-violet-400/70' : 'border-blue-300'
  const currentXpLabel = formatLiveSheetXpAmount(model.currentXp)
  const floorLabel = formatLiveSheetXpAmount(model.floorXp)
  const nextLabel =
    model.nextThresholdXp != null
      ? formatLiveSheetXpAmount(model.nextThresholdXp)
      : null

  return (
    <div
      className="fixed inset-0 z-40 flex items-stretch justify-center bg-black/40 p-2 backdrop-blur-[1px] sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Level ${model.level}`}
        className={`flex max-h-[min(92vh,840px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 shadow-2xl ${
          morphusActive
            ? 'border-violet-400 bg-slate-950 text-violet-50'
            : 'border-blue-500 bg-white text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-start justify-between gap-3 border-b-2 px-4 py-3 ${
            morphusActive ? 'border-violet-700' : 'border-blue-200'
          }`}
        >
          <h2 className="text-xl font-black tracking-tight">
            LEVEL {model.level}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={
              morphusActive
                ? 'rounded-md border-2 border-violet-400 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-violet-100'
                : 'rounded-md border-2 border-blue-500 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-900'
            }
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-start gap-6">
            <div className="flex shrink-0 flex-col items-center">
              {nextLabel ? (
                <span
                  className={`mb-1 font-mono text-xs font-bold tabular-nums ${
                    morphusActive ? 'text-violet-300' : 'text-slate-500'
                  }`}
                >
                  {nextLabel}
                </span>
              ) : null}
              <div
                className={`relative h-56 w-14 overflow-hidden rounded-full border-2 ${trackBorder} ${
                  morphusActive ? 'bg-violet-950/40' : 'bg-blue-50'
                }`}
                role="progressbar"
                aria-valuenow={model.fillPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Experience progress in current level"
              >
                <div
                  className="absolute inset-x-0 bottom-0 transition-[height] duration-500"
                  style={{
                    height: `${model.fillPct}%`,
                    backgroundColor: fillColor,
                  }}
                />
                {!model.atExactFloor ? (
                  <span
                    className="absolute left-1/2 z-10 -translate-x-1/2 font-mono text-[11px] font-bold tabular-nums text-white drop-shadow"
                    style={{
                      bottom: `calc(${Math.min(92, Math.max(12, model.fillPct))}% - 0.55rem)`,
                    }}
                  >
                    {currentXpLabel}
                  </span>
                ) : null}
                <span className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 font-mono text-[11px] font-bold tabular-nums text-white drop-shadow">
                  {floorLabel}
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <ul className="space-y-0.5 font-mono text-xs tabular-nums">
                {model.chartRows.map((row) => (
                  <li
                    key={row.level}
                    className={
                      row.tone === 'current'
                        ? morphusActive
                          ? 'font-black text-violet-200'
                          : 'font-black text-blue-800'
                        : row.tone === 'passed'
                          ? morphusActive
                            ? 'text-slate-500'
                            : 'text-slate-400'
                          : morphusActive
                            ? 'text-slate-300'
                            : 'text-slate-600'
                    }
                  >
                    <span className="inline-block w-16">
                      Level {row.level}:
                    </span>{' '}
                    {formatLiveSheetXpChartRange(row)}
                  </li>
                ))}
              </ul>
              {model.citation ? (
                <p
                  className={`mt-3 text-[11px] font-semibold ${
                    morphusActive ? 'text-violet-300' : 'text-slate-500'
                  }`}
                >
                  {model.citation}
                </p>
              ) : (
                <p
                  className={`mt-3 text-[11px] font-semibold ${
                    morphusActive ? 'text-violet-400' : 'text-slate-400'
                  }`}
                >
                  {model.tableName}
                </p>
              )}

              {xpHistory.length > 0 ? (
                <div className="mt-4">
                  <p
                    className={`mb-1 text-[10px] font-black uppercase tracking-wide ${
                      morphusActive ? 'text-violet-300' : 'text-blue-900'
                    }`}
                  >
                    Recent gains
                  </p>
                  <ul className="max-h-28 space-y-1 overflow-y-auto text-xs">
                    {[...xpHistory].reverse().slice(0, 8).map((e) => (
                      <li
                        key={e.id}
                        className={`flex justify-between gap-2 border-b border-dotted pb-1 font-mono last:border-0 ${
                          morphusActive
                            ? 'border-violet-700 text-violet-100'
                            : 'border-slate-200'
                        }`}
                      >
                        <span className="min-w-0 truncate">{e.label}</span>
                        <span className="shrink-0 text-emerald-500">
                          +{e.amount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          {import.meta.env.DEV && DevGrantXpControls ? (
            <div className="mt-4 border-t border-dashed pt-3">
              <Suspense fallback={null}>
                <DevGrantXpControls morphus={morphusActive} />
              </Suspense>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
