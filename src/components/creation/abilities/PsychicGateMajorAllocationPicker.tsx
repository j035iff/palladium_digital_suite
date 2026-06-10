import { useCharacter } from '../../../context/CharacterContext'
import type { PsychicGateMajorAllocation } from '../../../types'

const OPTIONS = [
  {
    id: 'single_pool' as PsychicGateMajorAllocation,
    label: '8 from one category',
    detail: 'All picks from Sensitive, Physical, or Healing',
  },
  {
    id: 'mixed_pools' as PsychicGateMajorAllocation,
    label: '6 mixed',
    detail: 'Any combination across Sensitive, Physical, and Healing',
  },
] as const

type PsychicGateMajorAllocationPickerProps = {
  morphus: boolean
}

export function PsychicGateMajorAllocationPicker({
  morphus,
}: PsychicGateMajorAllocationPickerProps) {
  const { character, setPsychicGateMajorAllocation } = useCharacter()
  const activeAllocation = character.creationPsychicGateMajorAllocation

  return (
    <div
      className={`mb-4 rounded-lg border p-3 text-sm ${
        morphus
          ? 'border-violet-800 bg-slate-900/50 text-violet-100'
          : 'border-slate-200 bg-slate-50 text-slate-800'
      }`}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
        Major psionic allocation
      </p>
      <p className="mb-3 text-xs opacity-90">
        Choose how your Major psionic picks are distributed at 1st level before
        selecting powers.
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const active = activeAllocation === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setPsychicGateMajorAllocation(option.id)}
              className={`rounded-md border-2 px-3 py-2 text-left text-sm transition ${
                active
                  ? morphus
                    ? 'border-amber-400 bg-violet-900 text-amber-100'
                    : 'border-blue-600 bg-blue-50 text-blue-900'
                  : morphus
                    ? 'border-violet-700 bg-slate-950 hover:border-violet-500'
                    : 'border-slate-300 bg-white hover:border-blue-400'
              }`}
            >
              <span className="block font-semibold">{option.label}</span>
              <span className="block text-[11px] opacity-80">{option.detail}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
