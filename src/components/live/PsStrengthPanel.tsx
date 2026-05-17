import type { StrengthCapacities } from '../../types'

type Props = {
  capacities: StrengthCapacities
  morphus: boolean
  compact?: boolean
}

const CATEGORY_LABEL = {
  standard: 'Standard',
  extraordinary: 'Extraordinary',
  supernatural: 'Supernatural',
} as const

export function PsStrengthPanel({ capacities, morphus, compact = false }: Props) {
  const shell = morphus
    ? 'border border-violet-500/60 bg-violet-950/35 text-violet-50'
    : 'border border-blue-200 bg-blue-50/90 text-slate-900'
  const muted = morphus ? 'text-violet-300/90' : 'text-slate-600'
  const head = morphus ? 'text-violet-200' : 'text-blue-900'

  const dmg = capacities.handToHandDamage

  return (
    <section
      className={`rounded-lg p-3 ${shell}`}
      aria-labelledby="ps-mechanics-heading"
    >
      <h3
        id="ps-mechanics-heading"
        className={`mb-2 text-[10px] font-black uppercase tracking-wider ${head}`}
      >
        P.S. — lift / carry / throw
        <span className="ml-2 font-semibold normal-case tracking-normal opacity-80">
          ({CATEGORY_LABEL[capacities.strengthCategory]})
        </span>
      </h3>

      <dl className={`grid gap-1 text-xs ${compact ? 'sm:grid-cols-2' : ''}`}>
        <div className="flex justify-between gap-2">
          <dt className={muted}>Carry</dt>
          <dd className="font-mono font-semibold tabular-nums">
            {capacities.carryingCapacityLbs} lbs
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className={muted}>Lift</dt>
          <dd className="font-mono font-semibold tabular-nums">
            {capacities.liftingCapacityLbs} lbs
          </dd>
        </div>
        <div className="flex justify-between gap-2 sm:col-span-2">
          <dt className={muted}>Max weight throw</dt>
          <dd className="font-mono font-semibold tabular-nums">
            {capacities.maxWeightThrowDistanceFeet.toFixed(1)} ft
          </dd>
        </div>
      </dl>

      {!compact ? (
        <div className={`mt-3 border-t pt-2 ${morphus ? 'border-violet-500/40' : 'border-blue-200'}`}>
          <p className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${head}`}>
            Weapon throw ranges (ft)
          </p>
          <ul className={`max-h-28 space-y-0.5 overflow-y-auto text-[11px] ${muted}`}>
            {capacities.weaponThrowRanges.map((row) => (
              <li key={row.objectKind} className="flex justify-between gap-2">
                <span>{row.label}</span>
                <span className="font-mono tabular-nums">{row.rangeFeet}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={`mt-3 border-t pt-2 ${morphus ? 'border-violet-500/40' : 'border-blue-200'}`}>
        <p className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${head}`}>
          Hand-to-hand damage
        </p>
        {dmg.kind === 'supernatural' ? (
          <ul className={`space-y-1 text-[11px] ${muted}`}>
            <li>
              <span className="font-semibold">Restrained:</span>{' '}
              <span className="font-mono">{dmg.restrainedPunch}</span>
            </li>
            <li>
              <span className="font-semibold">Full strength:</span>{' '}
              <span className="font-mono">{dmg.fullStrengthPunch}</span>
            </li>
            <li>
              <span className="font-semibold">Power:</span>{' '}
              <span className="font-mono">{dmg.powerPunch}</span>
              <span className="opacity-80"> — {dmg.powerPunchMeleeActions} APM</span>
            </li>
          </ul>
        ) : (
          <p className={`text-[11px] ${muted}`}>
            Unarmed <span className="font-mono font-semibold">{dmg.unarmedDamageNotation}</span>
            {dmg.attributeDamageBonus > 0 ? (
              <span className="opacity-80">
                {' '}
                (P.S. +{dmg.attributeDamageBonus} to damage)
              </span>
            ) : null}
          </p>
        )}
      </div>
    </section>
  )
}
