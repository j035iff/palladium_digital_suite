import type { FireMode, Weapon } from '../../types'
import { getWeaponFireModes, resolveFireModeAmmoCost } from '../../lib/fireModes'

type WeaponFireModeSelectorProps = {
  weapon: Weapon
  selectedModeId: string
  morphus: boolean
  onSelect: (modeId: string) => void
}

export function WeaponFireModeSelector({
  weapon,
  selectedModeId,
  morphus,
  onSelect,
}: WeaponFireModeSelectorProps) {
  const modes = getWeaponFireModes(weapon)
  if (modes.length === 0) return null

  return (
    <div className="mt-2" role="group" aria-label={`Fire mode for ${weapon.name}`}>
      <p
        className={`mb-1 text-[9px] font-black uppercase tracking-wide ${
          morphus ? 'text-violet-300' : 'text-slate-600'
        }`}
      >
        Fire mode
      </p>
      <div className="flex flex-wrap gap-1">
        {modes.map((mode) => (
          <ModeChip
            key={mode.id}
            mode={mode}
            weapon={weapon}
            selected={selectedModeId === mode.id}
            morphus={morphus}
            onSelect={() => onSelect(mode.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ModeChip({
  mode,
  weapon,
  selected,
  morphus,
  onSelect,
}: {
  mode: FireMode
  weapon: Weapon
  selected: boolean
  morphus: boolean
  onSelect: () => void
}) {
  const cost = resolveFireModeAmmoCost(weapon, mode)
  const costLabel = mode.ammoCost === -1 ? 'clip' : `${cost} rds`
  const modLabel = mode.strikeModifier === 0 ? '+0' : formatBonus(mode.strikeModifier)

  const selectedCls = morphus
    ? 'border-amber-400 bg-violet-800 text-amber-100'
    : 'border-orange-600 bg-orange-600 text-white'
  const idleCls = morphus
    ? 'border-violet-600/80 bg-slate-950/80 text-violet-200 hover:border-violet-400'
    : 'border-slate-300 bg-white text-slate-800 hover:border-blue-400'

  return (
    <button
      type="button"
      title={`${mode.name}: ${costLabel}, strike ${modLabel}`}
      className={`rounded-md border-2 px-2 py-1 text-left transition-colors ${
        selected ? selectedCls : idleCls
      }`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="block text-[9px] font-black uppercase leading-tight">{mode.name}</span>
      <span className="block font-mono text-[8px] opacity-85">
        {costLabel} · {modLabel}
      </span>
    </button>
  )
}

function formatBonus(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}
