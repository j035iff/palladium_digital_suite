import { useCallback, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { getAbilityById } from '../../data/abilityLibrary'
import { getSkillById } from '../../data/skillLibrary'
import { assessCreationSpawnBlockers } from '../../lib/creationReadiness'
import {
  rollFacadeHpMaximum,
  rollFacadeSdcMaximum,
  rollIspMaximum,
  rollMorphusHpMaximum,
  rollMorphusSdcMaximum,
  rollPpeMaximum,
  type SpawnVitalityRolls,
} from '../../lib/spawnFinalVitality'

function tierLabel(t: string): string {
  if (t === 'none') return 'None'
  if (t === 'minor') return 'Minor'
  if (t === 'major') return 'Major'
  if (t === 'master') return 'Master'
  return t
}

function attrLine(
  label: string,
  attrs: {
    iq: number
    me: number
    ma: number
    pp: number
    pe: number
    pb: number
    spd: number
    ps: { score: number; tier: string }
  },
): string {
  return `${label}: I.Q.${attrs.iq} M.E.${attrs.me} M.A.${attrs.ma} P.S.${attrs.ps.score} (${attrs.ps.tier}) P.P.${attrs.pp} P.E.${attrs.pe} P.B.${attrs.pb} Spd${attrs.spd}`
}

export function CharacterSpawn({
  runFinalize,
}: {
  /** Show transition UI, then call the provided finalize (locks record). */
  runFinalize: (finalize: () => void) => void
}) {
  const {
    character,
    activeForm,
    psychicTier,
    commitSpawnVitalityRolls,
    finalizeCharacter,
  } = useCharacter()

  const morphus = activeForm === 'morphus'
  const [rolls, setRolls] = useState<SpawnVitalityRolls | null>(null)

  const blockers = useMemo(
    () => assessCreationSpawnBlockers(character),
    [character],
  )
  const canSpawn = blockers.length === 0

  const rollFresh = useCallback((): SpawnVitalityRolls => {
    const f = character.facade.attributes
    const m = character.morphus.attributes
    const ppe = rollPpeMaximum(f.me, f.pe)
    const morphIsp =
      psychicTier !== 'none' || character.psychicGateBypassed === true
        ? rollIspMaximum(m.me)
        : 0
    return {
      facadeHp: rollFacadeHpMaximum(f.pe),
      facadeSdc: rollFacadeSdcMaximum(f),
      morphusHp: rollMorphusHpMaximum(m.pe),
      morphusSdc: rollMorphusSdcMaximum(m.pe, m.ps.score),
      ppeMax: ppe,
      morphusIspMax: morphIsp,
    }
  }, [character, psychicTier])

  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'

  const occIds = character.creationOccSkillIds ?? []
  const relIds = character.creationRelatedSkillIds ?? []
  const abilityIds = character.selectedAbilities ?? []

  const handleSpawn = () => {
    if (!canSpawn) return
    runFinalize(finalizeCharacter)
  }

  const handleCommitVitality = () => {
    const payload = rolls ?? rollFresh()
    commitSpawnVitalityRolls(payload)
    setRolls(payload)
  }

  const handleRollOnly = () => {
    setRolls(rollFresh())
  }

  return (
    <section
      className="relative mt-8 w-full border-t-2 border-dashed pt-8"
      aria-labelledby="character-spawn-heading"
    >
      <h2
        id="character-spawn-heading"
        className="mb-1 text-sm font-semibold uppercase tracking-wide"
        style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
      >
        Step 5: Spawn &amp; Finalization
      </h2>
      <p
        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"
        style={{ color: morphus ? '#a5b4fc' : '#475569' }}
      >
        Review your build, converge rolled vitality (attribute_and_stat.md + psychic_gate.md),
        then spawn to lock the character and switch to the live sheet (character_creation.md §5).
      </p>

      <div className={`mb-4 rounded-lg border p-4 ${panelStyle}`}>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
          Summary dashboard
        </h3>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase opacity-70">
              Psychic tier
            </dt>
            <dd className="mt-0.5 font-mono">
              {tierLabel(psychicTier)}
              {character.psychicGateBypassed ? (
                <span className="ml-2 text-xs opacity-70">
                  (Gate bypassed — setting integrity)
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase opacity-70">
              Attributes — Facade
            </dt>
            <dd className="mt-0.5 font-mono text-xs leading-relaxed">
              {attrLine('Facade', character.facade.attributes)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase opacity-70">
              Attributes — Morphus
            </dt>
            <dd className="mt-0.5 font-mono text-xs leading-relaxed">
              {attrLine('Morphus', character.morphus.attributes)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase opacity-70">
              Skills (creation picks)
            </dt>
            <dd className="mt-0.5">
              <p className="text-xs opacity-80">O.C.C.</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {occIds.length === 0 ? (
                  <li className="text-rose-400">None selected</li>
                ) : (
                  occIds.map((id) => (
                    <li key={id}>{getSkillById(id)?.name ?? id}</li>
                  ))
                )}
              </ul>
              <p className="mt-2 text-xs opacity-80">O.C.C. related</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {relIds.length === 0 ? (
                  <li className="opacity-60">None</li>
                ) : (
                  relIds.map((id) => (
                    <li key={id}>{getSkillById(id)?.name ?? id}</li>
                  ))
                )}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase opacity-70">
              Abilities
            </dt>
            <dd className="mt-0.5">
              <ul className="list-inside list-disc text-xs">
                {abilityIds.length === 0 ? (
                  <li className="text-rose-400">None selected</li>
                ) : (
                  abilityIds.map((id) => (
                    <li key={id}>{getAbilityById(id)?.name ?? id}</li>
                  ))
                )}
              </ul>
            </dd>
          </div>
        </dl>
      </div>

      {blockers.length > 0 ? (
        <div
          className={`mb-4 rounded-lg border-2 border-amber-500/70 bg-amber-950/25 p-4 text-sm ${
            morphus ? 'text-amber-100' : 'text-amber-950'
          }`}
          role="alert"
        >
          <p className="mb-2 font-bold uppercase tracking-wide text-amber-600">
            Pillar 8 — resolve before spawn
          </p>
          <ul className="list-inside list-disc space-y-1">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={`mb-4 rounded-lg border p-4 ${panelStyle}`}>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
          Final roll — vitality convergence
        </h3>
        <ul className="mb-3 list-inside list-disc space-y-1 text-xs opacity-85">
          <li>
            Facade H.P.: P.E. + 1d6 (min 4) — attribute_and_stat.md (P.E. drives base H.P.).
          </li>
          <li>
            Facade S.D.C.: derived structural baseline from attributes + 1d6 (derivedVitality +
            variance).
          </li>
          <li>Morphus H.P. / S.D.C.: P.E. / P.S.-weighted dice (M.D.C. track).</li>
          <li>P.P.E.: M.E. + P.E. + 2d6 (sheet placeholder pool).</li>
          <li>
            Morphus I.S.P.: M.E. + 1d6 when psionic tier applies or gate is bypassed; otherwise
            0 (psychic_gate.md §3).
          </li>
        </ul>
        <div className="mb-3 grid gap-2 font-mono text-xs sm:grid-cols-2">
          <div>
            Preview facade H.P. max:{' '}
            <strong>{rolls?.facadeHp ?? '—'}</strong>
          </div>
          <div>
            Preview facade S.D.C. max:{' '}
            <strong>{rolls?.facadeSdc ?? '—'}</strong>
          </div>
          <div>
            Preview morphus H.P. max:{' '}
            <strong>{rolls?.morphusHp ?? '—'}</strong>
          </div>
          <div>
            Preview morphus S.D.C. max:{' '}
            <strong>{rolls?.morphusSdc ?? '—'}</strong>
          </div>
          <div>
            Preview P.P.E. max: <strong>{rolls?.ppeMax ?? '—'}</strong>
          </div>
          <div>
            Preview morphus I.S.P. max:{' '}
            <strong>{rolls?.morphusIspMax ?? '—'}</strong>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRollOnly}
            className="rounded-md bg-slate-600 px-4 py-2 text-sm font-bold text-white hover:bg-slate-500"
          >
            Roll pools
          </button>
          <button
            type="button"
            onClick={handleCommitVitality}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-500"
          >
            Commit rolls to character
          </button>
        </div>
        {character.creationVitalityCommitted ? (
          <p className="mt-3 text-xs font-semibold text-teal-400">
            Vitality committed — pools are on the live record.
          </p>
        ) : (
          <p className="mt-3 text-xs opacity-70">
            Rolls are not saved until you commit (updates use CharacterContext sheet paths).
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canSpawn}
          title={
            canSpawn
              ? 'Lock character and go to live sheet'
              : blockers.join(' ')
          }
          onClick={handleSpawn}
          className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:opacity-50"
        >
          Spawn character
        </button>
        {!canSpawn ? (
          <span className="text-xs opacity-70">Spawn disabled until warnings clear.</span>
        ) : null}
      </div>
    </section>
  )
}
