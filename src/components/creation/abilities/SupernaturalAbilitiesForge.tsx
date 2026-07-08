import {

  SUPERNATURAL_ABILITY_LANE_LABELS,

} from '../../../lib/forgeNavigation/supernaturalAbilitiesForge'

import { useSupernaturalAbilitiesForge } from './useSupernaturalAbilitiesForge'

import { MagicForgePanel } from './MagicForgePanel'

import { PsionicsForgePanel } from './PsionicsForgePanel'

import { SupernaturalAbilityLaneEngineBar } from './SupernaturalAbilityLaneEngineBar'

import { SupernaturalAbilityLaneNaPanel } from './SupernaturalAbilityLaneNaPanel'

import { SupernaturalAbilityLaneTabs } from './SupernaturalAbilityLaneTabs'

import { TalentsForgePanel } from './TalentsForgePanel'



export function SupernaturalAbilitiesForgeLaneTabs() {

  const { budget, activeLane, setActiveLane, occName, morphus } =

    useSupernaturalAbilitiesForge()

  return (

    <SupernaturalAbilityLaneTabs

      budget={budget}

      activeLane={activeLane}

      onSelectLane={setActiveLane}

      occName={occName}

      morphus={morphus}

    />

  )

}



export function SupernaturalAbilitiesForge() {

  const {

    morphus,

    isNightbane,

    genreId,

    occName,

    activeOcc,

    occCreationDerived,

    budget,

    spellCap,

    activeLane,

    counts,

    activeLaneAllowed,

    psychicTier,
    psychicGateBypassed,
    majorAllocation,
    selectedIds,
  } = useSupernaturalAbilitiesForge()



  const laneSelectionCount =

    activeLane === 'magic'

      ? counts.spell

      : activeLane === 'psionics'

        ? counts.psionic

        : counts.talent



  return (

    <section

      className="flex min-h-0 min-w-0 flex-1 flex-col"

      aria-labelledby="forge-tab-page-heading"

    >

      <div

        role="tabpanel"

        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5"

        aria-label={SUPERNATURAL_ABILITY_LANE_LABELS[activeLane]}

      >

          {!activeLaneAllowed ? (

            <SupernaturalAbilityLaneNaPanel

              lane={activeLane}

              occName={occName}

              morphus={morphus}

            />

          ) : (

            <SupernaturalAbilityLaneEngineBar

              lane={activeLane}

              morphus={morphus}

              occ={activeOcc}

              derived={occCreationDerived}

              selectionCount={laneSelectionCount}

              effectiveBudget={budget}

              psychicGateContext={{
                tier: psychicTier,
                psychicGateBypassed,
                majorAllocation,
              }}
              selectedIds={selectedIds}
              genreId={genreId}
            />

          )}

          {activeLane === 'magic' && activeLaneAllowed ? (

            <MagicForgePanel
              morphus={morphus}
              genreId={genreId}
              activeOcc={activeOcc}
              spellCap={spellCap}
              spellBudget={budget.spellSlots}
              spellCount={counts.spell}
            />

          ) : null}

          {activeLane === 'psionics' && activeLaneAllowed ? (

            <PsionicsForgePanel

              morphus={morphus}

              genreId={genreId}

              activeOcc={activeOcc}

              spellCap={spellCap}

              psionicBudget={budget.psionicSlots}

            />

          ) : null}

          {activeLane === 'talents' && activeLaneAllowed ? (

            <TalentsForgePanel

              morphus={morphus}

              genreId={genreId}

              isNightbane={isNightbane}

              activeOcc={activeOcc}

              spellCap={spellCap}

              talentBudget={budget.talentSlots}

              talentCount={counts.talent}

            />

          ) : null}

        </div>

      </section>

  )

}


