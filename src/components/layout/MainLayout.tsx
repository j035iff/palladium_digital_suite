import { useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { AttributeForge } from '../creation/AttributeForge'
import { PsychicGate } from '../creation/PsychicGate'
import { AbilitySelection } from '../creation/AbilitySelection'
import { SkillEngine } from '../creation/SkillEngine'
import { CharacterSpawn } from '../creation/CharacterSpawn'
import { OccSelector } from '../creation/OccSelector'
import { Armory } from '../live/Armory'
import { CombatHUD } from '../live/CombatHUD'
import { IdentityXpBar } from '../live/IdentityXpBar'
import { Inventory } from '../live/Inventory'
import { LevelUpModal } from '../live/LevelUpModal'
import { useCharacter } from '../../context/CharacterContext'
import type { MorphusDerivedSheetSlice } from '../../lib/morphusPassiveBridge'
import {
  formatMorphusDamageAffinityMultiplier,
  GIMMICK_TOY_SWITCH_LOCATION_LABELS,
} from '../../lib/morphusCharacteristicAggregation'
import { PsStrengthPanel } from '../live/PsStrengthPanel'
import { SkillList } from '../SkillList'
import { SavingThrowsPanel } from '../live/SavingThrowsPanel'

const DEFAULT_COMBAT_SIDEBAR_PX = 350
const MIN_COMBAT_SIDEBAR_PX = 300

export function MainLayout() {
  const [spawnSplash, setSpawnSplash] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_COMBAT_SIDEBAR_PX)
  const [isResizing, setIsResizing] = useState(false)
  const {
    character,
    creationGenreId,
    hostGenreId,
    saveCharacter,
    returnToLauncher,
    morphusSurfaceType,
    setMorphusSurfaceType,
    morphusStanceType,
    setMorphusStanceType,
    morphusDerived,
    morphusActiveBurstKeys,
    toggleMorphusBurst,
    morphusActiveGimmickSwitchKeys,
    toggleMorphusGimmickSwitch,
    morphusRelativeArShift,
    morphusNaturalAr,
    activeForm,
    activeFormState: form,
    activeStats,
    supportsDualForm,
    strengthCapacities,
    toggleForm,
    vitalityFlash,
    levelUpQueue,
    resolveLevelUpRitual,
  } = useCharacter()

  const morphusActive = supportsDualForm && activeForm === 'morphus'
  const showCreation = character.isFinalized !== true

  /** Split + fixed-width sidebar only at md+; drives inline width (Tailwind var alone was unreliable). */
  const [splitLayout, setSplitLayout] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => setSplitLayout(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const clamp = () => {
      const maxW = Math.floor(window.innerWidth * 0.5)
      setSidebarWidth((w) =>
        Math.max(MIN_COMBAT_SIDEBAR_PX, Math.min(maxW, w)),
      )
    }
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [])

  const onSidebarResizeStart = (e: ReactMouseEvent) => {
    if (!character.isFinalized) return
    if (e.button !== 0) return
    e.preventDefault()
    const startX = e.clientX
    const startW = sidebarWidth
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const maxSidebarPx = () => Math.floor(window.innerWidth * 0.5)

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const next = startW - dx
      setSidebarWidth(
        Math.max(
          MIN_COMBAT_SIDEBAR_PX,
          Math.min(maxSidebarPx(), Math.round(next)),
        ),
      )
    }

    const onUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

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
      <header
        className="sticky top-0 z-20 border-b-2 px-4 py-3 backdrop-blur-sm"
        style={{
          borderColor: morphusActive ? 'rgb(139 92 246)' : 'rgb(59 130 246)',
          backgroundColor: morphusActive
            ? 'rgba(15, 23, 42, 0.92)'
            : 'rgba(255, 255, 255, 0.92)',
        }}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="text-left">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: morphusActive ? '#c4b5fd' : '#1d4ed8' }}
            >
              Identity
            </p>
            <h1
              className="text-xl font-bold tracking-tight"
              style={{ color: morphusActive ? '#f5f3ff' : '#0f172a' }}
            >
              {character.name}
            </h1>
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: morphusActive ? '#a78bfa' : '#475569' }}
            >
              O.C.C. {character.occ.name}
            </p>
            <p
              className="text-sm font-medium"
              style={{ color: morphusActive ? '#a78bfa' : '#334155' }}
              title={`Progression: ${character.occ.name} Table`}
            >
              Level {character.level}
            </p>
            <IdentityXpBar />
            <p
              className="mt-1 font-mono text-[10px] uppercase tracking-wide opacity-70"
              style={{ color: morphusActive ? '#94a3b8' : '#64748b' }}
            >
              {creationGenreId} → host {hostGenreId}
              {morphusActive && morphusRelativeArShift !== 0
                ? ` · Morphus A.R. ${morphusRelativeArShift >= 0 ? '+' : ''}${morphusRelativeArShift}`
                : ''}
              {morphusActive && morphusNaturalAr != null
                ? ` · natural A.R. ${morphusNaturalAr}`
                : ''}
            </p>
            {morphusActive ? (
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
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveCharacter}
              className={`rounded-lg border-2 px-3 py-2 text-xs font-bold uppercase tracking-wide ${
                morphusActive
                  ? 'border-emerald-500/70 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/60'
                  : 'border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
              }`}
            >
              Save
            </button>
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
        <div className="mx-auto grid w-full max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <VitalityStat
            label="ISP"
            current={form.isp.current}
            max={form.isp.maximum}
            scaling="sdc_hp"
            morphus={morphusActive}
            accent="isp"
          />
        </div>
      </section>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:h-full md:min-h-0 md:flex-row">
        <main className="mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 text-left md:mx-0 md:max-w-none md:pr-2">
        <section aria-labelledby="attrs-heading">
          <h2
            id="attrs-heading"
            className="mb-2 text-sm font-semibold uppercase tracking-wide"
            style={{ color: morphusActive ? '#c4b5fd' : '#1e40af' }}
          >
            {supportsDualForm ? 'Active form — attributes' : 'Attributes'}
          </h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Attr label="I.Q." value={form.attributes.iq} morphus={morphusActive} />
            <Attr label="M.E." value={form.attributes.me} morphus={morphusActive} />
            <Attr label="M.A." value={form.attributes.ma} morphus={morphusActive} />
            <Attr
              label="P.S."
              value={`${form.attributes.ps.score} (${form.attributes.ps.tier})`}
              morphus={morphusActive}
            />
            <Attr label="P.P." value={form.attributes.pp} morphus={morphusActive} />
            <Attr label="P.E." value={form.attributes.pe} morphus={morphusActive} />
            <Attr label="P.B." value={form.attributes.pb} morphus={morphusActive} />
            <Attr label="Spd" value={form.attributes.spd} morphus={morphusActive} />
          </dl>
          <p
            className="mt-2 text-sm"
            style={{ color: morphusActive ? '#a5b4fc' : '#475569' }}
          >
            Alignment: <strong>{form.alignment}</strong>
          </p>
          <div className="mt-3">
            <PsStrengthPanel capacities={strengthCapacities} morphus={morphusActive} />
          </div>
        </section>

        {morphusActive && morphusDerived ? (
          <MorphusTraitsPanel
            derived={morphusDerived}
            activeBurstKeys={morphusActiveBurstKeys}
            onToggleBurst={toggleMorphusBurst}
            activeGimmickSwitchKeys={morphusActiveGimmickSwitchKeys}
            onToggleGimmickSwitch={toggleMorphusGimmickSwitch}
          />
        ) : null}

        <SavingThrowsPanel />

        <section aria-labelledby="skills-heading">
          <h2
            id="skills-heading"
            className="mb-2 text-sm font-semibold uppercase tracking-wide"
            style={{ color: morphusActive ? '#c4b5fd' : '#1e40af' }}
          >
            Skills
          </h2>
          <SkillList
            skills={form.skills}
            morphusActive={morphusActive}
            characterLevel={character.level}
            iq={form.attributes.iq}
          />
        </section>

        {showCreation ? (
          <>
            <OccSelector />

            <AttributeForge />

            <PsychicGate />

            <SkillEngine />

            <AbilitySelection />

            <CharacterSpawn
              runFinalize={(finalize) => {
                setSpawnSplash(true)
                window.setTimeout(() => {
                  finalize()
                  setSpawnSplash(false)
                }, 1500)
              }}
            />
          </>
        ) : (
          <>
            <p
              className="rounded-lg border border-emerald-600/40 bg-emerald-950/20 px-4 py-3 text-sm"
              style={{ color: morphusActive ? '#a7f3d0' : '#065f46' }}
            >
              Character record is finalized — creation tools are hidden. Use the header and
              pools for play.
            </p>
            <Armory />
            <Inventory />
          </>
        )}
        </main>

        {character.isFinalized ? (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize combat HUD sidebar"
              title="Drag left or right to resize panels"
              aria-valuemin={MIN_COMBAT_SIDEBAR_PX}
              aria-valuetext={`${Math.round(sidebarWidth)} pixels wide (min ${MIN_COMBAT_SIDEBAR_PX}, max half of viewport)`}
              aria-valuenow={Math.round(sidebarWidth)}
              className={`group relative z-[60] hidden h-full min-h-0 w-3 shrink-0 cursor-col-resize flex-col items-center justify-center border-x border-slate-400/70 bg-slate-200/90 shadow-inner select-none touch-none dark:border-slate-500 dark:bg-slate-700/85 md:flex md:w-4 md:self-stretch ${
                isResizing
                  ? morphusActive
                    ? 'border-violet-400/90 bg-violet-900/40 ring-2 ring-violet-400/60'
                    : 'border-blue-500/90 bg-blue-100/90 ring-2 ring-blue-500/50 dark:bg-blue-950/50'
                  : ''
              }`}
              onMouseDown={onSidebarResizeStart}
            >
              <span
                className="pointer-events-none select-none px-0.5 font-mono text-sm font-bold leading-none text-slate-600 tabular-nums dark:text-slate-200"
                aria-hidden
              >
                ⋮
              </span>
              <div
                className={`pointer-events-none mt-1 h-px w-2/3 max-w-[14px] shrink-0 rounded-full transition-[background-color,box-shadow] duration-150 ${
                  morphusActive
                    ? isResizing
                      ? 'bg-violet-300 shadow-[0_0_10px_rgba(167,139,250,0.9)]'
                      : 'bg-violet-500/70 group-hover:bg-violet-300'
                    : isResizing
                      ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.75)]'
                      : 'bg-blue-600/70 group-hover:bg-blue-500'
                }`}
              />
            </div>
            <div
              className="flex w-full shrink-0 flex-col md:h-full md:min-h-0 md:max-w-[50vw] md:flex-none md:overflow-hidden md:self-stretch"
              style={
                (splitLayout
                  ? {
                      width: sidebarWidth,
                      minWidth: MIN_COMBAT_SIDEBAR_PX,
                      maxWidth: '50vw',
                      flexShrink: 0,
                    }
                  : { width: '100%' }) as CSSProperties
              }
            >
              <CombatHUD />
            </div>
          </>
        ) : null}
      </div>
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

const WEAPON_TRAIT_LABELS: Record<string, string> = {
  indestructible: 'Indestructible',
  disarm_immune: 'Disarm immune',
  infinite_ammo: 'Infinite ammo',
  auto_returning: 'Auto-returning',
}

const SENSORY_OBFUSCATION_LABELS: Record<string, string> = {
  digital_photo_blur: 'Digital photo blur',
  video_distortion: 'Video distortion',
  biometric_scrambling: 'Biometric scrambling',
  scent_masking: 'Scent masking',
}

const BURROW_SUBSTRATE_LABELS: Record<string, string> = {
  soil_dirt: 'Soil / dirt',
  solid_rock: 'Solid rock',
  concrete: 'Concrete',
}

const GIMMICK_FLAG_LABELS: Record<string, string> = {
  infinite_ammo: 'Infinite uses',
  fragile: 'Fragile',
  auto_returning: 'Auto-returning',
}

const REGEN_LABELS: Record<string, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  per_24_hours: 'Every 24 hours',
  per_transformation: 'Per transformation',
  per_encounter: 'Per encounter',
}

function MorphusTraitsPanel({
  derived,
  activeBurstKeys,
  onToggleBurst,
  activeGimmickSwitchKeys,
  onToggleGimmickSwitch,
}: {
  derived: MorphusDerivedSheetSlice
  activeBurstKeys: readonly string[]
  onToggleBurst: (burstKey: string) => void
  activeGimmickSwitchKeys: readonly string[]
  onToggleGimmickSwitch: (switchKey: string) => void
}) {
  const hasWeapons = derived.naturalWeapons.length > 0
  const hasCompanions = derived.companions.length > 0
  const hasNotes = derived.traitNotes.length > 0
  const hasTraits = derived.weaponTraits.length > 0
  const hasRolls = derived.customSystemRolls.length > 0
  const hasBurrow = derived.burrowingEngine != null
  const hasObfuscation = derived.externalSensoryObfuscation.length > 0
  const hasPoly = derived.polymorphicTemplates.length > 0
  const hasGimmicks = derived.gimmickInventory.length > 0
  const hasDisabled =
    derived.disabledNaturalAttackTags.length > 0
  const hasVarScale = derived.variableScaleNotes.length > 0
  const jump = derived.jumpBonuses
  const hasJump =
    jump.standingHeight > 0 ||
    jump.standingDistance > 0 ||
    jump.runningHeight > 0 ||
    jump.runningDistance > 0
  const hasSwim = derived.swimSpeedBonus !== 0
  const hasAffinity = derived.damageAffinityNotes.length > 0
  const hasLimbs = derived.limbComponents.length > 0
  const hasBursts = derived.activatedAbilities.length > 0
  const hasGimmickSwitches = derived.gimmickToySwitches.length > 0
  const hasIntercepts = derived.combatInterceptions.length > 0
  const hasNv = derived.nightvisionRangeFlatBonus > 0
  const flight = derived.flightEngine
  const hasFlight =
    flight != null &&
    (flight.maxSpeedMph > 0 ||
      flight.maxAltitudeFeet != null ||
      flight.strikeBonus !== 0 ||
      flight.parryBonus !== 0 ||
      flight.dodgeBonus !== 0)
  const hasTelescopic = derived.sensoryFlags.telescopicVision
  const hasSeeInvisible = derived.sensoryFlags.seeInvisible
  if (
    !hasWeapons &&
    !hasCompanions &&
    !hasNotes &&
    !hasTraits &&
    !hasRolls &&
    !hasBurrow &&
    !hasObfuscation &&
    !hasPoly &&
    !hasGimmicks &&
    !hasDisabled &&
    !hasVarScale &&
    !hasJump &&
    !hasSwim &&
    !hasAffinity &&
    !hasLimbs &&
    !hasBursts &&
    !hasGimmickSwitches &&
    !hasIntercepts &&
    !hasNv &&
    !hasFlight &&
    !hasTelescopic &&
    !hasSeeInvisible
  ) {
    return null
  }

  return (
    <section
      aria-labelledby="morphus-traits-heading"
      className="rounded-lg border border-violet-800/60 bg-violet-950/30 px-4 py-3"
    >
      <h2
        id="morphus-traits-heading"
        className="mb-2 text-sm font-semibold uppercase tracking-wide text-violet-300"
      >
        Morphus traits (aggregated)
      </h2>
      {hasPoly ? (
        <p className="mb-2 text-xs font-semibold text-amber-200/95">
          Polymorphic template:{' '}
          {derived.polymorphicTemplates.map((p) => p.traitName).join(' · ')}
        </p>
      ) : null}
      {hasBurrow && derived.burrowingEngine ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Burrow {derived.burrowingEngine.feetPerMeleeRound} ft/melee on{' '}
          {derived.burrowingEngine.allowedSubstrates
            .map((s) => BURROW_SUBSTRATE_LABELS[s] ?? s)
            .join(', ')}
        </p>
      ) : null}
      {hasObfuscation ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Identity shield:{' '}
          {derived.externalSensoryObfuscation
            .map((o) => SENSORY_OBFUSCATION_LABELS[o] ?? o)
            .join(' · ')}
        </p>
      ) : null}
      {hasRolls ? (
        <ul className="mb-2 list-inside list-disc text-sm text-violet-100/95">
          {derived.customSystemRolls.map((r, i) => (
            <li key={`${r.sourceTraitId}-${r.rollName}-${i}`}>
              <span className="font-medium">{r.rollName}</span>
              {' — '}
              {r.resolvedChance}% at level
              <span className="text-violet-400/80"> ({r.sourceTraitName})</span>
            </li>
          ))}
        </ul>
      ) : null}
      {hasDisabled ? (
        <p className="mb-2 text-xs text-rose-200/90">
          Disabled natural attacks:{' '}
          {derived.disabledNaturalAttackTags.join(', ')}
        </p>
      ) : null}
      {hasVarScale ? (
        <ul className="mb-2 list-inside list-disc text-xs text-violet-200/85">
          {derived.variableScaleNotes.map((n) => (
            <li key={`${n.traitId}-${n.statKey}`}>
              <span className="font-medium">{n.traitName}</span> ({n.statKey}):{' '}
              {n.conditions.join(' · ')}
            </li>
          ))}
        </ul>
      ) : null}
      {hasJump ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Jump +{jump.standingHeight} ft height / +{jump.standingDistance} ft distance
          {jump.runningHeight > 0 || jump.runningDistance > 0
            ? ` (run +${jump.runningHeight}/+${jump.runningDistance})`
            : ''}
        </p>
      ) : null}
      {hasSwim ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Swim speed bonus: +{derived.swimSpeedBonus}
        </p>
      ) : null}
      {hasNv ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Nightvision +{derived.nightvisionRangeFlatBonus} ft (Morphus)
        </p>
      ) : null}
      {hasTelescopic ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Telescopic vision (Morphus)
        </p>
      ) : null}
      {hasSeeInvisible ? (
        <p className="mb-2 text-xs text-violet-200/90">
          See invisible (Morphus)
        </p>
      ) : null}
      {hasFlight && flight ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Flight
          {flight.maxSpeedMph > 0 ? ` up to ${flight.maxSpeedMph} mph` : ''}
          {flight.maxAltitudeFeet != null
            ? ` · max altitude ${flight.maxAltitudeFeet} ft`
            : ''}
          {flight.strikeBonus !== 0 ||
          flight.parryBonus !== 0 ||
          flight.dodgeBonus !== 0
            ? ` · in-flight combat +${[
                flight.strikeBonus ? `strike ${flight.strikeBonus}` : '',
                flight.parryBonus ? `parry ${flight.parryBonus}` : '',
                flight.dodgeBonus ? `dodge ${flight.dodgeBonus}` : '',
              ]
                .filter(Boolean)
                .join(', ')}`
            : ''}
        </p>
      ) : null}
      {hasAffinity ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Damage affinities:{' '}
          {derived.damageAffinityNotes
            .map((a) => `${a.label} (${formatMorphusDamageAffinityMultiplier(a.multiplier)})`)
            .join(' · ')}
        </p>
      ) : null}
      {hasLimbs ? (
        <ul className="mb-2 space-y-1 text-sm text-violet-100/95">
          {derived.limbComponents.map((limb, i) => (
            <li
              key={`${limb.sourceTraitId}-${limb.limbName}-${i}`}
              className="rounded border border-violet-700/40 bg-slate-950/30 px-2 py-1"
            >
              <span className="font-medium">{limb.limbName}</span>
              {' — '}
              S.D.C. {limb.sdc}
              {limb.ar != null ? ` · A.R. ${limb.ar}` : ''}
              {limb.calledShotPenalty != null
                ? ` · called shot ${limb.calledShotPenalty}`
                : ''}
              {limb.destructionConditionOverrides ? (
                <span className="text-xs text-amber-200/80">
                  {' '}
                  · on destroy: spd/other overrides apply
                </span>
              ) : null}
              <span className="text-violet-400/80"> ({limb.sourceTraitName})</span>
            </li>
          ))}
        </ul>
      ) : null}
      {hasGimmickSwitches ? (
        <div className="mb-2 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
            Gimmick toy switches
          </p>
          <p className="text-[10px] text-violet-300/70">
            Toggle effects while active (one switch press). Preset rows are catalog
            options until assigned at creation.
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-violet-100/95">
            {derived.gimmickToySwitches.map((sw) => {
              const on = activeGimmickSwitchKeys.includes(sw.switchKey)
              const loc =
                sw.bodyLocation != null
                  ? GIMMICK_TOY_SWITCH_LOCATION_LABELS[sw.bodyLocation]
                  : null
              const detail = [
                sw.effect.durationFormula,
                sw.effect.durationMeleeRounds != null
                  ? `${sw.effect.durationMeleeRounds} melee round(s)`
                  : null,
                sw.effect.damageFormula
                  ? `dmg ${sw.effect.damageFormula}`
                  : null,
                sw.effect.strikeBonus != null ? `strike +${sw.effect.strikeBonus}` : null,
                sw.effect.dodgeBonus != null ? `dodge +${sw.effect.dodgeBonus}` : null,
                sw.effect.rangeFeet != null ? `${sw.effect.rangeFeet} ft` : null,
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <li
                  key={sw.switchKey}
                  className="flex flex-wrap items-center gap-2 rounded border border-violet-700/50 bg-slate-950/40 px-2 py-1"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onToggleGimmickSwitch(sw.switchKey)}
                      className="mt-0.5 accent-violet-500"
                    />
                    <span className="min-w-0">
                      <span className="font-medium">{sw.label}</span>
                      {loc ? (
                        <span className="text-violet-300/80"> — {loc}</span>
                      ) : null}
                      {sw.isPresetCatalog ? (
                        <span className="text-amber-200/80 text-xs"> (preset)</span>
                      ) : null}
                      {detail ? (
                        <span className="block text-xs text-violet-300/80">{detail}</span>
                      ) : null}
                      {sw.effect.notes ? (
                        <span className="block text-xs text-violet-400/75">
                          {sw.effect.notes}
                        </span>
                      ) : null}
                    </span>
                  </label>
                  <span className="shrink-0 text-violet-400/80 text-xs">
                    ({sw.sourceTraitName})
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      {hasBursts ? (
        <div className="mb-2 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
            Activated abilities
          </p>
          <ul className="space-y-1 text-sm text-violet-100/95">
            {derived.activatedAbilities.map((ab) => {
              const on = activeBurstKeys.includes(ab.burstKey)
              return (
                <li
                  key={ab.burstKey}
                  className="flex flex-wrap items-center gap-2 rounded border border-violet-700/50 bg-slate-950/40 px-2 py-1"
                >
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onToggleBurst(ab.burstKey)}
                      className="accent-violet-500"
                    />
                    <span className="font-medium">{ab.abilityName}</span>
                  </label>
                  <span className="text-xs text-violet-300/80">
                    {ab.chargesPerPeriod === 0
                      ? 'Unlimited'
                      : `${ab.chargesPerPeriod}/${REGEN_LABELS[ab.resetPeriod] ?? ab.resetPeriod}`}
                    {' · '}
                    {ab.durationFormula}
                  </span>
                  <span className="text-violet-400/80 text-xs">
                    ({ab.sourceTraitName})
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      {hasIntercepts ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Combat intercepts:{' '}
          {derived.combatInterceptions
            .map(
              (r) =>
                `${r.label} ${r.modifierFlat >= 0 ? '+' : ''}${r.modifierFlat}`,
            )
            .join(' · ')}
        </p>
      ) : null}
      {hasGimmicks ? (
        <ul className="mb-2 space-y-1.5 text-sm text-violet-100/95">
          {derived.gimmickInventory.map((g, i) => (
            <li
              key={`${g.sourceTraitId}-${g.itemName}-${i}`}
              className="rounded border border-violet-700/40 bg-slate-950/30 px-2 py-1"
            >
              <span className="font-medium">{g.itemName}</span>
              {' — '}
              S.D.C. {g.sdc}
              {g.usageLimit != null ? ` · ${g.usageLimit} uses` : ''}
              {g.usageLimitFormula != null
                ? ` · ${g.usageLimitFormula} uses`
                : ''}
              {g.regenerationRule
                ? ` · ${REGEN_LABELS[g.regenerationRule] ?? g.regenerationRule}`
                : ''}
              {(g.components?.length ?? 0) > 0
                ? ` · ${g.components!.map((c) => `${c.quantity}× ${c.limbName} ${c.sdc} S.D.C.`).join(', ')}`
                : ''}
              <br />
              <span className="text-xs text-violet-300/80">{g.effectFormula}</span>
              {(g.traitFlags?.length ?? 0) > 0 ? (
                <span className="text-xs text-violet-400/70">
                  {' '}
                  ·{' '}
                  {g.traitFlags!
                    .map((f) => GIMMICK_FLAG_LABELS[f] ?? f)
                    .join(' · ')}
                </span>
              ) : null}
              <span className="text-violet-400/80"> ({g.sourceTraitName})</span>
            </li>
          ))}
        </ul>
      ) : null}
      {hasTraits ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Weapon flags:{' '}
          {derived.weaponTraits
            .map((t) => WEAPON_TRAIT_LABELS[t] ?? t)
            .join(' · ')}
        </p>
      ) : null}
      {hasWeapons ? (
        <ul className="mb-2 list-inside list-disc text-sm text-violet-100/95">
          {derived.naturalWeapons.map((w, i) => (
            <li
              key={`${w.sourceTraitId}-${i}`}
              className={w.isLimbTypeDisabled ? 'opacity-60 line-through' : undefined}
            >
              <span className="font-medium">{w.label ?? w.limbType}</span>
              {' — '}
              {w.displayDamage}
              {w.isAdditiveToHth ? ' (+ HtH)' : ''}
              {w.isLimbTypeDisabled ? ' [disabled]' : ''}
              <span className="text-violet-400/80"> ({w.sourceTraitName})</span>
            </li>
          ))}
        </ul>
      ) : null}
      {hasCompanions ? (
        <div className="mb-2 space-y-2 text-sm text-violet-100/95">
          {derived.companions.map((c) => (
            <div
              key={c.sourceTraitId}
              className="rounded border border-violet-700/50 bg-slate-950/40 px-2 py-1.5"
            >
              <p className="font-medium text-violet-200">{c.entityName}</p>
              <p className="text-xs text-violet-400/90">
                Pool: {c.poolSharingRule.replace(/_/g, ' ')} · from {c.sourceTraitName}
              </p>
              {Object.keys(c.attributeDeltas).length > 0 ? (
                <p className="mt-1 font-mono text-xs">
                  {Object.entries(c.attributeDeltas)
                    .filter(([, v]) => v != null && v !== 0)
                    .map(([k, v]) => `${k} ${v! >= 0 ? '+' : ''}${v}`)
                    .join(' · ')}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {hasNotes ? (
        <details className="text-xs text-violet-300/80">
          <summary className="cursor-pointer font-semibold uppercase tracking-wide">
            Rules text ({derived.traitNotes.length} traits)
          </summary>
          <ul className="mt-2 space-y-2">
            {derived.traitNotes.map((n) => (
              <li key={n.traitId}>
                <span className="font-medium text-violet-200">{n.traitName}</span>
                <ul className="ml-4 list-disc">
                  {n.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}

function Attr({
  label,
  value,
  morphus,
}: {
  label: string
  value: string | number
  morphus: boolean
}) {
  return (
    <div
      className="rounded border px-2 py-1.5"
      style={{
        borderColor: morphus ? '#4c1d95' : '#bfdbfe',
        backgroundColor: morphus ? '#1e1b4b' : '#f8fafc',
      }}
    >
      <dt
        className="text-[10px] font-bold uppercase tracking-wide"
        style={{ color: morphus ? '#c4b5fd' : '#2563eb' }}
      >
        {label}
      </dt>
      <dd
        className="font-mono text-sm font-semibold tabular-nums"
        style={{ color: morphus ? '#f5f3ff' : '#0f172a' }}
      >
        {value}
      </dd>
    </div>
  )
}
