import { useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  computeCombatMirrorBonuses,
  computeLiveBonuses,
} from '../../lib/characterDerived'
import { listPendingDiceEntries } from '../../lib/pendingDiceLedger'
import { listOccVariableBonusTasks } from '../../lib/occVariableBonus'

export function LiveLedger() {
  const {
    character,
    activeFormState,
    activeRace,
    effectiveOcc,
    supportsDualForm,
    psychicTier,
    strengthCapacities,
  } = useCharacter()
  const attrs = activeFormState.attributes
  const combatMirror = useMemo(
    () => computeCombatMirrorBonuses(attrs),
    [attrs],
  )
  const iqPreview = useMemo(() => computeLiveBonuses(attrs), [attrs])

  const pendingDice = useMemo(
    () =>
      listPendingDiceEntries(character, activeRace, effectiveOcc ?? undefined, {
        supportsDualForm,
        psychicTier,
      }),
    [character, activeRace, effectiveOcc, supportsDualForm, psychicTier],
  )

  const occVarTasks = useMemo(
    () =>
      listOccVariableBonusTasks(
        effectiveOcc ?? undefined,
        character.occSpecializationId,
      ),
    [effectiveOcc, character.occSpecializationId],
  )

  const resolved = character.creationPendingDiceResolutions ?? {}
  const occResolved = character.creationOccVariableResolutions ?? {}

  const panel =
    'rounded-lg border p-4 border-blue-200 bg-white text-slate-900 dark:border-violet-700 dark:bg-slate-950/80 dark:text-violet-50'

  return (
    <aside className={`h-fit ${panel}`} aria-label="Live creation ledger">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
        Live Ledger
      </h3>
      <p className="mb-3 text-xs opacity-75">
        Derived combat and pending physical dice (character_creation.md Phase I).
      </p>
      <dl className="space-y-2 font-mono text-sm tabular-nums">
        <div className="flex justify-between gap-2">
          <dt>Strike</dt>
          <dd className="font-semibold text-emerald-700 dark:text-emerald-400">
            +{combatMirror.strike}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Parry</dt>
          <dd className="font-semibold text-emerald-700 dark:text-emerald-400">
            +{combatMirror.parry}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Dodge</dt>
          <dd className="font-semibold text-emerald-700 dark:text-emerald-400">
            +{combatMirror.dodge}
          </dd>
        </div>
        <div className="flex justify-between gap-2 border-t border-slate-200 pt-2 dark:border-white/10">
          <dt>H2H dmg</dt>
          <dd className="font-semibold text-amber-700 dark:text-amber-300">
            {strengthCapacities.handToHandDamage.kind === 'supernatural' ? (
              <span className="text-[11px]">
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

      {occVarTasks.length > 0 ? (
        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-white/10">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide opacity-70">
            O.C.C. variable dice
          </p>
          <ul className="space-y-1 text-xs">
            {occVarTasks.map((t) => {
              const v = occResolved[t.id]
              const done = v != null && v >= t.min && v <= t.max
              return (
                <li key={t.id} className={done ? 'opacity-60' : ''}>
                  <span className="font-mono">{t.notation}</span> — {t.label}
                  {done ? ` ✓ (${v})` : ' — pending'}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {pendingDice.length > 0 ? (
        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-white/10">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide opacity-70">
            Spawn dice checklist
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
            {pendingDice.map((e) => {
              const v = resolved[e.id]
              const done = v != null && v >= e.min && v <= e.max
              return (
                <li key={e.id} className={done ? 'text-emerald-600' : ''}>
                  <span className="font-mono font-semibold">{e.notation}</span>{' '}
                  {e.label}
                  {done ? ` → ${v}` : ''}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </aside>
  )
}
