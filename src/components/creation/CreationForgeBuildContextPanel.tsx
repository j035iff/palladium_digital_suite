import { useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { resolveEffectiveCreationAbilityBudget } from '../../lib/creationAbilityBudget'
import { isConfiguratorOccSelected, isConfiguratorRaceSelected } from '../../lib/configuratorMatrix'
import {
  listPendingDiceBlocks,
  pendingDiceBlocksResolutionComplete,
} from '../../lib/pendingDiceLedger'
import {
  creationFreeRelatedSkillCap,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
  sumCreationSkillPickSlots,
  sumRelatedPoolSlotUsage,
} from '../../lib/creationSkillPicks'
import {
  creationHandToHandReservedRelatedSlots,
} from '../../lib/creationHandToHandChoice'
import {
  resolveOccCoreSkillPicks,
} from '../../lib/occCoreSkillVouchers'
import {
  listOccRelatedVoucherTasks,
  sumRelatedVoucherReservedSlots,
} from '../../lib/occRelatedSkillVouchers'
import { CreationForgePanelChrome } from './CreationForgePanelChrome'
function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="shrink-0 font-semibold uppercase tracking-wide opacity-60">
        {label}
      </span>
      <span className="min-w-0 text-right font-medium leading-snug">{value}</span>
    </div>
  )
}

export function CreationForgeBuildContextPanel({ morphus }: { morphus: boolean }) {
  const {
    character,
    activeRace,
    effectiveOcc,
    occCreationDerived,
    skillSlotMultiplier,
    psychicTier,
    supportsDualForm,
  } = useCharacter()

  const raceLabel = isConfiguratorRaceSelected(character.raceId)
    ? (activeRace?.name ?? 'Race selected')
    : 'Not selected'

  const occLabel = isConfiguratorOccSelected(character.occ.id)
    ? (effectiveOcc?.name ?? 'O.C.C. selected')
    : 'Not selected'

  const specialization = effectiveOcc?.specializations?.find(
    (entry) => entry.id === character.occSpecializationId,
  )

  const genreId = character.creationGenreId ?? character.hostGenreId ?? 'nightbane'

  const abilityBudget = useMemo(
    () =>
      resolveEffectiveCreationAbilityBudget({
        occ: effectiveOcc ?? undefined,
        raceId: character.raceId,
        psychicTier,
        psychicGateBypassed: character.psychicGateBypassed === true,
        majorAllocation: character.creationPsychicGateMajorAllocation,
        storedBudget: character.creationAbilityBudget,
        creationGenreId: genreId,
        hostGenreId: character.hostGenreId,
      }),
    [
      effectiveOcc,
      character.raceId,
      psychicTier,
      character.psychicGateBypassed,
      character.creationPsychicGateMajorAllocation,
      character.creationAbilityBudget,
      genreId,
      character.hostGenreId,
    ],
  )

  const voucherPicks = character.creationOccCoreVoucherPicks ?? {}
  const resolvedOccPicks = useMemo(
    () =>
      resolveOccCoreSkillPicks(
        effectiveOcc ?? undefined,
        character.occSpecializationId,
        voucherPicks,
        character.creationOccGrantPickDetails,
      ),
    [
      effectiveOcc,
      character.occSpecializationId,
      voucherPicks,
      character.creationOccGrantPickDetails,
    ],
  )
  const relatedSelected = getCreationRelatedPicks(character)
  const secondarySelected = getCreationSecondaryPicks(character)
  const relatedBase =
    occCreationDerived?.occRelatedSkillSlotBudget ??
    character.occRelatedSkillSlotBudget ??
    10
  const relatedCap = Math.floor(relatedBase * skillSlotMultiplier)
  const secondaryCap = occCreationDerived?.secondarySkillSlots ?? 0
  const handToHandReserved = effectiveOcc
    ? creationHandToHandReservedRelatedSlots(effectiveOcc, character)
    : 0
  const relatedVoucherReserved = sumRelatedVoucherReservedSlots(
    listOccRelatedVoucherTasks(effectiveOcc, character.occSpecializationId),
  )
  const freeRelatedCap = creationFreeRelatedSkillCap(
    relatedCap,
    relatedVoucherReserved,
  )
  const relatedUsed = sumRelatedPoolSlotUsage(
    relatedSelected,
    resolvedOccPicks,
    handToHandReserved,
    {
      occ: effectiveOcc ?? undefined,
      specializationId: character.occSpecializationId,
    },
  )
  const secondaryPickSlots = sumCreationSkillPickSlots(secondarySelected, {
    occ: effectiveOcc ?? undefined,
    specializationId: character.occSpecializationId,
  })
  const pendingScope = supportsDualForm ? 'primary' : 'all'
  const pendingBlocks = useMemo(
    () =>
      listPendingDiceBlocks(character, activeRace, effectiveOcc ?? undefined, {
        supportsDualForm,
        psychicTier,
        scope: pendingScope,
      }),
    [
      character,
      activeRace,
      effectiveOcc,
      supportsDualForm,
      psychicTier,
      pendingScope,
    ],
  )
  const pendingComplete =
    pendingBlocks.length === 0 ||
    pendingDiceBlocksResolutionComplete(
      pendingBlocks,
      character.creationPendingDiceResolutions ?? {},
    )

  const psychicLabel =
    character.psychicGateBypassed === true
      ? 'Bypassed'
      : psychicTier === 'none'
        ? 'None'
        : psychicTier.charAt(0).toUpperCase() + psychicTier.slice(1)

  const abilityParts: string[] = []
  if (abilityBudget.spellSlots > 0) {
    abilityParts.push(`${abilityBudget.spellSlots} spell${abilityBudget.spellSlots === 1 ? '' : 's'}`)
  }
  if (abilityBudget.psionicSlots > 0) {
    abilityParts.push(
      `${abilityBudget.psionicSlots} psionic${abilityBudget.psionicSlots === 1 ? '' : 's'}`,
    )
  }
  if (abilityBudget.talentSlots > 0) {
    abilityParts.push(
      `${abilityBudget.talentSlots} talent${abilityBudget.talentSlots === 1 ? '' : 's'}`,
    )
  }

  return (
    <CreationForgePanelChrome
      title="Build context"
      description="Race, O.C.C., and key budgets for this step."
      morphus={morphus}
      aria-label="Character build context"
    >
      <div className="space-y-3">
        <ContextRow label="Race" value={raceLabel} />
        <ContextRow label="O.C.C." value={occLabel} />
        {specialization ? (
          <ContextRow label="Spec" value={specialization.name} />
        ) : null}
        <ContextRow label="Psychic" value={psychicLabel} />
        {freeRelatedCap > 0 || relatedVoucherReserved > 0 ? (
          <ContextRow
            label="Related"
            value={`${relatedUsed} / ${freeRelatedCap} slots`}
          />
        ) : null}
        {secondaryCap > 0 ? (
          <ContextRow
            label="Secondary"
            value={`${secondaryPickSlots} / ${secondaryCap}`}
          />
        ) : null}
        {abilityParts.length > 0 ? (
          <ContextRow label="Abilities" value={abilityParts.join(' · ')} />
        ) : null}
        {pendingBlocks.length > 0 ? (
          <ContextRow
            label="Dice"
            value={pendingComplete ? 'All entered' : 'Rolls pending'}
          />
        ) : null}
      </div>
    </CreationForgePanelChrome>
  )
}
