import { useState } from 'react'
import { AttributeForge } from '../creation/AttributeForge'
import { PsychicGate } from '../creation/PsychicGate'
import { AbilitySelection } from '../creation/AbilitySelection'
import { SkillEngine } from '../creation/SkillEngine'
import { CharacterSpawn } from '../creation/CharacterSpawn'
import { useCharacter } from '../../context/CharacterContext'
import { SkillList } from '../SkillList'

export function MainLayout() {
  const [spawnSplash, setSpawnSplash] = useState(false)
  const {
    character,
    activeForm,
    activeFormState: form,
    activeStats,
    getVitalityType,
    toggleForm,
  } = useCharacter()

  const morphusActive = activeForm === 'morphus'
  const vitalityType = getVitalityType()
  const showCreation = character.isFinalized !== true

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
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
              className="text-sm font-medium"
              style={{ color: morphusActive ? '#a78bfa' : '#334155' }}
            >
              Level {character.level}
              <span className="mx-2 opacity-50" aria-hidden="true">
                ·
              </span>
              <span className="tabular-nums">XP {character.xp.toLocaleString()}</span>
            </p>
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

      <section
        className="border-b-2 px-4 py-3"
        style={{
          borderColor: morphusActive ? '#6d28d9' : '#2563eb',
          backgroundColor: morphusActive ? '#1e1b4b' : '#eff6ff',
        }}
        aria-label="Vitality: hit points, structural damage, and mental pools"
        data-vitality-type={vitalityType}
      >
        <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <VitalityStat
            label="HP"
            current={activeStats.hitPoints.current}
            max={activeStats.hitPoints.maximum}
            scaling={activeStats.hitPoints.scaling}
            morphus={morphusActive}
            accent="hp"
          />
          <VitalityStat
            label="SDC"
            current={activeStats.structuralDamageCapacity.current}
            max={activeStats.structuralDamageCapacity.maximum}
            scaling={activeStats.structuralDamageCapacity.scaling}
            morphus={morphusActive}
            accent="sdc"
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

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 text-left">
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

        <section aria-labelledby="skills-heading">
          <h2
            id="skills-heading"
            className="mb-2 text-sm font-semibold uppercase tracking-wide"
            style={{ color: morphusActive ? '#c4b5fd' : '#1e40af' }}
          >
            Skills
          </h2>
          <SkillList skills={form.skills} morphusActive={morphusActive} />
        </section>

        {showCreation ? (
          <>
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
          <p
            className="rounded-lg border border-emerald-600/40 bg-emerald-950/20 px-4 py-3 text-sm"
            style={{ color: morphusActive ? '#a7f3d0' : '#065f46' }}
          >
            Character record is finalized — creation tools are hidden. Use the header and
            pools for play.
          </p>
        )}
      </main>
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
}: {
  label: string
  current: number
  max: number
  scaling: 'sdc_hp' | 'mdc'
  morphus: boolean
  accent: 'hp' | 'sdc' | 'ppe' | 'isp'
}) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  const isMdc = scaling === 'mdc'
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
