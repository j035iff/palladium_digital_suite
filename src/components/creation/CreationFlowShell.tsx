import { useEffect, useMemo, useRef, useState } from 'react'

import { useCharacter } from '../../context/CharacterContext'

import { ConfiguratorPanel } from './ConfiguratorPanel'

import { AttributeForge } from './AttributeForge'

import { PsychicGate } from './PsychicGate'

import { SkillEngine } from './SkillEngine'

import {
  SupernaturalAbilitiesForge,
  SupernaturalAbilitiesForgeLaneTabs,
} from './abilities/SupernaturalAbilitiesForge'
import { SupernaturalAbilitiesForgeProvider } from './abilities/SupernaturalAbilitiesForgeContext'

import { CreationReviewFinalize } from './CreationReviewFinalize'

import { OccVariableBonusPhase } from './OccVariableBonusPhase'

import { CreationAttributeHeader } from './CreationAttributeHeader'

import { IdentityHeader } from '../layout/IdentityHeader'

import { LiveLedger } from './LiveLedger'
import {
  MORPHUS_LEDGER_BORDER_CLASS,
  MORPHUS_LEDGER_SURFACE_CLASS,
} from './LedgerStatGrid'

import { MorphusForge } from './MorphusForge'

import { CreationFinalizeDice } from './CreationFinalizeDice'

import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'

import { ForgeContinueGate } from '../forge/ForgeContinueGate'

import { ForgeTabNaBanner } from '../forge/ForgeTabNaBanner'

import { ForgeTabInactiveShell } from '../forge/ForgeTabInactiveShell'

import { ForgeTabPageHeader } from '../forge/ForgeTabPageHeader'

import {

  buildCharacterCreationForgeContext,

  CHARACTER_CREATION_TAB_PAGE_TITLES,
  characterCreationTraitsTabPageTitle,

  deriveCharacterCreationForgeNavigation,

  resolveActiveForgeTab,

  type CharacterCreationForgeTabId,

} from '../../lib/forgeNavigation/characterCreationForge'

import { listCharacterCreationTabRequirements } from '../../lib/forgeNavigation/characterCreationTabRequirements'



function ForgeTabBody({
  tabId,
  morphusActive,
  creationGenreId,
  hostGenreId,
}: {
  tabId: CharacterCreationForgeTabId
  morphusActive: boolean
  creationGenreId: string
  hostGenreId: string
}) {

  switch (tabId) {

    case 'tab1_configurator':

      return (
        <ConfiguratorPanel
          headerSlot={
            <IdentityHeader
              variant="tab"
              morphusActive={morphusActive}
              creationGenreId={creationGenreId}
              hostGenreId={hostGenreId}
            />
          }
        />
      )

    case 'tab2_attributes':

      return (

        <>

          <CreationAttributeHeader />

          <AttributeForge />

          <OccVariableBonusPhase />

        </>

      )

    case 'tab3_psionic':

      return <PsychicGate />

    case 'tab4_skills':

      return <SkillEngine />

    case 'tab5_finalize':

      return <CreationFinalizeDice />

    case 'tab6_traits':

      return <MorphusForge />

    case 'tab7_abilities':

      return <SupernaturalAbilitiesForge />

    case 'tab8_review':

      return null

    default:

      return null

  }

}



function SessionMenu({
  canSaveForLater,
  onReset,
  onSaveForLater,
  onLeave,
}: {
  canSaveForLater: boolean
  onReset: () => void
  onSaveForLater: () => void
  onLeave: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const saveHint = canSaveForLater
    ? 'Save this draft and return to the portal.'
    : 'Continue past Identity (Race & O.C.C.) before saving for later.'

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg border-2 border-slate-300 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 outline-none transition hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-400"
      >
        Session
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Session actions"
          className="absolute right-0 top-full z-30 mt-1.5 w-60 rounded-lg border-2 border-slate-300 bg-white p-2 shadow-lg dark:border-slate-600 dark:bg-slate-900"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onReset()
            }}
            className="w-full rounded-md border border-amber-500/70 bg-amber-50 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-amber-950 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50"
          >
            Reset
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canSaveForLater}
            title={saveHint}
            onClick={() => {
              if (!canSaveForLater) return
              setOpen(false)
              onSaveForLater()
            }}
            className={`mt-2 w-full rounded-md border px-3 py-2 text-left text-xs font-bold uppercase tracking-wide ${
              !canSaveForLater
                ? 'cursor-not-allowed border-slate-300/60 bg-slate-100 text-slate-400 opacity-70 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500'
                : 'border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/70 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60'
            }`}
          >
            Save for Later
          </button>
          {!canSaveForLater ? (
            <p className="mt-1 px-1 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
              {saveHint}
            </p>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLeave()
            }}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-700 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-400"
          >
            Leave without Saving
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function CreationFlowShell({

  onSpawnFinalize,

}: {

  onSpawnFinalize?: (finalize: () => void) => void

}) {

  const {

    rawCharacter,

    activeRace,

    effectiveOcc,

    psychicTier,

    activeForm,

    supportsDualForm,

    morphusLedgerUnlocked,

    creationGenreId,

    hostGenreId,

    setCreationForgeTab,

    markCreationForgeTabComplete,

    resetCreation,

    saveCreationForLater,

    canSaveCreationForLater,

    leaveCreationWithoutSaving,

  } = useCharacter()

  const morphusLedger =
    supportsDualForm && morphusLedgerUnlocked && activeForm === 'morphus'



  const forgeCtx = useMemo(

    () =>

      buildCharacterCreationForgeContext(

        rawCharacter,

        activeRace,

        effectiveOcc ?? undefined,

        psychicTier,

      ),

    [rawCharacter, activeRace, effectiveOcc, psychicTier],

  )



  const activeTabId = resolveActiveForgeTab(rawCharacter)



  const nav = useMemo(

    () => deriveCharacterCreationForgeNavigation(forgeCtx, activeTabId),

    [forgeCtx, activeTabId],

  )



  const activeView = nav.tabs.find((t) => t.id === activeTabId)

  const pageTitle =
    activeTabId === 'tab6_traits'
      ? characterCreationTraitsTabPageTitle(activeRace, effectiveOcc ?? undefined)
      : CHARACTER_CREATION_TAB_PAGE_TITLES[activeTabId]

  const activeBlockers = activeView?.blockers ?? []
  const tabInactive = activeView?.visual === 'na'

  const activeRequirements = useMemo(
    () =>
      nav.showContinue
        ? listCharacterCreationTabRequirements(activeTabId, forgeCtx)
        : [],
    [nav.showContinue, activeTabId, forgeCtx],
  )



  const handleContinue = () => {

    if (!nav.continueEnabled) return

    markCreationForgeTabComplete(activeTabId)

  }



  return (

    <div className="flex h-full min-h-0 flex-1 flex-col md:flex-row md:gap-0">

      <SupernaturalAbilitiesForgeProvider>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">

          <div

            className="shrink-0 border-b border-slate-200 bg-white pb-3 shadow-sm dark:border-slate-700 dark:bg-slate-950"

            aria-label="Creation forge frame"

          >

            <div className="flex items-start justify-between gap-3 pt-1 pr-4">

              <div className="min-w-0 flex-1">

                <ForgeNavigationBar

                  tabs={nav.tabs}

                  activeTabId={activeTabId}

                  onSelectTab={(id) => setCreationForgeTab(id as CharacterCreationForgeTabId)}

                />

              </div>

              <SessionMenu

                canSaveForLater={canSaveCreationForLater}

                onReset={resetCreation}

                onSaveForLater={saveCreationForLater}

                onLeave={leaveCreationWithoutSaving}

              />

            </div>

            <div className="mt-3">

              <ForgeTabPageHeader

                title={pageTitle}

                visual={activeView?.visual ?? 'active'}

                requirements={activeRequirements}

                actions={

                  nav.showContinue ? (

                    <ForgeContinueGate

                      inline

                      showBlockers={false}

                      enabled={nav.continueEnabled}

                      validated={activeView?.visual === 'complete'}

                      headerVisual={activeView?.visual}

                      tooltip={nav.continueTooltip}

                      blockers={activeBlockers}

                      onContinue={handleContinue}

                    />

                  ) : null

                }

              />

            </div>

            {activeTabId === 'tab7_abilities' ? (
              <ForgeTabInactiveShell inactive={tabInactive} className="mt-3 px-4">
                <SupernaturalAbilitiesForgeLaneTabs />
              </ForgeTabInactiveShell>
            ) : null}

          </div>



        <div
          className={
            activeTabId === 'tab4_skills' ||
            activeTabId === 'tab1_configurator' ||
            activeTabId === 'tab6_traits' ||
            activeTabId === 'tab7_abilities'
              ? 'flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-4 md:pl-4'
              : 'min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pt-4 md:pl-4'
          }
        >

          {nav.firstRepairTabId && nav.firstRepairTabId !== activeTabId ? (

            <p

              className="rounded-lg border border-amber-500/60 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"

              role="status"

            >

              Resolve &quot;

              {nav.tabs.find((t) => t.id === nav.firstRepairTabId)?.label}&quot; first

              (top-down), then continue through remaining flagged tabs.

            </p>

          ) : null}



          {activeView?.visual === 'na' && activeView.naReason ? (
            <ForgeTabNaBanner message={activeView.naReason} />
          ) : null}

          {activeView?.conflictReason ? (

            <p

              className="rounded-lg border border-amber-600/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100"

              role="alert"

            >

              {activeView.conflictReason}

            </p>

          ) : null}



          {activeTabId === 'tab8_review' ? (

            <>

              <CreationReviewFinalize

                onSpawnConfirm={(finalize) => {

                  if (onSpawnFinalize) onSpawnFinalize(finalize)

                  else finalize()

                }}

              />

              <p className="text-xs text-slate-500">

                Review is a summary only — all dice must be finalized on earlier tabs
                before you can spawn.

              </p>

            </>

          ) : activeTabId === 'tab4_skills' ||
            activeTabId === 'tab1_configurator' ||
            activeTabId === 'tab6_traits' ? (

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

              <ForgeTabInactiveShell inactive={tabInactive} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <ForgeTabBody
                  tabId={activeTabId}
                  morphusActive={morphusLedger}
                  creationGenreId={creationGenreId}
                  hostGenreId={hostGenreId}
                />
              </ForgeTabInactiveShell>

            </div>

          ) : (

            <ForgeTabInactiveShell inactive={tabInactive}>
              <ForgeTabBody
                tabId={activeTabId}
                morphusActive={morphusLedger}
                creationGenreId={creationGenreId}
                hostGenreId={hostGenreId}
              />
            </ForgeTabInactiveShell>

          )}

        </div>

        </div>

      </SupernaturalAbilitiesForgeProvider>

      <aside

        className={`flex max-h-[min(36vh,16rem)] min-h-0 shrink-0 flex-col border-t shadow-sm md:max-h-none md:w-54 md:border-t-0 md:border-l lg:w-60 xl:w-72 ${
          morphusLedger
            ? `${MORPHUS_LEDGER_BORDER_CLASS} ${MORPHUS_LEDGER_SURFACE_CLASS}`
            : 'border-blue-200 bg-white dark:border-blue-600 dark:bg-slate-950'
        }`}

        aria-label="Live ledger panel"

      >

        <LiveLedger variant="sidebar" />

      </aside>

    </div>

  )

}


