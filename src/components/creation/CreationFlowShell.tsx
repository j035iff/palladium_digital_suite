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
import {
  buildCharacterCreationForgeContext,
  deriveCharacterCreationForgeNavigation,
  resolveActiveForgeTab,
  type CharacterCreationForgeTabId,
} from '../../lib/forgeNavigation/characterCreationForge'

function ForgeTabBody({ tabId }: { tabId: CharacterCreationForgeTabId }) {
  switch (tabId) {
    case 'tab1_configurator':
      return <OccSelector />
    case 'tab2_attributes':
      return (
        <>
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

  const handleContinue = () => {
    if (!nav.continueEnabled) return
    markCreationForgeTabComplete(activeTabId)
  }

  return (
    <div className="space-y-6">
      <CreationAttributeHeader />

      <ForgeNavigationBar
        tabs={nav.tabs}
        activeTabId={activeTabId}
        onSelectTab={(id) => setCreationForgeTab(id as CharacterCreationForgeTabId)}
      />

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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {activeTabId === 'tab7_review' ? (
            <CreationReviewFinalize
              onSpawnConfirm={(finalize) => {
                if (onSpawnFinalize) onSpawnFinalize(finalize)
                else finalize()
              }}
            />
          ) : (
            <ForgeTabBody tabId={activeTabId} />
          )}
        </div>
        <LiveLedger />
      </div>

      {nav.showContinue ? (
        <ForgeContinueGate
          enabled={nav.continueEnabled}
          validated={activeView?.visual === 'complete'}
          tooltip={nav.continueTooltip}
          blockers={activeBlockers}
          onContinue={handleContinue}
        />
      ) : activeTabId !== 'tab7_review' ? null : (
        <p className="text-xs text-slate-500">
          Review is the terminal gate — resolve pending dice and spawn when ready.
        </p>
      )}
    </div>
  )
}
