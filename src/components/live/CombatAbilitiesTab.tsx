/**
 * Combat → Abilities (interim): P.P.E. / I.S.P. at top; body placeholder until full mockup.
 */

type Props = {
  morphus: boolean
  ppeCurrent: number
  ppeMax: number
  showIsp: boolean
  ispCurrent: number
  ispMax: number
}

export function CombatAbilitiesTab({
  morphus,
  ppeCurrent,
  ppeMax,
  showIsp,
  ispCurrent,
  ispMax,
}: Props) {
  const card = morphus
    ? 'border-violet-500/80 bg-slate-950/90'
    : 'border-blue-300 bg-white'

  return (
    <div className="space-y-3" aria-label="Combat abilities">
      <div
        className={`grid gap-2 ${showIsp ? 'sm:grid-cols-2' : 'sm:grid-cols-1 sm:max-w-xs'}`}
      >
        <ResourceCard
          label="P.P.E."
          current={ppeCurrent}
          max={ppeMax}
          morphus={morphus}
          className={card}
        />
        {showIsp ? (
          <ResourceCard
            label="I.S.P."
            current={ispCurrent}
            max={ispMax}
            morphus={morphus}
            className={card}
          />
        ) : null}
      </div>
      <div
        className={`rounded-lg border-2 border-dashed px-4 py-8 text-center ${
          morphus
            ? 'border-violet-600/60 bg-slate-950/50 text-violet-200'
            : 'border-blue-300 bg-blue-50/40 text-slate-600'
        }`}
        role="status"
      >
        <p className="text-xs font-black uppercase tracking-wide">Abilities — coming next</p>
        <p className="mt-2 text-[11px] leading-snug opacity-80">
          Cast, duration, and pumped targets will live here. Use the strip Abilities overlay for
          the full list until this mockup lands.
        </p>
      </div>
    </div>
  )
}

function ResourceCard({
  label,
  current,
  max,
  morphus,
  className,
}: {
  label: string
  current: number
  max: number
  morphus: boolean
  className: string
}) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  return (
    <div className={`rounded-lg border-2 p-3 ${className}`}>
      <p
        className={`text-[10px] font-black uppercase tracking-wide ${
          morphus ? 'text-violet-200' : 'text-blue-900'
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-xl font-black tabular-nums ${
          morphus ? 'text-violet-50' : 'text-slate-900'
        }`}
      >
        {current}
        <span className="opacity-60"> / </span>
        {max}
      </p>
      <div
        className={`mt-2 h-2 w-full overflow-hidden rounded-full ${
          morphus ? 'bg-slate-900' : 'bg-blue-100'
        }`}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label} pool`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            background: morphus
              ? 'linear-gradient(90deg,#a78bfa,#5b21b6)'
              : 'linear-gradient(90deg,#34d399,#047857)',
          }}
        />
      </div>
    </div>
  )
}
