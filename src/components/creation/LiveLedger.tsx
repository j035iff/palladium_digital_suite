import { useMemo, type ReactNode } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { buildCreationLiveLedgerSnapshot } from '../../lib/creationLiveLedger'

function LedgerSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="mt-4 border-t border-slate-200 pt-3 dark:border-white/10">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide opacity-70">
        {title}
      </p>
      {children}
    </div>
  )
}

function LedgerGrid({ lines }: { lines: { label: string; value: string; hint?: string }[] }) {
  return (
    <dl className="space-y-1 text-xs">
      {lines.map((line) => (
        <div key={line.label} className="flex flex-col gap-0.5">
          <div className="flex justify-between gap-2">
            <dt className="opacity-80">{line.label}</dt>
            <dd className="shrink-0 text-right font-mono font-semibold tabular-nums">
              {line.value}
            </dd>
          </div>
          {line.hint ? (
            <dd className="text-[10px] opacity-60">{line.hint}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  )
}

export function LiveLedger() {
  const {
    character,
    activeFormState,
    activeForm,
    activeRace,
    effectiveOcc,
    supportsDualForm,
    psychicTier,
    strengthCapacities,
    handToHandCombatProfile,
    saveProfileDerived,
  } = useCharacter()
  const attrs = activeFormState.attributes

  const ledger = useMemo(
    () =>
      buildCreationLiveLedgerSnapshot({
        character,
        attrs,
        race: activeRace,
        occ: effectiveOcc ?? undefined,
        supportsDualForm,
        psychicTier,
        activeForm,
        strengthCapacities,
        handToHand: handToHandCombatProfile.accumulated,
        horrorFactorTotal: saveProfileDerived.horrorFactor.total,
      }),
    [
      character,
      attrs,
      activeForm,
      activeRace,
      effectiveOcc,
      supportsDualForm,
      psychicTier,
      strengthCapacities,
      handToHandCombatProfile.accumulated,
      saveProfileDerived.horrorFactor.total,
    ],
  )

  const panel =
    'rounded-lg border p-4 border-blue-200 bg-white text-slate-900 dark:border-violet-700 dark:bg-slate-950/80 dark:text-violet-50'

  return (
    <aside className={`h-fit ${panel}`} aria-label="Live creation ledger">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
        Live Ledger
      </h3>
      <p className="mb-3 text-xs opacity-75">
        Full build mirror — attributes, vitals, saves, and combat update as you
        configure.
      </p>

      <LedgerSection title="Attributes">
        <LedgerGrid lines={ledger.attributes} />
      </LedgerSection>

      <LedgerSection title="Exceptional bonuses">
        <LedgerGrid lines={ledger.exceptional} />
      </LedgerSection>

      <LedgerSection title="Vitals">
        <LedgerGrid lines={ledger.vitals} />
      </LedgerSection>

      <LedgerSection title="Save vs">
        <LedgerGrid lines={ledger.saves} />
      </LedgerSection>

      <LedgerSection title="Combat bonuses">
        <LedgerGrid lines={ledger.combat} />
      </LedgerSection>

      {ledger.physical.lines.length > 0 || ledger.physical.pendingDiceLines.length > 0 ? (
        <LedgerSection title="Skill physical staging (on Spawn)">
          <LedgerGrid lines={ledger.physical.lines} />
          {ledger.physical.pendingDiceLines.length > 0 ? (
            <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs dark:border-white/10">
              {ledger.physical.pendingDiceLines.map((line) => (
                <li key={line.label}>
                  <span className="font-mono font-semibold">{line.value}</span>{' '}
                  {line.label}
                  {line.hint ? (
                    <span className="block text-[10px] opacity-60">{line.hint}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </LedgerSection>
      ) : null}

      {ledger.occVariable.length > 0 ? (
        <LedgerSection title="O.C.C. variable dice">
          <LedgerGrid lines={ledger.occVariable} />
        </LedgerSection>
      ) : null}

      {ledger.spawnDice.length > 0 ? (
        <LedgerSection title="Spawn dice checklist">
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
            {ledger.spawnDice.map((e) => {
              const done = e.hint === 'Resolved'
              return (
                <li key={e.label} className={done ? 'text-emerald-600' : ''}>
                  <span className="font-mono font-semibold">{e.value}</span>{' '}
                  {e.label}
                  {e.hint && e.hint !== 'Resolved' ? (
                    <span className="block text-[10px] opacity-60">{e.hint}</span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </LedgerSection>
      ) : null}
    </aside>
  )
}
