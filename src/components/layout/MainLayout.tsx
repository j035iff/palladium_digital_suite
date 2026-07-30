import { useMemo, useState } from 'react'
import { CreationFlowShell } from '../creation/CreationFlowShell'
import { IdentityXpBar } from '../live/IdentityXpBar'
import { LevelUpModal } from '../live/LevelUpModal'
import { LiveSheetTabBody } from '../live/LiveSheetTabBody'
import { useCharacter } from '../../context/CharacterContext'
import { getIqBonuses } from '../../lib/attributeBonuses'
import {
  buildLiveSheetTabViews,
  isLiveSheetTabId,
  LIVE_SHEET_TAB_TITLES,
  type LiveSheetTabId,
} from '../../lib/liveSheetTabs'
import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import { IdentityHeader } from './IdentityHeader'

export function MainLayout() {
  const [spawnSplash, setSpawnSplash] = useState(false)
  /** Default collapsed so the Active Zone has room under the sticky core. */
  const [identityCollapsed, setIdentityCollapsed] = useState(true)
  const [sheetTabId, setSheetTabId] = useState<LiveSheetTabId>('stats')
  const {
    character,
    creationGenreId,
    hostGenreId,
    returnToLauncher,
    morphusSurfaceType,
    setMorphusSurfaceType,
    morphusStanceType,
    setMorphusStanceType,
    morphusDerived,
    morphusRelativeArShift,
    morphusNaturalAr,
    activeForm,
    activeFormState: form,
    activeStats,
    supportsDualForm,
    toggleForm,
    vitalityFlash,
    levelUpQueue,
    resolveLevelUpRitual,
    equippedArmor,
    saveProfileDerived,
    psychicTier,
  } = useCharacter()

  const morphusActive = supportsDualForm && activeForm === 'morphus'
  const showCreation = character.isFinalized !== true
  const showIsp = psychicTier !== 'none' || form.isp.maximum > 0

  const sheetTabs = useMemo(
    () => buildLiveSheetTabViews(sheetTabId),
    [sheetTabId],
  )

  const perceptionBonus = getIqBonuses(form.attributes.iq).perceptionBonus
  const armorAr = equippedArmor && equippedArmor.currentSdc > 0 ? equippedArmor.ar : null
  const defenseAr = armorAr ?? morphusNaturalAr ?? null
  const horrorFactor = saveProfileDerived.horrorFactor.total

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {spawnSplash ? (
        <div
          className="pds-spawn-splash fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 px-6 text-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="spawn-splash-title"
        >
          <p
            id="spawn-splash-title"
            className="text-3xl font-black tracking-tight text-amber-200 drop-shadow-lg sm:text-4xl"
          >
            Character Spawned!
          </p>
          <p className="mt-4 max-w-md text-sm text-slate-200">
            Record locked — loading live sheet.
          </p>
        </div>
      ) : null}
      {!showCreation ? (
        <div
          className="sticky top-0 z-20 shrink-0 backdrop-blur-sm"
          aria-label="Persistent character core"
        >
          <header
            className="border-b-2 px-4 py-3"
            style={{
              borderColor: morphusActive ? 'rgb(139 92 246)' : 'rgb(59 130 246)',
              backgroundColor: morphusActive
                ? 'rgba(15, 23, 42, 0.92)'
                : 'rgba(255, 255, 255, 0.92)',
            }}
          >
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 text-left">
                <IdentityHeader
                  morphusActive={morphusActive}
                  creationGenreId={creationGenreId}
                  hostGenreId={hostGenreId}
                  collapsed={identityCollapsed}
                  onCollapsedChange={setIdentityCollapsed}
                />
                {!identityCollapsed ? (
                  <div className="mt-2">
                    <p
                      className="text-sm font-medium"
                      style={{ color: morphusActive ? '#a78bfa' : '#334155' }}
                      title={`Progression: ${character.occ.name} Table`}
                    >
                      Level {character.level}
                    </p>
                    <IdentityXpBar />
                  </div>
                ) : null}
                {!identityCollapsed && morphusActive ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
                      Surface
                      <select
                        value={morphusSurfaceType}
                        onChange={(e) =>
                          setMorphusSurfaceType(
                            e.target.value as 'hard_flat' | 'rough_uneven' | 'soft_fluid',
                          )
                        }
                        className="rounded border border-violet-700 bg-slate-950 px-2 py-0.5 font-mono normal-case text-violet-100"
                      >
                        <option value="hard_flat">Hard / flat</option>
                        <option value="rough_uneven">Rough / uneven</option>
                        <option value="soft_fluid">Soft / fluid</option>
                      </select>
                    </label>
                    {(morphusDerived?.availableStanceTypes.length ?? 0) > 0 ? (
                      <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
                        Stance
                        <select
                          value={morphusStanceType}
                          onChange={(e) =>
                            setMorphusStanceType(
                              e.target.value as typeof morphusStanceType,
                            )
                          }
                          className="rounded border border-violet-700 bg-slate-950 px-2 py-0.5 font-mono normal-case text-violet-100"
                        >
                          {(morphusDerived?.availableStanceTypes ?? []).map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                ) : null}
                {!identityCollapsed &&
                morphusActive &&
                (morphusRelativeArShift !== 0 || morphusNaturalAr != null) ? (
                  <p
                    className="mt-1 font-mono text-[10px] uppercase tracking-wide opacity-70"
                    style={{ color: '#94a3b8' }}
                  >
                    {morphusRelativeArShift !== 0
                      ? `Morphus A.R. ${morphusRelativeArShift >= 0 ? '+' : ''}${morphusRelativeArShift}`
                      : ''}
                    {morphusRelativeArShift !== 0 && morphusNaturalAr != null
                      ? ' · '
                      : ''}
                    {morphusNaturalAr != null ? `natural A.R. ${morphusNaturalAr}` : ''}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={returnToLauncher}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-bold uppercase tracking-wide ${
                    morphusActive
                      ? 'border-slate-600 bg-slate-900/80 text-slate-300 hover:border-slate-400'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  Portal
                </button>
                {supportsDualForm ? (
                  <button
                    type="button"
                    onClick={toggleForm}
                    className="shrink-0 rounded-lg border-4 px-4 py-2 text-sm font-bold uppercase tracking-wide shadow-lg outline-none ring-offset-2 focus-visible:ring-4"
                    style={{
                      borderColor: morphusActive ? '#fbbf24' : '#0f172a',
                      backgroundColor: morphusActive ? '#4c1d95' : '#eff6ff',
                      color: morphusActive ? '#fef9c3' : '#0f172a',
                      ...(morphusActive
                        ? { boxShadow: '0 0 0 2px #7c3aed' }
                        : { boxShadow: '0 0 0 2px #3b82f6' }),
                    }}
                    aria-pressed={morphusActive}
                    aria-label={
                      morphusActive
                        ? 'Become Facade: switch to human presentation'
                        : 'Become Morphus: switch to morphus form'
                    }
                  >
                    Become {morphusActive ? 'Facade' : 'Morphus'}
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          {identityCollapsed ? (
            <section
              className={`border-b-2 px-4 py-2 ${
                vitalityFlash === 'damage'
                  ? 'pds-vitality-flash-damage'
                  : vitalityFlash === 'heal'
                    ? 'pds-vitality-flash-heal'
                    : ''
              }`}
              style={{
                borderColor: morphusActive ? '#6d28d9' : '#2563eb',
                backgroundColor: morphusActive ? '#1e1b4b' : '#eff6ff',
              }}
              aria-label="Vitality summary"
            >
              <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs font-bold tabular-nums">
                <span title="Hit Points">
                  HP {activeStats.hitPoints.current}/{activeStats.hitPoints.maximum}
                </span>
                <span title="Structural Damage Capacity">
                  SDC {activeStats.structuralDamageCapacity.current}/
                  {activeStats.structuralDamageCapacity.maximum}
                </span>
                <span title="P.P.E.">
                  PPE {character.ppe.current}/{character.ppe.maximum}
                </span>
                {showIsp ? (
                  <span title="I.S.P.">
                    ISP {form.isp.current}/{form.isp.maximum}
                  </span>
                ) : null}
                <span className="opacity-80" title="Armor Rating">
                  A.R. {defenseAr != null ? defenseAr : '—'}
                </span>
                <span className="opacity-80" title="Horror Factor">
                  H.F. {horrorFactor != null ? horrorFactor : 'N/A'}
                </span>
                <span className="ml-auto opacity-70">Lv {character.level}</span>
              </div>
            </section>
          ) : (
            <section
              className={`border-b-2 px-4 py-3 transition-[box-shadow,background-color] duration-300 ${
                vitalityFlash === 'damage'
                  ? 'pds-vitality-flash-damage'
                  : vitalityFlash === 'heal'
                    ? 'pds-vitality-flash-heal'
                    : ''
              }`}
              style={{
                borderColor: morphusActive ? '#6d28d9' : '#2563eb',
                backgroundColor: morphusActive ? '#1e1b4b' : '#eff6ff',
              }}
              aria-label="Vitality: hit points, structural damage, and mental pools"
              data-vitality-presentation="sdc"
            >
              <div
                className={`mx-auto grid w-full max-w-6xl gap-3 sm:grid-cols-2 ${
                  showIsp ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
                }`}
              >
                <VitalityStat
                  label="HP"
                  current={activeStats.hitPoints.current}
                  max={activeStats.hitPoints.maximum}
                  scaling={activeStats.hitPoints.scaling}
                  morphus={morphusActive}
                  accent="hp"
                  sdcPresentation
                />
                <VitalityStat
                  label="SDC"
                  current={activeStats.structuralDamageCapacity.current}
                  max={activeStats.structuralDamageCapacity.maximum}
                  scaling={activeStats.structuralDamageCapacity.scaling}
                  morphus={morphusActive}
                  accent="sdc"
                  sdcPresentation
                />
                <VitalityStat
                  label="PPE"
                  current={character.ppe.current}
                  max={character.ppe.maximum}
                  scaling="sdc_hp"
                  morphus={morphusActive}
                  accent="ppe"
                />
                {showIsp ? (
                  <VitalityStat
                    label="ISP"
                    current={form.isp.current}
                    max={form.isp.maximum}
                    scaling="sdc_hp"
                    morphus={morphusActive}
                    accent="isp"
                  />
                ) : null}
              </div>
              <div
                className="mx-auto mt-3 flex w-full max-w-6xl flex-wrap gap-2"
                aria-label="Defensive stats"
              >
                <DefenseChip
                  label="A.R."
                  value={defenseAr != null ? String(defenseAr) : '—'}
                  detail={
                    armorAr != null
                      ? 'Equipped armor'
                      : morphusNaturalAr != null
                        ? 'Natural / Morphus'
                        : 'No armor rating'
                  }
                  morphus={morphusActive}
                />
                <DefenseChip
                  label="H.F."
                  value={horrorFactor != null ? String(horrorFactor) : 'N/A'}
                  detail={saveProfileDerived.horrorFactor.tooltipEquation}
                  morphus={morphusActive}
                />
                <DefenseChip
                  label="Perception"
                  value={perceptionBonus > 0 ? `+${perceptionBonus}` : '—'}
                  detail="I.Q. perception bonus"
                  morphus={morphusActive}
                />
              </div>
            </section>
          )}

          <div
            className={`border-b-2 px-4 py-2 ${
              morphusActive
                ? 'border-violet-700/80 bg-slate-950/95'
                : 'border-blue-200 bg-white/95'
            }`}
            aria-label="Live sheet tabs"
          >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-1.5">
              <ForgeNavigationBar
                tabs={sheetTabs}
                activeTabId={sheetTabId}
                singleRow
                onSelectTab={(id) => {
                  if (isLiveSheetTabId(id)) setSheetTabId(id)
                }}
              />
              <p
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  morphusActive ? 'text-violet-300/90' : 'text-slate-600'
                }`}
              >
                {LIVE_SHEET_TAB_TITLES[sheetTabId]}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {character.isFinalized && levelUpQueue.length > 0 && character.occ?.xpTable?.floors?.length ? (
        <LevelUpModal
          key={levelUpQueue[0]}
          open
          morphus={morphusActive}
          character={character}
          targetLevel={levelUpQueue[0]}
          onConfirm={resolveLevelUpRitual}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {showCreation ? (
          <main className="mx-0 flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col overflow-hidden p-0 text-left">
            <CreationFlowShell
              onSpawnFinalize={(finalize) => {
                setSpawnSplash(true)
                window.setTimeout(() => {
                  finalize()
                  setSpawnSplash(false)
                }, 1500)
              }}
            />
          </main>
        ) : (
          <main className="mx-auto flex min-h-0 w-full max-w-6xl min-w-0 flex-1 flex-col overflow-y-auto px-4 py-4 text-left">
            <LiveSheetTabBody tabId={sheetTabId} />
          </main>
        )}
      </div>
    </div>
  )
}

function DefenseChip({
  label,
  value,
  detail,
  morphus,
}: {
  label: string
  value: string
  detail: string
  morphus: boolean
}) {
  return (
    <div
      className={`rounded-md border-2 px-3 py-1.5 ${
        morphus
          ? 'border-violet-600/80 bg-slate-950/80 text-violet-50'
          : 'border-blue-400/80 bg-white text-slate-900'
      }`}
      title={detail}
    >
      <p
        className={`text-[9px] font-black uppercase tracking-wide ${
          morphus ? 'text-violet-300' : 'text-blue-800'
        }`}
      >
        {label}
      </p>
      <p className="font-mono text-sm font-black tabular-nums">{value}</p>
    </div>
  )
}

function VitalityStat({
  label,
  current,
  max,
  scaling,
  morphus,
  accent,
  sdcPresentation,
}: {
  label: string
  current: number
  max: number
  scaling: 'sdc_hp' | 'mdc'
  morphus: boolean
  accent: 'hp' | 'sdc' | 'ppe' | 'isp'
  /** When true, hide Mega-Damage chrome — default S.D.C.-first app shell. */
  sdcPresentation?: boolean
}) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  const isMdc = sdcPresentation ? false : scaling === 'mdc'
  const barBg = morphus ? 'rgba(30,27,75,0.8)' : 'rgba(219,234,254,0.9)'
  const fill =
    isMdc && accent !== 'ppe' && accent !== 'isp'
      ? 'linear-gradient(90deg,#fbbf24,#f59e0b)'
      : accent === 'hp'
        ? morphus
          ? 'linear-gradient(90deg,#f87171,#991b1b)'
          : 'linear-gradient(90deg,#60a5fa,#1d4ed8)'
        : morphus
          ? 'linear-gradient(90deg,#a78bfa,#5b21b6)'
          : 'linear-gradient(90deg,#38bdf8,#1d4ed8)'

  return (
    <div
      className="rounded-md border-2 p-3"
      style={{
        borderColor: isMdc ? '#fbbf24' : morphus ? '#6d28d9' : '#3b82f6',
        backgroundColor: morphus ? '#0f172a' : '#ffffff',
      }}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: morphus ? '#e9d5ff' : '#0f172a' }}
        >
          {label}
        </span>
        {isMdc ? (
          <span
            className="rounded px-1 text-[10px] font-bold uppercase text-black"
            style={{ backgroundColor: '#fbbf24' }}
          >
            MDC
          </span>
        ) : (
          <span
            className="text-[10px] font-semibold uppercase"
            style={{ color: morphus ? '#94a3b8' : '#64748b' }}
          >
            SDC / HP
          </span>
        )}
      </div>
      <p
        className="mb-2 font-mono text-lg font-bold tabular-nums"
        style={{ color: morphus ? '#f8fafc' : '#0f172a' }}
      >
        {current}
        <span style={{ opacity: 0.6 }}> / </span>
        {max}
      </p>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: barBg }}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
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

