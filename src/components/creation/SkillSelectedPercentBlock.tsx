import { useId, useState } from 'react'

import type {
  SkillPercentBreakdownPart,
  SkillPercentSummary,
} from '../../lib/skillCreationDisplay'

const PART_CLASS: Record<SkillPercentBreakdownPart['kind'], string> = {
  base: 'text-slate-900',
  iq: 'text-sky-600',
  occ: 'text-emerald-700',
  synergy: 'text-orange-600',
  penalty: 'text-rose-600',
}

export function SkillSelectedPercentBlock({
  summary,
  impossibleInMorphus,
  morphus,
}: {
  summary: SkillPercentSummary
  impossibleInMorphus?: boolean
  morphus?: boolean
}) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()

  const hasTooltip = !impossibleInMorphus && summary.parts.length > 0

  const panelClass = morphus
    ? 'border-amber-700/60 bg-amber-950/40 text-amber-50'
    : 'border-amber-200 bg-amber-50 text-slate-900'

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        className="inline-flex items-baseline gap-1 text-right disabled:cursor-default"
        disabled={!hasTooltip || impossibleInMorphus}
        aria-expanded={open}
        aria-controls={hasTooltip ? tooltipId : undefined}
        onClick={() => {
          if (!hasTooltip || impossibleInMorphus) return
          setOpen((value) => !value)
        }}
      >
        {impossibleInMorphus ? (
          <span className="font-bold text-rose-500">Impossible</span>
        ) : (
          <span className="font-bold tabular-nums text-emerald-700">
            {summary.total}%
          </span>
        )}
        <span className="font-normal tabular-nums text-slate-900">
          (+{summary.perLevel}%/level)
        </span>
      </button>

      {open && hasTooltip ? (
        <div
          id={tooltipId}
          className={`mt-1 rounded border px-2 py-1.5 text-left text-xs ${panelClass}`}
        >
          <p className="font-mono leading-relaxed tabular-nums">
            {summary.parts.map((part, index) => (
              <span key={`${part.kind}-${part.text}-${index}`}>
                {index > 0 ? ' ' : null}
                <span className={PART_CLASS[part.kind]}>{part.text}</span>
              </span>
            ))}
          </p>
        </div>
      ) : null}
    </div>
  )
}
