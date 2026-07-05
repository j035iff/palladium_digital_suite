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
  variant?: 'forge' | 'identity'
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
      : morphus
        ? 'border-violet-600 bg-slate-950 text-violet-50'
        : 'border-slate-300 bg-white text-slate-900'
  const conflictClass =
    variant === 'identity'
      ? morphus
        ? 'border-amber-400 text-amber-100'
        : 'border-amber-500 text-amber-900'
      : morphus
        ? 'border-amber-500/70 ring-amber-400/30'
        : 'border-amber-500 ring-amber-200'
  const labelClass =
    variant === 'identity'
      ? morphus
        ? 'text-[10px] font-semibold uppercase tracking-wider text-violet-300/80'
        : 'text-[10px] font-semibold uppercase tracking-wider text-slate-500'
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
