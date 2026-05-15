import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { getAbilityById } from '../../data/abilityLibrary'
import {
  computeUnarmedStrikeBreakdown,
  computeWeaponStrikeBreakdown,
  unarmedDamageLabel,
} from '../../lib/strikeEngine'
import {
  computeQuickActionTotals,
  formatBonus,
} from '../../lib/combatQuickBonuses'
import { rollD20 } from '../../lib/meleeDice'
import { canReloadWeapon, spareAmmoForWeapon } from '../../lib/ammoPools'
import type { Weapon } from '../../types'
import { CombatNarrativeLog } from './CombatNarrativeLog'
import { WeaponReloadControl } from './WeaponReloadControl'

function barPct(current: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(100, Math.round((current / max) * 100))
}

function VitalityTrack({
  label,
  current,
  max: maxVal,
  morphus,
  variant,
  hitFlash,
}: {
  label: string
  current: number
  max: number
  morphus: boolean
  variant: 'sdc' | 'hp' | 'armor'
  /** High-contrast pulse after damage routed to this track. */
  hitFlash?: boolean
}) {
  const pct = barPct(current, maxVal)
  const track = morphus ? 'bg-slate-950' : 'bg-slate-200/90'
  const fill =
    variant === 'armor'
      ? morphus
        ? 'linear-gradient(90deg,#2dd4bf,#0f766e)'
        : 'linear-gradient(90deg,#14b8a6,#047857)'
      : morphus && variant === 'sdc'
        ? 'linear-gradient(90deg,#a78bfa,#7c3aed)'
        : morphus && variant === 'hp'
          ? 'linear-gradient(90deg,#f472b6,#be185d)'
          : !morphus && variant === 'sdc'
            ? 'linear-gradient(90deg,#38bdf8,#1d4ed8)'
            : 'linear-gradient(90deg,#60a5fa,#dc2626)'

  const pulseCls =
    hitFlash && variant === 'armor'
      ? 'pds-hud-armor-hit'
      : hitFlash && variant === 'sdc'
        ? morphus
          ? 'pds-hud-body-sdc-hit-void'
          : 'pds-hud-body-sdc-hit'
        : ''

  return (
    <div className={pulseCls}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span
          className={`text-xs font-black uppercase tracking-wide ${
            morphus ? 'text-violet-200' : 'text-slate-800'
          }`}
        >
          {label}
        </span>
        <span
          className={`font-mono text-sm font-bold tabular-nums ${
            morphus ? 'text-violet-100' : 'text-slate-900'
          }`}
        >
          {current}
          <span className="opacity-55"> / </span>
          {maxVal}
        </span>
      </div>
      <div
        className={`h-3.5 w-full overflow-hidden rounded-full ${track}`}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={maxVal}
        aria-label={`${label} pool`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: fill }}
        />
      </div>
    </div>
  )
}

function MiniPool({
  label,
  current,
  max: maxVal,
  morphus,
  variant,
}: {
  label: string
  current: number
  max: number
  morphus: boolean
  variant: 'hp' | 'sdc'
}) {
  const pct = barPct(current, maxVal)
  const track = morphus ? 'bg-slate-950' : 'bg-slate-200/90'
  const fill =
    variant === 'hp'
      ? morphus
        ? '#f472b6'
        : '#2563eb'
      : morphus
        ? '#a78bfa'
        : '#0284c7'

  return (
    <div className="min-w-[5.5rem] flex-1">
      <div className="mb-0.5 flex items-baseline justify-between gap-1">
        <span
          className={`text-[9px] font-black uppercase tracking-wide ${
            morphus ? 'text-violet-200' : 'text-slate-700'
          }`}
        >
          {label}
        </span>
        <span
          className={`font-mono text-[10px] font-bold tabular-nums ${
            morphus ? 'text-violet-100' : 'text-slate-900'
          }`}
        >
          {current}/{maxVal}
        </span>
      </div>
      <div className={`h-2 w-full overflow-hidden rounded-full ${track}`}>
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: fill }}
        />
      </div>
    </div>
  )
}

function CompactApmPips({
  morphus,
  maxApm,
  actionsUsed,
}: {
  morphus: boolean
  maxApm: number
  actionsUsed: number
}) {
  if (maxApm <= 0) return null
  return (
    <div className="flex flex-wrap items-center gap-0.5" aria-hidden>
      {Array.from({ length: maxApm }, (_, i) => {
        const spent = i < actionsUsed
        const facadeActive =
          'inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-800 bg-blue-600 text-[10px] font-bold text-white'
        const facadeSpent =
          'inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-400/80 bg-slate-200/90 text-[10px] font-bold text-slate-600 opacity-25'
        const morphActive =
          'inline-flex h-6 w-6 items-center justify-center rounded-full border border-violet-200 bg-violet-600 text-[10px] font-bold text-white'
        const morphSpent =
          'inline-flex h-6 w-6 items-center justify-center rounded-full border border-violet-900/80 bg-slate-900 text-[10px] font-bold text-violet-400 opacity-25'
        const cls = morphus
          ? spent
            ? morphSpent
            : morphActive
          : spent
            ? facadeSpent
            : facadeActive
        return (
          <span key={i} className={cls}>
            {spent ? '○' : '⚔'}
          </span>
        )
      })}
    </div>
  )
}

/**
 * Persistent S.D.C.-first tactical HUD (master_flow.md, combat_logic.md, attribute_and_stat.md).
 * Max A.P.M. comes from {@link CharacterContext} (`attacksPerMelee.max`).
 */
export function CombatHUD() {
  const {
    character,
    activeForm,
    activeStats,
    attacksPerMelee,
    spendCombatAction,
    resetMeleeRound,
    activeMeleeDurations,
    registerActiveMeleeDuration,
    applySdcPriorityVitality,
    durationCheckPulse,
    equippedArmor,
    readyWeapons,
    overEncumbered,
    encumbranceSpdNote,
    currentWeightLbs,
    carryLimitLbs,
    combatHudDamagePulse,
    spendWeaponRangedShot,
    reloadWeapon,
    ammoPools,
  } = useCharacter()

  const morphus = activeForm === 'morphus'
  const [amount, setAmount] = useState('4')
  const [mode, setMode] = useState<'damage' | 'heal'>('damage')
  const [attackRollStr, setAttackRollStr] = useState('')
  const [hudMinimized, setHudMinimized] = useState(false)
  const [strikeBanner, setStrikeBanner] = useState<{
    key: string
    title: string
    detail: string
    total: number
  } | null>(null)

  useEffect(() => {
    if (!strikeBanner) return
    const t = window.setTimeout(() => setStrikeBanner(null), 2800)
    return () => window.clearTimeout(t)
  }, [strikeBanner])

  const hudArmor = useMemo(() => {
    const a = equippedArmor
    if (!a) return null
    if (a.currentSdc <= 0) return null
    return a
  }, [equippedArmor])

  const totals = useMemo(
    () => computeQuickActionTotals(character, activeForm),
    [character, activeForm],
  )

  const hp = activeStats.hitPoints
  const sdc = activeStats.structuralDamageCapacity

  const shell = morphus
    ? 'border-t-2 border-violet-400 bg-slate-950/96 text-violet-50 max-md:shadow-[0_-10px_40px_rgba(0,0,0,0.55)] md:border-t-0 md:border-l-2 md:border-violet-400 md:shadow-none'
    : 'border-t-2 border-blue-500 bg-white/96 text-slate-900 max-md:shadow-[0_-6px_24px_rgba(30,64,175,0.14)] md:border-t-0 md:border-l-2 md:border-blue-500 md:shadow-none'

  const sub = morphus
    ? 'border border-violet-500/70 bg-violet-950/40'
    : 'border border-blue-200 bg-blue-50/80'

  const btnCompact = morphus
    ? 'shrink-0 rounded-md border-2 border-violet-300 bg-violet-800 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-violet-700'
    : 'shrink-0 rounded-md border-2 border-blue-600 bg-blue-600 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-blue-500'

  const btn = morphus
    ? 'border-2 border-violet-300 bg-violet-800 text-white hover:bg-violet-700'
    : 'border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-500'

  const actionStrikeBtn = morphus
    ? 'rounded-lg border-2 border-amber-400 bg-gradient-to-br from-violet-700 via-violet-900 to-rose-950 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.35)] hover:brightness-110'
    : 'rounded-lg border-2 border-orange-600 bg-gradient-to-br from-amber-500 to-orange-700 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_20px_rgba(234,88,12,0.35)] hover:brightness-105'

  const bonusTiles = [
    { label: 'Strike', value: totals.strike, hint: 'P.P. natural + skills (attribute_and_stat.md)' },
    { label: 'Parry', value: totals.parry, hint: 'P.P. natural + skills' },
    { label: 'Dodge', value: totals.dodge, hint: 'P.P. natural + skills' },
    {
      label: 'Roll w/ Impact',
      value: totals.rollWithImpact,
      hint: 'Dodge total + P.E. (attribute_and_stat.md)',
    },
  ]

  const applyVitality = () => {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return
    const trimmedRoll = attackRollStr.trim()
    const rollN = Number(trimmedRoll)
    const useRoll =
      mode === 'damage' &&
      Boolean(hudArmor) &&
      trimmedRoll.length > 0 &&
      Number.isFinite(rollN)
    if (
      mode === 'damage' &&
      hudArmor &&
      trimmedRoll.length > 0 &&
      !Number.isFinite(rollN)
    ) {
      return
    }
    applySdcPriorityVitality({
      mode,
      amount: n,
      useAttackRollVsArmor: useRoll,
      attackRoll: useRoll ? rollN : undefined,
    })
  }

  const trimmedStrike = attackRollStr.trim()
  const strikeRollParsed = Number(trimmedStrike)
  const attackRollInvalid =
    mode === 'damage' &&
    Boolean(hudArmor) &&
    trimmedStrike.length > 0 &&
    !Number.isFinite(strikeRollParsed)

  const readyWeaponList = useMemo(
    () => readyWeapons.filter((w): w is Weapon => w != null),
    [readyWeapons],
  )

  const showUnarmed = readyWeaponList.length === 0

  const unarmedBd = useMemo(
    () => computeUnarmedStrikeBreakdown(character, activeForm),
    [character, activeForm],
  )

  const armorMorphusMismatch =
    morphus && equippedArmor && equippedArmor.morphusCompatible === false

  const maxApm = attacksPerMelee.max
  const curApm = attacksPerMelee.current
  /** Remaining actions = curApm; pips are consumed visually left → right. */
  const actionsUsed = Math.max(0, maxApm - curApm)

  return (
    <aside
      className={`max-md:sticky max-md:bottom-0 max-md:z-40 md:relative md:z-0 md:flex md:h-full md:min-h-0 md:flex-col md:overflow-y-auto shrink-0 backdrop-blur-md ${shell} ${
        durationCheckPulse ? 'pds-hud-duration-pulse' : ''
      }`}
      aria-label="S.D.C. combat tactical HUD"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col px-3 py-3 md:mx-0 md:max-w-none md:flex-1">
        {durationCheckPulse ? (
          <div
            className={`mb-3 rounded-md border-2 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide ${
              morphus
                ? 'border-amber-400 bg-violet-950 text-amber-100'
                : 'border-amber-500 bg-amber-50 text-amber-950'
            }`}
            role="status"
          >
            New melee round — review active spell and ability durations (melee step).
          </div>
        ) : null}

        <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2
              className={`text-xs font-black uppercase tracking-[0.2em] ${
                morphus ? 'text-violet-200' : 'text-blue-900'
              }`}
            >
              Tactical — S.D.C. combat
            </h2>
            <p className={`text-[11px] font-medium ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}>
              Damage depletes <strong>S.D.C.</strong> then <strong>H.P.</strong>; M.D.C. scaling stays in
              engine only (combat_logic.md). Max A.P.M. {maxApm}.
            </p>
          </div>
          <button
            type="button"
            className={btnCompact}
            aria-expanded={!hudMinimized}
            onClick={() => setHudMinimized((v) => !v)}
          >
            {hudMinimized ? 'Expand' : 'Minimize'}
          </button>
        </header>

        <CombatNarrativeLog morphus={morphus} />

        {hudMinimized ? (
          <div
            className={`flex flex-wrap items-center gap-2 rounded-lg border-2 p-2 ${sub}`}
            aria-label="Condensed combat vitality"
          >
            <MiniPool label="HP" current={hp.current} max={hp.maximum} morphus={morphus} variant="hp" />
            <MiniPool label="SDC" current={sdc.current} max={sdc.maximum} morphus={morphus} variant="sdc" />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span
                className={`text-[9px] font-black uppercase tracking-wide ${
                  morphus ? 'text-violet-200' : 'text-blue-900'
                }`}
              >
                APM
              </span>
              <CompactApmPips morphus={morphus} maxApm={maxApm} actionsUsed={actionsUsed} />
            </div>
            <button
              type="button"
              title="Spend one attack per melee"
              onClick={spendCombatAction}
              disabled={curApm <= 0}
              className={`shrink-0 rounded px-2 py-1 text-[10px] font-black uppercase disabled:opacity-35 ${btnCompact}`}
            >
              −1
            </button>
            <button
              type="button"
              title="New melee round"
              onClick={resetMeleeRound}
              className={`shrink-0 rounded px-2 py-1 text-[10px] font-black uppercase ${btnCompact}`}
            >
              ↻
            </button>
          </div>
        ) : (
          <>
        <div className={`mb-3 space-y-3 rounded-lg border-2 p-3 ${sub}`}>
          <p
            className={`text-[10px] font-bold uppercase tracking-wider ${
              morphus ? 'text-violet-200' : 'text-blue-900'
            }`}
          >
            Vitality (S.D.C. first)
          </p>
          {armorMorphusMismatch ? (
            <div
              className={`rounded-md border-2 px-2 py-1.5 text-[10px] font-bold leading-snug ${
                morphus
                  ? 'border-amber-400 bg-violet-950 text-amber-100'
                  : 'border-amber-600 bg-amber-50 text-amber-950'
              }`}
              role="status"
            >
              Total Reconfiguration: equipped armor is Facade-sized — not rated for Morphus bulk.
            </div>
          ) : null}
          {overEncumbered ? (
            <div
              className="rounded-md border-2 border-red-600 bg-red-950/40 px-2 py-1.5 text-[10px] font-bold leading-snug text-red-100"
              role="alert"
            >
              Over carry: {currentWeightLbs}/{carryLimitLbs} lbs. {encumbranceSpdNote}
            </div>
          ) : null}
          {hudArmor ? (
            <VitalityTrack
              label={`Armor S.D.C. (${hudArmor.name})`}
              current={hudArmor.currentSdc}
              max={hudArmor.maxSdc}
              morphus={morphus}
              variant="armor"
              hitFlash={
                combatHudDamagePulse === 'armor' || combatHudDamagePulse === 'split'
              }
            />
          ) : null}
          <VitalityTrack
            label="Body S.D.C."
            current={sdc.current}
            max={sdc.maximum}
            morphus={morphus}
            variant="sdc"
            hitFlash={
              combatHudDamagePulse === 'body' || combatHudDamagePulse === 'split'
            }
          />
          <VitalityTrack
            label="H.P."
            current={hp.current}
            max={hp.maximum}
            morphus={morphus}
            variant="hp"
          />
        </div>

        <div className={`mb-3 rounded-lg border-2 p-3 ${sub}`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3
              className={`text-[10px] font-black uppercase tracking-wider ${
                morphus ? 'text-violet-200' : 'text-blue-900'
              }`}
            >
              Melee — A.P.M. ({curApm} / {maxApm})
            </h3>
          </div>
          <div
            className="mb-3 flex flex-wrap items-center gap-2"
            role="group"
            aria-label={`Attacks per melee, ${curApm} of ${maxApm} remaining; ${actionsUsed} spent from the left`}
          >
            {maxApm > 0
              ? Array.from({ length: maxApm }, (_, i) => {
                  const spent = i < actionsUsed
                  const facadeActive =
                    'inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-800 bg-blue-600 text-lg font-bold text-white shadow-md'
                  const facadeSpent =
                    'inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-400/80 bg-slate-200/90 text-lg font-bold text-slate-600 opacity-20'
                  const morphActive =
                    'inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-violet-200 bg-violet-600 text-lg font-bold text-white shadow-md'
                  const morphSpent =
                    'inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-violet-900/80 bg-slate-900 text-lg font-bold text-violet-400 opacity-20'
                  const cls = morphus
                    ? spent
                      ? morphSpent
                      : morphActive
                    : spent
                      ? facadeSpent
                      : facadeActive
                  return (
                    <span
                      key={i}
                      title={
                        spent
                          ? 'Spent this melee (left to right)'
                          : 'Remaining action this melee'
                      }
                      className={cls}
                      aria-hidden
                    >
                      {spent ? '○' : '⚔'}
                    </span>
                  )
                })
              : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={spendCombatAction}
              disabled={curApm <= 0}
              className={`rounded-md px-3 py-2 text-xs font-black uppercase tracking-wide disabled:opacity-40 ${btn}`}
            >
              Spend action
            </button>
            <button
              type="button"
              onClick={resetMeleeRound}
              className={`rounded-md px-3 py-2 text-xs font-black uppercase tracking-wide ${btn}`}
            >
              New melee round
            </button>
          </div>
          {activeMeleeDurations.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[11px]">
              {activeMeleeDurations.map((d) => (
                <li key={d.abilityId} className="font-mono opacity-90">
                  {getAbilityById(d.abilityId)?.name ?? d.abilityId}:{' '}
                  <strong>{d.roundsRemaining}</strong> melee
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            className={`mt-2 text-[10px] font-semibold underline ${morphus ? 'text-violet-300' : 'text-blue-800'}`}
            onClick={() => registerActiveMeleeDuration('armor_ithan', 3)}
          >
            Demo: Armor of Ithan (3 melees)
          </button>
        </div>

        <div className={`mb-3 rounded-lg border-2 p-3 ${sub}`}>
          <h3
            className={`mb-2 text-[10px] font-black uppercase tracking-wider ${
              morphus ? 'text-violet-200' : 'text-blue-900'
            }`}
          >
            Active bonuses
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {bonusTiles.map((b) => (
              <div
                key={b.label}
                title={b.hint}
                className={`rounded-md border px-1.5 py-2 text-center ${
                  morphus
                    ? 'border-violet-400/80 bg-slate-950/80'
                    : 'border-blue-200 bg-white'
                }`}
              >
                <p
                  className={`text-[9px] font-bold uppercase leading-tight opacity-80 ${
                    morphus ? 'text-violet-200' : 'text-slate-700'
                  }`}
                >
                  {b.label}
                </p>
                <p
                  className={`font-mono text-base font-black leading-tight ${
                    morphus ? 'text-amber-300' : 'text-blue-800'
                  }`}
                >
                  {formatBonus(b.value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className={`mb-3 rounded-lg border-2 p-3 ${sub}`}>
          <h3
            className={`mb-2 text-[10px] font-black uppercase tracking-wider ${
              morphus ? 'text-violet-200' : 'text-blue-900'
            }`}
          >
            Equipped weapons — strike engine
          </h3>
          <p
            className={`mb-2 text-[10px] leading-snug ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}
          >
            <strong>Total strike</strong> = P.P. bonus + W.P. (or Hand-to-Hand) skill bonus + weapon intrinsic
            bonus. Ranged: each strike spends one payload round; reload when you have spare ammo (Armory).
          </p>
          {strikeBanner ? (
            <div
              className={`pds-hud-strike-banner mb-3 rounded-xl border-4 px-3 py-4 text-center ${
                morphus
                  ? 'border-amber-400 bg-black/85 text-amber-100'
                  : 'border-orange-600 bg-amber-50 text-orange-950'
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">Strike resolved</p>
              <p className={`mt-1 text-sm font-bold ${morphus ? 'text-violet-200' : 'text-slate-800'}`}>
                {strikeBanner.title}
              </p>
              <p
                className={`mt-2 font-mono text-4xl font-black tabular-nums leading-none ${
                  morphus ? 'text-amber-300' : 'text-orange-700'
                }`}
              >
                {strikeBanner.total}
              </p>
              <p className={`mt-2 font-mono text-sm font-semibold ${morphus ? 'text-violet-100' : 'text-slate-800'}`}>
                {strikeBanner.detail}
              </p>
            </div>
          ) : null}
          <ul className="space-y-3">
            {readyWeaponList.map((w) => {
              const bd = computeWeaponStrikeBreakdown(character, activeForm, w)
              const ranged = Boolean(w.payload)
              const canStrike = !ranged || (w.payload?.current ?? 0) > 0
              return (
                <li
                  key={w.id}
                  className={`rounded-xl border-2 px-3 py-3 ${
                    morphus
                      ? 'border-violet-500/80 bg-slate-950/85 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.25)]'
                      : 'border-orange-400/90 bg-white shadow-[inset_0_0_0_1px_rgba(251,146,60,0.25)]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-black ${morphus ? 'text-violet-50' : 'text-slate-900'}`}>
                        {w.name}
                      </p>
                      <p className={`mt-1 font-mono text-[10px] leading-relaxed ${morphus ? 'text-violet-200' : 'text-slate-700'}`}>
                        P.P. {formatBonus(bd.ppBonus)}
                        {' · '}
                        W.P./skill {formatBonus(bd.wpBonus)}
                        {bd.skillSourceLabel ? ` (${bd.skillSourceLabel})` : ' (no W.P. link)'}
                        {' · '}
                        Weapon {formatBonus(bd.weaponBonus)} →{' '}
                        <strong className={morphus ? 'text-amber-300' : 'text-orange-700'}>
                          {formatBonus(bd.total)} total
                        </strong>
                      </p>
                      <p className={`mt-1 font-mono text-[10px] ${morphus ? 'text-violet-300' : 'text-slate-600'}`}>
                        Damage {w.damage}
                        {ranged && w.payload ? (
                          <>
                            {' '}
                            · Payload {w.payload.current}/{w.payload.max}
                            {' '}
                            · Reserve {spareAmmoForWeapon(w, ammoPools)}
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        type="button"
                        disabled={!canStrike}
                        title={!canStrike ? 'Empty magazine — reload in Armory' : 'Roll d20 + total strike bonus'}
                        className={actionStrikeBtn}
                        onClick={() => {
                          const d = rollD20()
                          const t = d + bd.total
                          setStrikeBanner({
                            key: w.id,
                            title: w.name,
                            detail: `1d20 (${d}) + total bonus (${bd.total}) = ${t}`,
                            total: t,
                          })
                          if (ranged) spendWeaponRangedShot(w.id)
                        }}
                      >
                        Roll strike
                      </button>
                      {ranged ? (
                        <WeaponReloadControl
                          weapon={w}
                          ammoPools={ammoPools}
                          morphus={morphus}
                          vibrant={canReloadWeapon(w, ammoPools)}
                          onReload={() => {
                            reloadWeapon(w.id)
                          }}
                          onReloadFailed={() => {
                            reloadWeapon(w.id)
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
            {showUnarmed ? (
              <li
                className={`rounded-xl border-2 border-dashed px-3 py-3 ${
                  morphus
                    ? 'border-amber-500/70 bg-violet-950/50'
                    : 'border-orange-400/80 bg-orange-50/80'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm font-black ${morphus ? 'text-amber-100' : 'text-orange-950'}`}>
                      Unarmed
                    </p>
                    <p className={`mt-1 font-mono text-[10px] leading-relaxed ${morphus ? 'text-violet-200' : 'text-slate-700'}`}>
                      P.P. {formatBonus(unarmedBd.ppBonus)}
                      {' · '}
                      H2H {formatBonus(unarmedBd.wpBonus)}
                      {unarmedBd.skillSourceLabel ? ` (${unarmedBd.skillSourceLabel})` : ' (add Hand-to-Hand on sheet)'}
                      {' · '}
                      Weapon {formatBonus(unarmedBd.weaponBonus)} →{' '}
                      <strong className={morphus ? 'text-amber-300' : 'text-orange-700'}>
                        {formatBonus(unarmedBd.total)} total
                      </strong>
                    </p>
                    <p className={`mt-1 font-mono text-[10px] ${morphus ? 'text-violet-300' : 'text-slate-600'}`}>
                      Damage {unarmedDamageLabel(character, activeForm)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={actionStrikeBtn}
                    onClick={() => {
                      const d = rollD20()
                      const t = d + unarmedBd.total
                      setStrikeBanner({
                        key: 'unarmed',
                        title: 'Unarmed strike',
                        detail: `1d20 (${d}) + total bonus (${unarmedBd.total}) = ${t}`,
                        total: t,
                      })
                    }}
                  >
                    Roll strike
                  </button>
                </div>
              </li>
            ) : null}
          </ul>
        </div>

        <div className={`rounded-lg border-2 p-3 ${sub}`}>
          <h3
            className={`mb-2 text-[10px] font-black uppercase tracking-wider ${
              morphus ? 'text-violet-200' : 'text-blue-900'
            }`}
          >
            Apply damage / heal
          </h3>
          <p className={`mb-2 text-[10px] leading-snug ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}>
            Body: S.D.C. then H.P. (damage); S.D.C. to max then H.P. (heal). With armor equipped, enter an
            optional <strong>attack roll</strong> vs A.R.: strictly below A.R. applies damage to armor S.D.C.
            first; at or above A.R. bypasses to body S.D.C. Leave the roll blank to apply damage directly to
            the body (no A.R. gate).
          </p>
          <div className="mb-2 flex flex-wrap gap-3 text-xs font-semibold">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="combat-mode"
                checked={mode === 'damage'}
                onChange={() => setMode('damage')}
              />
              Damage
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="combat-mode"
                checked={mode === 'heal'}
                onChange={() => setMode('heal')}
              />
              Heal
            </label>
          </div>
          <label
            className={`mb-1 block text-[10px] font-bold uppercase ${
              morphus ? 'text-violet-200' : 'text-blue-900'
            }`}
          >
            Amount
          </label>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`mb-2 w-full rounded-md border-2 px-2 py-2 font-mono text-sm ${
              morphus
                ? 'border-violet-500 bg-slate-950 text-violet-50'
                : 'border-blue-400 bg-white text-slate-900'
            }`}
          />
          {mode === 'damage' && hudArmor ? (
            <div
              className={`mb-2 space-y-2 rounded-md border-2 border-dashed px-2 py-2 text-[11px] font-semibold leading-snug ${
                morphus
                  ? 'border-violet-500/80 bg-slate-950/50 text-violet-100'
                  : 'border-blue-400/90 bg-white/80 text-slate-800'
              }`}
            >
              <label
                className={`mb-1 block text-[10px] font-bold uppercase ${
                  morphus ? 'text-violet-200' : 'text-blue-900'
                }`}
              >
                Attack roll (optional vs A.R. {hudArmor.ar})
              </label>
              <input
                type="number"
                value={attackRollStr}
                onChange={(e) => setAttackRollStr(e.target.value)}
                placeholder="Leave empty = no A.R. routing"
                className={`w-full rounded-md border-2 px-2 py-1.5 font-mono text-sm ${
                  morphus
                    ? 'border-violet-500 bg-slate-950 text-violet-50 placeholder:text-violet-600'
                    : 'border-blue-400 bg-white text-slate-900 placeholder:text-slate-400'
                }`}
              />
              {attackRollInvalid ? (
                <p className="mt-1 text-[10px] font-bold text-red-600">
                  Enter a numeric attack roll, or clear the field.
                </p>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={applyVitality}
            disabled={attackRollInvalid}
            className={`w-full rounded-md py-2.5 text-sm font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40 ${
              morphus
                ? 'bg-violet-600 text-white hover:bg-violet-500'
                : 'bg-blue-700 text-white hover:bg-blue-600'
            }`}
          >
            {mode === 'heal' ? 'Apply heal' : 'Apply damage'}
          </button>
        </div>
          </>
        )}
      </div>
    </aside>
  )
}
