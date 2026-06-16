import type { MorphusSlotPickOption } from '../../../types'

const PICK_CARD_CLASS =
  'w-full rounded-lg border border-violet-600 bg-slate-900 px-3 py-3 text-left text-sm text-violet-100 shadow-sm transition hover:border-violet-400 hover:bg-slate-800'

const DISABLED_PICK_CARD_CLASS =
  'w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-3 text-left text-sm text-slate-500 opacity-70'

const SELECTED_CARD_CLASS =
  'rounded-lg border border-emerald-600/50 bg-emerald-950 px-3 py-2 text-sm text-emerald-50'

function ModifierList({
  heading,
  lines,
  tone,
}: {
  heading: string
  lines: string[]
  tone: 'bonus' | 'penalty'
}) {
  const color = tone === 'bonus' ? 'text-emerald-300/95' : 'text-rose-300/95'
  return (
    <div className="mt-2">
      <p className={`text-[10px] font-bold uppercase tracking-wide ${color}`}>{heading}</p>
      {lines.length > 0 ? (
        <ul className={`mt-1 list-disc space-y-0.5 pl-4 text-xs ${color}`}>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className={`mt-0.5 text-xs italic ${color} opacity-80`}>N/A</p>
      )}
    </div>
  )
}

export function MorphusTraitPickDetail({
  entry,
  selected = false,
  showModifiers = true,
}: {
  entry: MorphusSlotPickOption
  selected?: boolean
  showModifiers?: boolean
}) {
  const bonuses = entry.bonuses ?? []
  const penalties = entry.penalties ?? []
  const disabled = entry.disabled === true
  const titleClass = selected ? 'text-emerald-50' : disabled ? 'text-slate-500' : 'text-violet-50'
  const descClass = selected
    ? 'text-emerald-100/85'
    : disabled
      ? 'text-slate-600'
      : 'text-violet-200/85'

  return (
    <div className="flex items-start justify-between gap-3">
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${titleClass}`}>{entry.name}</span>
        {entry.disabledReason ? (
          <span className="mt-1 block text-xs font-medium text-slate-500">{entry.disabledReason}</span>
        ) : null}
        {entry.tableRoute ? (
          <span className="mt-1 block text-xs font-medium text-amber-200/90">{entry.tableRoute}</span>
        ) : null}
        {entry.description ? (
          <span className={`mt-1 block text-xs leading-relaxed ${descClass}`}>{entry.description}</span>
        ) : null}
        {showModifiers ? (
          entry.modifierNote ? (
            <p
              className={`mt-2 text-xs italic ${
                selected ? 'text-emerald-200/90' : 'text-violet-300/90'
              }`}
            >
              {entry.modifierNote}
            </p>
          ) : (
            <>
              <ModifierList heading="Bonuses" lines={bonuses} tone="bonus" />
              <ModifierList heading="Penalties" lines={penalties} tone="penalty" />
            </>
          )
        ) : null}
      </span>
      {entry.band ? (
        <span className="shrink-0 rounded border border-violet-700/80 bg-slate-950/90 px-1.5 py-0.5 font-mono text-[10px] text-violet-300">
          {entry.band}%
        </span>
      ) : null}
    </div>
  )
}

export function MorphusTraitPickCard({
  entry,
  onPick,
  showModifiers = true,
}: {
  entry: MorphusSlotPickOption
  onPick: () => void
  showModifiers?: boolean
}) {
  const disabled = entry.disabled === true
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onPick}
      disabled={disabled}
      aria-disabled={disabled}
      className={disabled ? DISABLED_PICK_CARD_CLASS : PICK_CARD_CLASS}
    >
      <MorphusTraitPickDetail entry={entry} showModifiers={showModifiers && !disabled} />
    </button>
  )
}

export function MorphusSelectedTraitCard({
  entry,
  onChange,
  showModifiers = true,
}: {
  entry: MorphusSlotPickOption
  onChange: () => void
  showModifiers?: boolean
}) {
  return (
    <div className={`mt-2 ${SELECTED_CARD_CLASS}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300/90">Selected</p>
        <button
          type="button"
          onClick={onChange}
          className="shrink-0 rounded border border-violet-600/80 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-200 hover:border-violet-400"
        >
          Change
        </button>
      </div>
      <MorphusTraitPickDetail entry={entry} selected showModifiers={showModifiers} />
    </div>
  )
}

export const MORPHUS_FORGE_FIELD_CLASS =
  'w-full rounded-lg border border-violet-600 bg-slate-900 px-3 py-2 font-mono text-violet-50 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40'

export const MORPHUS_FORGE_BRANCH_CLASS =
  'rounded-lg border border-violet-600 bg-slate-900 px-3 py-2 text-sm text-violet-50 shadow-sm transition hover:border-emerald-500 hover:bg-slate-800'
