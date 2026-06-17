import { useEffect, useRef, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { nextLevelThresholdXp } from '../../data/xpTables'

/**
 * Identity header XP strip + history popover (Pillar 6 — consistent vitals).
 */
export function IdentityXpBar() {
  const {
    character,
    activeForm,
    supportsDualForm,
    xpProgress,
    xpHistory,
    grantXp,
    pendingLevelUpTarget,
  } = useCharacter()
  const morphus = supportsDualForm && activeForm === 'morphus'
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const next = nextLevelThresholdXp(character.level, character.occ.xpTable)
  const progressionTitle = `Progression: ${character.occ.name} Table`
  const pendingRing = Boolean(pendingLevelUpTarget)

  const track = morphus ? 'bg-slate-900/90' : 'bg-slate-200'
  const fill = morphus
    ? 'linear-gradient(90deg,#fbbf24,#a855f7)'
    : 'linear-gradient(90deg,#3b82f6,#1d4ed8)'

  return (
    <div ref={rootRef} className="relative mt-2 w-full max-w-md">
      <button
        type="button"
        className={`w-full rounded-lg border-2 px-2 py-1.5 text-left transition-[box-shadow] duration-300 ${
          pendingRing
            ? morphus
              ? 'border-amber-400 pds-xp-pending-void'
              : 'border-amber-500 pds-xp-pending-primary'
            : morphus
              ? 'border-violet-500/80 bg-slate-950/80'
              : 'border-blue-400 bg-blue-50/90'
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={progressionTitle}
        aria-label={`Experience and XP history — ${progressionTitle}`}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span
            className={`text-[10px] font-black uppercase tracking-wider ${
              morphus ? 'text-violet-200' : 'text-blue-900'
            }`}
          >
            Experience
          </span>
          <span
            className={`font-mono text-xs font-bold tabular-nums ${
              morphus ? 'text-amber-200' : 'text-slate-900'
            }`}
          >
            {character.xp.toLocaleString()} XP
            {next != null ? (
              <span className="opacity-70">
                {' '}
                → {next.toLocaleString()}
              </span>
            ) : (
              <span className="opacity-70"> (max)</span>
            )}
          </span>
        </div>
        <div
          className={`h-2.5 w-full overflow-hidden rounded-full ${track}`}
          role="progressbar"
          aria-valuenow={xpProgress.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress toward next level"
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${xpProgress.pct}%`, background: fill }}
          />
        </div>
        {pendingRing ? (
          <p className="mt-1 text-center text-[10px] font-black uppercase text-amber-400">
            Level-up ritual pending
          </p>
        ) : null}
      </button>

      {open ? (
        <div
          className={`absolute left-0 top-full z-50 mt-1 w-full min-w-[14rem] rounded-lg border-2 p-2 shadow-xl ${
            morphus
              ? 'border-violet-500 bg-slate-950 text-violet-50'
              : 'border-blue-400 bg-white text-slate-900'
          }`}
          role="dialog"
          aria-label="XP history"
        >
          <p
            className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${
              morphus ? 'text-violet-400' : 'text-slate-600'
            }`}
          >
            {progressionTitle}
          </p>
          <p
            className={`mb-2 text-[10px] font-black uppercase tracking-wide ${
              morphus ? 'text-violet-300' : 'text-blue-900'
            }`}
          >
            Recent gains
          </p>
          {xpHistory.length === 0 ? (
            <p className={`text-xs ${morphus ? 'text-violet-400' : 'text-slate-600'}`}>
              No entries yet.
            </p>
          ) : (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto text-xs">
              {[...xpHistory].reverse().map((e) => (
                <li
                  key={e.id}
                  className={`flex justify-between gap-2 border-b border-dotted pb-1 font-mono last:border-0 ${
                    morphus ? 'border-violet-700 text-violet-100' : 'border-slate-200'
                  }`}
                >
                  <span className="min-w-0 truncate">{e.label}</span>
                  <span className="shrink-0 text-emerald-400">+{e.amount}</span>
                </li>
              ))}
            </ul>
          )}
          {character.isFinalized ? (
            <button
              type="button"
              className={`mt-2 w-full rounded-md border-2 px-2 py-1.5 text-[10px] font-bold uppercase ${
                morphus
                  ? 'border-violet-400 text-violet-200 hover:bg-violet-900/80'
                  : 'border-blue-500 text-blue-800 hover:bg-blue-100'
              }`}
              onClick={() => grantXp(100, 'Demo award')}
            >
              Log +100 XP (demo)
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
