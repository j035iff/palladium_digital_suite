import { useState } from 'react'
import type { ActiveForm, Character, FireMode, Weapon } from '../../types'
import {
  computeWeaponProfileBonuses,
  formatWeaponStatEquation,
  isRangedWeapon,
  prettyWeaponTraitKey,
  type WeaponStatProfile,
} from '../../lib/weaponBonuses'
import { formatBonus } from '../../lib/combatQuickBonuses'
import { canReloadWeapon, formatAmmoHudLine, type AmmoReservesState } from '../../lib/ammoReserves'
import {
  canAffordFireMode,
  DEFAULT_RANGED_FIRE_MODES,
  defaultFireModeId,
  formatFireModeStrikeDetail,
  getFireModeById,
  getWeaponFireModes,
  getWildBurstWarning,
  resolveFireModeAmmoCost,
} from '../../lib/fireModes'

const MELEE_SHEET_MODE: FireMode = {
  id: 'melee_sheet',
  name: 'Melee',
  ammoCost: 0,
  strikeModifier: 0,
}
import { ManualRollField } from '../combat/ManualRollField'
import { WeaponFireModeSelector } from './WeaponFireModeSelector'
import { WeaponReloadControl } from './WeaponReloadControl'

export type StrikeBannerState =
  | {
      key: string
      title: string
      detail: string
      total: number
    }
  | null

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
}

function rollDamageFromNotation(notation: string): number {
  const m = notation.match(/(\d+)d(\d+)/i)
  if (!m) return 0
  const n = Number(m[1])
  const sides = Number(m[2])
  let sum = 0
  for (let i = 0; i < n; i++) sum += 1 + Math.floor(Math.random() * sides)
  return sum
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
    <div
      className={`group relative flex min-w-[4.85rem] flex-1 flex-col rounded-lg border px-2 py-1.5 text-center shadow-sm ${border}`}
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
      <div
        role="tooltip"
        className={`pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-1 w-[min(100vw-2rem,20rem)] -translate-x-1/2 rounded-md border-2 px-2 py-2 text-left font-mono text-[10px] font-semibold leading-snug opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 md:bottom-auto md:top-full md:mb-0 md:mt-1 ${
          morphus ? 'border-amber-300/70 bg-black/93 text-amber-50' : 'border-sky-700 bg-white text-slate-900'
        }`}
      >
        {tip}
      </div>
    </div>
  )
}

/**
 * Weapon profile — aggregated sheet bonuses plus Pillar 5 manual strike/damage controls.
 */
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
}: WeaponStrikeCardProps) {
  const [strikeManual, setStrikeManual] = useState('')
  const [damageManual, setDamageManual] = useState('')

  const ranged = isRangedWeapon(w)
  const profile = computeWeaponProfileBonuses(character, activeForm, w)
  const mode: FireMode = ranged
    ? getFireModeById(w, fireModeId) ??
      getFireModeById(w, defaultFireModeId(w)) ??
      getWeaponFireModes(w)[0] ??
      DEFAULT_RANGED_FIRE_MODES[0]
    : MELEE_SHEET_MODE
  const ammoCost = mode ? resolveFireModeAmmoCost(w, mode) : 0
  const canAfford = mode ? canAffordFireMode(w, mode) : true
  const magEmpty = ranged && (w.payload?.current ?? 0) <= 0
  const wildWarn = mode ? getWildBurstWarning(w, mode) : { kind: 'none' as const }
  const strikeBonus = profile.strike.total + mode.strikeModifier

  const recordStrike = () => {
    if (ranged && magEmpty) {
      onRequestReloadShake()
      return
    }
    if (!canAfford) return
    const d = Number(strikeManual.trim())
    if (!Number.isFinite(d)) return
    const total = d + strikeBonus
    onStrikeResolved({
      key: w.id,
      title: `${w.name} — ${mode.name}`,
      detail: formatFireModeStrikeDetail(d, profile.strike.total, mode),
      total,
    })
    if (ranged && ammoCost > 0) onSpendAmmo(w.id, ammoCost)
  }

  const wpSubtitle = w.wpCategory ?? profile.wpSkillDisplayName ?? w.category

  const accentMelee = morphus ? 'border-l-teal-400' : 'border-l-teal-600'
  const accentRanged = morphus ? 'border-l-amber-400' : 'border-l-orange-600'
  const accent = ranged ? accentRanged : accentMelee
  const headerIcon = ranged ? '🎯' : '⚔'
  const kindLabel = ranged ? 'Ranged' : 'Melee'

  const cardBg = morphus
    ? 'border-violet-500/85 bg-gradient-to-br from-violet-950/95 via-slate-950/92 to-black/92'
    : 'border-orange-400/95 bg-gradient-to-br from-orange-50/96 via-white to-sky-50/90'

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

        <p className={`text-[9px] font-semibold italic ${morphus ? 'text-violet-600/95' : 'text-teal-800/95'}`}>
          Final totals are for manual play at the table. Use Tactical “Resolve combat” when you need the A.R. drawer.
        </p>

        {wildWarn.kind === 'short_burst' ? (
          <p className="text-[10px] font-bold text-amber-600" role="status">
            {wildWarn.message}
          </p>
        ) : null}

        <div
          className={`rounded-lg border p-2 ${
            morphus ? 'border-violet-700/65 bg-violet-950/40' : 'border-slate-300/80 bg-slate-100/95'
          }`}
        >
          <p className={`mb-2 text-[9px] font-black uppercase tracking-wider ${morphus ? 'text-violet-200' : 'text-slate-700'}`}>
            Pillar 5 — dice
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ManualRollField
              label="Strike (d20)"
              morphus={morphus}
              manualValue={strikeManual}
              onManualValueChange={setStrikeManual}
              calculatedBonus={strikeBonus}
              hint="Bonus includes selected fire mode (ranged)."
              onRecord={recordStrike}
              recordLabel="Record strike"
              recordDisabled={magEmpty || (ranged && !canAfford)}
            />
            <ManualRollField
              label="Damage"
              morphus={morphus}
              manualValue={damageManual}
              onManualValueChange={setDamageManual}
              calculatedBonus={0}
              hint={`Notation ${w.damage}`}
              rollDie={() => rollDamageFromNotation(w.damage)}
              dieLabel={w.damage}
            />
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
