import type {
  MorphusCapabilityCategory,
  MorphusCapabilityPolarity,
  MorphusCapabilitySummary,
} from '../../types'

const CATEGORY_ORDER: MorphusCapabilityCategory[] = [
  'abilities',
  'senses',
  'movement',
  'combat',
  'defense',
  'skills',
  'appearance',
  'recovery',
  'choices',
  'workflow',
]

const CATEGORY_LABELS: Record<MorphusCapabilityCategory, string> = {
  senses: 'Senses',
  movement: 'Movement',
  combat: 'Combat',
  defense: 'Defense',
  skills: 'Skills',
  appearance: 'Appearance',
  abilities: 'Abilities',
  recovery: 'Recovery',
  choices: 'Choices',
  workflow: 'Table flow',
}

const POLARITY_CLASS: Record<MorphusCapabilityPolarity, string> = {
  bonus: 'text-emerald-300/95',
  penalty: 'text-rose-300/95',
  neutral: 'text-violet-100/90',
  choice: 'text-amber-200/95',
}

type Props = {
  summary: MorphusCapabilitySummary
  balanceModifierPercent?: number
  reachPercentBonus?: number
  jumpMultiplier?: number
  minimumJumpFeet?: number
}

export function MorphusCapabilitiesPanel({
  summary,
  balanceModifierPercent = 0,
  reachPercentBonus = 0,
  jumpMultiplier = 1,
  minimumJumpFeet = 0,
}: Props) {
  const hasLines = summary.lines.length > 0
  const hasMobilityAgg =
    balanceModifierPercent !== 0 ||
    reachPercentBonus > 0 ||
    jumpMultiplier > 1 ||
    minimumJumpFeet > 0

  if (!hasLines && !hasMobilityAgg) return null

  const categories = CATEGORY_ORDER.filter(
    (c) => (summary.byCategory[c]?.length ?? 0) > 0,
  )

  return (
    <section
      aria-labelledby="morphus-capabilities-heading"
      className="rounded-lg border border-indigo-700/50 bg-indigo-950/25 px-4 py-3"
    >
      <h2
        id="morphus-capabilities-heading"
        className="mb-1 text-sm font-semibold uppercase tracking-wide text-indigo-300"
      >
        Morphus capabilities
      </h2>
      <p className="mb-3 text-xs text-indigo-200/70">
        What your Morphus can do — aggregated from structured trait data (not raw
        book text).
      </p>

      {hasMobilityAgg ? (
        <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          {balanceModifierPercent !== 0 ? (
            <>
              <dt className="text-indigo-300/80">Balance</dt>
              <dd className="text-indigo-100">
                {balanceModifierPercent > 0 ? '+' : ''}
                {balanceModifierPercent}%
              </dd>
            </>
          ) : null}
          {reachPercentBonus > 0 ? (
            <>
              <dt className="text-indigo-300/80">Reach</dt>
              <dd className="text-indigo-100">+{reachPercentBonus}%</dd>
            </>
          ) : null}
          {jumpMultiplier > 1 ? (
            <>
              <dt className="text-indigo-300/80">Jump</dt>
              <dd className="text-indigo-100">
                ×{jumpMultiplier}
                {minimumJumpFeet > 0 ? ` (${minimumJumpFeet} ft min)` : ''}
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}

      <div className="space-y-3">
        {categories.map((category) => {
          const lines = summary.byCategory[category] ?? []
          return (
            <div key={category}>
              <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-indigo-400/90">
                {CATEGORY_LABELS[category]}
              </h3>
              <ul className="space-y-1 text-sm">
                {lines.map((line, i) => (
                  <li
                    key={`${line.sourceTraitId}-${line.label}-${i}`}
                    className="leading-snug"
                  >
                    <span className={`font-medium ${POLARITY_CLASS[line.polarity]}`}>
                      {line.label}
                    </span>
                    <span className="text-indigo-100/85"> — {line.detail}</span>
                    <span className="text-indigo-400/60 text-xs">
                      {' '}
                      ({line.sourceTraitName})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
