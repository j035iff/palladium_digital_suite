import type { MorphusPolymorphicModifier } from '../../../types'

type Props = {
  label: string
  value: MorphusPolymorphicModifier | undefined
  onChange: (next: MorphusPolymorphicModifier | undefined) => void
  compact?: boolean
}

function parseNum(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

export function PolymorphicModifierRow({ label, value, onChange, compact }: Props) {
  const mod = value ?? {}

  const patch = (partial: Partial<MorphusPolymorphicModifier>) => {
    const next = { ...mod, ...partial }
    const empty =
      next.flat == null &&
      (next.dice == null || next.dice.trim() === '') &&
      next.percent == null &&
      next.isOverride !== true
    onChange(empty ? undefined : next)
  }

  return (
    <div
      className={
        compact
          ? 'grid grid-cols-[minmax(5rem,7rem)_1fr_1fr_1fr] items-center gap-2 text-xs'
          : 'grid grid-cols-[minmax(6rem,8rem)_1fr_1fr_1fr_auto] items-center gap-2 text-sm'
      }
    >
      <span className="font-medium text-violet-100/90">{label}</span>
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wide text-violet-400/80">Flat</span>
        <input
          type="number"
          className="rounded border border-violet-700/60 bg-violet-950/40 px-2 py-1 text-violet-50"
          value={mod.flat ?? ''}
          onChange={(e) => patch({ flat: parseNum(e.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wide text-violet-400/80">Dice</span>
        <input
          type="text"
          placeholder="1D6"
          className="rounded border border-violet-700/60 bg-violet-950/40 px-2 py-1 text-violet-50"
          value={mod.dice ?? ''}
          onChange={(e) => patch({ dice: e.target.value || undefined })}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wide text-violet-400/80">%</span>
        <input
          type="number"
          className="rounded border border-violet-700/60 bg-violet-950/40 px-2 py-1 text-violet-50"
          value={mod.percent ?? ''}
          onChange={(e) => patch({ percent: parseNum(e.target.value) })}
        />
      </label>
      {!compact ? (
        <label className="flex items-center gap-1 text-xs text-violet-300/90">
          <input
            type="checkbox"
            checked={mod.isOverride === true}
            onChange={(e) => patch({ isOverride: e.target.checked || undefined })}
          />
          Override
        </label>
      ) : null}
    </div>
  )
}
