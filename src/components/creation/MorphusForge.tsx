import { useCallback, useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { ForgeNavigationBar, nextForgeTabIdAfter } from '../forge/ForgeNavigationBar'
import { ForgeTabPageHeader } from '../forge/ForgeTabPageHeader'
import {
  deriveMorphusForgeNavigation,
  morphusForgeStateAfterPathChange,
  resolveMorphusForgeState,
  type MorphusForgeSubTabId,
} from '../../lib/morphusForgeNavigation'
import { MorphusCrossroadsTab } from './morphus/MorphusCrossroadsTab'
import { MorphusTraitForgeTab } from './morphus/MorphusTraitForgeTab'
import { MorphusReviewTab } from './morphus/MorphusReviewTab'

const SUB_TAB_TITLES: Record<MorphusForgeSubTabId, string> = {
  crossroads: 'Tab 1: Crossroads & Initialization',
  trait_forge: 'Tab 2: Dynamic Trait Forge',
  review: 'Tab 3: Morphus Review & Validation',
}

export function MorphusForge() {
  const {
    character,
    activeRace,
    effectiveOcc,
    psychicTier,
    supportsDualForm,
    patchMorphusForgeState,
    markMorphusForgeSubTabComplete,
    setMorphusForgeSubTab,
  } = useCharacter()

  const primaryReady =
    !supportsDualForm || character.creationPrimaryDiceFinalized === true

  const navCtx = useMemo(
    () => ({
      supportsDualForm,
      psychicTier,
      race: activeRace,
      occ: effectiveOcc ?? undefined,
    }),
    [supportsDualForm, psychicTier, activeRace, effectiveOcc],
  )

  const morphusState = useMemo(
    () => resolveMorphusForgeState(character),
    [character],
  )

  const nav = useMemo(
    () => deriveMorphusForgeNavigation(character, navCtx),
    [character, navCtx],
  )

  const activeSubTab = nav.activeSubTabId
  const activeView = nav.tabs.find((t) => t.id === activeSubTab)

  const handlePatchCrossroads = useCallback(
    (patch: Parameters<typeof morphusForgeStateAfterPathChange>[1]) => {
      patchMorphusForgeState((prev) => morphusForgeStateAfterPathChange(prev, patch))
    },
    [patchMorphusForgeState],
  )

  const handleContinue = () => {
    if (!nav.continueEnabled) return
    const current = activeSubTab
    markMorphusForgeSubTabComplete(current)
    const nextId = nextForgeTabIdAfter(nav.tabs, current)
    if (nextId) setMorphusForgeSubTab(nextId as MorphusForgeSubTabId)
  }

  if (!primaryReady) {
    return (
      <section aria-labelledby="forge-tab-page-heading">
        <p
          className="rounded-lg border border-amber-500/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          Complete all Facade dice on the <strong>Roll Pending</strong> tab before building
          Morphus.
        </p>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="forge-tab-page-heading"
      className="flex min-h-0 flex-1 flex-col space-y-4"
    >
      <div className="rounded-xl border border-violet-800/60 bg-slate-950/30 p-3">
        <ForgeNavigationBar
          tabs={nav.tabs}
          activeTabId={activeSubTab}
          continueEnabled={nav.continueEnabled}
          continueTooltip={nav.continueTooltip}
          onContinueTab={() => handleContinue()}
          onSelectTab={(id) => setMorphusForgeSubTab(id as MorphusForgeSubTabId)}
        />
        <div className="mt-3">
          <ForgeTabPageHeader
            title={SUB_TAB_TITLES[activeSubTab]}
            visual={activeView?.visual ?? 'active'}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
          {activeSubTab === 'crossroads' ? (
            <MorphusCrossroadsTab
              morphusForgeState={morphusState}
              onPatchState={handlePatchCrossroads}
            />
          ) : null}
          {activeSubTab === 'trait_forge' ? (
            <MorphusTraitForgeTab
              morphusForgeState={morphusState}
              onSetCharacteristicsCount={(count) =>
                patchMorphusForgeState((prev) => ({
                  ...prev,
                  characteristicsPickCount: count,
                }))
              }
            />
          ) : null}
          {activeSubTab === 'review' ? (
            <MorphusReviewTab
              morphusForgeState={morphusState}
              onFinalize={() => {
                /* creationTraitForgeStubComplete set in MorphusReviewTab */
              }}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
