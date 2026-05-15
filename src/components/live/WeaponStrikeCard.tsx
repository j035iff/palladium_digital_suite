import type { ActiveForm, Character, Weapon } from '../../types'
import { computeWeaponStrikeBreakdown } from '../../lib/strikeEngine'
import { formatBonus } from '../../lib/combatQuickBonuses'
import { rollD20 } from '../../lib/meleeDice'
import { canReloadWeapon, formatAmmoHudLine, type AmmoReservesState } from '../../lib/ammoReserves'
import {
  canAffordFireMode,
  defaultFireModeId,
  formatFireModeStrikeDetail,
  getFireModeById,
  getWildBurstWarning,
  isWildFireMode,
  resolveFireModeAmmoCost,
} from '../../lib/fireModes'
import { WeaponFireModeSelector } from './WeaponFireModeSelector'
import { WeaponReloadControl } from './WeaponReloadControl'

export type StrikeBannerState = {
  key: string
  title: string
  detail: string
  total: number
} | null

type WeaponStrikeCardProps = {
  weapon: Weapon
  character: Character
  activeForm: ActiveForm
  morphus: boolean
  ammoReserves: AmmoReservesState
  fireModeId: string
  reloadShakeTrigger: number
  onFireModeChange: (modeId: string) => void
  onStrikeResolved: (banner: NonNullable<StrikeBannerState>) => void
  onSpendAmmo: (weaponId: string, rounds: number) => void
  onReload: () => void
  onReloadFailed: () => void
  onRequestReloadShake: () => void
  actionStrikeBtn: string
}

export function WeaponStrikeCard({
  weapon: w,
  character,
  activeForm,
  morphus,
  ammoReserves,
  fireModeId,
  reloadShakeTrigger,
  onFireModeChange,
  onStrikeResolved,
  onSpendAmmo,
  onReload,
  onReloadFailed,
  onRequestReloadShake,
  actionStrikeBtn,
}: WeaponStrikeCardProps) {
  const ranged = Boolean(w.payload)
  const bd = computeWeaponStrikeBreakdown(character, activeForm, w)
  const mode =
    getFireModeById(w, fireModeId) ??
    getFireModeById(w, defaultFireModeId(w))
  const wild = mode ? isWildFireMode(mode) : false
  const ammoCost = mode ? resolveFireModeAmmoCost(w, mode) : 0
  const canAfford = mode ? canAffordFireMode(w, mode) : true
  const magEmpty = ranged && (w.payload?.current ?? 0) <= 0
  const wildWarn = mode ? getWildBurstWarning(w, mode) : { kind: 'none' as const }

  const strikeTotal = mode ? bd.total + mode.strikeModifier : bd.total

  const wildStrikeBtn = morphus
    ? 'rounded-lg border-2 border-red-500 bg-gradient-to-br from-red-700 via-orange-800 to-amber-900 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-amber-50 shadow-[0_0_28px_rgba(239,68,68,0.55)] hover:brightness-110 disabled:opacity-40 disabled:grayscale'
    : 'rounded-lg border-2 border-red-700 bg-gradient-to-br from-red-600 to-orange-600 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_24px_rgba(220,38,38,0.45)] hover:brightness-105 disabled:opacity-40 disabled:grayscale'

  const strikeBtnCls = wild ? wildStrikeBtn : actionStrikeBtn

  const handleStrike = () => {
    if (!mode) return
    if (magEmpty) {
      onRequestReloadShake()
      return
    }
    if (!canAfford) return
    const d = rollD20()
    const total = d + bd.total + mode.strikeModifier
    onStrikeResolved({
      key: w.id,
      title: `${w.name} — ${mode.name}`,
      detail: formatFireModeStrikeDetail(d, bd.total, mode),
      total,
    })
    if (ranged && ammoCost > 0) onSpendAmmo(w.id, ammoCost)
  }

  return (
    <li
      className={`rounded-xl border-2 px-3 py-3 ${
        morphus
          ? 'border-violet-500/80 bg-slate-950/85 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.25)]'
          : 'border-orange-400/90 bg-white shadow-[inset_0_0_0_1px_rgba(251,146,60,0.25)]'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-black ${morphus ? 'text-violet-50' : 'text-slate-900'}`}>
            {w.name}
          </p>
          <p
            className={`mt-1 font-mono text-[10px] leading-relaxed ${morphus ? 'text-violet-200' : 'text-slate-700'}`}
          >
            P.P. {formatBonus(bd.ppBonus)}
            {' · '}
            W.P./skill {formatBonus(bd.wpBonus)}
            {bd.skillSourceLabel ? ` (${bd.skillSourceLabel})` : ' (no W.P. link)'}
            {' · '}
            Weapon {formatBonus(bd.weaponBonus)}
            {mode ? (
              <>
                {' · '}
                Mode {formatBonus(mode.strikeModifier)} →{' '}
                <strong className={morphus ? 'text-amber-300' : 'text-orange-700'}>
                  {formatBonus(strikeTotal)} strike
                </strong>
              </>
            ) : null}
          </p>
          <p className={`mt-1 font-mono text-[10px] ${morphus ? 'text-violet-300' : 'text-slate-600'}`}>
            Damage {w.damage}
            {ranged && w.payload ? (
              <>
                {' '}
                · Mag {w.payload.current}/{w.payload.max}
                {' '}
                · {formatAmmoHudLine(w, ammoReserves)}
                {mode ? ` · Mode cost ${ammoCost} rds` : ''}
              </>
            ) : null}
          </p>
          {ranged && mode ? (
            <WeaponFireModeSelector
              weapon={w}
              selectedModeId={fireModeId}
              morphus={morphus}
              onSelect={onFireModeChange}
            />
          ) : null}
          {wildWarn.kind === 'short_burst' ? (
            <p
              className={`mt-2 rounded border-2 px-2 py-1 text-[10px] font-bold leading-snug ${
                morphus
                  ? 'border-amber-500/80 bg-amber-950/40 text-amber-200'
                  : 'border-amber-600 bg-amber-50 text-amber-950'
              }`}
              role="status"
            >
              {wildWarn.message}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            disabled={ranged && !canAfford && !magEmpty}
            title={
              magEmpty
                ? 'Magazine empty — reload'
                : !canAfford && mode
                  ? `Need ${ammoCost} rounds in mag for ${mode.name}`
                  : `Roll d20 + ${strikeTotal} (includes ${mode?.name ?? 'mode'} modifier)`
            }
            className={strikeBtnCls}
            onClick={handleStrike}
          >
            Roll strike
          </button>
          {ranged && mode && !canAfford ? (
            <span
              className={`max-w-[11rem] text-center text-[9px] font-black uppercase leading-tight ${
                morphus ? 'text-red-400' : 'text-red-600'
              }`}
              role="alert"
            >
              NOT ENOUGH AMMO FOR {mode.name.toUpperCase()}
            </span>
          ) : null}
          {ranged ? (
            <WeaponReloadControl
              weapon={w}
              ammoReserves={ammoReserves}
              morphus={morphus}
              vibrant={canReloadWeapon(w, ammoReserves)}
              shakeTrigger={reloadShakeTrigger}
              onReload={onReload}
              onReloadFailed={onReloadFailed}
            />
          ) : null}
        </div>
      </div>
    </li>
  )
}
