import type { ActiveForm, Character, Weapon } from '../../types'
import type { AmmoReservesState } from '../../lib/ammoReserves'
import { WeaponStrikeCard, type StrikeBannerState } from './WeaponStrikeCard'
import { defaultFireModeId } from '../../lib/fireModes'

type Props = {
  morphus: boolean
  eraLabel: string
  candidates: readonly Weapon[]
  selected: Weapon | null
  character: Character
  activeForm: ActiveForm
  ammoReserves: AmmoReservesState
  fireModeId: string
  reloadShakeTrigger: number
  hostNote?: string
  onSelectWeapon: (weaponId: string) => void
  onFireModeChange: (modeId: string) => void
  onStrikeResolved: (banner: NonNullable<StrikeBannerState>) => void
  onSpendAmmo: (weaponId: string, rounds: number) => void
  onReload: (weaponId: string) => void
  onReloadFailed: (weaponId: string) => void
  onRequestReloadShake: (weaponId: string) => void
}

/** Expanded ancient/modern bubble: Gear picker + full weapon profile. */
export function CombatWeaponSlotExpand({
  morphus,
  eraLabel,
  candidates,
  selected,
  character,
  activeForm,
  ammoReserves,
  fireModeId,
  reloadShakeTrigger,
  hostNote,
  onSelectWeapon,
  onFireModeChange,
  onStrikeResolved,
  onSpendAmmo,
  onReload,
  onReloadFailed,
  onRequestReloadShake,
}: Props) {
  const muted = morphus ? 'text-violet-300/90' : 'text-slate-600'
  const listBox = morphus
    ? 'border-violet-700/80 bg-black/40 text-violet-50'
    : 'border-slate-200 bg-white text-slate-900'

  return (
    <div className="space-y-3">
      <div>
        <p className={`mb-1 text-[10px] font-black uppercase tracking-wider ${morphus ? 'text-violet-200' : 'text-blue-900'}`}>
          Carried {eraLabel.toLowerCase()} (Gear)
        </p>
        {candidates.length === 0 ? (
          <p className={`text-[11px] font-semibold ${muted}`}>
            No {eraLabel.toLowerCase()} in Gear. Add one on the Gear tab to equip this slot.
          </p>
        ) : (
          <ul className={`divide-y rounded-lg border text-[12px] ${listBox} ${morphus ? 'divide-violet-800/80' : 'divide-slate-200'}`}>
            {candidates.map((w) => {
              const active = selected?.id === w.id
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-2 text-left ${
                      active
                        ? morphus
                          ? 'bg-violet-800/70 font-bold'
                          : 'bg-blue-100 font-bold'
                        : morphus
                          ? 'hover:bg-violet-950/80'
                          : 'hover:bg-slate-50'
                    }`}
                    onClick={() => onSelectWeapon(w.id)}
                    aria-pressed={active}
                  >
                    <span className="truncate">{w.name}</span>
                    <span className={`text-[10px] uppercase ${muted}`}>
                      {active ? 'Equipped' : 'Select'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {hostNote ? (
        <p className={`text-[11px] font-semibold ${muted}`}>{hostNote}</p>
      ) : null}

      {selected ? (
        <ul className="list-none p-0">
          <WeaponStrikeCard
            weapon={selected}
            character={character}
            activeForm={activeForm}
            morphus={morphus}
            ammoReserves={ammoReserves}
            fireModeId={fireModeId || defaultFireModeId(selected)}
            reloadShakeTrigger={reloadShakeTrigger}
            onFireModeChange={onFireModeChange}
            onStrikeResolved={onStrikeResolved}
            onSpendAmmo={onSpendAmmo}
            onReload={() => onReload(selected.id)}
            onReloadFailed={() => onReloadFailed(selected.id)}
            onRequestReloadShake={() => onRequestReloadShake(selected.id)}
          />
        </ul>
      ) : null}
    </div>
  )
}
