import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { unarmedDamageLabel } from '../../lib/strikeEngine'
import { formatBonus } from '../../lib/combatQuickBonuses'
import { getWeaponFireModes } from '../../lib/fireModes'
import type { SheetCombatStatDetails } from '../../lib/sheetBonuses'
import { formatSheetBonusEquation } from '../../lib/sheetBonuses'
import { CombatNarrativeLog } from './CombatNarrativeLog'
import type { StrikeBannerState } from './WeaponStrikeCard'
import { CombatCategoryBubble } from './CombatCategoryBubble'
import { CombatWeaponCategoryPanel } from './CombatWeaponCategoryPanel'
import { UnarmedCombatExpand } from './UnarmedCombatExpand'
import { ClampedOverlayTooltip } from './ClampedOverlayTooltip'
import { CombatVitalsTab } from './CombatVitalsTab'
import { CombatAbilitiesTab } from './CombatAbilitiesTab'
import {
  COMBAT_SUB_TAB_LABELS,
  COMBAT_SUB_TAB_ORDER,
  type CombatSubTabId,
} from '../../lib/liveCombatTabs'
import type { CombatDamagePoolId } from '../../lib/combatDamagePools'
import {
  applyStrikePenaltyToWeaponProfile,
  formatFireModeDamageLabel,
  formatHandToHandCategoryTitle,
  formatHandToHandStyleBadge,
  hostGenreOffersModernWeapons,
  listCarriedWeaponsOfEra,
  listSlotWeaponOptions,
  modernTwoGunStrikePenalty,
  normalizeCombatEraSlots,
  pickBurstFireMode,
  pickSingleFireMode,
  resolvePickedWeaponId,
  weaponById,
} from '../../lib/combatWeaponSlots'
import { computeWeaponProfileBonuses } from '../../lib/weaponBonuses'

/** Pip diameter matches Melee reset height — keep the APM bar one control tall. */
const APM_CONTROL_H = 'h-8'

function ApmPipRow({
  morphus,
  maxApm,
  actionsUsed,
  onSpendOne,
}: {
  morphus: boolean
  maxApm: number
  actionsUsed: number
  onSpendOne: () => void
}) {
  if (maxApm <= 0) return null
  const remaining = Math.max(0, maxApm - actionsUsed)
  const box =
    `inline-flex ${APM_CONTROL_H} w-8 items-center justify-center rounded-full border-2 text-sm font-bold`

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label={`Attacks per melee, ${remaining} of ${maxApm} remaining. Tap a remaining action to spend 1.`}
    >
      {Array.from({ length: maxApm }, (_, i) => {
        const spent = i < actionsUsed
        const spentCls = morphus
          ? `${box} border-violet-900/80 bg-slate-900 text-violet-400 opacity-20`
          : `${box} border-slate-400/80 bg-slate-200/90 text-slate-600 opacity-20`
        const liveCls = morphus
          ? `${box} cursor-pointer border-violet-200 bg-violet-600 text-white shadow-sm hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950`
          : `${box} cursor-pointer border-blue-800 bg-blue-600 text-white shadow-sm hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 focus-visible:ring-offset-1`

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
    <ClampedOverlayTooltip
      tip={tip}
      morphus={morphus}
      tone="sheet"
      className={`inline-flex ${APM_CONTROL_H} items-center justify-center rounded border px-2 ${
        morphus ? 'border-violet-400/80 bg-slate-950/80' : 'border-slate-300 bg-white'
      }`}
    >
      <span
        className={`font-mono text-xs font-black uppercase tracking-wide tabular-nums leading-none ${
          morphus ? 'text-amber-300' : 'text-slate-800'
        }`}
      >
        INIT {formatBonus(detail.total)}
      </span>
    </ClampedOverlayTooltip>
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
type CombatBubbleId = 'unarmed'

/**
 * Combat Home tactical HUD (master_flow.md, combat_logic.md, ui_wireframe.md §3).
 * Slim sticky APM + Initiative + Melee chrome (outside scroll); Campaigns-style
 * sub-tabs; only the active tab body scrolls. Strip quick-ref stays on Persistent Core.
 */
export function CombatHUD({ layout = 'panel' }: { layout?: CombatHudLayout }) {
  const {
    character,
    activeForm,
    activeFormState: form,
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
    equippedArmorId,
    readyWeaponIds,
    setReadyWeapon,
    strengthCapacities,
    spendWeaponAmmo,
    reloadWeapon,
    ammoReserves,
    morphusNaturalAr,
    psychicTier,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const showIsp = psychicTier !== 'none' || form.isp.maximum > 0
  const [subTab, setSubTab] = useState<CombatSubTabId>('vitals')
  const [absorbOrder, setAbsorbOrder] = useState<CombatDamagePoolId[]>([
    'armor',
    'sdc',
    'hp',
  ])
  const [expandedBubble, setExpandedBubble] = useState<CombatBubbleId | null>(null)
  /** Per-era weapon slots — primary always present; extras stay until removed. Default None. */
  const [eraSlots, setEraSlots] = useState<{
    ancient: (string | null)[]
    modern: (string | null)[]
  }>({ ancient: [null], modern: [null] })
  const [expandedWeaponSlot, setExpandedWeaponSlot] = useState<{
    ancient: number | null
    modern: number | null
  }>({ ancient: null, modern: null })
  const [strikeBanner, setStrikeBanner] = useState<StrikeBannerState>(null)
  const [fireModeByWeaponId, setFireModeByWeaponId] = useState<Record<string, string>>(
    {},
  )
  const [reloadShakeByWeaponId, setReloadShakeByWeaponId] = useState<
    Record<string, number>
  >({})

  useEffect(() => {
    if (!strikeBanner) return
    const t = window.setTimeout(() => setStrikeBanner(null), 2800)
    return () => window.clearTimeout(t)
  }, [strikeBanner])

  /** Panel: APM + tabs stay unboxed; outline lives on the scrollable tab body (mockup). */
  const shell =
    layout === 'panel'
      ? morphus
        ? 'bg-transparent text-violet-50'
        : 'bg-transparent text-slate-900'
      : morphus
        ? 'border-t-2 border-violet-400 bg-slate-950/96 text-violet-50 max-md:shadow-[0_-10px_40px_rgba(0,0,0,0.55)] md:border-t-0 md:border-l-2 md:border-violet-400 md:shadow-none'
        : 'border-t-2 border-blue-500 bg-white/96 text-slate-900 max-md:shadow-[0_-6px_24px_rgba(30,64,175,0.14)] md:border-t-0 md:border-l-2 md:border-blue-500 md:shadow-none'

  const tabBodyOutline = morphus
    ? 'rounded-lg border-2 border-violet-400/80 bg-slate-950/90'
    : 'rounded-lg border-2 border-sky-300 bg-white'

  const btn = morphus
    ? 'border-2 border-violet-300 bg-violet-800 text-white hover:bg-violet-700'
    : 'border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-500'

  const ancientCandidates = useMemo(
    () => listCarriedWeaponsOfEra(inventoryItems, 'ancient'),
    [inventoryItems],
  )
  const modernCandidates = useMemo(
    () => listCarriedWeaponsOfEra(inventoryItems, 'modern'),
    [inventoryItems],
  )
  const hostOffersModern = hostGenreOffersModernWeapons(hostGenreId)

  /** Seed primary slot from Gear ready weapons once when still None. */
  useEffect(() => {
    setEraSlots((prev) => {
      let nextAncient = normalizeCombatEraSlots(prev.ancient)
      let nextModern = normalizeCombatEraSlots(prev.modern)
      let changed = false
      const readyAncient = readyWeaponIds[0]
      const readyModern = readyWeaponIds[1]
      if (
        nextAncient[0] == null &&
        readyAncient &&
        ancientCandidates.some((w) => w.id === readyAncient)
      ) {
        nextAncient = [...nextAncient]
        nextAncient[0] = readyAncient
        changed = true
      }
      if (
        nextModern[0] == null &&
        readyModern &&
        modernCandidates.some((w) => w.id === readyModern)
      ) {
        nextModern = [...nextModern]
        nextModern[0] = readyModern
        changed = true
      }
      return changed ? { ancient: nextAncient, modern: nextModern } : prev
    })
  }, [ancientCandidates, modernCandidates, readyWeaponIds])

  const ancientSlots = normalizeCombatEraSlots(eraSlots.ancient)
  const modernSlots = normalizeCombatEraSlots(eraSlots.modern)

  const selectedAncientWeapons = useMemo(() => {
    return ancientSlots.map((id, i) => {
      const opts = listSlotWeaponOptions(inventoryItems, 'ancient', i)
      return weaponById(opts, resolvePickedWeaponId(opts, id))
    })
  }, [ancientSlots, inventoryItems])

  const selectedModernWeapons = useMemo(() => {
    return modernSlots.map((id, i) => {
      const opts = listSlotWeaponOptions(inventoryItems, 'modern', i)
      return weaponById(opts, resolvePickedWeaponId(opts, id))
    })
  }, [modernSlots, inventoryItems])

  const selectedAncient = selectedAncientWeapons[0] ?? null
  const selectedModern = selectedModernWeapons[0] ?? null

  const riftedModernNote =
    !hostOffersModern && selectedModern
      ? 'Brought from another world — still usable here.'
      : undefined

  const toggleBubble = (id: CombatBubbleId) => {
    setExpandedBubble((cur) => (cur === id ? null : id))
  }

  const maxApm = attacksPerMelee.max
  const curApm = attacksPerMelee.current
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
  const modernPrimaryPenalty = modernTwoGunStrikePenalty(selectedModernWeapons, 0)
  const modernProfileRaw = selectedModern
    ? computeWeaponProfileBonuses(
        character,
        activeForm,
        selectedModern,
        handToHandCombatProfile.accumulated,
      )
    : null
  const modernProfile = modernProfileRaw
    ? applyStrikePenaltyToWeaponProfile(modernProfileRaw, modernPrimaryPenalty)
    : null
  const modernModes = selectedModern ? getWeaponFireModes(selectedModern) : []
  const modernSingle = pickSingleFireMode(modernModes)
  const modernBurst = pickBurstFireMode(modernModes)

  const apmHint =
    handToHandCombatProfile.attackApmCost > 1
      ? `Tap a remaining action to spend 1 A.P.M. Untrained attacks cost ${handToHandCombatProfile.attackApmCost} actions.`
      : 'Tap a remaining action to spend 1 A.P.M.'

  const frame =
    layout === 'panel'
      ? 'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden backdrop-blur-md'
      : 'max-md:sticky max-md:bottom-0 max-md:z-40 md:relative md:z-0 md:flex md:h-full md:min-h-0 md:flex-col md:overflow-hidden shrink-0 backdrop-blur-md'

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
            ? 'mx-auto flex h-full min-h-0 w-full max-w-4xl flex-1 flex-col px-3 pt-2 pb-0'
            : 'mx-auto flex h-full min-h-0 w-full max-w-4xl flex-1 flex-col px-3 pt-2 pb-0 md:mx-0 md:max-w-none'
        }
      >
        {durationCheckPulse ? (
          <div
            className={`mb-2 shrink-0 rounded-md border-2 px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide ${
              morphus
                ? 'border-amber-400 bg-violet-950 text-amber-100'
                : 'border-amber-500 bg-amber-50 text-amber-950'
            }`}
            role="status"
          >
            New melee round — review active spell and ability durations (melee step).
          </div>
        ) : null}

        {/* Slim APM capsule — width hugs pips; centered above tabs (outside scroll). */}
        <div className="mb-1.5 flex shrink-0 flex-col items-center gap-1">
          <div
            className={`inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border-2 px-2.5 py-1 ${
              morphus
                ? 'border-violet-400/80 bg-violet-950/70'
                : 'border-sky-400 bg-sky-50'
            }`}
            title={apmHint}
            aria-label={`Attacks per melee, ${curApm} of ${maxApm} remaining`}
          >
            <span
              className={`shrink-0 text-[10px] font-black uppercase tracking-wider ${
                morphus ? 'text-violet-200' : 'text-slate-900'
              }`}
            >
              APM
            </span>
            <ApmPipRow
              morphus={morphus}
              maxApm={maxApm}
              actionsUsed={actionsUsed}
              onSpendOne={spendOneAction}
            />
            <span
              className={`mx-0.5 hidden h-5 w-px shrink-0 sm:block ${
                morphus ? 'bg-violet-500/70' : 'bg-sky-300'
              }`}
              aria-hidden
            />
            <InitiativeChip detail={sheetCombatDerived.initiative} morphus={morphus} />
            <button
              type="button"
              title="New melee round"
              onClick={resetMeleeRound}
              className={`inline-flex ${APM_CONTROL_H} shrink-0 items-center rounded-full px-3 text-[11px] font-black uppercase tracking-wide ${btn}`}
              aria-label="New melee round"
            >
              ↻ Melee
            </button>
          </div>
          {curApm <= 0 && maxApm > 0 ? (
            <p
              className={`text-center text-[10px] font-bold leading-tight ${morphus ? 'text-amber-200' : 'text-amber-800'}`}
              role="status"
            >
              Out of actions — strike and dodge are spent; parry is still free.
            </p>
          ) : null}
        </div>

        {/* Campaigns-style sub-tabs — unboxed dark strip (mockup). */}
        <div
          className={`mb-0 flex shrink-0 flex-wrap items-center gap-1.5 rounded-t-md px-2 py-1.5 ${
            morphus ? 'bg-violet-950' : 'bg-slate-900'
          }`}
          role="tablist"
          aria-label="Combat sections"
        >
          {COMBAT_SUB_TAB_ORDER.map((id) => {
            const active = subTab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubTab(id)}
                className={`rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  active
                    ? morphus
                      ? 'bg-violet-200 text-slate-950 shadow-sm'
                      : 'bg-white text-slate-900 shadow-sm'
                    : morphus
                      ? 'bg-transparent text-violet-100 hover:bg-violet-900'
                      : 'bg-transparent text-white hover:bg-slate-800'
                }`}
              >
                {COMBAT_SUB_TAB_LABELS[id]}
              </button>
            )
          })}
        </div>

        {/* One outline around the scrollable tab body (mockup hierarchy). */}
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 ${tabBodyOutline} ${
            morphus ? 'rounded-t-none' : 'rounded-t-none'
          }`}
          aria-label={`${COMBAT_SUB_TAB_LABELS[subTab]} tab`}
        >
        {strikeBanner && subTab === 'spd' ? (
          <div
            className={`pds-hud-strike-banner mb-3 rounded-xl border-4 px-3 py-4 text-center ${
              morphus
                ? 'border-amber-400 bg-black/85 text-amber-100'
                : 'border-orange-600 bg-amber-50 text-orange-950'
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">
              Strike resolved
            </p>
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
            <p
              className={`mt-2 font-mono text-sm font-semibold ${morphus ? 'text-violet-100' : 'text-slate-800'}`}
            >
              {strikeBanner.detail}
            </p>
          </div>
        ) : null}

        {subTab === 'vitals' ? (
          <CombatVitalsTab
            morphus={morphus}
            character={character}
            activeForm={activeForm}
            inventoryItems={inventoryItems}
            equippedArmorId={equippedArmorId}
            naturalAr={morphusNaturalAr ?? null}
            absorbOrder={absorbOrder}
            onAbsorbOrderChange={setAbsorbOrder}
            applySdcPriorityVitality={applySdcPriorityVitality}
          />
        ) : null}

        {subTab === 'spd' ? (
          <div className="mb-3 space-y-3" aria-label="Combat S/P/D">
            <CombatCategoryBubble
              morphus={morphus}
              categoryLabel={formatHandToHandCategoryTitle(
                handToHandCombatProfile.skillName,
              )}
              titleAside={formatHandToHandStyleBadge(
                handToHandCombatProfile.skillName,
              )}
              expanded={expandedBubble === 'unarmed'}
              empty={false}
              glyphId="fist"
              onToggle={() => toggleBubble('unarmed')}
              summary={
                <>
                  <SummaryLine
                    label="Strike"
                    value={formatBonus(sheetCombatDerived.strike.total)}
                  />
                  <SummaryLine
                    label="Parry"
                    value={formatBonus(sheetCombatDerived.parry.total)}
                  />
                  <SummaryLine
                    label="Dodge"
                    value={formatBonus(sheetCombatDerived.dodge.total)}
                  />
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

            <CombatWeaponCategoryPanel
              morphus={morphus}
              era="ancient"
              categoryLabel="Ancient Weapons"
              inventoryItems={inventoryItems}
              slotWeaponIds={ancientSlots}
              expandedSlotIndex={expandedWeaponSlot.ancient}
              character={character}
              activeForm={activeForm}
              ammoReserves={ammoReserves}
              fireModeByWeaponId={fireModeByWeaponId}
              reloadShakeByWeaponId={reloadShakeByWeaponId}
              onSlotsChange={(next) =>
                setEraSlots((prev) => ({ ...prev, ancient: next }))
              }
              onExpandedSlotChange={(idx) =>
                setExpandedWeaponSlot((prev) => ({ ...prev, ancient: idx }))
              }
              onPrimaryReadySync={(id) => setReadyWeapon(0, id)}
              onFireModeChange={(weaponId, modeId) =>
                setFireModeByWeaponId((prev) => ({ ...prev, [weaponId]: modeId }))
              }
              onStrikeResolved={setStrikeBanner}
              onSpendAmmo={spendWeaponAmmo}
              onReload={(id) => reloadWeapon(id)}
              onReloadFailed={(id) => reloadWeapon(id)}
              onRequestReloadShake={(id) =>
                setReloadShakeByWeaponId((prev) => ({
                  ...prev,
                  [id]: (prev[id] ?? 0) + 1,
                }))
              }
              summary={
                selectedAncient && ancientProfile ? (
                  <>
                    <SummaryLine
                      label="Strike"
                      value={formatBonus(ancientProfile.strike.total)}
                    />
                    <SummaryLine
                      label="Parry"
                      value={formatBonus(ancientProfile.parry.total)}
                    />
                    <SummaryLine label="Dam" value={selectedAncient.damage} />
                  </>
                ) : (
                  <>
                    <SummaryLine label="Strike" value="—" />
                    <SummaryLine label="Parry" value="—" />
                    <SummaryLine label="Dam" value="—" />
                  </>
                )
              }
            />

            <CombatWeaponCategoryPanel
              morphus={morphus}
              era="modern"
              categoryLabel="Modern Weapons"
              inventoryItems={inventoryItems}
              slotWeaponIds={modernSlots}
              expandedSlotIndex={expandedWeaponSlot.modern}
              character={character}
              activeForm={activeForm}
              ammoReserves={ammoReserves}
              fireModeByWeaponId={fireModeByWeaponId}
              reloadShakeByWeaponId={reloadShakeByWeaponId}
              hostNote={riftedModernNote}
              onSlotsChange={(next) =>
                setEraSlots((prev) => ({ ...prev, modern: next }))
              }
              onExpandedSlotChange={(idx) =>
                setExpandedWeaponSlot((prev) => ({ ...prev, modern: idx }))
              }
              onPrimaryReadySync={(id) => setReadyWeapon(1, id)}
              onFireModeChange={(weaponId, modeId) =>
                setFireModeByWeaponId((prev) => ({ ...prev, [weaponId]: modeId }))
              }
              onStrikeResolved={setStrikeBanner}
              onSpendAmmo={spendWeaponAmmo}
              onReload={(id) => reloadWeapon(id)}
              onReloadFailed={(id) => reloadWeapon(id)}
              onRequestReloadShake={(id) =>
                setReloadShakeByWeaponId((prev) => ({
                  ...prev,
                  [id]: (prev[id] ?? 0) + 1,
                }))
              }
              summary={
                selectedModern && modernProfile ? (
                  <>
                    {riftedModernNote ? (
                      <p className="mb-0.5 text-[9px] font-semibold opacity-70">
                        {riftedModernNote}
                      </p>
                    ) : null}
                    <SummaryLine
                      label="Aimed"
                      value={formatBonus(
                        modernProfile.strike.total + (modernSingle?.strikeModifier ?? 0),
                      )}
                    />
                    <SummaryLine
                      label="Burst"
                      value={
                        modernBurst
                          ? formatBonus(
                              modernProfile.strike.total + modernBurst.strikeModifier,
                            )
                          : '—'
                      }
                    />
                    <SummaryLine
                      label="Dam"
                      value={formatFireModeDamageLabel(selectedModern, modernSingle)}
                    />
                  </>
                ) : (
                  <>
                    <SummaryLine label="Aimed" value="—" />
                    <SummaryLine label="Burst" value="—" />
                    <SummaryLine label="Dam" value="—" />
                  </>
                )
              }
            />

            <CombatNarrativeLog morphus={morphus} />
          </div>
        ) : null}

        {subTab === 'abilities' ? (
          <CombatAbilitiesTab
            morphus={morphus}
            ppeCurrent={character.ppe.current}
            ppeMax={character.ppe.maximum}
            showIsp={showIsp}
            ispCurrent={form.isp.current}
            ispMax={form.isp.maximum}
          />
        ) : null}
        </div>
      </div>
    </aside>
  )
}
