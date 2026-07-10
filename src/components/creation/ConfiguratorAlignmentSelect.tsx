import { useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  CONFIGURATOR_ALIGNMENT_UNDECIDED,
  configuratorAlignmentLabel,
  describeAlignmentSelectionConflict,
  effectiveConfiguratorAlignment,
  PALLADIUM_ALIGNMENT_VALUES,
} from '../../lib/configuratorMatrix'

export function ConfiguratorAlignmentSelect({
  morphus,
  variant = 'forge',
}: {
  morphus: boolean
  variant?: 'forge' | 'identity' | 'creation'
}) {
  const { character, activeRace, activeOcc, setAlignment } = useCharacter()

  const currentAlignment = effectiveConfiguratorAlignment(character.primary.alignment)

  const options = useMemo(
    () =>
      PALLADIUM_ALIGNMENT_VALUES.map((alignment) => {
        const conflict = describeAlignmentSelectionConflict(
          alignment,
          activeRace,
          activeOcc ?? undefined,
        )
        return {
          value: alignment,
          label: configuratorAlignmentLabel(alignment),
          compatible: conflict == null,
          conflictReason: conflict,
        }
      }),
    [activeRace, activeOcc],
  )

  const currentConflict = useMemo(() => {
    if (!currentAlignment) return null
    return describeAlignmentSelectionConflict(
      currentAlignment,
      activeRace,
      activeOcc ?? undefined,
    )
  }, [currentAlignment, activeRace, activeOcc])

  const selectClass =
    variant === 'identity'
      ? morphus
        ? 'border-violet-500/40 bg-transparent text-violet-100 focus:border-violet-400'
        : 'border-slate-300 bg-transparent text-slate-900 focus:border-blue-600'
      : variant === 'creation'
        ? morphus
          ? 'border-0 bg-transparent text-violet-950 focus:ring-0'
          : 'border-0 bg-transparent text-slate-900 focus:ring-0'
        : morphus
          ? 'border-violet-600 bg-slate-950 text-violet-50'
          : 'border-slate-300 bg-white text-slate-900'
  const conflictClass =
    variant === 'identity'
      ? morphus
        ? 'border-amber-400 text-amber-100'
        : 'border-amber-500 text-amber-900'
      : variant === 'creation'
        ? morphus
          ? 'border-amber-400/80 ring-amber-400/30'
          : 'border-amber-500/80 ring-amber-400/30'
        : morphus
          ? 'border-amber-500/70 ring-amber-400/30'
          : 'border-amber-500 ring-amber-200'
  const labelClass =
    variant === 'identity'
      ? morphus
        ? 'text-[10px] font-semibold uppercase tracking-wider text-violet-300/80'
        : 'text-[10px] font-semibold uppercase tracking-wider text-slate-500'
      : variant === 'creation'
        ? 'text-[0.5em] font-bold uppercase leading-none tracking-wide text-slate-500'
        : morphus
          ? 'text-[10px] font-bold uppercase tracking-wide text-violet-300'
          : 'text-[10px] font-bold uppercase tracking-wide text-slate-500'

  const selectElement = (
    <select
      value={currentAlignment || CONFIGURATOR_ALIGNMENT_UNDECIDED}
      onChange={(event) => {
        const value = event.target.value
        setAlignment(value === CONFIGURATOR_ALIGNMENT_UNDECIDED ? '' : value)
      }}
      title={currentConflict ?? undefined}
      aria-label="Character alignment"
      className={
        variant === 'identity'
          ? `w-full cursor-pointer border-0 border-b-2 px-0 py-0.5 text-sm font-medium outline-none transition-colors ${selectClass} ${
              currentConflict ? conflictClass : ''
            }`
          : variant === 'creation'
            ? `cursor-pointer border-0 bg-transparent px-0 py-0 text-[15px] font-semibold uppercase leading-tight tracking-wide outline-none sm:text-[18px] ${selectClass} ${
                currentConflict ? conflictClass : ''
              }`
            : `rounded-lg border-2 px-2.5 py-1.5 text-sm font-medium shadow-sm outline-none focus:ring-2 ${selectClass} ${
                currentConflict ? conflictClass : ''
              }`
      }
    >
      <option value={CONFIGURATOR_ALIGNMENT_UNDECIDED}>
        {configuratorAlignmentLabel(CONFIGURATOR_ALIGNMENT_UNDECIDED)}
      </option>
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={!option.compatible}
          title={option.conflictReason ?? undefined}
        >
          {option.label}
        </option>
      ))}
    </select>
  )

  if (variant === 'identity') {
    return (
      <div>
        <p className={labelClass}>Alignment</p>
        {selectElement}
        {currentConflict ? (
          <span
            className={`mt-0.5 block max-w-xs text-[10px] leading-snug ${
              morphus ? 'text-amber-200' : 'text-amber-800'
            }`}
          >
            {currentConflict}
          </span>
        ) : null}
      </div>
    )
  }

  if (variant === 'creation') {
    const alignmentDisplayLabel = configuratorAlignmentLabel(
      currentAlignment || CONFIGURATOR_ALIGNMENT_UNDECIDED,
    )

    return (
      <select
        value={currentAlignment || CONFIGURATOR_ALIGNMENT_UNDECIDED}
        onChange={(event) => {
          const value = event.target.value
          setAlignment(value === CONFIGURATOR_ALIGNMENT_UNDECIDED ? '' : value)
        }}
        title={currentConflict ?? alignmentDisplayLabel}
        aria-label="Character alignment"
        className={`m-0 inline-block max-w-full cursor-pointer align-baseline border-0 bg-transparent p-0 text-[1em] font-semibold uppercase leading-none tracking-wide outline-none ${
          morphus ? 'text-violet-950' : 'text-slate-900'
        } ${currentConflict ? conflictClass : ''}`}
      >
        <option
          value={CONFIGURATOR_ALIGNMENT_UNDECIDED}
          className="bg-white text-slate-900"
        >
          {configuratorAlignmentLabel(CONFIGURATOR_ALIGNMENT_UNDECIDED)}
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={!option.compatible}
            title={option.conflictReason ?? undefined}
            className={
              option.compatible ? 'bg-white text-slate-900' : 'bg-white text-slate-400'
            }
          >
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <label className="flex min-w-[12rem] flex-col gap-1 text-left">
      <span className={labelClass}>Alignment</span>
      {selectElement}
      {currentConflict ? (
        <span
          className={`max-w-xs text-[10px] leading-snug ${
            morphus ? 'text-amber-200' : 'text-amber-800'
          }`}
        >
          {currentConflict}
        </span>
      ) : null}
    </label>
  )
}
