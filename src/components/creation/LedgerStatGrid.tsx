import type { CreationLedgerLine } from '../../lib/creationLiveLedger'
import { ledgerDiceGroupRowLabel } from '../../lib/ledgerStatBonuses'

const HOVER_VALUE_CLASS =
  'cursor-help underline decoration-dotted decoration-slate-400/70 underline-offset-2'

function LedgerHint({
  hint,
  skillDetailTooltip,
}: {
  hint: string
  skillDetailTooltip?: string
}) {
  if (!skillDetailTooltip || !hint.includes('Skills:')) {
    return <dd className="text-[10px] opacity-60">{hint}</dd>
  }

  const segments = hint.split(' · ')
  return (
    <dd className="text-[10px] opacity-60">
      {segments.map((segment, index) => {
        const isSkills = segment.startsWith('Skills:')
        return (
          <span key={segment}>
            {index > 0 ? ' · ' : null}
            {isSkills ? (
              <span className={HOVER_VALUE_CLASS} title={skillDetailTooltip}>
                {segment}
              </span>
            ) : (
              segment
            )}
          </span>
        )
      })}
    </dd>
  )
}

function LedgerSimpleRow({ line }: { line: CreationLedgerLine }) {
  const valueTitle = line.valueTooltip ?? line.hint
  const valueHoverable = Boolean(line.valueTooltip)

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between gap-2">
        <dt className="opacity-80">{line.label}</dt>
        <dd
          className={`shrink-0 text-right font-mono font-semibold tabular-nums ${
            valueHoverable ? HOVER_VALUE_CLASS : ''
          }`}
          title={valueTitle}
        >
          {line.value}
        </dd>
      </div>
      {line.hint ? (
        <LedgerHint hint={line.hint} skillDetailTooltip={line.skillDetailTooltip} />
      ) : null}
    </div>
  )
}

function LedgerStatRow({ line }: { line: CreationLedgerLine }) {
  const hasStatLayout =
    line.inlineRaceRoll != null ||
    line.labelSuffix != null ||
    (line.diceGroups != null && line.diceGroups.length > 0) ||
    line.valueModified === true

  if (!hasStatLayout) {
    return <LedgerSimpleRow line={line} />
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between gap-2">
        <dt className="flex min-w-0 flex-1 items-baseline gap-1.5 opacity-80">
          <span className="shrink-0">{line.label}</span>
          {line.inlineRaceRoll ? (
            <span className="shrink-0 font-mono text-xs font-semibold tabular-nums opacity-90">
              {line.inlineRaceRoll}
            </span>
          ) : null}
          {line.labelSuffix ? (
            <span className="shrink-0 font-mono text-[10px] font-bold text-rose-600 dark:text-rose-400">
              {line.labelSuffix}
            </span>
          ) : null}
        </dt>
        <dd
          className={`shrink-0 text-right font-mono font-semibold tabular-nums ${
            line.valueModified
              ? 'text-emerald-600 dark:text-emerald-400'
              : ''
          } ${line.valueTooltip ? HOVER_VALUE_CLASS : ''}`}
          title={line.valueTooltip}
        >
          {line.value}
        </dd>
      </div>
      {line.diceGroups && line.diceGroups.length > 0 ? (
        <dd className="text-[10px] leading-relaxed opacity-60">
          {line.diceGroups.map((group, index) => (
            <span key={group.kind}>
              {index > 0 ? ', ' : null}
              <span
                className={HOVER_VALUE_CLASS}
                title={group.tooltip}
              >
                {ledgerDiceGroupRowLabel(group.kind)}: {group.display}
              </span>
            </span>
          ))}
        </dd>
      ) : line.hint ? (
        <LedgerHint hint={line.hint} skillDetailTooltip={line.skillDetailTooltip} />
      ) : null}
    </div>
  )
}

export function LedgerStatGrid({ lines }: { lines: CreationLedgerLine[] }) {
  return (
    <dl className="space-y-1 text-xs">
      {lines.map((line) => (
        <LedgerStatRow key={line.label} line={line} />
      ))}
    </dl>
  )
}

export function LedgerGrid({ lines }: { lines: CreationLedgerLine[] }) {
  return (
    <dl className="space-y-1 text-xs">
      {lines.map((line) => (
        <LedgerSimpleRow key={line.label} line={line} />
      ))}
    </dl>
  )
}
