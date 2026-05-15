import { useState } from 'react'
import type { Weapon } from '../../types'
import {
  ammoTypeLabel,
  canReloadWeapon,
  reloadRoundsRequired,
  spareAmmoForWeapon,
  type AmmoPoolsState,
} from '../../lib/ammoPools'

type WeaponReloadControlProps = {
  weapon: Weapon
  ammoPools: AmmoPoolsState
  morphus: boolean
  onReload: () => void
  onReloadFailed: () => void
  vibrant?: boolean
}

export function WeaponReloadControl({
  weapon,
  ammoPools,
  morphus,
  onReload,
  onReloadFailed,
  vibrant = false,
}: WeaponReloadControlProps) {
  const [shake, setShake] = useState(false)
  const spare = spareAmmoForWeapon(weapon, ammoPools)
  const canReload = canReloadWeapon(weapon, ammoPools)
  const cost = reloadRoundsRequired(weapon)
  const ammoLabel = ammoTypeLabel(weapon, ammoPools)
  const outOfAmmo = spare <= 0 || !canReload

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

  const tooltip =
    outOfAmmo && cost > 0
      ? `Requires at least ${cost} round${cost === 1 ? '' : 's'} of ${ammoLabel} to reload. (${spare} in reserve)`
      : canReload
        ? `Reload (${cost} round${cost === 1 ? '' : 's'} from ${ammoLabel} pool; ${spare} spare)`
        : weapon.payload && weapon.payload.current >= weapon.payload.max
          ? 'Magazine full'
          : `Requires at least ${cost} round${cost === 1 ? '' : 's'} of ${ammoLabel} to reload.`

  const handleClick = () => {
    if (outOfAmmo) {
      setShake(true)
      onReloadFailed()
      window.setTimeout(() => setShake(false), 520)
      return
    }
    onReload()
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        className={`rounded-md border-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition-[box-shadow,filter,transform] ${
          shake ? 'pds-reload-shake' : ''
        } ${outOfAmmo ? disabledCls : activeCls}`}
        aria-disabled={outOfAmmo}
        title={tooltip}
        onClick={handleClick}
      >
        Reload
      </button>
      {outOfAmmo ? (
        <span
          className={`text-[9px] font-black uppercase tracking-wide ${
            morphus ? 'text-red-400' : 'text-red-600'
          }`}
        >
          {spare <= 0 ? 'OUT OF AMMO' : 'NO SPARE MAGS'}
        </span>
      ) : null}
    </div>
  )
}
