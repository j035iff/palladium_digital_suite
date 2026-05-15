import { useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { AttributeForge } from '../creation/AttributeForge'
import { PsychicGate } from '../creation/PsychicGate'
import { AbilitySelection } from '../creation/AbilitySelection'
import { SkillEngine } from '../creation/SkillEngine'
import { CharacterSpawn } from '../creation/CharacterSpawn'
import { OccSelection } from '../creation/OccSelection'
import { Armory } from '../live/Armory'
import { CombatHUD } from '../live/CombatHUD'
import { IdentityXpBar } from '../live/IdentityXpBar'
import { Inventory } from '../live/Inventory'
import { LevelUpModal } from '../live/LevelUpModal'
import { useCharacter } from '../../context/CharacterContext'
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
    activeForm,
    activeFormState: form,
    activeStats,
    toggleForm,
    vitalityFlash,
    levelUpQueue,
    resolveLevelUpRitual,
  } = useCharacter()

  const morphusActive = activeForm === 'morphus'
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
          </div>

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
            Active form — attributes
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
        </section>

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
            <OccSelection />

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
