import { useMemo } from 'react'

import { OccSelector } from './OccSelector'

import { AttributeForge } from './AttributeForge'

import { PsychicGate } from './PsychicGate'

import { SkillEngine } from './SkillEngine'

import { AbilitySelection } from './AbilitySelection'

import { CreationReviewFinalize } from './CreationReviewFinalize'

import { OccVariableBonusPhase } from './OccVariableBonusPhase'

import { CreationAttributeHeader } from './CreationAttributeHeader'

import { LiveLedger } from './LiveLedger'

import { useCharacter } from '../../context/CharacterContext'

import { MorphusForgeStub } from './MorphusForgeStub'

import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'

import { ForgeContinueGate } from '../forge/ForgeContinueGate'

import { ForgeTabPageHeader } from '../forge/ForgeTabPageHeader'

import {

  buildCharacterCreationForgeContext,

  CHARACTER_CREATION_TAB_PAGE_TITLES,

  deriveCharacterCreationForgeNavigation,

  resolveActiveForgeTab,

  type CharacterCreationForgeTabId,

} from '../../lib/forgeNavigation/characterCreationForge'

import { listCharacterCreationTabRequirements } from '../../lib/forgeNavigation/characterCreationTabRequirements'



function ForgeTabBody({ tabId }: { tabId: CharacterCreationForgeTabId }) {

  switch (tabId) {

    case 'tab1_configurator':

      return <OccSelector />

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

    case 'tab5_traits':

      return <MorphusForgeStub />

    case 'tab6_abilities':

      return <AbilitySelection />

    case 'tab7_review':

      return null

    default:

      return null

  }

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

    setCreationForgeTab,

    markCreationForgeTabComplete,

  } = useCharacter()



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

  const activeBlockers = activeView?.blockers ?? []

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

      <aside

        className="flex min-h-0 shrink-0 flex-col border-b border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-900/50 md:w-72 md:border-b-0 md:border-r lg:w-80 xl:w-96"

        aria-label="Live ledger panel"

      >

        <div className="max-h-[min(36vh,16rem)] min-h-0 overflow-y-auto overscroll-contain md:max-h-none md:flex-1">

          <LiveLedger variant="sidebar" />

        </div>

      </aside>



      <div className="flex min-h-0 min-w-0 flex-1 flex-col">

        <div

          className="shrink-0 border-b border-slate-200 bg-white pb-3 shadow-sm dark:border-slate-700 dark:bg-slate-950"

          aria-label="Creation forge frame"

        >

          <div className="pt-1">

            <ForgeNavigationBar

              tabs={nav.tabs}

              activeTabId={activeTabId}

              onSelectTab={(id) => setCreationForgeTab(id as CharacterCreationForgeTabId)}

            />

          </div>

          <div className="mt-3">

            <ForgeTabPageHeader

              title={CHARACTER_CREATION_TAB_PAGE_TITLES[activeTabId]}

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

        </div>



        <div
          className={
            activeTabId === 'tab4_skills'
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



          {activeView?.conflictReason ? (

            <p

              className="rounded-lg border border-amber-600/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100"

              role="alert"

            >

              {activeView.conflictReason}

            </p>

          ) : null}



          {activeTabId === 'tab7_review' ? (

            <>

              <CreationReviewFinalize

                onSpawnConfirm={(finalize) => {

                  if (onSpawnFinalize) onSpawnFinalize(finalize)

                  else finalize()

                }}

              />

              <p className="text-xs text-slate-500">

                Review is the terminal gate — resolve pending dice and spawn when ready.

              </p>

            </>

          ) : activeTabId === 'tab4_skills' ? (

            <div className="min-h-0 flex-1">

              <ForgeTabBody tabId={activeTabId} />

            </div>

          ) : (

            <ForgeTabBody tabId={activeTabId} />

          )}

        </div>

      </div>

    </div>

  )

}


