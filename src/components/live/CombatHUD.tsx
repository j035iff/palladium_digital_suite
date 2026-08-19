import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { unarmedDamageLabel } from '../../lib/strikeEngine'
import { formatBonus } from '../../lib/combatQuickBonuses'
import { ManualRollField } from '../combat/ManualRollField'
import {
  defaultFireModeId,
  getWeaponFireModes,
} from '../../lib/fireModes'
import type { SheetCombatStatDetails } from '../../lib/sheetBonuses'
import { formatSheetBonusEquation } from '../../lib/sheetBonuses'
import { CombatNarrativeLog } from './CombatNarrativeLog'
import type { StrikeBannerState } from './WeaponStrikeCard'
import { CombatCategoryBubble } from './CombatCategoryBubble'
import { CombatWeaponSlotExpand } from './CombatWeaponSlotExpand'
import { UnarmedCombatExpand } from './UnarmedCombatExpand'
import {
  combatWeaponGlyphId,
  defaultSelectedWeaponId,
  formatFireModeDamageLabel,
  formatHandToHandHeader,
  hostGenreOffersModernWeapons,
  listCarriedWeaponsOfEra,
  pickBurstFireMode,
  pickSingleFireMode,
  weaponById,
} from '../../lib/combatWeaponSlots'
import { computeWeaponProfileBonuses } from '../../lib/weaponBonuses'

function ApmPipRow({
  morphus,
  maxApm,
  actionsUsed,
  size,
  onSpendOne,
}: {
  morphus: boolean
  maxApm: number
  actionsUsed: number
  size: 'compact' | 'full'
  onSpendOne: () => void
}) {
  if (maxApm <= 0) return null
  const remaining = Math.max(0, maxApm - actionsUsed)
  const compact = size === 'compact'
  const box = compact
    ? 'inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold'
    : 'inline-flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg font-bold'

  return (
    <div
      className={`flex flex-wrap items-center ${compact ? 'gap-0.5' : 'mb-3 gap-2'}`}
      role="group"
      aria-label={`Attacks per melee, ${remaining} of ${maxApm} remaining. Tap a remaining action to spend 1.`}
    >
      {Array.from({ length: maxApm }, (_, i) => {
        const spent = i < actionsUsed
        const spentCls = morphus
          ? `${box} border-violet-900/80 bg-slate-900 text-violet-400 ${compact ? 'opacity-25' : 'opacity-20'}`
          : `${box} border-slate-400/80 bg-slate-200/90 text-slate-600 ${compact ? 'opacity-25' : 'opacity-20'}`
        const liveCls = morphus
          ? `${box} cursor-pointer border-violet-200 bg-violet-600 text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${compact ? '' : 'shadow-md'}`
          : `${box} cursor-pointer border-blue-800 bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 focus-visible:ring-offset-1 ${compact ? '' : 'shadow-md'}`

        if (spent) {
          return (
            <span key={i} className={spentCls} title="Spent this melee" aria-hidden>
              ○
            </span>
          )
        }
        return (
          <button
            key={i}
            type="button"
            className={liveCls}
            title="Spend 1 melee action"
            aria-label="Spend 1 melee action"
            onClick={onSpendOne}
          >
            ⚔
          </button>
        )
      })}
    </div>
  )
}

function InitiativeChip({
  detail,
  morphus,
}: {
  detail: SheetCombatStatDetails
  morphus: boolean
}) {
  const tip = formatSheetBonusEquation(detail, formatBonus)
  return (
    <div
      className={`group relative min-w-[5.5rem] rounded-md border px-2 py-1.5 text-center ${
        morphus ? 'border-violet-400/80 bg-slate-950/80' : 'border-blue-200 bg-white'
      }`}
    >
      <p
        className={`text-[9px] font-bold uppercase tracking-wide ${
          morphus ? 'text-violet-200' : 'text-slate-700'
        }`}
      >
        Initiative
      </p>
      <p
        className={`font-mono text-2xl font-black tabular-nums leading-none ${
          morphus ? 'text-amber-300' : 'text-blue-800'
        }`}
      >
        {formatBonus(detail.total)}
      </p>
      <div
        role="tooltip"
        className={`pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-1 w-[min(100vw-2rem,20rem)] -translate-x-1/2 rounded-md border-2 px-2 py-1.5 text-left text-[10px] font-semibold leading-snug opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 ${
          morphus
            ? 'border-violet-400/90 bg-black/92 text-violet-50'
            : 'border-blue-400 bg-white text-slate-900'
        }`}
      >
        {tip}
      </div>
    </div>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="opacity-70">{label}: </span>
      <span className="font-mono font-bold">{value}</span>
    </p>
  )
}

type CombatHudLayout = 'sidebar' | 'panel'
type CombatBubbleId = 'unarmed' | 'ancient' | 'modern'

/**
 * Combat Home tactical HUD (master_flow.md, combat_logic.md, ui_wireframe.md §3).
 * Max A.P.M. comes from {@link CharacterContext} (`attacksPerMelee.max`).
 * Vitality bars live on the Persistent Core header, not here.
 * `panel` — Active Zone combat mode; `sidebar` — legacy dock.
 */
export function CombatHUD({ layout = 'panel' }: { layout?: CombatHudLayout }) {
  const {
    character,
    activeForm,
    supportsDualForm,
    hostGenreId,
    inventoryItems,
    sheetCombatDerived,
    handToHandCombatProfile,
    ownedHandToHandStyles,
    setActiveCombatHandToHandSkillId,
    attacksPerMelee,
    spendCombatAction,
    resetMeleeRound,
    applySdcPriorityVitality,
    durationCheckPulse,
    equippedArmor,
    readyWeaponIds,
    setReadyWeapon,
    strengthCapacities,
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
  const [hudMinimized, setHudMinimized] = useState(false)
  const [expandedBubble, setExpandedBubble] = useState<CombatBubbleId | null>(null)
  const [pickedIds, setPickedIds] = useState<{ ancient: string | null; modern: string | null }>(
    { ancient: null, modern: null },
  )
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

  const shell =
    layout === 'panel'
      ? morphus
        ? 'rounded-xl border-2 border-violet-400 bg-slate-950/96 text-violet-50 shadow-lg'
        : 'rounded-xl border-2 border-blue-500 bg-white/96 text-slate-900 shadow-lg'
      : morphus
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

  const ancientCandidates = useMemo(
    () => listCarriedWeaponsOfEra(inventoryItems, 'ancient'),
    [inventoryItems],
  )
  const modernCandidates = useMemo(
    () => listCarriedWeaponsOfEra(inventoryItems, 'modern'),
    [inventoryItems],
  )
  const hostOffersModern = hostGenreOffersModernWeapons(hostGenreId)

  const selectedAncient = useMemo(() => {
    const fallback = defaultSelectedWeaponId(ancientCandidates, readyWeaponIds)
    const id =
      pickedIds.ancient && ancientCandidates.some((w) => w.id === pickedIds.ancient)
        ? pickedIds.ancient
        : fallback
    return weaponById(ancientCandidates, id)
  }, [ancientCandidates, pickedIds.ancient, readyWeaponIds])

  const selectedModern = useMemo(() => {
    const fallback = defaultSelectedWeaponId(modernCandidates, readyWeaponIds)
    const id =
      pickedIds.modern && modernCandidates.some((w) => w.id === pickedIds.modern)
        ? pickedIds.modern
        : fallback
    return weaponById(modernCandidates, id)
  }, [modernCandidates, pickedIds.modern, readyWeaponIds])

  const selectEraWeapon = (era: 'ancient' | 'modern', weaponId: string) => {
    setPickedIds((prev) => ({ ...prev, [era]: weaponId }))
    setReadyWeapon(era === 'ancient' ? 0 : 1, weaponId)
  }

  const riftedModernNote =
    !hostOffersModern && selectedModern
      ? 'Brought from another world — still usable here.'
      : undefined

  const toggleBubble = (id: CombatBubbleId) => {
    setExpandedBubble((cur) => (cur === id ? null : id))
  }

  const maxApm = attacksPerMelee.max
  const curApm = attacksPerMelee.current
  /** Remaining actions = curApm; pips are consumed visually left → right. */
  const actionsUsed = Math.max(0, maxApm - curApm)
  const spendOneAction = () => spendCombatAction(1)

  const punchLabel = unarmedDamageLabel(
    character,
    activeForm,
    handToHandCombatProfile.accumulated.damage,
  )
  const ancientProfile = selectedAncient
    ? computeWeaponProfileBonuses(
        character,
        activeForm,
        selectedAncient,
        handToHandCombatProfile.accumulated,
      )
    : null
  const modernProfile = selectedModern
    ? computeWeaponProfileBonuses(
        character,
        activeForm,
        selectedModern,
        handToHandCombatProfile.accumulated,
      )
    : null
  const modernModes = selectedModern ? getWeaponFireModes(selectedModern) : []
  const modernSingle = pickSingleFireMode(modernModes)
  const modernBurst = pickBurstFireMode(modernModes)

  const frame =
    layout === 'panel'
      ? 'w-full backdrop-blur-md'
      : 'max-md:sticky max-md:bottom-0 max-md:z-40 md:relative md:z-0 md:flex md:h-full md:min-h-0 md:flex-col md:overflow-y-auto shrink-0 backdrop-blur-md'

  return (
    <aside
      className={`${frame} ${shell} ${
        durationCheckPulse ? 'pds-hud-duration-pulse' : ''
      }`}
      aria-label="S.D.C. combat tactical HUD"
    >
      <div
        className={
          layout === 'panel'
            ? 'mx-auto flex w-full max-w-4xl flex-col px-3 py-3'
            : 'mx-auto flex w-full max-w-4xl flex-col px-3 py-3 md:mx-0 md:max-w-none md:flex-1'
        }
      >
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

        {hudMinimized ? (
          <div
            className={`flex flex-wrap items-center gap-2 rounded-lg border-2 p-2 ${sub}`}
            aria-label="Condensed melee A.P.M. and initiative"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span
                className={`text-[9px] font-black uppercase tracking-wide ${
                  morphus ? 'text-violet-200' : 'text-blue-900'
                }`}
              >
                APM {curApm}/{maxApm}
              </span>
              <ApmPipRow
                morphus={morphus}
                maxApm={maxApm}
                actionsUsed={actionsUsed}
                size="compact"
                onSpendOne={spendOneAction}
              />
            </div>
            <InitiativeChip detail={sheetCombatDerived.initiative} morphus={morphus} />
            <button
              type="button"
              title="New melee round"
              onClick={resetMeleeRound}
              className={`shrink-0 rounded px-2 py-1 text-[10px] font-black uppercase ${btnCompact}`}
            >
              ↻
            </button>
            <button
              type="button"
              className={btnCompact}
              aria-expanded={false}
              onClick={() => setHudMinimized(false)}
            >
              Expand
            </button>
          </div>
        ) : (
          <>
        <div className={`mb-3 rounded-lg border-2 p-3 ${sub}`}>
          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3
                className={`text-[10px] font-black uppercase tracking-wider ${
                  morphus ? 'text-violet-200' : 'text-blue-900'
                }`}
              >
                Melee — A.P.M. ({curApm} / {maxApm})
              </h3>
              <p className={`mt-1 text-[10px] leading-snug ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}>
                Tap a remaining action to spend <strong>1</strong> A.P.M.
                {handToHandCombatProfile.attackApmCost > 1
                  ? ` Untrained attacks cost ${handToHandCombatProfile.attackApmCost} actions.`
                  : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InitiativeChip detail={sheetCombatDerived.initiative} morphus={morphus} />
              <button
                type="button"
                className={btnCompact}
                aria-expanded
                onClick={() => setHudMinimized(true)}
              >
                Minimize
              </button>
            </div>
          </div>
          <ApmPipRow
            morphus={morphus}
            maxApm={maxApm}
            actionsUsed={actionsUsed}
            size="full"
            onSpendOne={spendOneAction}
          />
          {curApm <= 0 && maxApm > 0 ? (
            <p
              className={`mb-3 text-[10px] font-bold ${morphus ? 'text-amber-200' : 'text-amber-800'}`}
              role="status"
            >
              Out of actions — strike and dodge are spent; parry is still free.
            </p>
          ) : null}
          <button
            type="button"
            onClick={resetMeleeRound}
            className={`rounded-md px-3 py-2 text-xs font-black uppercase tracking-wide ${btn}`}
          >
            New melee round
          </button>
        </div>

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

        <div className="mb-3 space-y-3">
          <CombatCategoryBubble
            morphus={morphus}
            categoryLabel={formatHandToHandHeader(handToHandCombatProfile.skillName)}
            expanded={expandedBubble === 'unarmed'}
            empty={false}
            glyphId="fist"
            onToggle={() => toggleBubble('unarmed')}
            summary={
              <>
                <SummaryLine label="Strike" value={formatBonus(sheetCombatDerived.strike.total)} />
                <SummaryLine label="Parry" value={formatBonus(sheetCombatDerived.parry.total)} />
                <SummaryLine label="Dodge" value={formatBonus(sheetCombatDerived.dodge.total)} />
                <SummaryLine label="Punch" value={punchLabel} />
              </>
            }
          >
            <UnarmedCombatExpand
              morphus={morphus}
              character={character}
              activeForm={activeForm}
              combat={sheetCombatDerived}
              hth={handToHandCombatProfile}
              ownedStyles={ownedHandToHandStyles}
              onSelectStyle={setActiveCombatHandToHandSkillId}
              strengthCapacities={strengthCapacities}
              onStrikeResolved={(payload) =>
                setStrikeBanner({ key: 'unarmed', ...payload })
              }
            />
          </CombatCategoryBubble>

          <CombatCategoryBubble
            morphus={morphus}
            categoryLabel="Ancient Weapon"
            expanded={expandedBubble === 'ancient'}
            empty={!selectedAncient}
            emptyReason="No ancient weapon in Gear — add one on the Gear tab."
            glyphId={combatWeaponGlyphId(selectedAncient)}
            onToggle={() => toggleBubble('ancient')}
            summary={
              selectedAncient && ancientProfile ? (
                <>
                  <p className="font-bold">{selectedAncient.name}</p>
                  <SummaryLine label="Strike" value={formatBonus(ancientProfile.strike.total)} />
                  <SummaryLine label="Parry" value={formatBonus(ancientProfile.parry.total)} />
                  <SummaryLine label="Dam" value={selectedAncient.damage} />
                </>
              ) : null
            }
          >
            <CombatWeaponSlotExpand
              morphus={morphus}
              eraLabel="Ancient weapons"
              candidates={ancientCandidates}
              selected={selectedAncient}
              character={character}
              activeForm={activeForm}
              ammoReserves={ammoReserves}
              fireModeId={
                selectedAncient
                  ? (fireModeByWeaponId[selectedAncient.id] ?? defaultFireModeId(selectedAncient))
                  : ''
              }
              reloadShakeTrigger={selectedAncient ? (reloadShakeByWeaponId[selectedAncient.id] ?? 0) : 0}
              onSelectWeapon={(id) => selectEraWeapon('ancient', id)}
              onFireModeChange={(id) => {
                if (!selectedAncient) return
                setFireModeByWeaponId((prev) => ({ ...prev, [selectedAncient.id]: id }))
              }}
              onStrikeResolved={setStrikeBanner}
              onSpendAmmo={spendWeaponAmmo}
              onReload={(id) => reloadWeapon(id)}
              onReloadFailed={(id) => reloadWeapon(id)}
              onRequestReloadShake={(id) =>
                setReloadShakeByWeaponId((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
              }
            />
          </CombatCategoryBubble>

          <CombatCategoryBubble
            morphus={morphus}
            categoryLabel="Modern Weapon"
            expanded={expandedBubble === 'modern'}
            empty={!selectedModern}
            emptyReason="No modern weapon in Gear — add one on the Gear tab."
            glyphId={combatWeaponGlyphId(selectedModern)}
            onToggle={() => toggleBubble('modern')}
            summary={
              selectedModern && modernProfile ? (
                <>
                  <p className="font-bold">{selectedModern.name}</p>
                  {riftedModernNote ? (
                    <p className="mt-0.5 text-[9px] font-semibold opacity-70">{riftedModernNote}</p>
                  ) : null}
                  <div className="mt-1 grid grid-cols-2 gap-x-3">
                    <div>
                      <p className="text-[9px] font-black uppercase opacity-70">Single</p>
                      <SummaryLine
                        label="Strike"
                        value={formatBonus(
                          modernProfile.strike.total + (modernSingle?.strikeModifier ?? 0),
                        )}
                      />
                      <SummaryLine
                        label="Dam"
                        value={formatFireModeDamageLabel(selectedModern, modernSingle)}
                      />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase opacity-70">Burst</p>
                      {modernBurst ? (
                        <>
                          <SummaryLine
                            label="Strike"
                            value={formatBonus(
                              modernProfile.strike.total + modernBurst.strikeModifier,
                            )}
                          />
                          <SummaryLine
                            label="Dam"
                            value={formatFireModeDamageLabel(selectedModern, modernBurst)}
                          />
                        </>
                      ) : (
                        <p className="opacity-55">—</p>
                      )}
                    </div>
                  </div>
                </>
              ) : null
            }
          >
            <CombatWeaponSlotExpand
              morphus={morphus}
              eraLabel="Modern weapons"
              candidates={modernCandidates}
              selected={selectedModern}
              character={character}
              activeForm={activeForm}
              ammoReserves={ammoReserves}
              fireModeId={
                selectedModern
                  ? (fireModeByWeaponId[selectedModern.id] ?? defaultFireModeId(selectedModern))
                  : ''
              }
              reloadShakeTrigger={selectedModern ? (reloadShakeByWeaponId[selectedModern.id] ?? 0) : 0}
              hostNote={riftedModernNote}
              onSelectWeapon={(id) => selectEraWeapon('modern', id)}
              onFireModeChange={(id) => {
                if (!selectedModern) return
                setFireModeByWeaponId((prev) => ({ ...prev, [selectedModern.id]: id }))
              }}
              onStrikeResolved={setStrikeBanner}
              onSpendAmmo={spendWeaponAmmo}
              onReload={(id) => reloadWeapon(id)}
              onReloadFailed={(id) => reloadWeapon(id)}
              onRequestReloadShake={(id) =>
                setReloadShakeByWeaponId((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
              }
            />
          </CombatCategoryBubble>
        </div>

        <CombatNarrativeLog morphus={morphus} />

        <div className={`mt-3 rounded-lg border-2 p-3 ${sub}`}>
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
