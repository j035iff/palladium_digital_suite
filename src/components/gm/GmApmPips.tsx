export function GmApmPips({
  maxApm,
  spent,
  tappable,
  onSpend,
  label,
}: {
  maxApm: number
  spent: number
  tappable: boolean
  onSpend?: () => void
  label: string
}) {
  if (maxApm <= 0) return null
  const remaining = Math.max(0, maxApm - spent)
  return (
    <div
      className="flex flex-wrap items-center gap-1"
      role="group"
      aria-label={`${label}: ${remaining} of ${maxApm} remaining`}
    >
      {Array.from({ length: maxApm }, (_, i) => {
        const used = i < spent
        const cls = used
          ? 'inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[10px] text-slate-600 opacity-40'
          : tappable
            ? 'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-amber-400 bg-amber-600 text-[11px] font-bold text-slate-950 hover:bg-amber-400'
            : 'inline-flex h-7 w-7 items-center justify-center rounded-full border border-cyan-700/80 bg-cyan-950/80 text-[11px] font-bold text-cyan-100'
        if (used || !tappable) {
          return (
            <span key={i} className={cls} title={used ? 'Spent' : 'Player-managed'}>
              {used ? '○' : '⚔'}
            </span>
          )
        }
        return (
          <button
            key={i}
            type="button"
            className={cls}
            title="Spend 1 melee action"
            aria-label="Spend 1 melee action"
            onClick={onSpend}
          >
            ⚔
          </button>
        )
      })}
    </div>
  )
}

export function formatPercent(n: number): string {
  if (n <= 0) return '—'
  return `${n}%`
}

export function formatBonus(n: number): string {
  if (n === 0) return '+0'
  return n > 0 ? `+${n}` : String(n)
}
