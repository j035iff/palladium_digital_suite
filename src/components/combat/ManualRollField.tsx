import { rollD20 } from '../../lib/meleeDice'
import { formatBonus } from '../../lib/combatQuickBonuses'

export type ManualRollFieldProps = {
  label: string
  morphus: boolean
  manualValue: string
  onManualValueChange: (value: string) => void
  calculatedBonus: number
  rollDie?: () => number
  dieLabel?: string
  onRecord?: () => void
  recordLabel?: string
  recordDisabled?: boolean
  hint?: string
}

/** Pillar 5 — manual physical die first; digital dice only fills the field. */
export function ManualRollField({
  label,
  morphus,
  manualValue,
  onManualValueChange,
  calculatedBonus,
  rollDie = rollD20,
  dieLabel = 'd20',
  onRecord,
  recordLabel = 'Record',
  recordDisabled,
  hint,
}: ManualRollFieldProps) {
  const trimmed = manualValue.trim()
  const parsed = Number(trimmed)
  const manualNum = trimmed.length > 0 && Number.isFinite(parsed) ? parsed : null
  const total = manualNum != null ? manualNum + calculatedBonus : null

  const inputCls = morphus
    ? 'border-violet-400 bg-slate-950 text-violet-50 placeholder:text-violet-700'
    : 'border-blue-500 bg-white text-slate-900 placeholder:text-slate-400'

  const diceBtnCls = morphus
    ? 'border-violet-600 bg-violet-950 text-violet-200 hover:bg-violet-900'
    : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'

  return (
    <div className="w-full min-w-[10rem]">
      <label
        className={`mb-1 block text-[10px] font-black uppercase tracking-wide ${
          morphus ? 'text-violet-200' : 'text-slate-700'
        }`}
      >
        {label}
      </label>
      {hint ? (
        <p
          className={`mb-1 text-[9px] leading-snug ${
            morphus ? 'text-violet-400' : 'text-slate-500'
          }`}
        >
          {hint}
        </p>
      ) : null}
      <div className="flex items-stretch gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          value={manualValue}
          onChange={(e) => onManualValueChange(e.target.value)}
          placeholder="Physical die"
          aria-label={`${label} — enter physical die result`}
          className={`min-w-0 flex-1 rounded-lg border-2 px-3 py-2.5 text-center font-mono text-2xl font-black tabular-nums ${inputCls}`}
        />
        <button
          type="button"
          title={`Roll ${dieLabel} and fill field (does not submit)`}
          aria-label={`Roll ${dieLabel} into ${label}`}
          onClick={() => onManualValueChange(String(rollDie()))}
          className={`flex w-10 shrink-0 items-center justify-center rounded-lg border text-lg ${diceBtnCls}`}
        >
          🎲
        </button>
      </div>
      <p
        className={`mt-1.5 font-mono text-[10px] leading-snug ${
          morphus ? 'text-violet-300/90' : 'text-slate-600'
        }`}
        aria-live="polite"
      >
        Total ={' '}
        <span className="font-bold">{manualNum != null ? manualNum : '—'}</span>
        {' + '}
        <span className="font-bold">{formatBonus(calculatedBonus)}</span>
        {total != null ? (
          <>
            {' '}
            = <span className="font-black">{total}</span>
          </>
        ) : null}
      </p>
      {onRecord ? (
        <button
          type="button"
          disabled={recordDisabled ?? manualNum == null}
          onClick={onRecord}
          className={`mt-2 w-full rounded-md px-2 py-2 text-[10px] font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40 ${
            morphus
              ? 'bg-violet-700 text-white hover:bg-violet-600'
              : 'bg-blue-700 text-white hover:bg-blue-600'
          }`}
        >
          {recordLabel}
        </button>
      ) : null}
    </div>
  )
}
