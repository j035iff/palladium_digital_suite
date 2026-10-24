import type { ActiveForm, Character, FireMode, Weapon } from '../../types'
import {
  computeWeaponProfileBonuses,
  formatWeaponStatEquation,
  isRangedWeapon,
  prettyWeaponTraitKey,
  type WeaponStatProfile,
} from '../../lib/weaponBonuses'
import { applyStrikePenaltyToWeaponProfile } from '../../lib/combatWeaponSlots'
import { formatBonus } from '../../lib/combatQuickBonuses'
import { canReloadWeapon, formatAmmoHudLine, type AmmoReservesState } from '../../lib/ammoReserves'
import {
  canAffordFireMode,
  DEFAULT_RANGED_FIRE_MODES,
  defaultFireModeId,
  getFireModeById,
  getWeaponFireModes,
  getWildBurstWarning,
  resolveFireModeAmmoCost,
} from '../../lib/fireModes'
import { WeaponFireModeSelector } from './WeaponFireModeSelector'
import { WeaponReloadControl } from './WeaponReloadControl'
import { ClampedOverlayTooltip } from './ClampedOverlayTooltip'

const MELEE_SHEET_MODE: FireMode = {
  id: 'melee_sheet',
  name: 'Melee',
  ammoCost: 0,
  strikeModifier: 0,
}

type WeaponStrikeCardProps = {
  weapon: Weapon
  character: Character
  activeForm: ActiveForm
  morphus: boolean
  ammoReserves: AmmoReservesState
  fireModeId: string
  reloadShakeTrigger: number
  /** Modern two-gun (or other) strike penalty already resolved in lib. */
  strikePenalty?: number
  onFireModeChange: (modeId: string) => void
  onReload: () => void
  onReloadFailed: () => void
}

function WeaponStatChip({
  label,
  profile,
  morphus,
}: {
  label: string
  profile: WeaponStatProfile
  morphus: boolean
}) {
  const tip = formatWeaponStatEquation(profile, formatBonus)
  const border = morphus ? 'border-violet-400/45 bg-black/35' : 'border-sky-600/35 bg-white'
  const fg = morphus ? 'text-violet-100' : 'text-sky-950'
  return (
    <ClampedOverlayTooltip
      tip={tip}
      morphus={morphus}
      tone="weapon"
      className={`flex min-w-[4.85rem] flex-1 flex-col rounded-lg border px-2 py-1.5 text-center shadow-sm ${border}`}
    >
      <span
        className={`text-[8px] font-black uppercase tracking-wider opacity-85 ${morphus ? 'text-violet-200' : 'text-slate-700'}`}
      >
        {label}
      </span>
      <span className={`font-mono text-[1.35rem] font-black tabular-nums leading-tight md:text-[1.55rem] ${fg}`}>
        {formatBonus(profile.total)}
      </span>
      <span className={`mt-0.5 text-[8px] font-semibold italic opacity-50 max-sm:hidden ${morphus ? 'text-violet-300' : 'text-slate-500'}`}>
        Hover breakdown
      </span>
    </ClampedOverlayTooltip>
  )
}

/**
 * Weapon profile — aggregated sheet bonuses, fire modes, ammo, and damage notation.
 * Physical die entry / Record Strike live elsewhere (not on Action Expand).
 */
export function WeaponStrikeCard({
  weapon: w,
  character,
  activeForm,
  morphus,
  ammoReserves,
  fireModeId,
  reloadShakeTrigger,
  strikePenalty = 0,
  onFireModeChange,
  onReload,
  onReloadFailed,
}: WeaponStrikeCardProps) {
  const ranged = isRangedWeapon(w)
  const profile = applyStrikePenaltyToWeaponProfile(
    computeWeaponProfileBonuses(character, activeForm, w),
    strikePenalty,
  )
  const mode: FireMode = ranged
    ? getFireModeById(w, fireModeId) ??
      getFireModeById(w, defaultFireModeId(w)) ??
      getWeaponFireModes(w)[0] ??
      DEFAULT_RANGED_FIRE_MODES[0]
    : MELEE_SHEET_MODE
  const ammoCost = mode ? resolveFireModeAmmoCost(w, mode) : 0
  const canAfford = mode ? canAffordFireMode(w, mode) : true
  const wildWarn = mode ? getWildBurstWarning(w, mode) : { kind: 'none' as const }
  const strikeBonus = profile.strike.total + mode.strikeModifier

  const wpSubtitle = w.wpCategory ?? profile.wpSkillDisplayName ?? w.category

  const accentMelee = morphus ? 'border-l-teal-400' : 'border-l-teal-600'
  const accentRanged = morphus ? 'border-l-amber-400' : 'border-l-orange-600'
  const accent = ranged ? accentRanged : accentMelee
  const headerIcon = ranged ? '🎯' : '⚔'
  const kindLabel = ranged ? 'Ranged' : 'Melee'

  const cardBg = morphus
    ? 'border-violet-500/85 bg-gradient-to-br from-violet-950/95 via-slate-950/92 to-black/92'
    : 'border-orange-400/95 bg-gradient-to-br from-orange-50/96 via-white to-sky-50/90'

  const detailBox = morphus
    ? 'border-violet-700/65 bg-violet-950/40'
    : 'border-slate-300/80 bg-slate-100/95'
  const detailLabel = morphus ? 'text-violet-200' : 'text-slate-700'
  const detailMuted = morphus ? 'text-violet-400' : 'text-slate-500'
  const detailValue = morphus ? 'text-amber-300' : 'text-blue-800'

  return (
    <li className={`rounded-xl border-2 border-l-[6px] pl-2 pr-3 py-3 shadow-md ${accent} ${cardBg}`}>
      <div className="flex flex-col gap-3 pl-1">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3 border-opacity-40 border-black/15">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xl ${ranged ? 'drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]' : ''}`}>{headerIcon}</span>
              <p className={`truncate text-base font-black ${morphus ? 'text-violet-50' : 'text-slate-900'}`}>{w.name}</p>
              <span
                className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  ranged
                    ? morphus
                      ? 'bg-amber-500/35 text-amber-100 ring-1 ring-amber-400/50'
                      : 'bg-orange-200 text-orange-950 ring-1 ring-orange-400/70'
                    : morphus
                      ? 'bg-teal-800/65 text-teal-100 ring-1 ring-teal-400/40'
                      : 'bg-teal-100 text-teal-950 ring-1 ring-teal-700/35'
                }`}
              >
                {kindLabel}
              </span>
            </div>
            <p className={`mt-1 text-[11px] font-semibold ${morphus ? 'text-violet-300' : 'text-slate-600'}`}>{wpSubtitle}</p>
          </div>
          {profile.activeWeaponTraits.length > 0 ? (
            <div className="flex max-w-[12rem] flex-wrap justify-end gap-1">
              {profile.activeWeaponTraits.map((k) => (
                <span
                  key={k}
                  title="Weapon-specific modifier (item)"
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide shadow-sm ring-2 ${
                    morphus ? 'bg-amber-600/95 text-black ring-amber-300/60' : 'bg-amber-400 text-black ring-orange-900/35'
                  }`}
                >
                  {prettyWeaponTraitKey(k)}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <dl className="flex flex-wrap gap-2 md:gap-3">
          <WeaponStatChip label="Strike" profile={profile.strike} morphus={morphus} />
          <WeaponStatChip label="Parry" profile={profile.parry} morphus={morphus} />
          {profile.throw ? (
            <WeaponStatChip label="Throw" profile={profile.throw} morphus={morphus} />
          ) : (
            <div
              className={`flex min-w-[4.85rem] flex-1 flex-col items-center justify-center rounded-lg border border-dashed px-2 py-1.5 text-center opacity-45 ${
                morphus ? 'border-violet-700/65 text-violet-400' : 'border-slate-300 text-slate-500'
              }`}
            >
              <span className="text-[8px] font-bold uppercase tracking-wider">Throw</span>
              <span className="font-mono text-xs font-semibold text-[10px]">—</span>
            </div>
          )}
        </dl>

        {ranged && w.payload ? (
          <div className="space-y-1">
            <p className={`font-mono text-[10px] ${morphus ? 'text-violet-300' : 'text-slate-700'}`}>
              Mag {w.payload.current}/{w.payload.max} · {formatAmmoHudLine(w, ammoReserves)}
              {ammoCost > 0 ? ` · mode costs ${ammoCost}` : ''}
              {!canAfford ? ' · not enough ammo for mode' : ''}
            </p>
            {mode ? (
              <WeaponFireModeSelector
                weapon={w}
                selectedModeId={fireModeId}
                morphus={morphus}
                onSelect={onFireModeChange}
              />
            ) : null}
          </div>
        ) : null}

        {wildWarn.kind === 'short_burst' ? (
          <p className="text-[10px] font-bold text-amber-600" role="status">
            {wildWarn.message}
          </p>
        ) : null}

        <div className={`rounded-lg border p-2 ${detailBox}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className={`mb-1 text-[10px] font-black uppercase tracking-wide ${detailLabel}`}>
                Strike (d20)
              </p>
              {ranged ? (
                <p className={`mb-1 text-[9px] leading-snug ${detailMuted}`}>
                  Bonus includes selected fire mode (ranged).
                </p>
              ) : null}
              <p className={`font-mono text-2xl font-black tabular-nums ${detailValue}`}>
                {formatBonus(strikeBonus)}
              </p>
            </div>
            <div>
              <p className={`mb-1 text-[10px] font-black uppercase tracking-wide ${detailLabel}`}>
                Damage
              </p>
              <p className={`mb-1 text-[9px] leading-snug ${detailMuted}`}>
                Notation {w.damage}
              </p>
            </div>
          </div>
        </div>

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
    </li>
  )
}
