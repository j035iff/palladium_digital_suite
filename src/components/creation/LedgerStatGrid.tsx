import type { CreationLedgerLine } from '../../lib/creationLiveLedger'
import { ledgerDiceGroupRowLabel } from '../../lib/ledgerStatBonuses'

/** Near-black wine — darker than Tailwind red-950 so rose penalty text stays legible. */
export const MORPHUS_LEDGER_SURFACE_CLASS = 'bg-[#0a0101]'
export const MORPHUS_LEDGER_BORDER_CLASS = 'border-[#2a0808]'

const HOVER_VALUE_CLASS =
  'cursor-help underline decoration-dotted decoration-slate-400/70 underline-offset-2'

const HOVER_VALUE_CLASS_MORPHUS =
  'cursor-help underline decoration-dotted decoration-orange-200/80 underline-offset-2'

function ledgerHintClass(morphus?: boolean): string {
  return morphus ? 'text-[10px] text-orange-100/85' : 'text-[10px] opacity-60'
}

function morphusValueTone(
  value: string,
  valueModified?: boolean,
  hasPendingRolls?: boolean,
): string {
  if (hasPendingRolls) return 'text-yellow-300'
  if (valueModified) return 'text-emerald-300'
  const trimmed = value.trim()
  if (trimmed.startsWith('-') || trimmed.startsWith('−') || trimmed.startsWith('–')) {
    return 'text-orange-200'
  }
  return 'text-white'
}

function facadeValueTone(valueModified?: boolean, hasPendingRolls?: boolean): string {
  if (hasPendingRolls) return 'text-yellow-600 dark:text-yellow-400'
  if (valueModified) return 'text-emerald-600 dark:text-emerald-400'
  return ''
}

function LedgerHint({
  hint,
  skillDetailTooltip,
  morphus,
}: {
  hint: string
  skillDetailTooltip?: string
  morphus?: boolean
}) {
  if (!skillDetailTooltip || !hint.includes('Skills:')) {
    return <dd className={ledgerHintClass(morphus)}>{hint}</dd>
  }

  const segments = hint.split(' · ')
  return (
    <dd className={ledgerHintClass(morphus)}>
      {segments.map((segment, index) => {
        const isSkills = segment.startsWith('Skills:')
        return (
          <span key={segment}>
            {index > 0 ? ' · ' : null}
            {isSkills ? (
              <span
                className={morphus ? HOVER_VALUE_CLASS_MORPHUS : HOVER_VALUE_CLASS}
                title={skillDetailTooltip}
              >
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

function LedgerSimpleRow({
  line,
  morphus,
}: {
  line: CreationLedgerLine
  morphus?: boolean
}) {
  const valueTitle = line.valueTooltip ?? line.hint
  const valueHoverable = Boolean(line.valueTooltip)

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between gap-2">
        <dt className={morphus ? 'text-orange-50/95' : 'opacity-80'}>{line.label}</dt>
        <dd
          className={`shrink-0 text-right font-mono font-semibold tabular-nums ${
            morphus
              ? morphusValueTone(line.value, line.valueModified, line.hasPendingRolls)
              : facadeValueTone(line.valueModified, line.hasPendingRolls)
          } ${valueHoverable ? (morphus ? HOVER_VALUE_CLASS_MORPHUS : HOVER_VALUE_CLASS) : ''}`}
          title={valueTitle}
        >
          {line.value}
        </dd>
      </div>
      {line.hint ? (
        <LedgerHint
          hint={line.hint}
          skillDetailTooltip={line.skillDetailTooltip}
          morphus={morphus}
        />
      ) : null}
    </div>
  )
}

function LedgerStatRow({
  line,
  morphus,
}: {
  line: CreationLedgerLine
  morphus?: boolean
}) {
  const hasStatLayout =
    line.inlineRaceRoll != null ||
    line.labelSuffix != null ||
    (line.diceGroups != null && line.diceGroups.length > 0) ||
    line.valueModified === true

  if (!hasStatLayout) {
    return <LedgerSimpleRow line={line} morphus={morphus} />
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between gap-2">
        <dt className="flex min-w-0 flex-1 items-baseline gap-1.5 opacity-80">
          <span className={`shrink-0 ${morphus ? 'text-orange-50/95' : ''}`}>
            {line.label}
          </span>
          {line.inlineRaceRoll ? (
            <span
              className={`shrink-0 font-mono text-xs font-semibold tabular-nums ${
                morphus ? 'text-orange-100/90' : 'opacity-90'
              }`}
            >
              {line.inlineRaceRoll}
            </span>
          ) : null}
          {line.labelSuffix ? (
            <span
              className={`shrink-0 font-mono text-[10px] font-bold ${
                morphus ? 'text-orange-200' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {line.labelSuffix}
            </span>
          ) : null}
        </dt>
        <dd
          className={`shrink-0 text-right font-mono font-semibold tabular-nums ${
            morphus
              ? morphusValueTone(line.value, line.valueModified, line.hasPendingRolls)
              : facadeValueTone(line.valueModified, line.hasPendingRolls)
          } ${line.valueTooltip ? (morphus ? HOVER_VALUE_CLASS_MORPHUS : HOVER_VALUE_CLASS) : ''}`}
          title={line.valueTooltip}
        >
          {line.value}
        </dd>
      </div>
      {line.diceGroups && line.diceGroups.length > 0 ? (
        <dd className={ledgerHintClass(morphus)}>
          {line.diceGroups.map((group, index) => (
            <span key={group.kind}>
              {index > 0 ? ', ' : null}
              <span
                className={morphus ? HOVER_VALUE_CLASS_MORPHUS : HOVER_VALUE_CLASS}
                title={group.tooltip}
              >
                {ledgerDiceGroupRowLabel(group.kind)}: {group.display}
              </span>
            </span>
          ))}
        </dd>
      ) : line.hint ? (
        <LedgerHint
          hint={line.hint}
          skillDetailTooltip={line.skillDetailTooltip}
          morphus={morphus}
        />
      ) : null}
    </div>
  )
}

export function LedgerStatGrid({
  lines,
  morphus,
}: {
  lines: CreationLedgerLine[]
  morphus?: boolean
}) {
  return (
    <dl className="space-y-1 text-xs">
      {lines.map((line) => (
        <LedgerStatRow key={line.label} line={line} morphus={morphus} />
      ))}
    </dl>
  )
}

export function LedgerGrid({
  lines,
  morphus,
}: {
  lines: CreationLedgerLine[]
  morphus?: boolean
}) {
  return (
    <dl className="space-y-1 text-xs">
      {lines.map((line) => (
        <LedgerSimpleRow key={line.label} line={line} morphus={morphus} />
      ))}
    </dl>
  )
}

