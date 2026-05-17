import { useCallback, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  computeCombatMirrorBonuses,
  computeLiveBonuses,
} from '../../lib/characterDerived'
import {
  isBonusDieEligible,
  roll3d6,
  rollD6,
  sumDice,
} from '../../lib/forgeDice'
import { FORGE_ATTRIBUTE_KEYS, type ForgeAttrKey, type ForgeRoll } from './attributeForgeModel'

const ATTR_LABELS: Record<ForgeAttrKey, string> = {
  iq: 'I.Q.',
  me: 'M.E.',
  ma: 'M.A.',
  ps: 'P.S.',
  pp: 'P.P.',
  pe: 'P.E.',
  pb: 'P.B.',
  spd: 'Spd',
}

const DEFAULT_STAT = 10

function newRoll(): ForgeRoll {
  return {
    id: crypto.randomUUID(),
    dice: roll3d6(),
    bonus: null,
  }
}

function baseTotal(r: ForgeRoll): number {
  return sumDice(r.dice)
}

function totalWithBonus(r: ForgeRoll): number {
  const b = r.bonus
  return baseTotal(r) + (typeof b === 'number' ? b : 0)
}

function initialRolls(): ForgeRoll[] {
  return Array.from({ length: 8 }, () => newRoll())
}

function emptyAssignments(): Record<ForgeAttrKey, string | null> {
  return {
    iq: null,
    me: null,
    ma: null,
    ps: null,
    pp: null,
    pe: null,
    pb: null,
    spd: null,
  }
}

function attrUpdatePath(attr: ForgeAttrKey): string {
  return attr === 'ps' ? 'attributes.ps.score' : `attributes.${attr}`
}

export function AttributeForge() {
  const {
    activeForm,
    activeFormState,
    activeRace,
    raceStrengthLabel,
    strengthCapacities,
    updateAttribute,
    supportsDualForm,
  } = useCharacter()
  const race = activeRace
  const attrFormulas = race?.attributes
  const morphus = supportsDualForm && activeForm === 'morphus'

  const [rolls, setRolls] = useState<ForgeRoll[]>(initialRolls)
  const [assignments, setAssignments] =
    useState<Record<ForgeAttrKey, string | null>>(emptyAssignments)

  const mirrorAttrs = activeFormState.attributes
  const combatMirror = useMemo(
    () => computeCombatMirrorBonuses(mirrorAttrs),
    [mirrorAttrs],
  )
  const iqPreview = useMemo(
    () => computeLiveBonuses(mirrorAttrs),
    [mirrorAttrs],
  )

  const pushStat = useCallback(
    (attr: ForgeAttrKey, value: number) => {
      updateAttribute(attrUpdatePath(attr), value)
    },
    [updateAttribute],
  )

  const assignRollToAttr = useCallback(
    (attr: ForgeAttrKey, rollId: string | null) => {
      const prev = assignments
      const next: Record<ForgeAttrKey, string | null> = { ...prev }
      const stolenFrom: ForgeAttrKey[] = []

      if (rollId) {
        for (const a of FORGE_ATTRIBUTE_KEYS) {
          if (a !== attr && prev[a] === rollId) {
            stolenFrom.push(a)
            next[a] = null
          }
        }
      }
      next[attr] = rollId
      setAssignments(next)

      for (const a of stolenFrom) {
        pushStat(a, DEFAULT_STAT)
      }

      if (rollId) {
        const roll = rolls.find((r) => r.id === rollId)
        if (roll) pushStat(attr, totalWithBonus(roll))
      } else {
        pushStat(attr, DEFAULT_STAT)
      }
    },
    [assignments, rolls, pushStat],
  )

  const rollStats = useCallback(() => {
    setRolls(initialRolls())
    setAssignments(emptyAssignments())
    for (const a of FORGE_ATTRIBUTE_KEYS) {
      pushStat(a, DEFAULT_STAT)
    }
  }, [pushStat])

  const rollBonusForRoll = useCallback(
    (rollId: string) => {
      const ix = rolls.findIndex((r) => r.id === rollId)
      if (ix === -1) return
      const r = rolls[ix]
      if (!isBonusDieEligible(baseTotal(r)) || r.bonus !== null) return

      const bonus = rollD6()
      const updated: ForgeRoll = { ...r, bonus }
      const nextRolls = [...rolls]
      nextRolls[ix] = updated
      setRolls(nextRolls)

      const total = baseTotal(updated) + bonus
      for (const a of FORGE_ATTRIBUTE_KEYS) {
        if (assignments[a] === rollId) {
          pushStat(a, total)
        }
      }
    },
    [rolls, assignments, pushStat],
  )

  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'

  const subStyle = morphus
    ? 'border-violet-800 bg-slate-900'
    : 'border-slate-200 bg-slate-50'

  return (
    <section
      className="mt-8 w-full border-t-2 border-dashed pt-8"
      aria-labelledby="forge-heading"
    >
      <h2
        id="forge-heading"
        className="mb-1 text-sm font-semibold uppercase tracking-wide"
        style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
      >
        Step 2: Attribute Forge
      </h2>
      <p
        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"
        style={{ color: morphus ? '#a5b4fc' : '#475569' }}
      >
        Pool and assign eight rolls per your race template (srs.md). Totals of 16–18 unlock
        an optional bonus +1d6 (Pillar 7). Assignments sync to the active form and recompute
        H.P./S.D.C. caps when P.E. or P.S. change (attribute_and_stat.md).
      </p>
      {race ? (
        <p
          className="mb-4 max-w-3xl font-mono text-xs leading-snug opacity-90"
          style={{ color: morphus ? '#a5b4fc' : '#475569' }}
        >
          <span className="font-bold uppercase tracking-wide">Race dice — </span>
          I.Q.{attrFormulas?.iq ?? '3D6'} M.E.{attrFormulas?.me ?? '3D6'} M.A.
          {attrFormulas?.ma ?? '3D6'} P.S.{attrFormulas?.ps ?? '3D6'} P.P.
          {attrFormulas?.pp ?? '3D6'} P.E.{attrFormulas?.pe ?? '3D6'} P.B.
          {attrFormulas?.pb ?? '3D6'} Spd.{attrFormulas?.spd ?? '3D6'}
          <span className="ml-2 font-sans font-semibold">· {raceStrengthLabel}</span>
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`space-y-4 rounded-lg border p-4 lg:col-span-2 ${panelStyle}`}>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={rollStats}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-black shadow hover:bg-amber-400"
            >
              Roll Stats (8× 3d6)
            </button>
            <span className="text-xs opacity-80">
              {supportsDualForm ? (
                <>
                  Active form: <strong className="capitalize">{activeForm}</strong>
                </>
              ) : (
                <>
                  Assignments apply to your <strong>character sheet</strong> (single form for
                  this race).
                </>
              )}
            </span>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Attribute rolls">
            {rolls.map((r) => {
              const base = baseTotal(r)
              const high = isBonusDieEligible(base)
              const total = totalWithBonus(r)
              const showBonus = high && r.bonus === null

              return (
                <li
                  key={r.id}
                  className={`rounded-md border p-3 ${subStyle} ${
                    high
                      ? morphus
                        ? 'ring-2 ring-amber-400/80'
                        : 'ring-2 ring-amber-500'
                      : ''
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-sm tabular-nums">
                      [{r.dice[0]},{r.dice[1]},{r.dice[2]}]
                    </span>
                    <span
                      className={`text-lg font-bold tabular-nums ${
                        high ? 'text-amber-400' : ''
                      }`}
                    >
                      {base}
                      {typeof r.bonus === 'number' ? (
                        <span className="text-sm font-semibold opacity-90">
                          {' '}
                          + {r.bonus} = {total}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {high ? (
                    <p className="mt-1 text-xs font-medium text-amber-500/90">
                      High roll (16–18) — bonus die available (srs.md §2).
                    </p>
                  ) : null}
                  {showBonus ? (
                    <button
                      type="button"
                      className="mt-2 w-full rounded border border-amber-500/60 bg-amber-500/15 px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-200 hover:bg-amber-500/25"
                      onClick={() => rollBonusForRoll(r.id)}
                    >
                      Roll Bonus 1d6
                    </button>
                  ) : null}
                  {high && r.bonus !== null ? (
                    <p className="mt-1 text-xs opacity-80">Bonus applied (+{r.bonus}).</p>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <div className={`rounded-md border p-4 ${subStyle}`}>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide opacity-80">
              Assign rolls to attributes
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {FORGE_ATTRIBUTE_KEYS.map((attr) => (
                <label
                  key={attr}
                  className="flex flex-col gap-1 text-sm"
                  style={{ color: morphus ? '#e2e8f0' : '#0f172a' }}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
                    {ATTR_LABELS[attr]}
                  </span>
                  <select
                    className={`rounded border px-2 py-1.5 font-mono text-sm ${
                      morphus
                        ? 'border-violet-700 bg-slate-900 text-violet-100'
                        : 'border-slate-300 bg-white text-slate-900'
                    }`}
                    value={assignments[attr] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      assignRollToAttr(attr, v === '' ? null : v)
                    }}
                  >
                    <option value="">— Unassigned —</option>
                    {rolls.map((r) => (
                      <option key={r.id} value={r.id}>
                        {baseTotal(r)}
                        {typeof r.bonus === 'number'
                          ? `+${r.bonus}=${totalWithBonus(r)}`
                          : ''}{' '}
                        ({r.dice.join(',')})
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
        </div>

        <aside
          className={`h-fit rounded-lg border p-4 ${panelStyle}`}
          aria-label="Creation mirror: combat bonuses"
        >
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
            Mirror — bonuses
          </h3>
          <p className="mb-3 text-xs opacity-75">
            Live from the sheet (character_creation.md). P.P. drives Strike / Parry / Dodge;
            P.S. drives H2H damage bonus (attribute_and_stat.md §1).
          </p>
          <dl className="space-y-2 font-mono text-sm tabular-nums">
            <div className="flex justify-between gap-2">
              <dt>Strike</dt>
              <dd
                className={
                  morphus ? 'font-semibold text-emerald-400' : 'font-semibold text-emerald-700'
                }
              >
                +{combatMirror.strike}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Parry</dt>
              <dd
                className={
                  morphus ? 'font-semibold text-emerald-400' : 'font-semibold text-emerald-700'
                }
              >
                +{combatMirror.parry}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Dodge</dt>
              <dd
                className={
                  morphus ? 'font-semibold text-emerald-400' : 'font-semibold text-emerald-700'
                }
              >
                +{combatMirror.dodge}
              </dd>
            </div>
            <div
              className={`flex justify-between gap-2 border-t pt-2 ${morphus ? 'border-white/10' : 'border-slate-200'}`}
            >
              <dt>H2H dmg</dt>
              <dd
                className={
                  morphus ? 'font-semibold text-amber-300' : 'font-semibold text-amber-700'
                }
              >
                {strengthCapacities.handToHandDamage.kind === 'supernatural' ? (
                  <span className="font-mono text-[11px]">
                    {strengthCapacities.handToHandDamage.fullStrengthPunch}
                  </span>
                ) : (
                  <>+{combatMirror.handToHandDamage}</>
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs opacity-70">
            I.Q. O.C.C. % preview:{' '}
            <span className="font-mono font-semibold">
              {iqPreview.iqOccSkillPercent >= 0 ? '+' : ''}
              {iqPreview.iqOccSkillPercent}%
            </span>
          </p>
        </aside>
      </div>
    </section>
  )
}
