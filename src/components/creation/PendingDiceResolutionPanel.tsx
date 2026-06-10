import { useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  listPendingDiceBlocks,
  pendingDiceBlocksResolutionComplete,
} from '../../lib/pendingDiceLedger'
import {
  formatPendingDiceGroupLabel,
  pendingDiceBlockRunningTotal,
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
        if (
          value != null &&
          Number.isFinite(value) &&
          value >= roll.min &&
          value <= roll.max
        ) {
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

function PendingDiceInput({
  roll,
  value,
  onChange,
  compact,
}: {
  roll: PendingDiceRoll
  value: number | undefined
  onChange: (value: number) => void
  compact?: boolean
}) {
  const invalid =
    value != null && (value < roll.min || value > roll.max || !Number.isFinite(value))
  const done =
    value != null &&
    Number.isFinite(value) &&
    value >= roll.min &&
    value <= roll.max

  const inputClass = compact
    ? `w-16 rounded border px-1.5 py-1 font-mono text-xs text-slate-900 dark:text-slate-50 ${
        invalid ? 'border-rose-500' : done ? 'border-emerald-500' : 'border-slate-400'
      }`
    : `w-28 rounded-lg border-2 px-3 py-2 text-center font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50 ${
        invalid
          ? 'border-rose-500'
          : done
            ? 'border-emerald-500'
            : 'border-blue-500'
      }`

  return (
    <input
      type="number"
      inputMode="numeric"
      min={roll.min}
      max={roll.max}
      placeholder={`${roll.min}–${roll.max}`}
      aria-label={`${roll.source} — enter ${roll.notation} result`}
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return
        const n = Number(raw)
        if (Number.isFinite(n)) onChange(n)
      }}
      className={inputClass}
    />
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
  onChange: (rollId: string, value: number) => void
  compact?: boolean
}) {
  const runningTotal = pendingDiceBlockRunningTotal(block, resolutions)

  return (
    <section className="rounded-md border border-slate-300 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">
          {block.label}
        </h4>
        <p
          className="font-mono text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-300"
          title={block.flatTooltip}
        >
          {runningTotal}
        </p>
      </div>
      {block.hint ? (
        <p className="mb-3 font-mono text-xs text-slate-700 dark:text-slate-200">
          {block.hint}
        </p>
      ) : null}
      {block.groups.map((group) => (
        <div key={`${block.id}-${group.kind}`} className="mb-3 last:mb-0">
          <p className="mb-1 font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">
            {formatPendingDiceGroupLabel(group.kind)}: {group.display}
          </p>
          <p
            className="mb-2 text-[10px] text-slate-600 dark:text-slate-300"
            title={group.tooltip}
          >
            {group.tooltip}
          </p>
          <ul className={compact ? 'space-y-2' : 'space-y-3'}>
            {group.rolls.map((roll) => {
              const value = resolutions[roll.id]
              return (
                <li
                  key={roll.id}
                  className={`flex flex-wrap items-end gap-3 ${
                    compact ? '' : 'border-b border-slate-200 pb-3 last:border-0 dark:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {roll.source}
                    </p>
                    <p className="font-mono text-xs text-slate-700 dark:text-slate-200">
                      Roll {roll.notation} → {roll.min}–{roll.max}
                    </p>
                  </div>
                  <PendingDiceInput
                    roll={roll}
                    value={value}
                    compact={compact}
                    onChange={(n) => onChange(roll.id, n)}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      ))}
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
      listPendingDiceBlocks(character, activeRace, effectiveOcc ?? undefined, {
        supportsDualForm,
        psychicTier,
        scope,
      }),
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
        Roll your physical dice for each stat block below. Totals at the top of each block
        and the Live Ledger update as you enter results (Pillar 5 — physical dice first).
        Spawn writes these values to the character sheet.
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

