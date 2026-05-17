import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { getFeatureById } from '../../data/library/registry'
import { featureAppliesToForm } from '../../lib/featureEngine'
import {
  computeUnarmedStrikeBreakdown,
  unarmedDamageLabel,
} from '../../lib/strikeEngine'
import { formatBonus } from '../../lib/combatQuickBonuses'
import { ManualRollField } from '../combat/ManualRollField'
import { defaultFireModeId } from '../../lib/fireModes'
import type { Weapon } from '../../types'
import type { SheetCombatStatDetails } from '../../lib/sheetBonuses'
import { formatSheetBonusEquation } from '../../lib/sheetBonuses'
import { CombatNarrativeLog } from './CombatNarrativeLog'
import { WeaponStrikeCard, type StrikeBannerState } from './WeaponStrikeCard'

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
 * Character sheet combat totals (P.P. natural, skills, morphus traits) with hover math.
 */
function SheetCombatStatTile({
  label,
  detail,
  morphus,
}: {
  label: string
  detail: SheetCombatStatDetails
  morphus: boolean
}) {
  const tip = formatSheetBonusEquation(detail, formatBonus)
  return (
    <div
      className={`group relative min-h-[5.5rem] rounded-md border px-2 py-2 text-center max-sm:pb-10 sm:pb-12 ${
        morphus ? 'border-violet-400/80 bg-slate-950/80' : 'border-blue-200 bg-white'
      }`}
    >
      <p
        className={`mb-2 text-[9px] font-bold uppercase leading-tight opacity-80 ${
          morphus ? 'text-violet-200' : 'text-slate-700'
        }`}
      >
        {label}
      </p>
      <p
        className={`font-mono text-3xl font-black tabular-nums leading-none md:text-[2.65rem] ${
          morphus ? 'text-amber-300' : 'text-blue-800'
        }`}
      >
        {formatBonus(detail.total)}
      </p>
      <div
        role="tooltip"
        className={`pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-1 w-[min(100vw-2rem,22rem)] -translate-x-1/2 rounded-md border-2 px-2 py-1.5 text-left text-[10px] font-semibold leading-snug opacity-0 shadow-lg transition-opacity group-hover:pointer-events-none group-hover:visible group-hover:opacity-100 md:bottom-auto md:top-full md:mb-0 md:mt-1 ${
          morphus
            ? 'border-violet-400/90 bg-black/92 text-violet-50'
            : 'border-blue-400 bg-white text-slate-900'
        }`}
      >
        {tip}
      </div>
      <span className={`mt-2 block text-[8px] font-semibold italic opacity-65 max-sm:hidden`}>
        Hover for math
      </span>
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
    supportsDualForm,
    activeStats,
    sheetCombatDerived,
    handToHandCombatProfile,
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
    strengthCapacities,
    combatHudDamagePulse,
    spendWeaponAmmo,
    reloadWeapon,
    ammoReserves,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const [amount, setAmount] = useState('4')
  const [mode, setMode] = useState<'damage' | 'heal'>('damage')
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveDamage, setResolveDamage] = useState('4')
  const [resolveAttackRollStr, setResolveAttackRollStr] = useState('')
  const [unarmedStrikeManual, setUnarmedStrikeManual] = useState('')
  const [unarmedDamageManual, setUnarmedDamageManual] = useState('')
  const [hudMinimized, setHudMinimized] = useState(false)
  const [strikeBanner, setStrikeBanner] = useState<StrikeBannerState>(null)
  const [fireModeByWeaponId, setFireModeByWeaponId] = useState<Record<string, string>>(
    {},
  )
  const [reloadShakeByWeaponId, setReloadShakeByWeaponId] = useState<
    Record<string, number>
  >({})

  useEffect(() => {
    if (!resolveOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setResolveOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resolveOpen])

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

  const hp = activeStats.hitPoints
  const sdc = activeStats.structuralDamageCapacity
  const featureSdcBonus = activeStats.featureSdcBonus

  const activeFeatures = useMemo(() => {
    const ids = character.selectedAbilities ?? []
    return ids
      .map((id) => getFeatureById(id))
      .filter((f): f is NonNullable<typeof f> => f != null)
      .filter((f) => featureAppliesToForm(f, activeForm))
  }, [character.selectedAbilities, activeForm])

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

  const openResolveCombat = () => {
    setResolveDamage(amount)
    setResolveAttackRollStr('')
    setResolveOpen(true)
  }

  const trimmedResolveRoll = resolveAttackRollStr.trim()
  const resolveRollParsed = Number(trimmedResolveRoll)
  const resolveAttackRollInvalid =
    Boolean(hudArmor) &&
    trimmedResolveRoll.length > 0 &&
    !Number.isFinite(resolveRollParsed)

  const applyVitality = () => {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return
    applySdcPriorityVitality({
      mode,
      amount: n,
      useAttackRollVsArmor: false,
    })
  }

  const applyResolvedDamage = () => {
    const n = Number(resolveDamage)
    if (!Number.isFinite(n) || n <= 0) return
    if (resolveAttackRollInvalid) return
    const useRoll =
      Boolean(hudArmor) && trimmedResolveRoll.length > 0 && Number.isFinite(resolveRollParsed)
    applySdcPriorityVitality({
      mode: 'damage',
      amount: n,
      useAttackRollVsArmor: useRoll,
      attackRoll: useRoll ? resolveRollParsed : undefined,
    })
    setResolveOpen(false)
  }

  const readyWeaponList = useMemo(
    () => readyWeapons.filter((w): w is Weapon => w != null),
    [readyWeapons],
  )

  const showUnarmed = readyWeaponList.length === 0

  const unarmedBd = useMemo(
    () =>
      computeUnarmedStrikeBreakdown(character, activeForm, {
        skillName: handToHandCombatProfile.skillName,
        accumulated: handToHandCombatProfile.accumulated,
      }),
    [character, activeForm, handToHandCombatProfile],
  )

  const armorMorphusMismatch =
    morphus && equippedArmor && equippedArmor.morphusCompatible === false

  const maxApm = attacksPerMelee.max
  const curApm = attacksPerMelee.current
  /** Remaining actions = curApm; pips are consumed visually left → right. */
  const actionsUsed = Math.max(0, maxApm - curApm)
  const attackApmCost = handToHandCombatProfile.attackApmCost

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
              title={`Spend ${attackApmCost} melee action${attackApmCost === 1 ? '' : 's'} (attack)`}
              onClick={() => spendCombatAction(attackApmCost)}
              disabled={curApm < attackApmCost}
              className={`shrink-0 rounded px-2 py-1 text-[10px] font-black uppercase disabled:opacity-35 ${btnCompact}`}
            >
              −{attackApmCost}
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
            label={
              featureSdcBonus > 0
                ? `Body S.D.C. (+${featureSdcBonus} trait)`
                : 'Body S.D.C.'
            }
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
          {activeFeatures.length > 0 ? (
            <p className={`text-[10px] ${morphus ? 'text-violet-300' : 'text-slate-600'}`}>
              Active features ({activeForm}):{' '}
              {activeFeatures.map((f) => f.identity.name).join(', ')}
              {featureSdcBonus > 0 ? ` · +${featureSdcBonus} S.D.C. from traits` : ''}
            </p>
          ) : null}
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
              onClick={() => spendCombatAction(attackApmCost)}
              disabled={curApm < attackApmCost}
              className={`rounded-md px-3 py-2 text-xs font-black uppercase tracking-wide disabled:opacity-40 ${btn}`}
            >
              Spend attack ({attackApmCost})
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
                  {getFeatureById(d.abilityId)?.identity.name ?? d.abilityId}:{' '}
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
            Combat sheet — total bonuses
          </h3>
          <p className={`mb-3 text-[10px] leading-snug ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}>
            Static numbers as on a paper sheet. Hover a tile for the full breakdown (P.P. natural, skills,
            traits). W.P. bonuses for a specific weapon appear in the strike row below.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <SheetCombatStatTile label="Strike" detail={sheetCombatDerived.strike} morphus={morphus} />
            <SheetCombatStatTile label="Parry" detail={sheetCombatDerived.parry} morphus={morphus} />
            <SheetCombatStatTile label="Dodge" detail={sheetCombatDerived.dodge} morphus={morphus} />
            <SheetCombatStatTile
              label="Roll w/ Impact"
              detail={sheetCombatDerived.rollWithImpact}
              morphus={morphus}
            />
            <SheetCombatStatTile
              label="Initiative"
              detail={sheetCombatDerived.initiative}
              morphus={morphus}
            />
          </div>
        </div>

        <div className={`mb-3 rounded-lg border-2 p-3 ${sub}`}>
          <h3
            className={`mb-2 text-[10px] font-black uppercase tracking-wider ${
              morphus ? 'text-violet-200' : 'text-blue-900'
            }`}
          >
            Equipped weapons — profiles
          </h3>
          <p
            className={`mb-2 text-[10px] leading-snug ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}
          >
            Each card shows <strong>final Strike / Parry / Throw</strong> from P.P., Hand-to-Hand, W.P., and this
            weapon’s bonuses — hover a value for the full equation. Pillar 5: enter physical dice below; use{' '}
            <strong>Resolve combat</strong> in Apply damage for the A.R. drawer.
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
            {readyWeaponList.map((w) => (
              <WeaponStrikeCard
                key={w.id}
                weapon={w}
                character={character}
                activeForm={activeForm}
                morphus={morphus}
                ammoReserves={ammoReserves}
                fireModeId={fireModeByWeaponId[w.id] ?? defaultFireModeId(w)}
                reloadShakeTrigger={reloadShakeByWeaponId[w.id] ?? 0}
                onFireModeChange={(id) =>
                  setFireModeByWeaponId((prev) => ({ ...prev, [w.id]: id }))
                }
                onStrikeResolved={setStrikeBanner}
                onSpendAmmo={spendWeaponAmmo}
                onReload={() => reloadWeapon(w.id)}
                onReloadFailed={() => reloadWeapon(w.id)}
                onRequestReloadShake={() =>
                  setReloadShakeByWeaponId((prev) => ({
                    ...prev,
                    [w.id]: (prev[w.id] ?? 0) + 1,
                  }))
                }
              />
            ))}
            {showUnarmed ? (
              <li
                className={`rounded-xl border-2 border-dashed px-3 py-3 ${
                  morphus
                    ? 'border-amber-500/70 bg-violet-950/50'
                    : 'border-orange-400/80 bg-orange-50/80'
                }`}
              >
                <p className={`mb-2 text-sm font-black ${morphus ? 'text-amber-100' : 'text-orange-950'}`}>
                  Unarmed
                </p>
                {strengthCapacities.handToHandDamage.kind === 'supernatural' ? (
                  <ul
                    className={`mb-3 space-y-1 rounded-md border px-2 py-2 text-[11px] ${
                      morphus
                        ? 'border-violet-500/50 bg-black/30 text-violet-100'
                        : 'border-orange-300 bg-white/80 text-slate-800'
                    }`}
                    aria-label="Supernatural punch damage"
                  >
                    <li>
                      <span className="font-semibold">Restrained:</span>{' '}
                      <span className="font-mono">
                        {strengthCapacities.handToHandDamage.restrainedPunch}
                      </span>
                    </li>
                    <li>
                      <span className="font-semibold">Full strength:</span>{' '}
                      <span className="font-mono">
                        {strengthCapacities.handToHandDamage.fullStrengthPunch}
                      </span>
                    </li>
                    <li>
                      <span className="font-semibold">Power:</span>{' '}
                      <span className="font-mono">
                        {strengthCapacities.handToHandDamage.powerPunch}
                      </span>
                      <span
                        className={`font-black ${morphus ? 'text-amber-300' : 'text-orange-700'}`}
                      >
                        {' '}
                        — {strengthCapacities.handToHandDamage.powerPunchMeleeActions} APM
                      </span>
                    </li>
                  </ul>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <ManualRollField
                    label="Strike (d20)"
                    morphus={morphus}
                    manualValue={unarmedStrikeManual}
                    onManualValueChange={setUnarmedStrikeManual}
                    calculatedBonus={unarmedBd.total}
                    onRecord={() => {
                      const d = Number(unarmedStrikeManual.trim())
                      if (!Number.isFinite(d)) return
                      const t = d + unarmedBd.total
                      setStrikeBanner({
                        key: 'unarmed',
                        title: 'Unarmed strike',
                        detail: `Manual (${d}) + bonus (${unarmedBd.total}) = ${t}`,
                        total: t,
                      })
                    }}
                    recordLabel="Record strike"
                  />
                  <ManualRollField
                    label="Damage"
                    morphus={morphus}
                    manualValue={unarmedDamageManual}
                    onManualValueChange={setUnarmedDamageManual}
                    calculatedBonus={0}
                    hint={unarmedDamageLabel(
                      character,
                      activeForm,
                      handToHandCombatProfile.accumulated.damage,
                    )}
                  />
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
            <strong>Pillar 5:</strong> quick apply from the sheet — no automation. Use{' '}
            <strong>Resolve combat</strong> when you need attack roll vs armor (A.R.) routing.
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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openResolveCombat}
              className={`rounded-md px-3 py-2 text-[10px] font-black uppercase tracking-wide ${
                morphus
                  ? 'border-2 border-violet-400 bg-violet-950 text-violet-100 hover:bg-violet-900'
                  : 'border-2 border-slate-400 bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              Resolve combat
            </button>
            <span className={`text-[10px] ${morphus ? 'text-violet-400/90' : 'text-slate-500'}`}>
              Opens drawer: physical die vs A.R., then apply routed damage.
            </span>
          </div>
          <ManualRollField
            label={mode === 'heal' ? 'Heal amount' : 'Damage amount'}
            morphus={morphus}
            manualValue={amount}
            onManualValueChange={setAmount}
            calculatedBonus={0}
            hint="Total points to apply (physical dice first). Skips A.R. — use Resolve combat for armor routing."
          />
          <button
            type="button"
            onClick={applyVitality}
            className={`mt-3 w-full rounded-md py-2.5 text-sm font-black uppercase tracking-wide ${
              morphus
                ? 'bg-violet-600 text-white hover:bg-violet-500'
                : 'bg-blue-700 text-white hover:bg-blue-600'
            }`}
          >
            {mode === 'heal' ? 'Apply heal' : 'Apply damage'}
          </button>
        </div>

        {resolveOpen ? (
          <div
            className="fixed inset-0 z-[60] flex justify-end bg-black/45 p-2 backdrop-blur-[1px]"
            role="presentation"
            onClick={() => setResolveOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Resolve combat"
              className={`mt-auto h-[min(92vh,560px)] w-full max-w-md overflow-y-auto rounded-t-2xl border-2 shadow-2xl md:mt-0 md:h-auto md:self-center md:rounded-2xl ${
                morphus
                  ? 'border-violet-400 bg-slate-950 text-violet-50'
                  : 'border-blue-500 bg-white text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`flex items-center justify-between border-b-2 px-4 py-3 ${
                  morphus ? 'border-violet-700' : 'border-blue-200'
                }`}
              >
                <div>
                  <h3 className={`text-xs font-black uppercase tracking-wide ${morphus ? 'text-violet-200' : 'text-blue-900'}`}>
                    Resolve combat
                  </h3>
                  <p className={`mt-0.5 text-[10px] leading-snug ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}>
                    Enter your physical attack roll and damage. A.R. compares to equipped armor when present.
                  </p>
                </div>
                <button
                  type="button"
                  className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase ${
                    morphus ? 'text-violet-200 hover:bg-violet-900' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setResolveOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="space-y-4 p-4">
                {hudArmor ? (
                  <p className={`rounded-md border px-2 py-1.5 text-[10px] font-semibold ${morphus ? 'border-teal-700/80 bg-violet-950/60 text-teal-100' : 'border-teal-200 bg-teal-50 text-teal-950'}`}>
                    A.R. gate: equipped <strong>{hudArmor.name}</strong> A.R. {hudArmor.ar}. Roll{' '}
                    <strong>≥ A.R.</strong> to hit the body directly; below applies to armor S.D.C. first (per
                    routing rules).
                  </p>
                ) : (
                  <p className={`text-[10px] ${morphus ? 'text-violet-300' : 'text-slate-600'}`}>
                    No operational armor — attack roll is recorded for your notes only; damage routes to body
                    S.D.C. / H.P.
                  </p>
                )}
                <ManualRollField
                  label="Physical die — attack / strike total"
                  morphus={morphus}
                  manualValue={resolveAttackRollStr}
                  onManualValueChange={setResolveAttackRollStr}
                  calculatedBonus={0}
                  hint={
                    hudArmor
                      ? `Compare to A.R. ${hudArmor.ar} (optional; leave empty to skip A.R. routing).`
                      : 'Optional scratch field for the die you rolled.'
                  }
                />
                {resolveAttackRollInvalid ? (
                  <p className="text-[10px] font-bold text-red-600">Enter a numeric roll, or clear the field.</p>
                ) : null}
                <ManualRollField
                  label="Damage to apply"
                  morphus={morphus}
                  manualValue={resolveDamage}
                  onManualValueChange={setResolveDamage}
                  calculatedBonus={0}
                  hint="Physical damage from the hit (dice on the table, not auto-rolled)."
                />
                <button
                  type="button"
                  disabled={resolveAttackRollInvalid}
                  onClick={applyResolvedDamage}
                  className={`w-full rounded-md py-2.5 text-sm font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40 ${
                    morphus
                      ? 'bg-violet-600 text-white hover:bg-violet-500'
                      : 'bg-blue-700 text-white hover:bg-blue-600'
                  }`}
                >
                  Apply routed damage
                </button>
              </div>
            </div>
          </div>
        ) : null}
          </>
        )}
      </div>
    </aside>
  )
}
