import { useId, useState, type FormEvent } from 'react'
import { useCharacter } from '../../../context/CharacterContext'
import {
  DEV_XP_GRANT_HISTORY_LABEL,
  parseDevXpGrantAmount,
} from '../../../lib/dev/parseDevXpGrantAmount'

type Props = {
  /** Match Experience chip / history popover Facade vs Morphus chrome. */
  morphus?: boolean
}

/**
 * Debug-only XP grant — Vite DEV builds only (`import.meta.env.DEV`).
 * Calls shared `grantXp` (same level-up queue path as production awards).
 */
export function DevGrantXpControls({ morphus = false }: Props) {
  const { character, grantXp } = useCharacter()
  const [raw, setRaw] = useState('')
  const inputId = useId()

  if (!import.meta.env.DEV) return null

  const amount = parseDevXpGrantAmount(raw)
  const canAdd = amount != null

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (amount == null) return
    grantXp(amount, DEV_XP_GRANT_HISTORY_LABEL)
    setRaw('')
  }

  const muted = morphus ? 'text-violet-300' : 'text-slate-600'
  const label = morphus ? 'text-violet-200' : 'text-blue-900'
  const field = morphus
    ? 'border-violet-500 bg-slate-900 text-violet-50'
    : 'border-slate-300 bg-white text-slate-900'
  const btn = morphus
    ? 'border-amber-400 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 disabled:opacity-40'
    : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40'

  return (
    <form
      className={`mb-2 border-b border-dotted pb-2 ${
        morphus ? 'border-violet-700' : 'border-slate-200'
      }`}
      onSubmit={onSubmit}
      aria-label="Debug add experience"
    >
      <p className={`text-[10px] font-black uppercase tracking-wide ${label}`}>
        Debug — Add XP
      </p>
      <p className={`mt-0.5 font-mono text-xs tabular-nums ${muted}`}>
        Current: {character.xp.toLocaleString()} XP · Level {character.level}
      </p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <label htmlFor={inputId} className="sr-only">
          XP amount to add
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Amount"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className={`min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs tabular-nums outline-none focus-visible:ring-2 ${field}`}
        />
        <button
          type="submit"
          disabled={!canAdd}
          className={`shrink-0 rounded border-2 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${btn}`}
        >
          Add
        </button>
      </div>
    </form>
  )
}
