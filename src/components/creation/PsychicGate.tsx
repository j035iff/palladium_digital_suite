import { useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  getStandardPsychicTestBandRows,
  tierFromTestPotential,
} from '../../lib/psychicGate'
import type { PsychicTier } from '../../types'

const TIERS: PsychicTier[] = ['none', 'minor', 'major', 'master']

const TIER_LABEL: Record<PsychicTier, string> = {
  none: 'None',
  minor: 'Minor',
  major: 'Major',
  master: 'Master',
}

const OCC_LOCK_TOOLTIP =
  'Psychic-class O.C.C. (e.g. Mind Melter): tier is locked to Master (psychic_gate.md §1).'

export function PsychicGate() {
  const {
    activeForm,
    activeFormState,
    supportsDualForm,
    character,
    psychicTier,
    saveVsPsionicsTarget,
    skillSlotMultiplier,
    setPsychicTier,
    testPsychicPotential,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const bypassed = character.psychicGateBypassed === true
  const occLocked = character.occ.category === 'psychic'
  const [lastTestRoll, setLastTestRoll] = useState<number | null>(null)

  const bandRows = useMemo(() => getStandardPsychicTestBandRows(), [])

  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'
  const subStyle = morphus
    ? 'border-violet-800 bg-slate-900'
    : 'border-slate-200 bg-slate-50'

  return (
    <section
      className="mt-8 w-full border-t-2 border-dashed pt-8"
      aria-labelledby="psychic-gate-heading"
    >
      <h2
        id="psychic-gate-heading"
        className="mb-1 text-sm font-semibold uppercase tracking-wide"
        style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
      >
        Step 2.5: Psychic Gate
      </h2>
      <p
        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"
        style={{ color: morphus ? '#a5b4fc' : '#475569' }}
      >
        Choose psionic potential (psychic_gate.md). I.S.P. on the active form is set to{' '}
        <strong>M.E. + 1d6</strong> when a tier other than None is confirmed. Major tier applies a{' '}
        <strong>0.5×</strong> multiplier to O.C.C. related skill slots (floor at selection time in
        the Skill Engine).
      </p>

      {bypassed ? (
        <div
          className={`rounded-lg border p-4 text-sm ${panelStyle}`}
          role="status"
        >
          <strong className="uppercase tracking-wide">Gate bypassed</strong>
          <p className="mt-2 opacity-90">
            This race or O.C.C. explicitly forbids Psychic Gate rolls (race psionics set to
            none or innate, or O.C.C. progression marks the gate bypassed).
          </p>
        </div>
      ) : (
        <div className={`grid gap-6 rounded-lg border p-4 lg:grid-cols-2 ${panelStyle}`}>
          <div className="space-y-4">
            {occLocked ? (
              <p
                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200"
                role="status"
              >
                O.C.C. check: Psychic-class character — tier locked to <strong>Master</strong>.
              </p>
            ) : null}

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
                Manual selection
              </h3>
              <div className="flex flex-wrap gap-2">
                {TIERS.map((tier) => {
                  const locked = occLocked && tier !== 'master'
                  const active = psychicTier === tier
                  return (
                    <button
                      key={tier}
                      type="button"
                      disabled={locked}
                      title={locked ? OCC_LOCK_TOOLTIP : undefined}
                      onClick={() => setPsychicTier(tier)}
                      className={`rounded-md border-2 px-3 py-2 text-sm font-semibold transition ${
                        locked
                          ? morphus
                            ? 'cursor-not-allowed border-slate-600 text-slate-500 line-through opacity-50'
                            : 'cursor-not-allowed border-slate-300 text-slate-400 line-through opacity-60'
                          : active
                            ? morphus
                              ? 'border-amber-400 bg-violet-900 text-amber-100'
                              : 'border-blue-600 bg-blue-50 text-blue-900'
                            : morphus
                              ? 'border-violet-700 bg-slate-900 hover:border-violet-500'
                              : 'border-slate-300 bg-white hover:border-blue-400'
                      }`}
                    >
                      {TIER_LABEL[tier]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
                Standard entry (randomized)
              </h3>
              <button
                type="button"
                disabled={occLocked}
                title={occLocked ? OCC_LOCK_TOOLTIP : undefined}
                className={`rounded-md px-4 py-2 text-sm font-bold ${
                  occLocked
                    ? 'cursor-not-allowed bg-slate-600 text-slate-400 line-through opacity-50'
                    : morphus
                      ? 'bg-teal-600 text-white hover:bg-teal-500'
                      : 'bg-teal-600 text-white hover:bg-teal-500'
                }`}
                onClick={() => {
                  const r = testPsychicPotential()
                  if (r > 0) setLastTestRoll(r)
                }}
              >
                Test Potential (1d100)
              </button>
              {lastTestRoll !== null ? (
                <p className="mt-2 font-mono text-sm tabular-nums opacity-90">
                  Last roll: <strong>{lastTestRoll}</strong> → tier{' '}
                  <strong className="capitalize">
                    {tierFromTestPotential(lastTestRoll)}
                  </strong>
                </p>
              ) : null}
              <ul
                className={`mt-3 max-w-md list-inside list-disc rounded border px-3 py-2 text-xs opacity-80 ${subStyle}`}
              >
                {bandRows.map((row) => (
                  <li key={row.hi}>
                    {String(row.lo).padStart(2, '0')}–{String(row.hi).padStart(2, '0')}:{' '}
                    {TIER_LABEL[row.tier]}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`space-y-4 rounded-md border p-4 ${subStyle}`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide opacity-70">
                Save vs. Psionics
              </p>
              <p
                className="mt-1 font-mono text-4xl font-black tabular-nums"
                style={{ color: morphus ? '#fde68a' : '#b45309' }}
              >
                {saveVsPsionicsTarget}+
              </p>
              <p className="mt-1 text-xs opacity-80">
                Roll M.E. or higher on d20 to save (None 15+, Minor/Major 12+, Master 10+;
                psychic_gate.md §2).
              </p>
            </div>

            <div
              className={`border-t pt-3 text-sm opacity-90 ${morphus ? 'border-white/10' : 'border-slate-200'}`}
            >
              <p>
                Current tier:{' '}
                <strong className="capitalize">{psychicTier}</strong>
              </p>
              <p className="mt-1">
                Skill engine slot multiplier:{' '}
                <strong className="font-mono">{skillSlotMultiplier}</strong>
                {psychicTier === 'major' ? (
                  <span className="block text-xs opacity-75">
                    Major: O.C.C. related skills ×0.5 (floor when counting slots; psychic_gate.md §2).
                  </span>
                ) : null}
              </p>
              <p className="mt-2 text-xs opacity-80">
                Active form I.S.P.:{' '}
                <span className="font-mono font-semibold">
                  {activeFormState.isp.current} / {activeFormState.isp.maximum}
                </span>{' '}
                (M.E. {activeFormState.attributes.me} + die on tier set)
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
