import { useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  listPendingDiceBlocks,
} from '../../lib/pendingDiceLedger'
import {
  formatPendingDiceBlockHeaderBase,
  formatPendingDiceRollLabel,
  isPendingDiceRollValueValid,
  pendingDiceBlockHasUnresolvedRolls,
  pendingDiceBlockRunningTotal,
  pendingDiceBlocksWithRolls,
  type PendingDiceBlock,
  type PendingDiceBlockScope,
  type PendingDiceRoll,
} from '../../lib/spawnDiceBlocks'

function resolvedRollCount(
  blocks: readonly PendingDiceBlock[],
  resolutions: Readonly<Record<string, number>>,
): number {
  let count = 0
  for (const block of blocks) {
    for (const group of block.groups) {
      for (const roll of group.rolls) {
        const value = resolutions[roll.id]
        if (isPendingDiceRollValueValid(roll, value)) {
          count += 1
        }
      }
    }
  }
  return count
}

function totalRollCount(blocks: readonly PendingDiceBlock[]): number {
  return blocks.reduce(
    (sum, block) =>
      sum + block.groups.reduce((groupSum, group) => groupSum + group.rolls.length, 0),
    0,
  )
}

function rollRangeTooltip(roll: PendingDiceRoll): string {
  if (roll.allowedValues?.length) {
    return `Roll ${roll.notation} — enter ${roll.allowedValues.join(', ')}`
  }
  return `Roll ${roll.notation} — enter a value from ${roll.min} to ${roll.max}`
}

function PendingDiceInput({
  roll,
  value,
  onChange,
  compact,
}: {
  roll: PendingDiceRoll
  value: number | undefined
  onChange: (value: number | null) => void
  compact?: boolean
}) {
  const invalid = value != null && !isPendingDiceRollValueValid(roll, value)
  const done = isPendingDiceRollValueValid(roll, value)

  const notationClass = compact
    ? `rounded-l border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${
        invalid
          ? 'border-rose-500 bg-rose-50 text-rose-900'
          : done
            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
            : 'border-slate-400 bg-slate-100 text-slate-800 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100'
      }`
    : `rounded-l-lg border-2 px-2.5 py-2 font-mono text-xs font-bold uppercase tracking-wide ${
        invalid
          ? 'border-rose-500 bg-rose-50 text-rose-900'
          : done
            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
            : 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-slate-800 dark:text-blue-100'
      }`

  const rollLabel = formatPendingDiceRollLabel(roll)
  const valueControlClass = compact
    ? `w-14 rounded-r border border-l-0 bg-white px-1.5 py-1 font-mono text-xs tabular-nums text-slate-900 dark:bg-slate-950 dark:text-slate-50 ${
        invalid ? 'border-rose-500' : done ? 'border-emerald-500' : 'border-slate-400'
      }`
    : `w-16 rounded-r-lg border-2 border-l-0 bg-white px-2 py-2 text-center font-mono text-base font-bold tabular-nums text-slate-900 dark:bg-slate-950 dark:text-slate-50 ${
        invalid
          ? 'border-rose-500'
          : done
            ? 'border-emerald-500'
            : 'border-blue-500'
      }`

  return (
    <div
      className="inline-flex shrink-0 items-stretch"
      title={rollRangeTooltip(roll)}
    >
      <span className={notationClass} aria-hidden>
        {roll.notation}
      </span>
      {roll.allowedValues?.length ? (
        <select
          aria-label={`${rollLabel} — ${rollRangeTooltip(roll)}`}
          value={value ?? ''}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              onChange(null)
              return
            }
            const n = Number(raw)
            if (Number.isFinite(n)) onChange(n)
          }}
          className={valueControlClass}
        >
          <option value="">?</option>
          {roll.allowedValues.map((allowed) => (
            <option key={allowed} value={allowed}>
              {allowed}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          inputMode="numeric"
          min={roll.min}
          max={roll.max}
          placeholder="?"
          aria-label={`${rollLabel} — ${rollRangeTooltip(roll)}`}
          value={value ?? ''}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              onChange(null)
              return
            }
            const n = Number(raw)
            if (Number.isFinite(n)) onChange(n)
          }}
          className={valueControlClass}
        />
      )}
    </div>
  )
}

function PendingDiceRollRow({
  roll,
  value,
  onChange,
  compact,
}: {
  roll: PendingDiceRoll
  value: number | undefined
  onChange: (value: number | null) => void
  compact?: boolean
}) {
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-2 ${
        compact ? 'py-1' : 'py-2'
      }`}
    >
      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-100">
        {formatPendingDiceRollLabel(roll)}
      </span>
      <PendingDiceInput
        roll={roll}
        value={value}
        compact={compact}
        onChange={onChange}
      />
    </li>
  )
}

function PendingDiceBlockSection({
  block,
  resolutions,
  onChange,
  compact,
}: {
  block: PendingDiceBlock
  resolutions: Readonly<Record<string, number>>
  onChange: (rollId: string, value: number | null) => void
  compact?: boolean
}) {
  const runningTotal = pendingDiceBlockRunningTotal(block, resolutions)
  const rollsComplete = !pendingDiceBlockHasUnresolvedRolls(block, resolutions)
  const rolls = block.groups.flatMap((group) => group.rolls)
  const headerBase = formatPendingDiceBlockHeaderBase(block)

  return (
    <section className="rounded-md border border-slate-300 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-900">
      <div className="overflow-hidden rounded-md bg-slate-800 dark:bg-slate-950">
        <div className="flex items-baseline justify-between gap-3 border-b border-blue-900/40 bg-slate-600 px-3 py-3 dark:border-blue-800/50 dark:bg-blue-950/40">
          <h4
            className={`font-black uppercase leading-none tracking-wide text-white ${
              compact ? 'text-xl' : 'text-3xl'
            }`}
          >
            {block.label}
          </h4>
          <span
            className={`shrink-0 font-mono text-lg font-black tabular-nums text-white ${
              compact ? '' : 'text-xl'
            }`}
          >
            {headerBase}
          </span>
        </div>
        <ul className="divide-y divide-slate-700/80 px-3">
          {rolls.map((roll) => (
            <PendingDiceRollRow
              key={roll.id}
              roll={roll}
              value={resolutions[roll.id]}
              compact={compact}
              onChange={(n) => onChange(roll.id, n)}
            />
          ))}
        </ul>
        <div
          className={`flex items-baseline justify-between gap-2 border-t border-slate-600 px-3 py-2 ${
            rollsComplete ? 'bg-emerald-950/40' : 'bg-amber-950/30'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Total
          </span>
          <p
            className={`font-mono font-black tabular-nums ${
              compact ? 'text-base' : 'text-xl'
            } ${rollsComplete ? 'text-emerald-400' : 'text-amber-400'}`}
            title={block.flatTooltip}
          >
            {runningTotal}
          </p>
        </div>
      </div>
    </section>
  )
}

export function PendingDiceResolutionPanel({
  variant = 'full',
  scope = 'all',
}: {
  variant?: 'full' | 'compact'
  scope?: PendingDiceBlockScope
}) {
  const {
    character,
    activeRace,
    effectiveOcc,
    psychicTier,
    supportsDualForm,
    setCreationPendingDiceResolution,
  } = useCharacter()

  const blocks = useMemo(
    () =>
      pendingDiceBlocksWithRolls(
        listPendingDiceBlocks(character, activeRace, effectiveOcc ?? undefined, {
          supportsDualForm,
          psychicTier,
          scope,
        }),
      ),
    [character, activeRace, effectiveOcc, supportsDualForm, psychicTier, scope],
  )

  const resolutions = character.creationPendingDiceResolutions ?? {}
  const entered = resolvedRollCount(blocks, resolutions)
  const totalRolls = totalRollCount(blocks)

  if (blocks.length === 0) {
    return (
      <p className="text-xs text-slate-700 dark:text-slate-200" role="status">
        No pending dice for this build.
      </p>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-2 text-xs">
        {blocks.map((block) => (
          <PendingDiceBlockSection
            key={block.id}
            block={block}
            resolutions={resolutions}
            compact
            onChange={setCreationPendingDiceResolution}
          />
        ))}
        <p className="pt-1 text-[10px] text-slate-700 dark:text-slate-200" role="status">
          {entered}/{totalRolls} rolls entered — Live Ledger updates as you type
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border-2 border-blue-400 bg-white p-4 shadow-sm dark:border-blue-600 dark:bg-slate-950">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">
          Physical die results
        </h3>
        <p className="font-mono text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
          {entered}/{totalRolls} entered
        </p>
      </div>
      <p className="mb-4 text-xs leading-snug text-slate-800 dark:text-slate-200">
        Enter each physical die result below. Each block shows rolls to resolve and a
        running total at the bottom; the Live Ledger updates as you type (Pillar 5 —
        physical dice first). Hover a die box for the valid result range.
      </p>
      <div className="space-y-4">
        {blocks.map((block) => (
          <PendingDiceBlockSection
            key={block.id}
            block={block}
            resolutions={resolutions}
            onChange={setCreationPendingDiceResolution}
          />
        ))}
      </div>
    </div>
  )
}
