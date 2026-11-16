type Props = {
  level: number
  morphusActive: boolean
  open: boolean
  onToggle: () => void
}

/** Compact Level badge left of the identity stack (Layer 1). */
export function LiveSheetLevelBadge({
  level,
  morphusActive,
  open,
  onToggle,
}: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-haspopup="dialog"
      title="Level and experience"
      aria-label={`Level ${level} — open experience overlay`}
      className={`flex h-[4.5rem] w-12 shrink-0 flex-col items-center justify-center rounded-full border-2 px-1 py-1.5 ${
        morphusActive
          ? 'border-violet-400 bg-slate-950 text-violet-50'
          : 'border-slate-900 bg-white text-slate-950'
      }`}
    >
      <span
        className={`text-[9px] font-semibold uppercase leading-none tracking-wide ${
          morphusActive ? 'text-violet-300' : 'text-slate-500'
        }`}
      >
        Level
      </span>
      <span className="mt-1 text-[1.65rem] font-black leading-none tabular-nums">
        {level}
      </span>
    </button>
  )
}
