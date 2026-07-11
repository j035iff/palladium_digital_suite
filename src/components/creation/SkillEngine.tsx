import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

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
  hasIncompleteCreationVoucherPicks,
  isOccCoreGrantSkillPick,
  isSkillInVouchersLibraryScope,
  listOccCoreVoucherTasks,
  resolveCreationLibrarySkillTier,
  resolveCreationOccSkillIds,
  resolveOccCoreSkillPicks,
} from '../../lib/occCoreSkillVouchers'

import {
  canAddSkillViaRelatedVoucher,
  countAllFilledRelatedVoucherSlots,
  CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY,
  CREATION_VOUCHERS_LIBRARY_CATEGORY,
  collectVocationalFocusBookCategories,
  findOpenRelatedVoucherSlot,
  findRelatedVoucherSlotForPick,
  flattenRelatedVoucherPicks,
  getRelatedVoucherSlotPicks,
  hasIncompleteVocationalFocusVouchers,
  isSkillInVocationalFocusLibraryScope,
  listCreationVoucherRelatedTasks,
  listVocationalFocusVoucherTasks,
  listOccRelatedVoucherTasks,
  sumRelatedVoucherReservedSlots,
} from '../../lib/occRelatedSkillVouchers'

import {
  collectOpenCreationVoucherBookCategories,
  creationVoucherDisplayName,
  listLibraryCreationVoucherTaskRefs,
  listOpenCreationVoucherAddTargets,
  type CreationVoucherAddTarget,
} from '../../lib/creationVoucherSlots'

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
  creationFreeRelatedSkillCap,
  creationLibrarySkillAddState,
  creationLibrarySkillVoucherAddAllowed,
  creationSelectedSkillIdSet,
  resolveCreationLibrarySkillVoucherBlockReason,
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
  sumFreeRelatedSkillSlotUsage,
  sumOccCoreProfessionalRelatedSlotSurcharges,
  sumRelatedPoolSlotUsage,
  sumRelatedPoolUsageExcludingHandToHand,
  upgradePickToProfessional,
} from '../../lib/creationSkillPicks'

import { CreationSelectedSkillsPanel } from './CreationSelectedSkillsPanel'
import { useCreationForgeLeftSlotRegistrar } from './CreationForgeLeftSlotContext'

import { SkillPickAddDialog, type SkillPickAddDialogState } from './SkillPickAddDialog'

import { SkillSpecializationEditDialog } from './SkillSpecializationEditDialog'

import { SkillStatLines } from './SkillStatLines'
import { SkillSelectedPercentBlock } from './SkillSelectedPercentBlock'

import type { CreationSkillPick } from '../../types'

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

    effectiveOcc,

    occCreationDerived,

    supportsDualForm,

    skillSlotMultiplier,

    morphusSurfaceType,

    psychicTier,

    setCreationSkillPicks,

    setCreationOccCoreVoucherPick,

    setCreationOccRelatedVoucherPick,

    setCreationOccRelatedVoucherCluster,

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

  const [pendingRelatedVoucherSlot, setPendingRelatedVoucherSlot] = useState<{
    taskId: string
    slot: number
    choiceCount: number
    skillId: string
  } | null>(null)

  const [editPick, setEditPick] = useState<{
    pick: CreationSkillPick
    tier: SkillPickDisplayTier
  } | null>(null)



  const occSkillIds = useMemo(
    () => character.creationOccSkillIds ?? [],
    [character.creationOccSkillIds],
  )

  const relatedSelected = useMemo(
    () => getCreationRelatedPicks(character),
    [character],
  )

  const secondarySelected = useMemo(
    () => getCreationSecondaryPicks(character),
    [character],
  )

  const voucherPicks = useMemo(
    () => character.creationOccCoreVoucherPicks ?? {},
    [character.creationOccCoreVoucherPicks],
  )

  const relatedVoucherPicks = useMemo(
    () => character.creationOccRelatedVoucherPicks ?? {},
    [character.creationOccRelatedVoucherPicks],
  )

  const relatedVoucherClusters = useMemo(
    () => character.creationOccRelatedVoucherClusters ?? {},
    [character.creationOccRelatedVoucherClusters],
  )

  const relatedVoucherTasks = useMemo(
    () => listOccRelatedVoucherTasks(effectiveOcc, character.occSpecializationId),
    [effectiveOcc, character.occSpecializationId],
  )

  const vocationalFocusTasks = useMemo(
    () => listVocationalFocusVoucherTasks(relatedVoucherTasks),
    [relatedVoucherTasks],
  )

  const creationVoucherRelatedTasks = useMemo(
    () => listCreationVoucherRelatedTasks(relatedVoucherTasks),
    [relatedVoucherTasks],
  )


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

  const allSelected = useMemo(
    () => creationSelectedSkillIdSet(allCreationPicks),
    [allCreationPicks],
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

  const relatedVoucherReserved = useMemo(
    () => sumRelatedVoucherReservedSlots(vocationalFocusTasks),
    [vocationalFocusTasks],
  )

  const freeRelatedCap = useMemo(
    () => creationFreeRelatedSkillCap(relatedCap, relatedVoucherReserved),
    [relatedCap, relatedVoucherReserved],
  )

  const relatedSkillCap = freeRelatedCap

  const slotWeightOpts = {
    occ: effectiveOcc ?? undefined,
    specializationId: character.occSpecializationId,
  }

  const relatedSlotsUsed = sumRelatedPoolSlotUsage(
    relatedSelected,
    resolvedOccPicks,
    handToHandReserved,
    slotWeightOpts,
  )

  const relatedSkillPoolUsed = sumRelatedPoolUsageExcludingHandToHand(
    relatedSelected,
    resolvedOccPicks,
    slotWeightOpts,
  )

  const relatedSkillPoolCap = freeRelatedCap

  const specializationSlotsCap = relatedVoucherReserved

  const specializationSlotsUsed = useMemo(
    () =>
      countAllFilledRelatedVoucherSlots(
        vocationalFocusTasks,
        relatedVoucherPicks,
      ),
    [vocationalFocusTasks, relatedVoucherPicks],
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
  const voucherSectionClass = morphus ? 'text-amber-300' : 'text-amber-950'
  const specializationSectionClass = morphus ? 'text-sky-300' : 'text-sky-700'
  const relatedSectionClass = morphus ? 'text-violet-400' : 'text-violet-600'
  const secondarySectionClass = morphus ? 'text-emerald-400' : 'text-emerald-700'

  const vocationalFocusLock = useMemo(
    () =>
      hasIncompleteVocationalFocusVouchers(
        relatedVoucherTasks,
        relatedVoucherPicks,
        relatedVoucherClusters,
      ),
    [relatedVoucherTasks, relatedVoucherPicks, relatedVoucherClusters],
  )

  const creationVoucherLock = useMemo(
    () =>
      !vocationalFocusLock &&
      hasIncompleteCreationVoucherPicks(
        effectiveOcc ?? undefined,
        character.occSpecializationId,
        voucherPicks,
        relatedVoucherPicks,
        relatedVoucherClusters,
      ),
    [
      vocationalFocusLock,
      effectiveOcc,
      character.occSpecializationId,
      voucherPicks,
      relatedVoucherPicks,
      relatedVoucherClusters,
    ],
  )

  const voucherBrowseLock = vocationalFocusLock || creationVoucherLock

  const vocationalFocusBookCategories = useMemo(
    () =>
      collectVocationalFocusBookCategories(
        relatedVoucherTasks,
        relatedVoucherClusters,
      ),
    [relatedVoucherTasks, relatedVoucherClusters],
  )

  useEffect(() => {
    if (
      vocationalFocusLock &&
      category !== CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY
    ) {
      setCategory(CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY)
    }
  }, [vocationalFocusLock, category])

  const bookCategories = useMemo(
    () => listCreationSkillBookCategories(hostGenreId),
    [hostGenreId],
  )

  const occCategoryRules = useMemo(
    () => effectiveOcc?.occRelatedSkills.categoryRules ?? [],
    [effectiveOcc],
  )

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


  const relatedSet = useMemo(
    () => {
      const voucherSkillIds = flattenRelatedVoucherPicks(
        relatedVoucherTasks,
        relatedVoucherPicks,
      ).map((p) => p.skillId)
      return new Set([
        ...relatedSelected.map((p) => p.skillId),
        ...voucherSkillIds,
      ])
    },
    [relatedSelected, relatedVoucherTasks, relatedVoucherPicks],
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

      relatedVoucherPicks,

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

      relatedVoucherPicks,

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

  const libraryCreationVoucherRefs = useMemo(
    () =>
      listLibraryCreationVoucherTaskRefs(
        effectiveOcc ?? undefined,
        character.occSpecializationId,
      ),
    [effectiveOcc, character.occSpecializationId],
  )

  const openVoucherBookCategories = useMemo(
    () =>
      collectOpenCreationVoucherBookCategories(
        libraryCreationVoucherRefs,
        voucherPicks,
        relatedVoucherPicks,
        relatedVoucherClusters,
        hostGenreId,
        catalogSkillIds,
        effectiveOcc?.wpRules?.forbiddenWps ?? [],
      ),
    [
      libraryCreationVoucherRefs,
      voucherPicks,
      relatedVoucherPicks,
      relatedVoucherClusters,
      hostGenreId,
      catalogSkillIds,
      effectiveOcc?.wpRules?.forbiddenWps,
    ],
  )

  const isBrowsingVoucherBookCategory =
    creationVoucherLock &&
    category !== '' &&
    category !== 'All' &&
    category !== CREATION_VOUCHERS_LIBRARY_CATEGORY &&
    category !== CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY &&
    bookCategories.includes(category)

  useEffect(() => {
    if (!creationVoucherLock) return
    if (openVoucherBookCategories.size === 0) return
    if (
      category !== '' &&
      category !== 'All' &&
      category !== CREATION_VOUCHERS_LIBRARY_CATEGORY &&
      category !== CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY &&
      openVoucherBookCategories.has(category)
    ) {
      return
    }
    const first = bookCategories.find((c) => openVoucherBookCategories.has(c))
    if (first) setCategory(first)
  }, [
    creationVoucherLock,
    category,
    bookCategories,
    openVoucherBookCategories,
  ])

  const voucherBrowseCategory =
    category === CREATION_VOUCHERS_LIBRARY_CATEGORY
      ? undefined
      : isBrowsingVoucherBookCategory
        ? category
        : category

  const voucherTasks = useMemo(
    () => listOccCoreVoucherTasks(effectiveOcc, character.occSpecializationId),
    [effectiveOcc, character.occSpecializationId],
  )

  const hasLibraryCreationVouchers = useMemo(
    () => voucherTasks.length > 0 || creationVoucherRelatedTasks.length > 0,
    [voucherTasks, creationVoucherRelatedTasks],
  )

  const libraryPopulated =
    category === CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY ||
    category === CREATION_VOUCHERS_LIBRARY_CATEGORY ||
    isBrowsingVoucherBookCategory ||
    (category === 'All' ? search.trim().length > 0 : category !== '')

  const libraryContext = useMemo(
    () => ({
      effectiveOcc,
      specializationId: character.occSpecializationId,
      relatedSlotsUsed,
      relatedSkillCap,
      freeRelatedCap,
      secondaryPickSlots,
      secondaryCap,
      occPicks: resolvedOccPicks,
      relatedPicks: relatedSelected,
      secondaryPicks: secondarySelected,
      allPicks: allCreationPicks,
      activeFilterCategory: category,
    }),
    [
      effectiveOcc,
      character.occSpecializationId,
      relatedSlotsUsed,
      relatedSkillCap,
      freeRelatedCap,
      secondaryPickSlots,
      secondaryCap,
      resolvedOccPicks,
      relatedSelected,
      secondarySelected,
      category,
      allCreationPicks,
    ],
  )

  const libraryPartitions = useMemo(() => {
    if (!libraryPopulated) {
      return { selected: [] as EngineSkillDef[], browse: [] as EngineSkillDef[] }
    }

    const libraryTierOpts = {
      relatedPicks: relatedSelected,
      secondaryPicks: secondarySelected,
      resolvedOccPicks,
      voucherTasks,
      voucherPicks,
      relatedVoucherTasks,
      relatedVoucherPicks,
    }

    const librarySelectionTier = (skillId: string) =>
      resolveCreationLibrarySkillTier(skillId, libraryTierOpts)

    const matchesLibraryQuery = (s: EngineSkillDef) => {
      const q = search.trim().toLowerCase()
      const nameOk =
        q === '' ||
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)

      if (category === CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY) {
        if (!effectiveOcc) return false
        if (
          !isSkillInVocationalFocusLibraryScope(
            s.id,
            relatedVoucherTasks,
            relatedVoucherPicks,
            effectiveOcc,
            character.occSpecializationId,
            relatedVoucherClusters,
          )
        ) {
          return false
        }
        return nameOk
      }

      if (category === CREATION_VOUCHERS_LIBRARY_CATEGORY) {
        if (!effectiveOcc) return false
        if (
          !isSkillInVouchersLibraryScope(
            s.id,
            effectiveOcc,
            character.occSpecializationId,
            voucherTasks,
            voucherPicks,
            creationVoucherRelatedTasks,
            relatedVoucherPicks,
            relatedVoucherClusters,
            hostGenreId,
            catalogSkillIds,
            effectiveOcc.wpRules?.forbiddenWps ?? [],
          )
        ) {
          return false
        }
        return nameOk
      }

      if (isBrowsingVoucherBookCategory) {
        if (!effectiveOcc) return false
        if (!matchesSkillBookCategoryFilter(s, category)) return false
        return (
          listOpenCreationVoucherAddTargets(
            s.id,
            libraryCreationVoucherRefs,
            voucherPicks,
            relatedVoucherPicks,
            relatedVoucherClusters,
            effectiveOcc,
            character.occSpecializationId,
            hostGenreId,
            catalogSkillIds,
            effectiveOcc.wpRules?.forbiddenWps ?? [],
            category,
          ).length > 0 && nameOk
        )
      }

      const catOk = matchesSkillBookCategoryFilter(s, category)
      return catOk && nameOk
    }

    const filtered = skillLibrary.filter((s) => matchesLibraryQuery(s))

    const filteredIds = new Set(filtered.map((s) => s.id))
    const voucherPinnedExtras = skillLibrary.filter(
      (s) =>
        !filteredIds.has(s.id) &&
        matchesLibraryQuery(s) &&
        librarySelectionTier(s.id) === 'voucher',
    )

    return partitionCreationSkillLibrary(
      [...filtered, ...voucherPinnedExtras],
      category,
      (s) => isCreationLibrarySkillUnconditionallyExcluded(s, libraryContext),
      (s) => {
        const tier = librarySelectionTier(s.id)
        if (
          category === CREATION_VOUCHERS_LIBRARY_CATEGORY ||
          isBrowsingVoucherBookCategory
        ) {
          return tier === 'voucher'
        }
        if (category === CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY) {
          return tier === 'specialization'
        }
        return tier != null
      },
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
    relatedVoucherTasks,
    relatedVoucherPicks,
    relatedVoucherClusters,
    effectiveOcc,
    character.occSpecializationId,
    creationVoucherRelatedTasks,
    hostGenreId,
    catalogSkillIds,
    libraryCreationVoucherRefs,
    isBrowsingVoucherBookCategory,
  ])



  const panelStyle = morphus
    ? 'border-violet-300 bg-violet-50 text-violet-950'
    : 'border-slate-300 bg-slate-100 text-slate-900'

  const subStyle = morphus
    ? 'border-violet-200 bg-violet-100/80 text-violet-900'
    : 'border-slate-300 bg-white text-slate-900'



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

    if (tier === 'specialization') {
      persistSpecializationVoucherPickUpdate(pick, updated)
    } else if (tier === 'related') {
      persistRelatedPickUpdate(pick, updated)
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

  function persistSpecializationVoucherPickUpdate(
    pick: CreationSkillPick,
    updated: CreationSkillPick,
  ) {
    const slot = findRelatedVoucherSlotForPick(
      vocationalFocusTasks,
      relatedVoucherPicks,
      pick.instanceId,
    )
    if (!slot) return
    const slots = getRelatedVoucherSlotPicks(
      relatedVoucherPicks,
      slot.taskId,
      slot.choiceCount,
    )
    slots[slot.slot] = updated
    setCreationOccRelatedVoucherPick(slot.taskId, slots)
  }

  function persistRelatedPickUpdate(
    pick: CreationSkillPick,
    updated: CreationSkillPick,
  ) {
    setRelatedSelected(
      relatedSelected.map((p) =>
        p.instanceId === pick.instanceId ? updated : p,
      ),
    )
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

  function persistCreationVoucherPickUpdate(
    pick: CreationSkillPick,
    updated: CreationSkillPick,
  ) {
    const occSlot = findOccCoreVoucherSlotForPick(
      effectiveOcc,
      character.occSpecializationId,
      voucherPicks,
      pick.instanceId,
    )
    if (occSlot) {
      const slots = getOccCoreVoucherSlotPicks(
        voucherPicks,
        occSlot.taskId,
        occSlot.choiceCount,
      )
      slots[occSlot.slot] = updated
      setCreationOccCoreVoucherPick(occSlot.taskId, slots)
      return
    }
    const relatedSlot = findRelatedVoucherSlotForPick(
      creationVoucherRelatedTasks,
      relatedVoucherPicks,
      pick.instanceId,
    )
    if (!relatedSlot) return
    const slots = getRelatedVoucherSlotPicks(
      relatedVoucherPicks,
      relatedSlot.taskId,
      relatedSlot.choiceCount,
    )
    slots[relatedSlot.slot] = updated
    setCreationOccRelatedVoucherPick(relatedSlot.taskId, slots)
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

    if (tier === 'voucher') {
      if (!pick.professionalQuality && slotsRemaining < 1) return
      persistCreationVoucherPickUpdate(
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

    if (tier === 'specialization') {
      if (!pick.professionalQuality && slotsRemaining < 1) return
      persistSpecializationVoucherPickUpdate(
        pick,
        pick.professionalQuality
          ? downgradePickToStandard(pick)
          : upgradePickToProfessional(pick),
      )
      return
    }

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
                  relatedSkillPoolCap,
                  relatedSkillPoolUsed,
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

        <div className="flex flex-col gap-1.5">

          <div className="flex items-start justify-between gap-2">

            <p className="min-w-0 flex-1 break-words font-bold text-slate-900">

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

          {display.percentSummary ? (
            <SkillSelectedPercentBlock
              summary={display.percentSummary}
              impossibleInMorphus={display.impossibleInMorphus}
              morphus={morphus}
            />
          ) : null}

          {grantSource ? (
            <p className="text-xs italic text-slate-500">
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

  function setRelatedVoucherSlotPick(
    taskId: string,
    slot: number,
    pick: CreationSkillPick | null,
    choiceCount: number,
  ) {
    const next = getRelatedVoucherSlotPicks(
      relatedVoucherPicks,
      taskId,
      choiceCount,
    )
    next[slot] = pick
    setCreationOccRelatedVoucherPick(taskId, next)
  }

  function commitRelatedVoucherPick(
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
    setRelatedVoucherSlotPick(
      taskId,
      slot,
      buildCreationSkillPick(skillId, { specialization }),
      choiceCount,
    )
  }

  function handleSpecializationVoucherAdd(skillId: string) {
    const def = getSkillById(skillId)
    if (
      def &&
      !creationLibrarySkillVoucherAddAllowed(def, {
        effectiveOcc,
        specializationId: character.occSpecializationId,
        allPicks: allCreationPicks,
      })
    ) {
      return
    }
    if (!effectiveOcc) return

    const openSlot = findOpenRelatedVoucherSlot(
      skillId,
      vocationalFocusTasks,
      relatedVoucherPicks,
      effectiveOcc,
      character.occSpecializationId,
      relatedVoucherClusters,
      category === CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY
        ? undefined
        : category,
    )
    if (!openSlot) return

    if (skillNeedsVoucherPickDialog(skillId)) {
      setPendingRelatedVoucherSlot({ ...openSlot, skillId })
      return
    }

    commitRelatedVoucherPick(
      openSlot.taskId,
      openSlot.slot,
      skillId,
      openSlot.choiceCount,
    )
  }

  function handleCreationVoucherAdd(
    skillId: string,
    target?: CreationVoucherAddTarget,
  ) {
    const def = getSkillById(skillId)
    if (
      def &&
      !creationLibrarySkillVoucherAddAllowed(def, {
        effectiveOcc,
        specializationId: character.occSpecializationId,
        allPicks: allCreationPicks,
      })
    ) {
      return
    }
    if (!effectiveOcc) return

    if (target) {
      if (target.kind === 'occ_core') {
        if (skillNeedsVoucherPickDialog(skillId)) {
          setPendingOccVoucherSlot({
            taskId: target.taskId,
            slot: target.slot,
            choiceCount: target.choiceCount,
            skillId,
          })
          return
        }
        commitOccVoucherPick(
          target.taskId,
          target.slot,
          skillId,
          target.choiceCount,
        )
        return
      }
      if (skillNeedsVoucherPickDialog(skillId)) {
        setPendingRelatedVoucherSlot({
          taskId: target.taskId,
          slot: target.slot,
          choiceCount: target.choiceCount,
          skillId,
        })
        return
      }
      commitRelatedVoucherPick(
        target.taskId,
        target.slot,
        skillId,
        target.choiceCount,
      )
      return
    }

    const occOpenSlot = findOpenOccCoreVoucherSlot(
      skillId,
      voucherTasks,
      voucherPicks,
      hostGenreId,
      catalogSkillIds,
      effectiveOcc.wpRules?.forbiddenWps ?? [],
    )
    if (occOpenSlot) {
      if (skillNeedsVoucherPickDialog(skillId)) {
        setPendingOccVoucherSlot({ ...occOpenSlot, skillId })
        return
      }
      commitOccVoucherPick(
        occOpenSlot.taskId,
        occOpenSlot.slot,
        skillId,
        occOpenSlot.choiceCount,
      )
      return
    }

    const relatedOpenSlot = findOpenRelatedVoucherSlot(
      skillId,
      creationVoucherRelatedTasks,
      relatedVoucherPicks,
      effectiveOcc,
      character.occSpecializationId,
      relatedVoucherClusters,
      voucherBrowseCategory === CREATION_VOUCHERS_LIBRARY_CATEGORY
        ? undefined
        : voucherBrowseCategory,
    )
    if (!relatedOpenSlot) return

    if (skillNeedsVoucherPickDialog(skillId)) {
      setPendingRelatedVoucherSlot({ ...relatedOpenSlot, skillId })
      return
    }

    commitRelatedVoucherPick(
      relatedOpenSlot.taskId,
      relatedOpenSlot.slot,
      skillId,
      relatedOpenSlot.choiceCount,
    )
  }

  /** @deprecated Use {@link handleCreationVoucherAdd}. */
  function handleOccVoucherAdd(skillId: string) {
    handleCreationVoucherAdd(skillId)
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
      relatedVoucherTasks,
      relatedVoucherPicks,
    })
    const alreadyChosen = selectionTier != null || picked
    const identityTaken = isCreationSkillIdentityTaken(allCreationPicks, s.id)
    const prereqOk = prerequisiteSatisfied(s.prerequisite, allSelected)
    const hasOpenCreationVoucherSlot =
      !vocationalFocusLock &&
      hasLibraryCreationVouchers &&
      effectiveOcc != null &&
      !identityTaken &&
      (canAddSkillViaOccCoreVoucher(
        s.id,
        voucherTasks,
        voucherPicks,
        hostGenreId,
        catalogSkillIds,
        allCreationPicks,
        effectiveOcc.wpRules?.forbiddenWps ?? [],
      ) ||
        canAddSkillViaRelatedVoucher(
          s.id,
          creationVoucherRelatedTasks,
          relatedVoucherPicks,
          effectiveOcc,
          character.occSpecializationId,
          relatedVoucherClusters,
          allCreationPicks,
          voucherBrowseCategory === CREATION_VOUCHERS_LIBRARY_CATEGORY
            ? undefined
            : voucherBrowseCategory,
        ))
    const hasOpenVocationalFocusSlot =
      effectiveOcc != null &&
      !identityTaken &&
      canAddSkillViaRelatedVoucher(
        s.id,
        vocationalFocusTasks,
        relatedVoucherPicks,
        effectiveOcc,
        character.occSpecializationId,
        relatedVoucherClusters,
        allCreationPicks,
        category === CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY
          ? undefined
          : category,
      )
    const voucherLibraryOpts = {
      effectiveOcc,
      specializationId: character.occSpecializationId,
      raceBlocked: libraryContext.raceBlocked,
      allPicks: allCreationPicks,
    }
    const voucherLibraryAllowed = creationLibrarySkillVoucherAddAllowed(
      s,
      voucherLibraryOpts,
    )
    const canAddViaCreationVoucher =
      !vocationalFocusLock &&
      hasLibraryCreationVouchers &&
      voucherLibraryAllowed &&
      !identityTaken &&
      effectiveOcc != null &&
      (canAddSkillViaOccCoreVoucher(
        s.id,
        voucherTasks,
        voucherPicks,
        hostGenreId,
        catalogSkillIds,
        allCreationPicks,
        effectiveOcc.wpRules?.forbiddenWps ?? [],
      ) ||
        canAddSkillViaRelatedVoucher(
          s.id,
          creationVoucherRelatedTasks,
          relatedVoucherPicks,
          effectiveOcc,
          character.occSpecializationId,
          relatedVoucherClusters,
          allCreationPicks,
          voucherBrowseCategory === CREATION_VOUCHERS_LIBRARY_CATEGORY
            ? undefined
            : voucherBrowseCategory,
        ))
    const voucherAddTargets =
      !vocationalFocusLock &&
      hasLibraryCreationVouchers &&
      voucherLibraryAllowed &&
      !identityTaken &&
      effectiveOcc != null
        ? listOpenCreationVoucherAddTargets(
            s.id,
            libraryCreationVoucherRefs,
            voucherPicks,
            relatedVoucherPicks,
            relatedVoucherClusters,
            effectiveOcc,
            character.occSpecializationId,
            hostGenreId,
            catalogSkillIds,
            effectiveOcc.wpRules?.forbiddenWps ?? [],
            voucherBrowseCategory === CREATION_VOUCHERS_LIBRARY_CATEGORY
              ? undefined
              : voucherBrowseCategory,
          )
        : []
    const canAddViaVocationalFocusVoucher =
      effectiveOcc != null &&
      voucherLibraryAllowed &&
      canAddSkillViaRelatedVoucher(
        s.id,
        vocationalFocusTasks,
        relatedVoucherPicks,
        effectiveOcc,
        character.occSpecializationId,
        relatedVoucherClusters,
        allCreationPicks,
        category === CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY
          ? undefined
          : category,
      )
    const prereqBlocked =
      !unconditionallyExcluded &&
      !identityTaken &&
      !picked &&
      (((canAddRelated || canAddSecondary) && !prereqOk) ||
        ((hasOpenCreationVoucherSlot || hasOpenVocationalFocusSlot) &&
          !voucherLibraryAllowed))

    const showVoucherButton = voucherAddTargets.length > 0 || canAddViaCreationVoucher
    const showVocationalFocusButton =
      canAddViaVocationalFocusVoucher && !identityTaken
    const showRelatedButton =
      !voucherBrowseLock &&
      canAddRelated &&
      prereqOk &&
      !identityTaken
    const showSecondaryButton =
      !voucherBrowseLock &&
      canAddSecondary &&
      prereqOk &&
      !identityTaken
    const showAddButtons =
      showVoucherButton ||
      showVocationalFocusButton ||
      showRelatedButton ||
      showSecondaryButton

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
      const voucherBlockReason = resolveCreationLibrarySkillVoucherBlockReason(
        s,
        voucherLibraryOpts,
      )
      if (
        (canAddViaCreationVoucher ||
          canAddViaVocationalFocusVoucher ||
          voucherAddTargets.length > 0) &&
        voucherBlockReason
      ) {
        statusLabel = voucherBlockReason
      } else {
        statusLabel = resolveCreationLibrarySkillBlockReason(s, libraryContext)
      }
    }

    const rowSurface = unconditionallyExcluded
      ? `${subStyle} opacity-60`
      : selectionTier
        ? skillPickRowSurfaceClass(
            selectionTier === 'occ' || selectionTier === 'voucher'
              ? selectionTier === 'voucher'
                ? 'preview_voucher'
                : 'preview_occ'
              : selectionTier === 'specialization'
                ? 'preview_specialization'
                : selectionTier,
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
              title={
                resolveCreationLibrarySkillVoucherBlockReason(s, voucherLibraryOpts) ||
                missingPrerequisiteMessage(s.prerequisite, allSelected) ||
                ''
              }
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
            {voucherAddTargets.length > 0
              ? voucherAddTargets.map((target) => (
                  <button
                    key={`${target.taskId}:${target.slot}`}
                    type="button"
                    className="rounded bg-amber-900 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-950"
                    onClick={() => handleCreationVoucherAdd(s.id, target)}
                  >
                    + {creationVoucherDisplayName(target.displayNumber)}
                  </button>
                ))
              : showVoucherButton ? (
                  <button
                    type="button"
                    className="rounded bg-amber-900 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-950"
                    onClick={() => handleCreationVoucherAdd(s.id)}
                  >
                    + Voucher
                  </button>
                ) : null}
            {showVocationalFocusButton ? (
              <button
                type="button"
                className="rounded bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-700"
                onClick={() => handleSpecializationVoucherAdd(s.id)}
              >
                + Vocational Focus
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



  const registerLeftSlot = useCreationForgeLeftSlotRegistrar()

  const showVouchersSection = useMemo(
    () =>
      voucherTasks.length > 0 || creationVoucherRelatedTasks.length > 0,
    [voucherTasks, creationVoucherRelatedTasks],
  )

  const selectedSkillsPanel = useMemo(
    () => (
      <CreationSelectedSkillsPanel
        morphus={morphus}
        panelStyle={panelStyle}
        subStyle={subStyle}
        handToHandInputClass={handToHandInputClass}
        occSectionClass={occSectionClass}
        voucherSectionClass={voucherSectionClass}
        specializationSectionClass={specializationSectionClass}
        relatedSectionClass={relatedSectionClass}
        secondarySectionClass={secondarySectionClass}
        relatedCap={freeRelatedCap}
        relatedSlotsUsed={relatedSlotsUsed}
        specializationSlotsCap={specializationSlotsCap}
        specializationSlotsUsed={specializationSlotsUsed}
        secondaryCap={secondaryCap}
        secondaryPickSlots={secondaryPickSlots}
        relatedSelected={relatedSelected}
        secondarySelected={secondarySelected}
        showVouchersSection={showVouchersSection}
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
        renderVoucherRow={(pick, onClear) => {
          const occVoucherSlot = findOccCoreVoucherSlotForPick(
            effectiveOcc,
            character.occSpecializationId,
            voucherPicks,
            pick.instanceId,
          )
          const relatedVoucherSlot = findRelatedVoucherSlotForPick(
            creationVoucherRelatedTasks,
            relatedVoucherPicks,
            pick.instanceId,
          )
          return renderSelectedRow(
            pick,
            'voucher',
            occVoucherSlot
              ? () =>
                  setOccVoucherSlotPick(
                    occVoucherSlot.taskId,
                    occVoucherSlot.slot,
                    null,
                    occVoucherSlot.choiceCount,
                  )
              : relatedVoucherSlot
                ? () =>
                    setRelatedVoucherSlotPick(
                      relatedVoucherSlot.taskId,
                      relatedVoucherSlot.slot,
                      null,
                      relatedVoucherSlot.choiceCount,
                    )
                : onClear,
            'Remove',
          )
        }}
        renderHandToHandRow={renderHandToHandRow}
        renderSpecializationRow={(pick) => {
          const voucherSlot = findRelatedVoucherSlotForPick(
            vocationalFocusTasks,
            relatedVoucherPicks,
            pick.instanceId,
          )
          return renderSelectedRow(
            pick,
            'specialization',
            voucherSlot
              ? () =>
                  setRelatedVoucherSlotPick(
                    voucherSlot.taskId,
                    voucherSlot.slot,
                    null,
                    voucherSlot.choiceCount,
                  )
              : undefined,
          )
        }}
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
        specializationVoucherTasks={vocationalFocusTasks}
        creationVoucherRelatedTasks={creationVoucherRelatedTasks}
        specializationVoucherPicks={relatedVoucherPicks}
        specializationVoucherClusters={relatedVoucherClusters}
        onSpecializationVoucherClearSlot={(taskId, slot, choiceCount) =>
          setRelatedVoucherSlotPick(taskId, slot, null, choiceCount)
        }
        onSpecializationVoucherClusterChange={(voucherId, categoryName) =>
          setCreationOccRelatedVoucherCluster(voucherId, categoryName)
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
        shellMode
      />
    ),
    [
      morphus,
      panelStyle,
      subStyle,
      handToHandInputClass,
      occSectionClass,
      voucherSectionClass,
      specializationSectionClass,
      relatedSectionClass,
      secondarySectionClass,
      freeRelatedCap,
      relatedSlotsUsed,
      specializationSlotsCap,
      specializationSlotsUsed,
      secondaryCap,
      secondaryPickSlots,
      relatedSelected,
      secondarySelected,
      showVouchersSection,
      handToHandOptions.length,
      effectiveOcc,
      character.occSpecializationId,
      occSkillIds,
      handToHandTier,
      handToHandReserved,
      handToHandOptions,
      vocationalFocusTasks,
      creationVoucherRelatedTasks,
      relatedVoucherPicks,
      relatedVoucherClusters,
      voucherTasks,
      voucherPicks,
    ],
  )

  useLayoutEffect(() => {
    registerLeftSlot(selectedSkillsPanel)
    return () => registerLeftSlot(null)
  }, [registerLeftSlot, selectedSkillsPanel])



  return (

    <div className="flex h-full min-h-0 flex-1 flex-col">

      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        aria-labelledby="forge-tab-page-heading"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">

      <p

        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"

        style={{ color: morphus ? '#a5b4fc' : '#475569' }}

      >

        While vouchers are open, browse by book category (Domestic, Technical, etc.);

        only categories with an open voucher slot are selectable. Use{' '}

        <strong>+ Voucher 1</strong>, <strong>+ Voucher 2</strong>, … in the library for

        each slot; filled choices appear under{' '}

        <strong className="text-amber-950">Vouchers</strong> in the selected panel.

        Complete <strong className="text-sky-700">Vocational Focus</strong>, then all{' '}

        <strong className="text-amber-950">Vouchers</strong>, before picking general{' '}

        <strong>related</strong> and <strong>secondary</strong> skills.

      </p>


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

                    : category === CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY

                      ? CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY

                      : category === CREATION_VOUCHERS_LIBRARY_CATEGORY

                        ? CREATION_VOUCHERS_LIBRARY_CATEGORY

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

                  ...(vocationalFocusLock

                    ? [

                        {

                          value: CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY,

                          label: CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY,

                          rule: null,

                        },

                      ]

                    : creationVoucherLock

                      ? bookCategories.map((c) => ({

                          value: c,

                          label: c,

                          rule: null,

                          disabled: !openVoucherBookCategories.has(c),

                          title: !openVoucherBookCategories.has(c)
                            ? 'Not available for Voucher selection'
                            : undefined,

                        }))

                      : [

                        { value: '', label: '— select category —', rule: null },

                        { value: 'All', label: 'All (search only)', rule: null },

                        ...(vocationalFocusTasks.length > 0

                          ? [

                              {

                                value: CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY,

                                label: CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY,

                                rule: null,

                              },

                            ]

                          : []),

                        ...(showVouchersSection

                          ? [

                              {

                                value: CREATION_VOUCHERS_LIBRARY_CATEGORY,

                                label: CREATION_VOUCHERS_LIBRARY_CATEGORY,

                                rule: null,

                              },

                            ]

                          : []),

                        ...bookCategories.map((c) => ({

                          value: c,

                          label: c,

                          rule: formatOccCategoryRuleDropdown(

                            resolveOccCategoryRuleForFilter(c, occCategoryRules),

                          ),

                        })),

                      ]),

                ].map((item) => (

                  <li key={item.value || '__empty'} role="option">

                    <button

                      type="button"

                      disabled={'disabled' in item ? Boolean(item.disabled) : false}

                      title={'title' in item ? item.title : undefined}

                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-100 ${

                        morphus ? 'hover:bg-violet-950' : ''

                      } ${category === item.value ? (morphus ? 'bg-violet-950' : 'bg-sky-50') : ''} ${

                        'disabled' in item && item.disabled

                          ? 'cursor-not-allowed opacity-40 hover:bg-transparent'

                          : ''

                      }`}

                      onClick={() => {

                        if ('disabled' in item && item.disabled) return

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

              {category === CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY

                ? CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY

                : category === CREATION_VOUCHERS_LIBRARY_CATEGORY

                  ? CREATION_VOUCHERS_LIBRARY_CATEGORY

                  : category}

            </h3>

            {category === CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY ? (

              <span className="text-sm font-medium text-sky-700">

                {vocationalFocusBookCategories.length > 0

                  ? vocationalFocusBookCategories.join(', ')

                  : 'Choose a vocational focus category'}

              </span>

            ) : category === CREATION_VOUCHERS_LIBRARY_CATEGORY ? null : (

              <span

                className={`text-sm font-medium ${occCategoryRuleToneClass(selectedCategoryRuleDisplay.tone, morphus)}`}

              >

                {selectedCategoryRuleDisplay.label}

              </span>

            )}

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

      <SkillPickAddDialog

        state={pickDialog}

        morphus={morphus}

        onCancel={() => setPickDialog(null)}

        onConfirm={(result) => {

          if (!pickDialog) return

          if (pickDialog.variant === 'voucher') {
            setPickDialog(null)
            return
          }

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

      <SkillPickAddDialog
        state={
          pendingRelatedVoucherSlot
            ? {
                skillId: pendingRelatedVoucherSlot.skillId,
                variant: 'voucher',
                existingPicks: allCreationPicks,
              }
            : null
        }
        morphus={morphus}
        onCancel={() => setPendingRelatedVoucherSlot(null)}
        onConfirm={(result) => {
          if (!pendingRelatedVoucherSlot) return
          const { taskId, slot, choiceCount, skillId } = pendingRelatedVoucherSlot
          commitRelatedVoucherPick(
            taskId,
            slot,
            skillId,
            choiceCount,
            result.specialization,
          )
          setPendingRelatedVoucherSlot(null)
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


