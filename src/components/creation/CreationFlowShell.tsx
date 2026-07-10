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

import { CreationForgeLeftSlot } from './CreationForgeLeftSlot'
import { CreationForgeLeftSlotProvider } from './CreationForgeLeftSlotContext'
import { creationForgeLeftColumnClass } from './creationForgeLeftPanelTheme'
import { ForgeTabDevActions } from './ForgeTabDevActions'

import { LiveLedger } from './LiveLedger'
import {
  MORPHUS_LEDGER_BORDER_CLASS,
  MORPHUS_LEDGER_SURFACE_CLASS,
} from './LedgerStatGrid'

import { MorphusForge } from './MorphusForge'

import { CreationFinalizeDice } from './CreationFinalizeDice'

import { ForgeNavigationBar, nextForgeTabIdAfter } from '../forge/ForgeNavigationBar'

import { ForgeTabNaBanner } from '../forge/ForgeTabNaBanner'

import { ForgeTabInactiveShell } from '../forge/ForgeTabInactiveShell'

import { ForgeTabPageHeader, FORGE_TAB_PAGE_HEADING_ID } from '../forge/ForgeTabPageHeader'
import {
  FORGE_SHORT_VIEWPORT_QUERY,
  useMediaQuery,
} from '../../lib/useMediaQuery'

import {

  buildCharacterCreationForgeContext,

  CHARACTER_CREATION_TAB_PAGE_TITLES,

  deriveCharacterCreationForgeNavigation,

  resolveActiveForgeTab,

  type CharacterCreationForgeTabId,

} from '../../lib/forgeNavigation/characterCreationForge'

import {
  listCharacterCreationTabRequirements,
} from '../../lib/forgeNavigation/characterCreationTabRequirements'



function ForgeTabBody({
  tabId,
}: {
  tabId: CharacterCreationForgeTabId
}) {

  switch (tabId) {

    case 'tab1_configurator':

      return <ConfiguratorPanel />

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
  tone = 'light',
}: {
  canSaveForLater: boolean
  onReset: () => void
  onSaveForLater: () => void
  onLeave: () => void
  tone?: 'light' | 'dark'
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
    : 'Continue past Race and OCC before saving for later.'

  const sessionButtonClass =
    tone === 'dark'
      ? 'rounded-lg border border-slate-500 bg-slate-800 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-100 outline-none transition hover:border-slate-400 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500'
      : 'rounded-lg border-2 border-slate-300 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 outline-none transition hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-400'

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className={sessionButtonClass}
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

  const shellPanelMorphus = supportsDualForm && activeForm === 'morphus'



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

  const pageTitle = CHARACTER_CREATION_TAB_PAGE_TITLES[activeTabId]

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
    const current = activeTabId
    markCreationForgeTabComplete(current)
    const nextId = nextForgeTabIdAfter(nav.tabs, current)
    if (nextId) setCreationForgeTab(nextId as CharacterCreationForgeTabId)
  }



  const denseTabBody =
    activeTabId === 'tab1_configurator' ||
    activeTabId === 'tab4_skills' ||
    activeTabId === 'tab6_traits' ||
    activeTabId === 'tab7_abilities'

  const shortViewport = useMediaQuery(FORGE_SHORT_VIEWPORT_QUERY)

  const unsatisfiedRequirements = activeRequirements.filter((req) => !req.satisfied)
  const allRequirementsSatisfied =
    activeRequirements.length > 0 && unsatisfiedRequirements.length === 0
  const showTab7Lanes = activeTabId === 'tab7_abilities'

  const [bannerCollapsing, setBannerCollapsing] = useState(false)
  const [collapseSnapshot, setCollapseSnapshot] = useState(activeRequirements)
  const [collapseOffset, setCollapseOffset] = useState<{ dx: number; dy: number } | null>(
    null,
  )
  const hadUnsatisfiedRef = useRef(false)
  const prevTabIdRef = useRef(activeTabId)
  const continueTargetRef = useRef<HTMLButtonElement | null>(null)
  const bannerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (prevTabIdRef.current !== activeTabId) {
      prevTabIdRef.current = activeTabId
      setBannerCollapsing(false)
      setCollapseOffset(null)
      hadUnsatisfiedRef.current = unsatisfiedRequirements.length > 0
      setCollapseSnapshot(activeRequirements)
      return
    }

    if (unsatisfiedRequirements.length > 0) {
      hadUnsatisfiedRef.current = true
      setCollapseSnapshot(activeRequirements)
      setBannerCollapsing(false)
      setCollapseOffset(null)
      return
    }

    if (
      hadUnsatisfiedRef.current &&
      allRequirementsSatisfied &&
      nav.continueEnabled &&
      !bannerCollapsing
    ) {
      setCollapseSnapshot(activeRequirements)
      // Measure after Continue pill paints, then start collapse into that bubble.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const banner = bannerRef.current
          const target = continueTargetRef.current
          if (banner && target) {
            const b = banner.getBoundingClientRect()
            const t = target.getBoundingClientRect()
            // Origin = Continue tab center relative to banner top-left.
            // Scaling toward that origin reads as "sucked into" the bubble.
            setCollapseOffset({
              dx: t.left + t.width / 2 - b.left,
              dy: t.top + t.height / 2 - b.top,
            })
          } else {
            setCollapseOffset({ dx: 48, dy: -24 })
          }
          setBannerCollapsing(true)
        })
      })
    }
  }, [
    activeTabId,
    activeRequirements,
    unsatisfiedRequirements.length,
    allRequirementsSatisfied,
    nav.continueEnabled,
    bannerCollapsing,
  ])

  const showRequirementsBanner =
    bannerCollapsing ||
    unsatisfiedRequirements.length > 0 ||
    // Keep the filled checklist visible for one frame until collapse starts.
    (allRequirementsSatisfied && hadUnsatisfiedRef.current)

  const showContextualBanner =
    showTab7Lanes ||
    showRequirementsBanner ||
    activeView?.visual === 'na'

  const bannerRequirements = bannerCollapsing ? collapseSnapshot : activeRequirements

  return (

    <div className="flex h-full min-h-0 flex-1 flex-col md:flex-row md:gap-0">

      <SupernaturalAbilitiesForgeProvider>

        <CreationForgeLeftSlotProvider>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">

          <div

            className="shrink-0 border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950"

            aria-label="Creation forge frame"

          >

            <div
              className={`flex items-start justify-between gap-3 border-b border-slate-200 bg-white ${
                shortViewport ? 'px-3 py-1' : 'px-4 py-1.5'
              } ${shellPanelMorphus ? 'bg-violet-50' : ''}`}
              aria-label="Character identity"
            >
              <IdentityHeader
                variant="creation"
                morphusActive={shellPanelMorphus}
                creationGenreId={creationGenreId}
                hostGenreId={hostGenreId}
                compactChrome={shortViewport}
              />
              <SessionMenu
                canSaveForLater={canSaveCreationForLater}
                onReset={resetCreation}
                onSaveForLater={saveCreationForLater}
                onLeave={leaveCreationWithoutSaving}
              />
            </div>

            <div
              className={`flex items-center gap-2 border-b border-slate-200 ${
                shortViewport ? 'px-3 py-1' : 'gap-3 px-4 py-1.5'
              }`}
            >
              <div className="min-w-0 flex-1">
                <ForgeNavigationBar
                  tabs={nav.tabs}
                  activeTabId={activeTabId}
                  singleRow
                  continueEnabled={nav.continueEnabled}
                  continueTooltip={nav.continueTooltip}
                  continueTargetRef={continueTargetRef}
                  onContinueTab={() => handleContinue()}
                  onSelectTab={(id) => setCreationForgeTab(id as CharacterCreationForgeTabId)}
                />
              </div>
              <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1.5">
                <ForgeTabDevActions activeTabId={activeTabId} />
              </div>
            </div>

            {showContextualBanner ? (
              <div
                className={`${
                  shortViewport ? 'px-3 pb-1.5 pt-1.5' : 'px-4 pb-2 pt-2'
                } ${bannerCollapsing ? 'overflow-hidden !pb-0 !pt-0' : ''}`}
              >
                <ForgeTabPageHeader
                  title={pageTitle}
                  hideTitle
                  visual={activeView?.visual ?? 'active'}
                  bannerRef={bannerRef}
                  requirements={
                    showTab7Lanes && !showRequirementsBanner && !bannerCollapsing
                      ? []
                      : bannerRequirements
                  }
                  collapsing={bannerCollapsing}
                  collapseOffset={collapseOffset}
                  onCollapseEnd={() => {
                    setBannerCollapsing(false)
                    setCollapseOffset(null)
                    hadUnsatisfiedRef.current = false
                  }}
                  subheader={
                    showTab7Lanes && !bannerCollapsing ? (
                      <ForgeTabInactiveShell inactive={tabInactive}>
                        <SupernaturalAbilitiesForgeLaneTabs />
                      </ForgeTabInactiveShell>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <h2 id={FORGE_TAB_PAGE_HEADING_ID} className="sr-only">
                {pageTitle}
              </h2>
            )}

          </div>



        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">

          <aside
            className={`hidden min-h-0 shrink-0 flex-col overflow-hidden border-slate-300 p-4 pr-3 md:flex md:h-full md:w-80 md:flex-col md:border-r xl:w-96 ${creationForgeLeftColumnClass(shellPanelMorphus)} ${
              shellPanelMorphus ? 'border-violet-300' : ''
            }`}
            aria-label="Forge summary panel"
          >
            <CreationForgeLeftSlot
              activeTabId={activeTabId}
              morphus={shellPanelMorphus}
            />
          </aside>

          <div
            className={
              denseTabBody
                ? 'flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-4'
                : 'min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pt-4'
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
            activeTabId === 'tab6_traits' ||
            activeTabId === 'tab7_abilities' ? (

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

              <ForgeTabInactiveShell inactive={tabInactive} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <ForgeTabBody tabId={activeTabId} />
              </ForgeTabInactiveShell>

            </div>

          ) : (

            <ForgeTabInactiveShell inactive={tabInactive}>
              <ForgeTabBody tabId={activeTabId} />
            </ForgeTabInactiveShell>

          )}

        </div>

        </div>

        </div>

        </CreationForgeLeftSlotProvider>

      </SupernaturalAbilitiesForgeProvider>

      <aside

        className={`flex max-h-[min(36vh,16rem)] min-h-0 shrink-0 flex-col border-t shadow-sm md:max-h-none md:w-60 md:border-t-0 md:border-l lg:w-60 xl:w-72 ${
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


