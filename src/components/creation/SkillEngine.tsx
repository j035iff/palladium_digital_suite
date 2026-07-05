import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'

import { useCharacter } from '../../context/CharacterContext'

import type { EngineSkillDef } from '../../data/library/skills'

import { getSkillById } from '../../data/library/skills'

import {

  listCreationSkillBookCategories,

  listCreationSkillLibrary,

  matchesSkillBookCategoryFilter,

  partitionCreationSkillLibrary,

} from '../../lib/creationSkillCatalog'

import { resolveCreationLibrarySkillPreview } from '../../lib/skillDisplayDetails'

import {
  appendCreationSkillPickWithConditionalGrants,
  grantedBySkillLabel,
  hasConditionalGrantForSkill,
  removeCreationSkillPickWithConditionalCascade,
  replaceConditionalGrantWithPaidPick,
} from '../../lib/conditionalRelatedSkills'

import { buildLiveSkillContext } from '../../lib/liveSkillEngine'

import {
  missingPrerequisiteMessage,
  prerequisiteSatisfied,
} from '../../lib/skillPrerequisites'

import {
  canAddSkillViaOccCoreVoucher,
  collectAllCreationSkillPicks,
  findOccCoreVoucherSlotForPick,
  findOpenOccCoreVoucherSlot,
  isOccCoreGrantSkillPick,
  listOccCoreVoucherTasks,
  resolveCreationLibrarySkillTier,
  resolveCreationOccSkillIds,
  resolveOccCoreSkillPicks,
  voucherUsesDedicatedPickerUi,
} from '../../lib/occCoreSkillVouchers'

import {
  canAffordHandToHandTier,
  creationHandToHandReservedRelatedSlots,
  effectiveCreationHandToHandTier,
  listOccHandToHandOptions,
  type CreationHandToHandTier,
} from '../../lib/creationHandToHandChoice'

import {

  resolveActiveSynergyBonusLines,

  resolveSkillCreationDisplay,

  type SkillPickDisplayTier,

} from '../../lib/skillCreationDisplay'

import {
  formatSkillPrerequisiteSummary,
  listSkillSynergyHints,
  skillPickRowSurfaceClass,
} from '../../lib/skillBlockDisplay'
import { SkillPrerequisiteMeta, SkillSynergyMeta } from './SkillSelectionMeta'

import {
  buildCreationSkillPick,
  creationLibrarySkillAddState,
  creationSkillIdsSet,
  creationSkillPickHasEditableSpecialization,
  downgradePickToStandard,
  formatCreationSkillPickLabel,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
  getOccCoreVoucherSlotPicks,
  isCreationLibrarySkillUnconditionallyExcluded,
  isCreationSkillIdentityTaken,
  professionalQualityLabel,
  resolveCreationLibrarySkillBlockReason,
  skillNeedsPickDialog,
  skillNeedsVoucherPickDialog,
  skillRequiresSpecialization,
  skillSupportsProfessionalQuality,
  sumCreationSkillPickSlots,
  sumRelatedPoolSlotUsage,
  upgradePickToProfessional,
} from '../../lib/creationSkillPicks'

import { CreationSelectedSkillsPanel } from './CreationSelectedSkillsPanel'

import { SkillPickAddDialog, type SkillPickAddDialogState } from './SkillPickAddDialog'

import { SkillSpecializationEditDialog } from './SkillSpecializationEditDialog'

import { SkillStatLines } from './SkillStatLines'
import { SkillSelectedPercentBlock } from './SkillSelectedPercentBlock'

import type { CreationSkillPick } from '../../types'

const DevAutoFillSkillsButton = import.meta.env.DEV
  ? lazy(() =>
      import('./dev/DevAutoFillSkillsButton').then((m) => ({
        default: m.DevAutoFillSkillsButton,
      })),
    )
  : null

import {
  formatOccCategoryRuleDropdown,
  formatOccCategoryRuleHeader,
  occCategoryRuleToneClass,
  resolveOccCategoryRuleForFilter,
} from '../../lib/occCategoryRuleDisplay'



export function SkillEngine() {

  const {

    character,

    activeForm,

    activeFormState,

    effectiveOcc,

    occCreationDerived,

    supportsDualForm,

    skillSlotMultiplier,

    morphusSurfaceType,

    psychicTier,

    setCreationSkillPicks,

    setCreationOccCoreVoucherPick,

    setCreationOccGrantPickDetail,

    setCreationHandToHandTier,

    hostGenreId,

  } = useCharacter()



  const morphus = supportsDualForm && activeForm === 'morphus'

  const [search, setSearch] = useState('')

  const [category, setCategory] = useState<string>('')

  const [categoryOpen, setCategoryOpen] = useState(false)

  const categorySelectRef = useRef<HTMLDivElement>(null)

  const [pickDialog, setPickDialog] = useState<SkillPickAddDialogState | null>(null)

  const [pendingOccVoucherSlot, setPendingOccVoucherSlot] = useState<{
    taskId: string
    slot: number
    choiceCount: number
    skillId: string
  } | null>(null)

  const [editPick, setEditPick] = useState<{
    pick: CreationSkillPick
    tier: SkillPickDisplayTier
  } | null>(null)



  const occSkillIds = character.creationOccSkillIds ?? []

  const relatedSelected = useMemo(
    () => getCreationRelatedPicks(character),
    [character],
  )

  const secondarySelected = useMemo(
    () => getCreationSecondaryPicks(character),
    [character],
  )

  const voucherPicks = character.creationOccCoreVoucherPicks ?? {}



  const resolvedOccSkillIds = useMemo(

    () =>

      resolveCreationOccSkillIds(

        effectiveOcc,

        character.occSpecializationId,

        occSkillIds,

        voucherPicks,

      ),

    [effectiveOcc, character.occSpecializationId, occSkillIds, voucherPicks],

  )

  const resolvedOccPicks = useMemo(

    () =>

      resolveOccCoreSkillPicks(

        effectiveOcc,

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

  const allCreationPicks = useMemo(
    () => collectAllCreationSkillPicks(character, effectiveOcc),
    [character, effectiveOcc],
  )



  const setRelatedSelected = (next: CreationSkillPick[]) => {

    setCreationSkillPicks(occSkillIds, next, secondarySelected)

  }

  const setSecondarySelected = (next: CreationSkillPick[]) => {

    setCreationSkillPicks(occSkillIds, relatedSelected, next)

  }



  const relatedBase =

    occCreationDerived?.occRelatedSkillSlotBudget ??

    character.occRelatedSkillSlotBudget ??

    10

  const relatedCap = Math.floor(relatedBase * skillSlotMultiplier)

  const handToHandReserved = effectiveOcc
    ? creationHandToHandReservedRelatedSlots(effectiveOcc, character)
    : 0

  const relatedSkillCap = relatedCap

  const relatedPickSlots = sumCreationSkillPickSlots(relatedSelected, {
    occ: effectiveOcc ?? undefined,
    specializationId: character.occSpecializationId,
  })

  const relatedSlotsUsed = sumRelatedPoolSlotUsage(
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

  const secondaryCap = occCreationDerived?.secondarySkillSlots ?? 0

  const handToHandTier = effectiveOcc
    ? effectiveCreationHandToHandTier(character, effectiveOcc)
    : (character.creationHandToHandTier ?? 'none')

  const handToHandOptions = useMemo(
    () =>
      effectiveOcc
        ? listOccHandToHandOptions(effectiveOcc, character.primary?.alignment)
        : [],
    [effectiveOcc, character.primary?.alignment],
  )

  const handToHandInputClass = morphus
    ? 'border-violet-700 bg-slate-900 text-violet-100'
    : 'border-slate-300 bg-white text-slate-900'

  const occSectionClass = morphus ? 'text-amber-300' : 'text-amber-950'
  const relatedSectionClass = morphus ? 'text-violet-400' : 'text-violet-600'
  const secondarySectionClass = morphus ? 'text-emerald-400' : 'text-emerald-700'



  const bookCategories = useMemo(

    () => listCreationSkillBookCategories(hostGenreId),

    [hostGenreId],

  )

  const occCategoryRules = effectiveOcc?.occRelatedSkills.categoryRules ?? []

  const selectedCategoryRule = useMemo(
    () => resolveOccCategoryRuleForFilter(category, occCategoryRules),
    [category, occCategoryRules],
  )

  const selectedCategoryRuleDisplay = useMemo(
    () => formatOccCategoryRuleHeader(selectedCategoryRule),
    [selectedCategoryRule],
  )

  useEffect(() => {
    if (!categoryOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (
        categorySelectRef.current &&
        !categorySelectRef.current.contains(event.target as Node)
      ) {
        setCategoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [categoryOpen])



  const allSelected = useMemo(

    () =>

      creationSkillIdsSet(resolvedOccSkillIds, relatedSelected, secondarySelected),

    [resolvedOccSkillIds, relatedSelected, secondarySelected],

  )



  const relatedSet = useMemo(

    () => new Set(relatedSelected.map((p) => p.skillId)),

    [relatedSelected],

  )



  const skillPercentCtx = useMemo(
    () =>
      buildLiveSkillContext(character, activeForm, {
        morphusSurfaceType,
      }),
    [character, activeForm, morphusSurfaceType],
  )

  const iqBonus = skillPercentCtx.iqBonus
  const maPbBonus = skillPercentCtx.maPbBonus

  const synergyAvailability = useMemo(
    () => ({
      effectiveOcc,
      specializationId: character.occSpecializationId,
    }),
    [effectiveOcc, character.occSpecializationId],
  )

  const displayOpts = useMemo(

    () => ({

      occ: effectiveOcc,

      relatedIds: relatedSet,

      allSelectedIds: allSelected,

      psychicTier,

      specializationId: character.occSpecializationId,

      voucherPicks,

      skillPercentCtx,

      iqBonus,

      maPbBonus,

      allPicks: allCreationPicks,

      synergyAvailability,

    }),

    [

      effectiveOcc,

      relatedSet,

      allSelected,

      psychicTier,

      character.occSpecializationId,

      voucherPicks,

      skillPercentCtx,

      iqBonus,

      maPbBonus,

      allCreationPicks,

      synergyAvailability,

    ],

  )



  const skillLibrary = useMemo(

    () => listCreationSkillLibrary(hostGenreId),

    [hostGenreId],

  )

  const catalogSkillIds = useMemo(
    () => skillLibrary.map((s) => s.id),
    [skillLibrary],
  )

  const voucherTasks = useMemo(
    () => listOccCoreVoucherTasks(effectiveOcc, character.occSpecializationId),
    [effectiveOcc, character.occSpecializationId],
  )

  const hasLibraryOccVouchers = useMemo(
    () => voucherTasks.some((task) => !voucherUsesDedicatedPickerUi(task.entry)),
    [voucherTasks],
  )

  const libraryPopulated = category === 'All' ? search.trim().length > 0 : category !== ''

  const libraryContext = useMemo(
    () => ({
      effectiveOcc,
      specializationId: character.occSpecializationId,
      relatedSlotsUsed,
      relatedSkillCap,
      secondaryPickSlots,
      secondaryCap,
      occPicks: resolvedOccPicks,
      relatedPicks: relatedSelected,
      secondaryPicks: secondarySelected,
      activeFilterCategory: category,
    }),
    [
      effectiveOcc,
      character.occSpecializationId,
      relatedSlotsUsed,
      relatedSkillCap,
      secondaryPickSlots,
      secondaryCap,
      resolvedOccPicks,
      relatedSelected,
      secondarySelected,
      category,
    ],
  )

  const libraryPartitions = useMemo(() => {
    if (!libraryPopulated) {
      return { selected: [] as EngineSkillDef[], browse: [] as EngineSkillDef[] }
    }

    const q = search.trim().toLowerCase()

    const libraryTierOpts = {
      relatedPicks: relatedSelected,
      secondaryPicks: secondarySelected,
      resolvedOccPicks,
      voucherTasks,
      voucherPicks,
    }

    const librarySelectionTier = (skillId: string) =>
      resolveCreationLibrarySkillTier(skillId, libraryTierOpts)

    const matchesLibraryQuery = (s: EngineSkillDef) => {
      const catOk = matchesSkillBookCategoryFilter(s, category)
      const nameOk =
        q === '' ||
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      return catOk && nameOk
    }

    const filtered = skillLibrary.filter((s) => matchesLibraryQuery(s))

    const filteredIds = new Set(filtered.map((s) => s.id))
    const occPinnedExtras = skillLibrary.filter(
      (s) =>
        !filteredIds.has(s.id) &&
        matchesLibraryQuery(s) &&
        librarySelectionTier(s.id) === 'occ',
    )

    return partitionCreationSkillLibrary(
      [...filtered, ...occPinnedExtras],
      category,
      (s) => isCreationLibrarySkillUnconditionallyExcluded(s, libraryContext),
      (s) => librarySelectionTier(s.id) != null,
      librarySelectionTier,
    )
  }, [
    search,
    category,
    skillLibrary,
    libraryPopulated,
    libraryContext,
    voucherTasks,
    voucherPicks,
    resolvedOccPicks,
    relatedSelected,
    secondarySelected,
  ])



  const panelStyle = morphus

    ? 'border-violet-700 bg-slate-950/80 text-violet-50'

    : 'border-blue-200 bg-white text-slate-900'

  const subStyle = morphus

    ? 'border-violet-800 bg-slate-900'

    : 'border-slate-200 bg-slate-50'



  function resolveDisplay(
    def: EngineSkillDef,
    tier: SkillPickDisplayTier,
    pick?: CreationSkillPick,
  ) {

    return resolveSkillCreationDisplay(def, tier, { ...displayOpts, pick })

  }



  function saveSpecializationEdit(
    pick: CreationSkillPick,
    tier: SkillPickDisplayTier,
    specialization: string,
  ) {
    const updated: CreationSkillPick = { ...pick, specialization }

    if (tier === 'related') {
      setRelatedSelected(
        relatedSelected.map((p) =>
          p.instanceId === pick.instanceId ? updated : p,
        ),
      )
    } else if (tier === 'secondary') {
      setSecondarySelected(
        secondarySelected.map((p) =>
          p.instanceId === pick.instanceId ? updated : p,
        ),
      )
    } else {
      persistOccCorePickUpdate(pick, updated)
    }
  }

  function persistOccCorePickUpdate(
    pick: CreationSkillPick,
    updated: CreationSkillPick,
  ) {
    if (
      isOccCoreGrantSkillPick(
        pick,
        effectiveOcc,
        character.occSpecializationId,
      )
    ) {
      setCreationOccGrantPickDetail(pick.skillId, updated)
      return
    }
    const slot = findOccCoreVoucherSlotForPick(
      effectiveOcc,
      character.occSpecializationId,
      voucherPicks,
      pick.instanceId,
    )
    if (!slot) return
    const slots = getOccCoreVoucherSlotPicks(
      voucherPicks,
      slot.taskId,
      slot.choiceCount,
    )
    slots[slot.slot] = updated
    setCreationOccCoreVoucherPick(slot.taskId, slots)
  }

  function togglePickProfessionalQuality(
    pick: CreationSkillPick,
    tier: SkillPickDisplayTier,
  ) {
    const cap = tier === 'secondary' ? secondaryCap : relatedSkillCap
    const used =
      tier === 'secondary' ? secondaryPickSlots : relatedSlotsUsed
    const slotsRemaining = Math.max(0, cap - used)

    if (tier === 'occ') {
      if (!pick.professionalQuality && slotsRemaining < 1) return
      persistOccCorePickUpdate(
        pick,
        pick.professionalQuality
          ? downgradePickToStandard(pick)
          : upgradePickToProfessional(pick),
      )
      return
    }

    const setTarget =
      tier === 'related' ? setRelatedSelected : setSecondarySelected
    const target = tier === 'related' ? relatedSelected : secondarySelected

    if (pick.professionalQuality) {
      setTarget(
        target.map((p) =>
          p.instanceId === pick.instanceId ? downgradePickToStandard(p) : p,
        ),
      )
      return
    }
    if (slotsRemaining < 1) return
    setTarget(
      target.map((p) =>
        p.instanceId === pick.instanceId ? upgradePickToProfessional(p) : p,
      ),
    )
  }

  function renderHandToHandRow() {
    if (!effectiveOcc || handToHandOptions.length === 0) return null

    return (
      <li
        className={`rounded border px-2 py-1.5 text-sm ${skillPickRowSurfaceClass('related', morphus)}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium">Hand-to-Hand</p>
            <select
              value={
                handToHandTier === 'none' ||
                handToHandOptions.some((o) => o.tier === handToHandTier)
                  ? handToHandTier
                  : 'none'
              }
              onChange={(e) => {
                setCreationHandToHandTier(
                  e.target.value as CreationHandToHandTier,
                )
              }}
              className={`mt-1 w-full max-w-md rounded border px-2 py-1.5 text-sm ${handToHandInputClass}`}
            >
              {handToHandOptions.map((opt) => {
                const affordable = canAffordHandToHandTier(
                  effectiveOcc,
                  opt.tier,
                  relatedCap,
                  relatedSlotsUsed - handToHandReserved,
                )
                const isCurrent = opt.tier === handToHandTier
                const blocked = opt.disabled || (!affordable && !isCurrent)
                return (
                  <option
                    key={opt.tier}
                    value={opt.tier}
                    disabled={blocked}
                  >
                    {opt.label}
                    {opt.disabledReason
                      ? ` — ${opt.disabledReason}`
                      : !affordable && !isCurrent
                        ? ' — insufficient related slots'
                        : ''}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      </li>
    )
  }

  function renderSelectedRow(

    pick: CreationSkillPick,

    tier: SkillPickDisplayTier,

    onRemove?: (instanceId: string) => void,

    removeLabel = 'Remove',

  ) {

    const def = getSkillById(pick.skillId)

    if (!def) return null

    const bad = !prerequisiteSatisfied(def.prerequisite, allSelected)

    const display = resolveDisplay(def, tier, pick)

    const canEdit = creationSkillPickHasEditableSpecialization(pick)

    const canTogglePro =
      skillSupportsProfessionalQuality(pick.skillId) && !pick.grantedBySkillId

    const grantSource = grantedBySkillLabel(pick)

    const proSlotsRemaining =
      tier === 'secondary'
        ? Math.max(0, secondaryCap - secondaryPickSlots)
        : Math.max(0, relatedSkillCap - relatedSlotsUsed)

    const canUpgradeToPro = !pick.professionalQuality && proSlotsRemaining >= 1

    const proUpgradeBlockedTitle =
      tier === 'occ'
        ? 'Not enough O.C.C. related skill slots (professional quality costs 1 related slot)'
        : tier === 'related'
          ? 'Not enough skill slots (professional quality costs 1 additional slot)'
          : 'Not enough skill slots (professional quality costs 1 additional slot)'

    const prerequisiteSummary = formatSkillPrerequisiteSummary(def.prerequisite)
    const synergyHints = listSkillSynergyHints(def, synergyAvailability)
    const displayedSynergyHints = synergyHints.filter((hint) => {
      if (hint.direction === 'outgoing') return true
      return !allSelected.has(hint.sourceSkillId)
    })
    const activeSynergyLines = resolveActiveSynergyBonusLines(
      def,
      allSelected,
      allCreationPicks,
      pick,
      synergyAvailability,
    )

    return (

      <li

        key={`${tier}-${pick.instanceId}`}

        className={`rounded border px-2 py-1.5 text-sm ${skillPickRowSurfaceClass(tier, morphus)} ${

          bad ? 'border-amber-500/60' : ''

        }`}

      >

        <div className="flex items-start justify-between gap-2">

          <div className="min-w-0 flex-1">

            <div className="flex items-start justify-between gap-3">

              <p className="font-bold text-slate-900">

                {formatCreationSkillPickLabel(pick, def.name)}

                {bad ? (

                  <span

                    className="ml-1 text-red-800 dark:text-red-300"

                    title={

                      missingPrerequisiteMessage(def.prerequisite, allSelected) ?? ''

                    }

                  >

                    ⚠

                  </span>

                ) : null}

              </p>

              {display.percentSummary ? (
                <SkillSelectedPercentBlock
                  summary={display.percentSummary}
                  impossibleInMorphus={display.impossibleInMorphus}
                  morphus={morphus}
                />
              ) : null}

            </div>

            {grantSource ? (
              <p className="mt-0.5 text-xs italic text-slate-500">
                Provided by {grantSource}
              </p>
            ) : null}

            {prerequisiteSummary ? (
              <SkillPrerequisiteMeta
                summary={prerequisiteSummary}
                satisfied={!bad}
              />
            ) : null}

            <SkillSynergyMeta
              hints={displayedSynergyHints}
              activeLines={activeSynergyLines}
            />

            {display.isWeaponProficiency || !display.percentSummary ? (
              <SkillStatLines display={display} />
            ) : display.physicalBonusSummary ||
              display.subPercentLines.length > 0 ? (
              <SkillStatLines display={display} />
            ) : null}

          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">

            {canEdit ? (

              <button

                type="button"

                className="text-xs text-violet-500 hover:underline"

                onClick={() => setEditPick({ pick, tier })}

              >

                Edit

              </button>

            ) : null}

            {canTogglePro ? (
              pick.professionalQuality ? (
                <button
                  type="button"
                  className="text-xs text-sky-500 hover:underline"
                  onClick={() => togglePickProfessionalQuality(pick, tier)}
                >
                  Set to standard quality
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canUpgradeToPro}
                  title={canUpgradeToPro ? undefined : proUpgradeBlockedTitle}
                  className="text-xs text-sky-500 hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                  onClick={() => togglePickProfessionalQuality(pick, tier)}
                >
                  Set to {professionalQualityLabel(pick.skillId).toLowerCase()}
                </button>
              )
            ) : null}

            {onRemove && !pick.grantedBySkillId ? (

              <button

                type="button"

                className="text-xs text-rose-400 hover:underline"

                onClick={() => onRemove(pick.instanceId)}

              >

                {removeLabel}

              </button>

            ) : null}

          </div>

        </div>

      </li>

    )

  }



  function openPickDialog(skillId: string, action: 'related' | 'secondary') {

    const cap = action === 'related' ? relatedSkillCap : secondaryCap

    const used = action === 'related' ? relatedSlotsUsed : secondaryPickSlots

    setPickDialog({

      skillId,

      variant: action,

      existingPicks: allCreationPicks,

      slotsRemaining: Math.max(0, cap - used),

    })

  }



  function commitSkillPickAdd(
    pick: CreationSkillPick,
    tier: 'related' | 'secondary',
  ) {
    if (
      hasConditionalGrantForSkill(
        pick.skillId,
        relatedSelected,
        secondarySelected,
      )
    ) {
      const next = replaceConditionalGrantWithPaidPick(
        pick,
        tier,
        relatedSelected,
        secondarySelected,
      )
      setCreationSkillPicks(occSkillIds, next.related, next.secondary)
      return
    }

    const selectedBeforeAdd = creationSkillIdsSet(
      resolvedOccSkillIds,
      relatedSelected,
      secondarySelected,
    )
    const next = appendCreationSkillPickWithConditionalGrants(
      pick,
      tier,
      selectedBeforeAdd,
      relatedSelected,
      secondarySelected,
    )
    setCreationSkillPicks(occSkillIds, next.related, next.secondary)
  }



  function setOccVoucherSlotPick(
    taskId: string,
    slot: number,
    pick: CreationSkillPick | null,
    choiceCount: number,
  ) {
    const next = getOccCoreVoucherSlotPicks(voucherPicks, taskId, choiceCount)
    next[slot] = pick
    setCreationOccCoreVoucherPick(taskId, next)
  }

  function commitOccVoucherPick(
    taskId: string,
    slot: number,
    skillId: string,
    choiceCount: number,
    specialization?: string,
  ) {
    if (
      isCreationSkillIdentityTaken(allCreationPicks, skillId, specialization)
    ) {
      return
    }
    setOccVoucherSlotPick(
      taskId,
      slot,
      buildCreationSkillPick(skillId, { specialization }),
      choiceCount,
    )
  }

  function handleOccVoucherAdd(skillId: string) {
    const def = getSkillById(skillId)
    if (def && !prerequisiteSatisfied(def.prerequisite, allSelected)) return

    const openSlot = findOpenOccCoreVoucherSlot(
      skillId,
      voucherTasks,
      voucherPicks,
      hostGenreId,
      catalogSkillIds,
      effectiveOcc?.wpRules?.forbiddenWps ?? [],
    )
    if (!openSlot) return

    if (skillNeedsVoucherPickDialog(skillId)) {
      setPendingOccVoucherSlot({ ...openSlot, skillId })
      return
    }

    commitOccVoucherPick(
      openSlot.taskId,
      openSlot.slot,
      skillId,
      openSlot.choiceCount,
    )
  }

  function handleSkillAdd(skillId: string, action: 'related' | 'secondary') {
    const def = getSkillById(skillId)
    if (def) {
      if (!prerequisiteSatisfied(def.prerequisite, allSelected)) return
      const { canAddRelated, canAddSecondary } = creationLibrarySkillAddState(
        def,
        libraryContext,
      )
      if (action === 'related' && !canAddRelated) return
      if (action === 'secondary' && !canAddSecondary) return
    }

    const existingPicks = action === 'related' ? relatedSelected : secondarySelected

    if (!skillNeedsPickDialog(skillId, existingPicks)) {

      if (isCreationSkillIdentityTaken(allCreationPicks, skillId)) return

      const pick = buildCreationSkillPick(skillId, { professionalQuality: false })

      commitSkillPickAdd(pick, action)

      return
    }

    openPickDialog(skillId, action)

  }



  function applyPickDialogResult(

    variant: 'related' | 'secondary',

    result: {

      specialization?: string

      professionalQuality: boolean

      upgradeInstanceId?: string

    },

  ) {

    const target = variant === 'related' ? relatedSelected : secondarySelected

    const setTarget = variant === 'related' ? setRelatedSelected : setSecondarySelected

    if (result.upgradeInstanceId) {

      const next = target.map((p) =>

        p.instanceId === result.upgradeInstanceId

          ? upgradePickToProfessional(p)

          : p,

      )

      setTarget(next)

      return

    }

    const skillId = pickDialog!.skillId

    if (
      isCreationSkillIdentityTaken(
        allCreationPicks,
        skillId,
        result.specialization,
        result.upgradeInstanceId ? [result.upgradeInstanceId] : undefined,
      )
    ) {
      return
    }

    const pick = buildCreationSkillPick(skillId, {

      specialization: result.specialization,

      professionalQuality: result.professionalQuality,

    })

    commitSkillPickAdd(pick, variant)

  }



  function renderLibrarySkill(s: EngineSkillDef) {
    const { picked, canAddRelated, canAddSecondary } = creationLibrarySkillAddState(
      s,
      libraryContext,
    )
    const unconditionallyExcluded = isCreationLibrarySkillUnconditionallyExcluded(
      s,
      libraryContext,
    )
    const selectionTier = resolveCreationLibrarySkillTier(s.id, {
      relatedPicks: relatedSelected,
      secondaryPicks: secondarySelected,
      resolvedOccPicks,
      voucherTasks,
      voucherPicks,
    })
    const alreadyChosen = selectionTier != null || picked
    const identityTaken = isCreationSkillIdentityTaken(allCreationPicks, s.id)
    const prereqOk = prerequisiteSatisfied(s.prerequisite, allSelected)
    const canAddOcc =
      hasLibraryOccVouchers &&
      canAddSkillViaOccCoreVoucher(
        s.id,
        voucherTasks,
        voucherPicks,
        hostGenreId,
        catalogSkillIds,
        allCreationPicks,
        effectiveOcc?.wpRules?.forbiddenWps ?? [],
      ) &&
      prereqOk
    const prereqBlocked =
      !unconditionallyExcluded &&
      !prereqOk &&
      (canAddRelated || canAddSecondary || canAddOcc) &&
      !identityTaken &&
      !picked

    const showOccButton =
      hasLibraryOccVouchers && canAddOcc && !identityTaken
    const showRelatedButton = canAddRelated && prereqOk && !identityTaken
    const showSecondaryButton = canAddSecondary && prereqOk && !identityTaken
    const showAddButtons =
      showOccButton || showRelatedButton || showSecondaryButton

    const showMeta = !unconditionallyExcluded
    const prerequisiteSummary = showMeta
      ? formatSkillPrerequisiteSummary(s.prerequisite)
      : null
    const synergyHints = showMeta
      ? listSkillSynergyHints(s, synergyAvailability)
      : []

    let statusLabel = ''
    if (unconditionallyExcluded) {
      statusLabel = resolveCreationLibrarySkillBlockReason(s, libraryContext)
    } else if (alreadyChosen || picked) {
      statusLabel = 'Already selected'
    } else if (!prereqBlocked && !showAddButtons) {
      statusLabel = resolveCreationLibrarySkillBlockReason(s, libraryContext)
    }

    const rowSurface = unconditionallyExcluded
      ? `${subStyle} opacity-60`
      : selectionTier
        ? skillPickRowSurfaceClass(
            selectionTier === 'occ' ? 'preview_occ' : selectionTier,
            morphus,
          )
        : subStyle

    const { physicalBonusSummary, subSkillNames, grantedSkillNames } = showAddButtons
      ? resolveCreationLibrarySkillPreview(s)
      : {
          physicalBonusSummary: undefined as string | undefined,
          subSkillNames: [] as string[],
          grantedSkillNames: [] as string[],
        }

    return (
      <li key={s.id} className={`rounded-md border p-2 ${rowSurface}`}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium">{s.name}</span>
          {prereqBlocked ? (
            <span
              className="text-red-800 dark:text-red-300"
              title={missingPrerequisiteMessage(s.prerequisite, allSelected) ?? ''}
            >
              ⚠
            </span>
          ) : null}
          {statusLabel ? (
            <span
              className={`text-xs font-semibold ${
                alreadyChosen || picked
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-red-500'
              }`}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>
        {prerequisiteSummary ? (
          <SkillPrerequisiteMeta
            summary={prerequisiteSummary}
            satisfied={prereqOk}
          />
        ) : null}
        <SkillSynergyMeta hints={synergyHints} />
        {physicalBonusSummary ? (
          <p className="mt-1 font-mono text-xs opacity-80">{physicalBonusSummary}</p>
        ) : null}
        {subSkillNames.length > 0 ? (
          <p className="mt-1 text-xs opacity-80">{subSkillNames.join(', ')}</p>
        ) : null}
        {grantedSkillNames.length > 0 ? (
          <p className="mt-1 text-xs opacity-70">
            Also grants: {grantedSkillNames.join(', ')}
          </p>
        ) : null}
        {showAddButtons ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {showOccButton ? (
              <button
                type="button"
                className="rounded bg-amber-900 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-950"
                onClick={() => handleOccVoucherAdd(s.id)}
              >
                + O.C.C.
              </button>
            ) : null}
            {showRelatedButton ? (
              <button
                type="button"
                className="rounded bg-violet-600 px-2 py-1 text-xs font-semibold text-white"
                onClick={() => handleSkillAdd(s.id, 'related')}
              >
                + Related
              </button>
            ) : null}
            {showSecondaryButton ? (
              <button
                type="button"
                className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white"
                onClick={() => handleSkillAdd(s.id, 'secondary')}
              >
                + Secondary
              </button>
            ) : null}
          </div>
        ) : null}
      </li>
    )
  }



  return (

    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">

      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        aria-labelledby="forge-tab-page-heading"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">

      <p

        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"

        style={{ color: morphus ? '#a5b4fc' : '#475569' }}

      >

        Use <strong>+ O.C.C.</strong> in the library for category voucher picks; filled

        choices appear grouped in the selected panel. Language, literacy, and weapon

        proficiencies stay in the panel. Pick <strong>related</strong> and{' '}

        <strong>secondary</strong> skills with the matching buttons.

      </p>

      {DevAutoFillSkillsButton ? (
        <Suspense fallback={null}>
          <DevAutoFillSkillsButton />
        </Suspense>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">

        <label className="flex items-center gap-2 text-sm">

          <span className="opacity-70">Category</span>

          <div ref={categorySelectRef} className="relative min-w-[14rem]">

            <button

              type="button"

              aria-haspopup="listbox"

              aria-expanded={categoryOpen}

              onClick={() => setCategoryOpen((open) => !open)}

              className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-2 text-left text-sm ${

                morphus

                  ? 'border-violet-700 bg-slate-900 text-violet-50'

                  : 'border-slate-300 bg-white text-slate-900'

              }`}

            >

              <span>

                {category === ''

                  ? '— select category —'

                  : category === 'All'

                    ? 'All (search only)'

                    : category}

              </span>

              <span className="text-xs opacity-60" aria-hidden>

                ▾

              </span>

            </button>

            {categoryOpen ? (

              <ul

                role="listbox"

                className={`absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border py-1 shadow-lg ${

                  morphus

                    ? 'border-violet-700 bg-slate-900 text-violet-50'

                    : 'border-slate-300 bg-white text-slate-900'

                }`}

              >

                {[

                  { value: '', label: '— select category —', rule: null as const },

                  { value: 'All', label: 'All (search only)', rule: null as const },

                  ...bookCategories.map((c) => ({

                    value: c,

                    label: c,

                    rule: formatOccCategoryRuleDropdown(

                      resolveOccCategoryRuleForFilter(c, occCategoryRules),

                    ),

                  })),

                ].map((item) => (

                  <li key={item.value || '__empty'} role="option">

                    <button

                      type="button"

                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-100 ${

                        morphus ? 'hover:bg-violet-950' : ''

                      } ${category === item.value ? (morphus ? 'bg-violet-950' : 'bg-sky-50') : ''}`}

                      onClick={() => {

                        setCategory(item.value)

                        setCategoryOpen(false)

                      }}

                    >

                      <span>{item.label}</span>

                      {item.rule ? (

                        <span

                          className={`shrink-0 text-xs font-medium ${occCategoryRuleToneClass(item.rule.tone, morphus)}`}

                        >

                          {item.rule.label}

                        </span>

                      ) : null}

                    </button>

                  </li>

                ))}

              </ul>

            ) : null}

          </div>

        </label>

        <input

          type="search"

          placeholder="Search skills…"

          value={search}

          onChange={(e) => setSearch(e.target.value)}

          className={`min-w-[200px] flex-1 rounded-md border px-3 py-2 text-sm ${

            morphus

              ? 'border-violet-700 bg-slate-900 text-violet-50'

              : 'border-slate-300 bg-white text-slate-900'

          }`}

          aria-label="Filter skills by name"

        />

      </div>



      <div className={`space-y-2 rounded-lg border p-3 ${panelStyle}`}>

        {category !== '' && category !== 'All' ? (

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">

            <h3 className="text-sm font-bold uppercase tracking-wide">

              {category}

            </h3>

            <span

              className={`text-sm font-medium ${occCategoryRuleToneClass(selectedCategoryRuleDisplay.tone, morphus)}`}

            >

              {selectedCategoryRuleDisplay.label}

            </span>

          </div>

        ) : (

          <h3 className="text-xs font-bold uppercase tracking-wide opacity-80">

            Library

          </h3>

        )}

        {!libraryPopulated ? (

          <p className="text-sm opacity-60">

            Select a category to browse skills, or choose All and enter a search

            term.

          </p>

        ) : libraryPartitions.selected.length === 0 &&
          libraryPartitions.browse.length === 0 ? (

          <p className="text-sm opacity-60">No skills match this filter.</p>

        ) : (

          <div className="flex max-h-[480px] min-h-0 flex-col gap-2 text-sm">

            {libraryPartitions.selected.length > 0 ? (
              <div
                className={`shrink-0 rounded-md border p-2 ${
                  morphus
                    ? 'border-violet-600/70 bg-violet-950/45'
                    : 'border-slate-300 bg-slate-50/90'
                }`}
              >
                <p className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
                  Selected in{' '}
                  {category === 'All' ? 'search results' : category}
                </p>
                <ul className="max-h-40 space-y-2 overflow-y-auto">
                  {libraryPartitions.selected.map((s) => renderLibrarySkill(s))}
                </ul>
              </div>
            ) : null}

            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {libraryPartitions.browse.length === 0 ? (
                <li className="text-sm opacity-60">
                  No other skills in this category.
                </li>
              ) : (
                libraryPartitions.browse.map((s) => renderLibrarySkill(s))
              )}
            </ul>

          </div>

        )}

      </div>

        </div>
      </section>

      <CreationSelectedSkillsPanel
        morphus={morphus}
        panelStyle={panelStyle}
        subStyle={subStyle}
        handToHandInputClass={handToHandInputClass}
        occSectionClass={occSectionClass}
        relatedSectionClass={relatedSectionClass}
        secondarySectionClass={secondarySectionClass}
        relatedCap={relatedCap}
        relatedSlotsUsed={relatedSlotsUsed}
        secondaryCap={secondaryCap}
        secondaryPickSlots={secondaryPickSlots}
        relatedSelected={relatedSelected}
        secondarySelected={secondarySelected}
        hasHandToHandOptions={handToHandOptions.length > 0}
        onEditOccPick={(pick) => setEditPick({ pick, tier: 'occ' })}
        renderOccSkillRow={(pick, onClear) => {
          const parameterizedOccGrant =
            isOccCoreGrantSkillPick(
              pick,
              effectiveOcc,
              character.occSpecializationId,
            ) && skillRequiresSpecialization(pick.skillId)
          return renderSelectedRow(
            pick,
            'occ',
            parameterizedOccGrant || !onClear ? undefined : () => onClear(),
            'Clear',
          )
        }}
        renderHandToHandRow={renderHandToHandRow}
        renderRelatedRow={(pick) =>
          renderSelectedRow(pick, 'related', (instanceId) =>
            setCreationSkillPicks(
              occSkillIds,
              removeCreationSkillPickWithConditionalCascade(
                relatedSelected,
                instanceId,
              ),
              secondarySelected,
            ),
          )
        }
        renderSecondaryRow={(pick) =>
          renderSelectedRow(pick, 'secondary', (instanceId) =>
            setCreationSkillPicks(
              occSkillIds,
              relatedSelected,
              removeCreationSkillPickWithConditionalCascade(
                secondarySelected,
                instanceId,
              ),
            ),
          )
        }
      />

      <SkillPickAddDialog

        state={pickDialog}

        morphus={morphus}

        onCancel={() => setPickDialog(null)}

        onConfirm={(result) => {

          if (!pickDialog) return

          applyPickDialogResult(pickDialog.variant, result)

          setPickDialog(null)

        }}

      />

      <SkillPickAddDialog
        state={
          pendingOccVoucherSlot
            ? {
                skillId: pendingOccVoucherSlot.skillId,
                variant: 'voucher',
                existingPicks: allCreationPicks,
              }
            : null
        }
        morphus={morphus}
        onCancel={() => setPendingOccVoucherSlot(null)}
        onConfirm={(result) => {
          if (!pendingOccVoucherSlot) return
          const { taskId, slot, choiceCount, skillId } = pendingOccVoucherSlot
          commitOccVoucherPick(
            taskId,
            slot,
            skillId,
            choiceCount,
            result.specialization,
          )
          setPendingOccVoucherSlot(null)
        }}
      />



      <SkillSpecializationEditDialog

        state={

          editPick

            ? { pick: editPick.pick, allPicks: allCreationPicks }

            : null

        }

        morphus={morphus}

        onCancel={() => setEditPick(null)}

        onSave={(specialization) => {

          if (!editPick) return

          saveSpecializationEdit(

            editPick.pick,

            editPick.tier,

            specialization,

          )

          setEditPick(null)

        }}

      />

    </div>

  )

}


