import { useState } from 'react'
import type { Weapon } from '../../types'
import {
  ammoCategoryForWeapon,
  canReloadWeapon,
  isOutOfCategoryAmmo,
  reloadRoundsRequired,
  reserveRoundsForWeapon,
  type AmmoReservesState,
} from '../../lib/ammoReserves'

type WeaponReloadControlProps = {
  weapon: Weapon
  ammoReserves: AmmoReservesState
  morphus: boolean
  onReload: () => void
  onReloadFailed: () => void
  vibrant?: boolean
  /** Increment to pulse the reload button (e.g. strike while empty). */
  shakeTrigger?: number
}

export function WeaponReloadControl({
  weapon,
  ammoReserves,
  morphus,
  onReload,
  onReloadFailed,
  vibrant = false,
  shakeTrigger = 0,
}: WeaponReloadControlProps) {
  const [shake, setShake] = useState(false)
  const externalShake = shakeTrigger > 0
  const category = ammoCategoryForWeapon(weapon)
  const reserve = reserveRoundsForWeapon(weapon, ammoReserves)
  const canReload = canReloadWeapon(weapon, ammoReserves)
  const outOfCategory = isOutOfCategoryAmmo(weapon, ammoReserves)
  const cost = reloadRoundsRequired(weapon)
  const magazineFull = Boolean(
    weapon.payload && weapon.payload.current >= weapon.payload.max,
  )

  const activeCls = vibrant
    ? morphus
      ? 'border-emerald-400 bg-emerald-950/80 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.45)] pds-reload-ready'
      : 'border-emerald-600 bg-emerald-600 text-white shadow-[0_0_14px_rgba(5,150,105,0.4)] pds-reload-ready'
    : morphus
      ? 'border-violet-400/80 bg-violet-900/60 text-violet-100 hover:bg-violet-800'
      : 'border-blue-500 bg-blue-600 text-white hover:bg-blue-500'

  const disabledCls = morphus
    ? 'cursor-not-allowed border-red-900/80 bg-slate-900/50 text-violet-500 opacity-50 grayscale'
    : 'cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 opacity-50 grayscale'

  const noAmmo = outOfCategory || (cost > 0 && reserve < cost)

  const tooltip = magazineFull
    ? 'Magazine full'
    : noAmmo && category
      ? `No ${category} rounds in reserve (${reserve} available; need ${cost}).`
      : canReload
        ? `Reload (${cost} round${cost === 1 ? '' : 's'} from ${category} reserve; ${reserve} spare)`
        : 'Cannot reload'

  const handleClick = () => {
    if (magazineFull || noAmmo) {
      setShake(true)
      onReloadFailed()
      window.setTimeout(() => setShake(false), 520)
      return
    }
    onReload()
  }

  const categoryLabel = category?.toUpperCase() ?? 'AMMO'

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        className={`rounded-md border-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition-[box-shadow,filter,transform] ${
          shake || externalShake ? 'pds-reload-shake' : ''
        } ${noAmmo || magazineFull ? disabledCls : activeCls}`}
        key={externalShake ? `shake-${shakeTrigger}` : 'reload'}
        aria-disabled={noAmmo || magazineFull}
        title={tooltip}
        onClick={handleClick}
      >
        Reload
      </button>
      {noAmmo && category ? (
        <span
          className={`text-[9px] font-black uppercase tracking-wide ${
            morphus ? 'text-red-400' : 'text-red-600'
          }`}
          role="alert"
        >
          NO {categoryLabel} AMMO
        </span>
      ) : null}
    </div>
  )
}
