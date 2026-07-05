import { useMemo, type ReactNode } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { buildCreationLiveLedgerSnapshot } from '../../lib/creationLiveLedger'
import type { ActiveForm } from '../../types'
import {
  LedgerStatGrid,
  MORPHUS_LEDGER_BORDER_CLASS,
  MORPHUS_LEDGER_SURFACE_CLASS,
} from './LedgerStatGrid'
import { FACADE_LABEL } from '../../lib/creationFormLabels'

function LedgerSection({
  title,
  children,
  morphus,
}: {
  title: string
  children: ReactNode
  morphus?: boolean
}) {
  return (
    <div
      className={
        morphus
          ? `mt-4 border-t ${MORPHUS_LEDGER_BORDER_CLASS} pt-3`
          : 'mt-4 border-t border-slate-200 pt-3 dark:border-white/10'
      }
    >
      <p
        className={
          morphus
            ? 'mb-2 text-[10px] font-bold uppercase tracking-wide text-orange-100/90'
            : 'mb-2 text-[10px] font-bold uppercase tracking-wide opacity-70'
        }
      >
        {title}
      </p>
      {children}
    </div>
  )
}

function LedgerFormToggle({
  activeForm,
  morphusLocked,
  onSelect,
}: {
  activeForm: ActiveForm
  morphusLocked?: boolean
  onSelect: (form: ActiveForm) => void
}) {
  const primaryActive = activeForm === 'primary'
  const morphusActive = activeForm === 'morphus'
  const morphusLockTitle = morphusLocked
    ? 'Morphus unlocks when you reach the Traits tab (complete Roll Pending first).'
    : undefined
  return (
    <div
      className={`grid grid-cols-2 gap-1 rounded-lg border-2 p-1 ${
        primaryActive
          ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-slate-900'
          : `border-[#3a0a0a] ${MORPHUS_LEDGER_SURFACE_CLASS}`
      }`}
      role="group"
      aria-label="Live ledger form view"
    >
      <button
        type="button"
        onClick={() => onSelect('primary')}
        aria-pressed={primaryActive}
        className={`rounded-md px-2 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
          primaryActive
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-transparent text-orange-100/80 hover:bg-[#1a0404] hover:text-orange-50'
        }`}
      >
        {FACADE_LABEL}
      </button>
      <button
        type="button"
        onClick={() => onSelect('morphus')}
        aria-pressed={morphusActive}
        disabled={morphusLocked}
        title={morphusLockTitle}
        aria-disabled={morphusLocked}
        className={`rounded-md px-2 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
          morphusLocked
            ? 'cursor-not-allowed bg-transparent text-slate-400 opacity-50 dark:text-slate-500'
            : morphusActive
              ? 'bg-[#5c1010] text-orange-50 shadow-sm ring-1 ring-orange-300/35'
              : 'bg-transparent text-slate-600 hover:bg-blue-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
        }`}
      >
        Morphus
      </button>
    </div>
  )
}

function LedgerStatSections({
  ledger,
  morphus,
}: {
  ledger: ReturnType<typeof buildCreationLiveLedgerSnapshot>
  morphus: boolean
}) {
  return (
    <>
      <LedgerSection title="Attributes" morphus={morphus}>
        <LedgerStatGrid lines={ledger.attributes} morphus={morphus} />
      </LedgerSection>

      <LedgerSection title="Exceptional bonuses (17–30)" morphus={morphus}>
        <LedgerStatGrid lines={ledger.exceptional} morphus={morphus} />
      </LedgerSection>

      {ledger.exceptionalSuper.map((group) => (
        <LedgerSection
          key={group.title}
          title={`Exceptional bonuses — ${group.title}`}
          morphus={morphus}
        >
          <LedgerStatGrid lines={group.lines} morphus={morphus} />
        </LedgerSection>
      ))}

      <LedgerSection title="Vitals" morphus={morphus}>
        <LedgerStatGrid lines={ledger.vitals} morphus={morphus} />
      </LedgerSection>

      <LedgerSection title="Save vs" morphus={morphus}>
        <LedgerStatGrid lines={ledger.saves} morphus={morphus} />
      </LedgerSection>

      <LedgerSection title="Combat bonuses" morphus={morphus}>
        <LedgerStatGrid lines={ledger.combat} morphus={morphus} />
      </LedgerSection>
    </>
  )
}

export function LiveLedger({ variant = 'card' }: { variant?: 'card' | 'sidebar' }) {
  const {
    character,
    activeForm,
    activeRace,
    effectiveOcc,
    supportsDualForm,
    morphusLedgerUnlocked,
    psychicTier,
    toggleForm,
  } = useCharacter()

  const ledgerForm: ActiveForm =
    supportsDualForm && morphusLedgerUnlocked && activeForm === 'morphus'
      ? 'morphus'
      : 'primary'
  const morphus = ledgerForm === 'morphus'
  const morphusLocked = supportsDualForm && !morphusLedgerUnlocked

  const ledger = useMemo(
    () =>
      buildCreationLiveLedgerSnapshot({
        character,
        race: activeRace,
        occ: effectiveOcc ?? undefined,
        supportsDualForm,
        psychicTier,
        activeForm: ledgerForm,
      }),
    [character, ledgerForm, activeRace, effectiveOcc, supportsDualForm, psychicTier],
  )

  const selectForm = (form: ActiveForm) => {
    if (form === ledgerForm) return
    if (form === 'morphus' && morphusLocked) return
    toggleForm()
  }

  const description =
    variant === 'sidebar'
      ? morphus
        ? 'Morphus build mirror — supernatural stats update as you forge.'
        : 'Facade build mirror — updates as you work through each forge tab.'
      : morphus
        ? 'Morphus build mirror — supernatural stats update as you work through each tab.'
        : 'Build mirror — attributes, vitals, saves, and combat update as you work through each tab below.'

  if (variant === 'sidebar') {
    return (
      <aside
        className={`flex h-full min-h-0 flex-col ${
          morphus
            ? `${MORPHUS_LEDGER_SURFACE_CLASS} text-orange-50`
            : 'bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100'
        }`}
        aria-label="Live creation ledger"
      >
        <div
          className={`sticky top-0 z-10 shrink-0 space-y-2 border-b p-3 pb-3 ${
            morphus
              ? MORPHUS_LEDGER_BORDER_CLASS
              : 'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950'
          } ${morphus ? MORPHUS_LEDGER_SURFACE_CLASS : ''}`}
        >
          <h3
            className={
              morphus
                ? 'text-xs font-bold uppercase tracking-wide text-orange-50'
                : 'text-xs font-bold uppercase tracking-wide opacity-80'
            }
          >
            Live Ledger
          </h3>

          {supportsDualForm ? (
            <>
              <LedgerFormToggle
                activeForm={ledgerForm}
                morphusLocked={morphusLocked}
                onSelect={selectForm}
              />
              {morphusLocked ? (
                <p className="text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                  Morphus view unlocks on the Traits tab after Roll Pending is complete.
                </p>
              ) : null}
            </>
          ) : null}

          <p
            className={
              morphus ? 'text-xs text-orange-100/85' : 'text-xs opacity-75'
            }
          >
            {description}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pt-2">
          <LedgerStatSections ledger={ledger} morphus={morphus} />
        </div>
      </aside>
    )
  }

  const panel = morphus
    ? `rounded-lg border-2 ${MORPHUS_LEDGER_BORDER_CLASS} ${MORPHUS_LEDGER_SURFACE_CLASS} p-4 text-orange-50`
    : 'rounded-lg border border-blue-200 bg-white p-4 text-slate-900 dark:border-blue-600 dark:bg-slate-950 dark:text-slate-100'

  return (
    <aside className={panel} aria-label="Live creation ledger">
      <h3
        className={
          morphus
            ? 'mb-2 text-xs font-bold uppercase tracking-wide text-orange-50'
            : 'mb-2 text-xs font-bold uppercase tracking-wide opacity-80'
        }
      >
        Live Ledger
      </h3>

      {supportsDualForm ? (
        <>
          <LedgerFormToggle
            activeForm={ledgerForm}
            morphusLocked={morphusLocked}
            onSelect={selectForm}
          />
          {morphusLocked ? (
            <p className="mb-3 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
              Morphus view unlocks on the Traits tab after Roll Pending is complete.
            </p>
          ) : null}
        </>
      ) : null}

      <p
        className={
          morphus ? 'mb-3 text-xs text-orange-100/85' : 'mb-3 text-xs opacity-75'
        }
      >
        {description}
      </p>

      <LedgerStatSections ledger={ledger} morphus={morphus} />
    </aside>
  )
}
