import { useMemo, type ReactNode } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { buildCreationLiveLedgerSnapshot } from '../../lib/creationLiveLedger'
import { LedgerGrid, LedgerStatGrid } from './LedgerStatGrid'

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

export function LiveLedger({ variant = 'card' }: { variant?: 'card' | 'sidebar' }) {
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
    variant === 'sidebar'
      ? 'h-full bg-white p-3 text-slate-900 dark:bg-slate-950 dark:text-slate-100'
      : 'rounded-lg border border-blue-200 bg-white p-4 text-slate-900 dark:border-blue-600 dark:bg-slate-950 dark:text-slate-100'

  return (
    <aside className={panel} aria-label="Live creation ledger">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
        Live Ledger
      </h3>
      <p className="mb-3 text-xs opacity-75">
        {variant === 'sidebar'
          ? 'Build mirror — updates as you work through each forge tab.'
          : 'Build mirror — attributes, vitals, saves, and combat update as you work through each tab below.'}
      </p>

      <LedgerSection title="Attributes">
        <LedgerStatGrid lines={ledger.attributes} />
      </LedgerSection>

      <LedgerSection title="Exceptional bonuses (17–30)">
        <LedgerGrid lines={ledger.exceptional} />
      </LedgerSection>

      {ledger.exceptionalSuper.map((group) => (
        <LedgerSection
          key={group.title}
          title={`Exceptional bonuses — ${group.title}`}
        >
          <LedgerGrid lines={group.lines} />
        </LedgerSection>
      ))}

      <LedgerSection title="Vitals">
        <LedgerStatGrid lines={ledger.vitals} />
      </LedgerSection>

      <LedgerSection title="Save vs">
        <LedgerGrid lines={ledger.saves} />
      </LedgerSection>

      <LedgerSection title="Combat bonuses">
        <LedgerGrid lines={ledger.combat} />
      </LedgerSection>
    </aside>
  )
}
