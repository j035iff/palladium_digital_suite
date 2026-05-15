import type { ReactNode } from 'react'
import type { Feature } from '../../types'
import { featureSystemLabel } from '../../lib/featureEngine'

function metaNum(feature: Feature, key: string): number | undefined {
  const v = feature.metadata?.[key]
  return typeof v === 'number' ? v : undefined
}

function metaStr(feature: Feature, key: string): string | undefined {
  const v = feature.metadata?.[key]
  return typeof v === 'string' ? v : undefined
}

export type FeatureCardProps = {
  feature: Feature
  morphus: boolean
  compact?: boolean
  headerExtra?: ReactNode
  footer?: ReactNode
}

export function FeatureCard({
  feature,
  morphus,
  compact,
  headerExtra,
  footer,
}: FeatureCardProps) {
  const { identity, activation, modifiers, metadata } = feature
  const desc =
    morphus && identity.descriptionMorphus
      ? identity.descriptionMorphus
      : identity.description
  const level = metaNum(feature, 'level')
  const school = metaStr(feature, 'school')
  const tier = metaStr(feature, 'tier')
  const morphusOnly = metadata?.morphusOnly === true
  const panel = morphus
    ? 'border-violet-800 bg-slate-950/70 text-violet-50'
    : 'border-slate-200 bg-white text-slate-900'

  return (
    <article className={`rounded-lg border p-3 text-sm ${panel}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="font-semibold">{identity.name}</span>
          <span className="ml-2 text-xs opacity-60">
            {featureSystemLabel(identity.system)}
          </span>
          {level != null ? (
            <span className="ml-2 font-mono text-xs opacity-80">Lvl {level}</span>
          ) : null}
          {school ? <span className="ml-2 text-xs opacity-70">{school}</span> : null}
          {tier ? <span className="ml-2 text-xs opacity-70">{tier}</span> : null}
          {morphusOnly ? (
            <span
              className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                morphus ? 'bg-amber-950 text-amber-200' : 'bg-amber-100 text-amber-900'
              }`}
            >
              Morphus
            </span>
          ) : null}
        </div>
        {headerExtra}
      </div>
      {!compact ? (
        <p
          className={`mt-2 text-xs leading-relaxed ${
            morphus ? 'text-violet-200/90 italic' : 'text-slate-600'
          }`}
        >
          {desc}
        </p>
      ) : null}
      {activation ? (
        <dl
          className={`mt-2 grid gap-1 rounded border px-2 py-1.5 text-[11px] ${
            morphus
              ? 'border-violet-900/80 bg-violet-950/40'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          {activation.cost ? (
            <div>
              <span className="font-bold">Cost:</span>{' '}
              {String(activation.cost.value)} {activation.cost.type.toUpperCase()}
            </div>
          ) : null}
          {activation.range ? (
            <div>
              <span className="font-bold">Range:</span> {activation.range}
            </div>
          ) : null}
          {activation.duration ? (
            <div>
              <span className="font-bold">Duration:</span> {activation.duration}
            </div>
          ) : null}
          {activation.save ? (
            <div>
              <span className="font-bold">Save:</span> {activation.save}
            </div>
          ) : null}
        </dl>
      ) : null}
      {modifiers && Object.keys(modifiers).length > 0 ? (
        <div className="mt-2">
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
            Modifiers{morphusOnly ? ' (Morphus)' : ''}
          </p>
          <ul className="mt-1 flex flex-wrap gap-2 font-mono text-xs">
            {Object.entries(modifiers).map(([k, v]) => (
              <li
                key={k}
                className={`rounded px-1.5 py-0.5 ${
                  morphus
                    ? 'bg-emerald-950/60 text-emerald-200'
                    : 'bg-emerald-50 text-emerald-900'
                }`}
              >
                {k.toUpperCase()} {v >= 0 ? '+' : ''}
                {v}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {footer}
    </article>
  )
}
