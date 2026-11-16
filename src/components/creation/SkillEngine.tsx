import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useCharacter } from '../../context/CharacterContext'

import type { EngineSkillDef } from '../../data/library/skills'

import { getSkillById } from '../../data/library/skills'

import {
  getSkillBookCategories,
  listCreationSkillBookCategories,
  listCreationSkillLibrary,
  matchesSkillBookCategoryFilter,
  partitionCreationSkillLibrary,
  resolveCreationPickSelectionCategory,
} from '../../lib/creationSkillCatalog'

import {
  resolveCreationLibrarySkillPreview,
  resolveSkillCatalogDescription,
} from '../../lib/skillDisplayDetails'
import { buildLiveSkillContext } from '../../lib/liveSkillEngine'
import { getPalladiumSkillCatalogEntryById } from '../../data/library/skillsCatalogLoader'

import {
  appendCreationSkillPickWithConditionalGrants,
  grantedBySkillLabel,
  hasConditionalGrantForSkill,
  removeCreationSkillPickFromTiers,
  replaceConditionalGrantWithPaidPick,
} from '../../lib/conditionalRelatedSkills'

import {
  missingPrerequisiteMessage,
  prerequisiteSatisfied,
} from '../../lib/skillPrerequisites'

import {
  canAddSkillViaOccCoreVoucher,
  collectAllCreationSkillPicks,
  countFilledOccCoreVoucherSlots,
  findOccCoreVoucherSlotForPick,
  findOpenOccCoreVoucherSlot,
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
  countFilledRelatedVoucherSlots,
  CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY,
  CREATION_VOUCHERS_LIBRARY_CATEGORY,
  collectVocationalFocusBookCategories,
  findOpenRelatedVoucherSlot,
  findRelatedVoucherSlotForPick,
  getRelatedVoucherSlotPicks,
  isSkillInVocationalFocusLibraryScope,
  listCreationVoucherRelatedTasks,
  listVocationalFocusVoucherTasks,
  listOccRelatedVoucherTasks,
  sumRelatedVoucherReservedSlots,
} from '../../lib/occRelatedSkillVouchers'

import { resolveCreationSkillBrowseLock } from '../../lib/creationSkillBrowseLock'

import {
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
  buildSkillPrerequisiteDescriptionDisplay,
  buildSkillPrerequisiteDisplay,
  buildSkillUnmetPrerequisiteDisplay,
  listSkillSynergyHints,
  partitionSkillSynergyHints,
  skillPickRowSurfaceClass,
} from '../../lib/skillBlockDisplay'
import { SkillPrerequisiteMeta, SkillSynergyMeta } from './SkillSelectionMeta'
import { CreationLibrarySkillRow } from './CreationLibrarySkillRow'

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
  resolveCreationLibrarySkillBlockReason,
  skillNeedsPickDialog,
  skillNeedsVoucherPickDialog,
  skillRequiresSpecialization,
  skillSupportsProfessionalQuality,
  sumCreationSkillPickSlots,
  sumRelatedPoolSlotUsage,
  sumRelatedPoolUsageExcludingHandToHand,
  upgradePickToProfessional,
} from '../../lib/creationSkillPicks'

import { CreationSelectedSkillsPanel } from './CreationSelectedSkillsPanel'
import { CreationSelectedSkillRow } from './CreationSelectedSkillRow'
import { CreationSkillLibraryHeader } from './CreationSkillLibraryHeader'
import { useCreationForgeLeftSlotRegistrar } from './CreationForgeLeftSlotContext'
import {
  createDefaultCreationCategoryAvailabilityFilter,
  filterCreationBookCategoriesByAvailability,
  skillBookCategoriesPassAvailabilityFilter,
  type CreationCategoryAvailabilityFilter,
  type CreationCategoryAvailabilityKind,
} from '../../lib/creationSkillCategoryAvailabilityFilter'

import { SkillPickAddDialog, type SkillPickAddDialogState } from './SkillPickAddDialog'

import { SkillSpecializationEditDialog } from './SkillSpecializationEditDialog'

import type { CreationSkillPick } from '../../types'

import {
  formatOccCategoryRuleDropdown,
  formatOccCategoryRuleHeader,
  occCategoryRuleToneClass,
  resolveOccCategoryRuleForFilter,
} from '../../lib/occCategoryRuleDisplay'



const VOCATIONAL_FOCUS_FILTER_KEY = 'vocational_focus'

export function SkillEngine() {

  const {

    character,

    activeForm,

    effectiveOcc,

    occCreationDerived,

    supportsDualForm,

    skillSlotMultiplier,

    setCreationSkillPicks,

    setCreationOccCoreVoucherPick,

    setCreationOccRelatedVoucherPick,

    setCreationOccRelatedVoucherCluster,

    setCreationOccGrantPickDetail,

    setCreationHandToHandTier,

    hostGenreId,

    psychicTier,

  } = useCharacter()



  const morphus = supportsDualForm && activeForm === 'morphus'

  const [search, setSearch] = useState('')

  const [category, setCategory] = useState<string>('')

  const [categoryOpen, setCategoryOpen] = useState(false)

  const [libraryAvailabilityFilter, setLibraryAvailabilityFilter] =
    useState(createDefaultCreationCategoryAvailabilityFilter)

  const [voucherAvailabilityFilters, setVoucherAvailabilityFilters] = useState<
    Record<string, CreationCategoryAvailabilityFilter>
  >({})

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
        character.creationGenreId,
      ),
    [
      effectiveOcc,
      character.occSpecializationId,
      occSkillIds,
      voucherPicks,
      character.creationGenreId,
    ],
  )

  const resolvedOccPicks = useMemo(
    () =>
      resolveOccCoreSkillPicks(
        effectiveOcc,
        character.occSpecializationId,
        voucherPicks,
        character.creationOccGrantPickDetails,
        character.creationGenreId,
      ),
    [
      effectiveOcc,
      character.occSpecializationId,
      voucherPicks,
      character.creationOccGrantPickDetails,
      character.creationGenreId,
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

  // Reserve all related vouchers (vocational + creation), matching forge validators.
  const relatedVoucherReserved = useMemo(
    () => sumRelatedVoucherReservedSlots(relatedVoucherTasks),
    [relatedVoucherTasks],
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

  const specializationSlotsCap = useMemo(
    () => sumRelatedVoucherReservedSlots(vocationalFocusTasks),
    [vocationalFocusTasks],
  )

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

  const skillBrowseLock = useMemo(
    () =>
      resolveCreationSkillBrowseLock({
        effectiveOcc: effectiveOcc ?? undefined,
        specializationId: character.occSpecializationId,
        relatedVoucherTasks,
        voucherPicks,
        relatedVoucherPicks,
        relatedVoucherClusters,
      }),
    [
      effectiveOcc,
      character.occSpecializationId,
      relatedVoucherTasks,
      voucherPicks,
      relatedVoucherPicks,
      relatedVoucherClusters,
    ],
  )

  const vocationalFocusBookCategories = useMemo(
    () =>
      collectVocationalFocusBookCategories(
        relatedVoucherTasks,
        relatedVoucherClusters,
      ),
    [relatedVoucherTasks, relatedVoucherClusters],
  )

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

  const resolveVoucherAvailabilityFilter = (
    laneKey: string,
  ): CreationCategoryAvailabilityFilter =>
    voucherAvailabilityFilters[laneKey] ??
    createDefaultCreationCategoryAvailabilityFilter()

  const filteredBookCategories = useMemo(
    () =>
      filterCreationBookCategoriesByAvailability(
        bookCategories,
        occCategoryRules,
        libraryAvailabilityFilter,
      ),
    [bookCategories, occCategoryRules, libraryAvailabilityFilter],
  )

  useEffect(() => {
    if (
      category !== '' &&
      category !== 'All' &&
      category !== CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY &&
      category !== CREATION_VOUCHERS_LIBRARY_CATEGORY &&
      !filteredBookCategories.includes(category)
    ) {
      setCategory('')
    }
  }, [category, filteredBookCategories])

  const handleLibraryAvailabilityChange = (
    kind: CreationCategoryAvailabilityKind,
    enabled: boolean,
  ) => {
    setLibraryAvailabilityFilter((prev) => ({ ...prev, [kind]: enabled }))
  }

  const handleVoucherAvailabilityChange = (
    laneKey: string,
    kind: CreationCategoryAvailabilityKind,
    enabled: boolean,
  ) => {
    setVoucherAvailabilityFilters((prev) => {
      const current =
        prev[laneKey] ?? createDefaultCreationCategoryAvailabilityFilter()
      return { ...prev, [laneKey]: { ...current, [kind]: enabled } }
    })
  }


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


  const synergyAvailability = useMemo(
    () => ({
      effectiveOcc,
      specializationId: character.occSpecializationId,
    }),
    [effectiveOcc, character.occSpecializationId],
  )

  const skillPercentCtx = useMemo(
    () => buildLiveSkillContext(character, activeForm),
    [character, activeForm],
  )

  const relatedIdsForDisplay = useMemo(() => {
    const ids = new Set<string>()
    for (const pick of relatedSelected) ids.add(pick.skillId)
    for (const picks of Object.values(relatedVoucherPicks)) {
      if (!Array.isArray(picks)) continue
      for (const pick of picks) {
        if (pick && typeof pick === 'object' && 'skillId' in pick) {
          ids.add(String((pick as { skillId: string }).skillId))
        }
      }
    }
    return ids
  }, [relatedSelected, relatedVoucherPicks])

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

  const voucherBrowseCategory =
    category === CREATION_VOUCHERS_LIBRARY_CATEGORY ? undefined : category

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
      raceBlocked: false,
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
        if (
          !skillBookCategoriesPassAvailabilityFilter(
            getSkillBookCategories(s.id),
            occCategoryRules,
            resolveVoucherAvailabilityFilter(VOCATIONAL_FOCUS_FILTER_KEY),
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
        const bookCats = getSkillBookCategories(s.id)
        const anyVoucherLaneAllows = libraryCreationVoucherRefs.some((ref) =>
          skillBookCategoriesPassAvailabilityFilter(
            bookCats,
            occCategoryRules,
            resolveVoucherAvailabilityFilter(ref.task.id),
          ),
        )
        if (!anyVoucherLaneAllows) return false
        return nameOk
      }

      const catOk = matchesSkillBookCategoryFilter(s, category)
      return catOk && nameOk
    }

    const filtered = skillLibrary.filter((s) => matchesLibraryQuery(s))

    return partitionCreationSkillLibrary(
      filtered,
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
    relatedVoucherTasks,
    relatedVoucherPicks,
    relatedVoucherClusters,
    effectiveOcc,
    character.occSpecializationId,
    creationVoucherRelatedTasks,
    hostGenreId,
    catalogSkillIds,
    libraryCreationVoucherRefs,
    occCategoryRules,
    voucherAvailabilityFilters,
  ])




  const panelStyle = morphus
    ? 'border-violet-300 bg-violet-50 text-violet-950'
    : 'border-slate-300 bg-slate-100 text-slate-900'

  const subStyle = morphus
    ? 'border-violet-200 bg-violet-100/80 text-violet-900'
    : 'border-slate-300 bg-white text-slate-900'



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

    const prerequisiteParts = buildSkillPrerequisiteDisplay(
      def.prerequisite,
      allSelected,
    )
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
    const hasExpandedMeta =
      Boolean(prerequisiteParts) ||
      displayedSynergyHints.length > 0 ||
      activeSynergyLines.some((line) => line.label !== 'Professional quality')

    return (
      <CreationSelectedSkillRow
        key={`${tier}-${pick.instanceId}`}
        label={formatCreationSkillPickLabel(pick, def.name)}
        warningTitle={
          bad
            ? (missingPrerequisiteMessage(def.prerequisite, allSelected) ??
              undefined)
            : undefined
        }
        grantSource={grantSource}
        surfaceClassName={`${skillPickRowSurfaceClass(tier, morphus)} ${
          bad ? 'border-amber-500/60' : ''
        }`}
        professionalQuality={
          canTogglePro
            ? {
                isProfessional: Boolean(pick.professionalQuality),
                disabled: !pick.professionalQuality && !canUpgradeToPro,
                disabledTitle: canUpgradeToPro
                  ? undefined
                  : proUpgradeBlockedTitle,
                onToggle: () => togglePickProfessionalQuality(pick, tier),
              }
            : undefined
        }
        onEdit={canEdit ? () => setEditPick({ pick, tier }) : undefined}
        onRemove={
          onRemove && !pick.grantedBySkillId
            ? () => onRemove(pick.instanceId)
            : undefined
        }
        removeLabel={removeLabel}
        expandedDetail={
          hasExpandedMeta ? (
            <>
              {prerequisiteParts ? (
                <SkillPrerequisiteMeta parts={prerequisiteParts} />
              ) : null}
              <SkillSynergyMeta
                hints={displayedSynergyHints}
                activeLines={activeSynergyLines}
              />
            </>
          ) : undefined
        }
      />
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



  function selectionCategoryForSkill(skillId: string): string | undefined {
    return resolveCreationPickSelectionCategory(skillId, category)
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
      buildCreationSkillPick(skillId, {
        specialization,
        selectionCategory: selectionCategoryForSkill(skillId),
      }),
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
      buildCreationSkillPick(skillId, {
        specialization,
        selectionCategory: selectionCategoryForSkill(skillId),
      }),
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

      const pick = buildCreationSkillPick(skillId, {
        professionalQuality: false,
        selectionCategory: selectionCategoryForSkill(skillId),
      })

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

      selectionCategory: selectionCategoryForSkill(skillId),

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
      !skillBrowseLock.blocksCreationVoucherWhileVocationalIncomplete &&
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
      !skillBrowseLock.blocksCreationVoucherWhileVocationalIncomplete &&
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
    const voucherAddTargetsRaw =
      !skillBrowseLock.blocksCreationVoucherWhileVocationalIncomplete &&
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
    const skillBookCats = getSkillBookCategories(s.id)
    const voucherAddTargets = voucherAddTargetsRaw.filter((target) =>
      skillBookCategoriesPassAvailabilityFilter(
        skillBookCats,
        occCategoryRules,
        resolveVoucherAvailabilityFilter(target.taskId),
      ),
    )
    const canAddViaVocationalFocusVoucher =
      effectiveOcc != null &&
      voucherLibraryAllowed &&
      skillBookCategoriesPassAvailabilityFilter(
        skillBookCats,
        occCategoryRules,
        resolveVoucherAvailabilityFilter(VOCATIONAL_FOCUS_FILTER_KEY),
      ) &&
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
      !skillBrowseLock.blocksRelatedSecondaryBrowse &&
      canAddRelated &&
      prereqOk &&
      !identityTaken
    const showSecondaryButton =
      !skillBrowseLock.blocksRelatedSecondaryBrowse &&
      canAddSecondary &&
      prereqOk &&
      !identityTaken
    const showAddButtons =
      showVoucherButton ||
      showVocationalFocusButton ||
      showRelatedButton ||
      showSecondaryButton

    const showMeta = !unconditionallyExcluded
    const unmetPrerequisiteParts = showMeta
      ? buildSkillUnmetPrerequisiteDisplay(s.prerequisite, allSelected)
      : null
    const requiresParts = showMeta
      ? buildSkillPrerequisiteDescriptionDisplay(s.prerequisite, allSelected)
      : null
    const synergyHints = showMeta
      ? listSkillSynergyHints(s, synergyAvailability)
      : []
    const { active: activeSynergyHints, available: availableSynergyHints } =
      partitionSkillSynergyHints(synergyHints, allSelected)

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

    const libraryPreview = resolveCreationLibrarySkillPreview(s)
    const physicalBonusSummary = libraryPreview.physicalBonusSummary
    const subSkillNames = showAddButtons ? libraryPreview.subSkillNames : []
    const grantedSkillNames = showAddButtons
      ? libraryPreview.grantedSkillNames
      : []

    const previewTier: SkillPickDisplayTier = selectionTier
      ? selectionTier === 'voucher'
        ? 'voucher'
        : selectionTier === 'specialization'
          ? 'specialization'
          : selectionTier
      : category === CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY &&
          showVocationalFocusButton
        ? 'preview_specialization'
        : category === CREATION_VOUCHERS_LIBRARY_CATEGORY && showVoucherButton
          ? 'preview_voucher'
          : showRelatedButton
            ? 'preview_related'
            : showVocationalFocusButton
              ? 'preview_specialization'
              : showVoucherButton
                ? 'preview_voucher'
                : 'preview_secondary'

    const percentDisplay = showMeta
      ? resolveSkillCreationDisplay(s, previewTier, {
          occ: effectiveOcc ?? undefined,
          relatedIds: relatedIdsForDisplay,
          allSelectedIds: allSelected,
          psychicTier,
          specializationId: character.occSpecializationId,
          voucherPicks,
          relatedVoucherPicks,
          skillPercentCtx,
          iqBonus: skillPercentCtx.iqBonus,
          allPicks: allCreationPicks,
          synergyAvailability,
          genreId: hostGenreId,
        })
      : null

    const catalogEntry = getPalladiumSkillCatalogEntryById(s.id) as
      | { description?: string }
      | undefined
    const descriptionResolved = resolveSkillCatalogDescription(
      catalogEntry?.description,
    )

    const warningTitle = prereqBlocked
      ? resolveCreationLibrarySkillVoucherBlockReason(s, voucherLibraryOpts) ||
        missingPrerequisiteMessage(s.prerequisite, allSelected) ||
        undefined
      : undefined

    return (
      <CreationLibrarySkillRow
        key={s.id}
        skillName={s.name}
        warningTitle={warningTitle}
        unmetPrerequisiteParts={unmetPrerequisiteParts}
        hasAvailableSynergies={availableSynergyHints.length > 0}
        hasActiveSynergies={activeSynergyHints.length > 0}
        description={descriptionResolved.text}
        descriptionIsPlaceholder={descriptionResolved.isPlaceholder}
        percentSummary={percentDisplay?.percentSummary}
        requiresParts={requiresParts}
        activeSynergyHints={activeSynergyHints}
        availableSynergyHints={availableSynergyHints}
        physicalBonusSummary={physicalBonusSummary}
        surfaceClassName={rowSurface}
        morphus={morphus}
      >
        {statusLabel ? (
          <p
            className={`mt-1 text-xs font-semibold ${
              alreadyChosen || picked
                ? 'text-slate-500 dark:text-slate-400'
                : 'text-red-500'
            }`}
          >
            {statusLabel}
          </p>
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
      </CreationLibrarySkillRow>
    )
  }



  const registerLeftSlot = useCreationForgeLeftSlotRegistrar()

  const showVouchersSection = useMemo(
    () =>
      voucherTasks.length > 0 || creationVoucherRelatedTasks.length > 0,
    [voucherTasks, creationVoucherRelatedTasks],
  )

  const libraryProgressChips = useMemo(() => {
    const chips: {
      key: string
      label: string
      used: number
      cap: number
      labelClassName?: string
    }[] = []
    if (vocationalFocusTasks.length > 0) {
      chips.push({
        key: 'vocational_focus',
        label: CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY,
        used: specializationSlotsUsed,
        cap: specializationSlotsCap,
        labelClassName: specializationSectionClass,
      })
    }
    libraryCreationVoucherRefs.forEach((ref, index) => {
      const filled =
        ref.kind === 'occ_core'
          ? countFilledOccCoreVoucherSlots(ref.task, voucherPicks)
          : countFilledRelatedVoucherSlots(ref.task, relatedVoucherPicks)
      chips.push({
        key: `voucher:${ref.task.id}`,
        label: creationVoucherDisplayName(index + 1),
        used: filled,
        cap: ref.task.entry.choiceCount,
        labelClassName: voucherSectionClass,
      })
    })
    if (freeRelatedCap > 0) {
      chips.push({
        key: 'related',
        label: 'O.C.C. Related',
        used: relatedSlotsUsed,
        cap: freeRelatedCap,
        labelClassName: relatedSectionClass,
      })
    }
    if (secondaryCap > 0) {
      chips.push({
        key: 'secondary',
        label: 'Secondary',
        used: secondaryPickSlots,
        cap: secondaryCap,
        labelClassName: secondarySectionClass,
      })
    }
    return chips
  }, [
    vocationalFocusTasks.length,
    specializationSlotsUsed,
    specializationSlotsCap,
    specializationSectionClass,
    libraryCreationVoucherRefs,
    voucherPicks,
    relatedVoucherPicks,
    voucherSectionClass,
    freeRelatedCap,
    relatedSlotsUsed,
    relatedSectionClass,
    secondaryCap,
    secondaryPickSlots,
    secondarySectionClass,
  ])

  const libraryVoucherFilterLanes = useMemo(() => {
    const lanes: {
      key: string
      label: string
      filter: CreationCategoryAvailabilityFilter
    }[] = []
    if (vocationalFocusTasks.length > 0) {
      lanes.push({
        key: VOCATIONAL_FOCUS_FILTER_KEY,
        label: CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY,
        filter: resolveVoucherAvailabilityFilter(VOCATIONAL_FOCUS_FILTER_KEY),
      })
    }
    libraryCreationVoucherRefs.forEach((ref, index) => {
      lanes.push({
        key: ref.task.id,
        label: creationVoucherDisplayName(index + 1),
        filter: resolveVoucherAvailabilityFilter(ref.task.id),
      })
    })
    return lanes
  }, [
    vocationalFocusTasks.length,
    libraryCreationVoucherRefs,
    voucherAvailabilityFilters,
  ])

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
        allSelectedPicks={allCreationPicks}
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
          renderSelectedRow(pick, 'related', (instanceId) => {
            const next = removeCreationSkillPickFromTiers(
              relatedSelected,
              secondarySelected,
              instanceId,
            )
            setCreationSkillPicks(occSkillIds, next.related, next.secondary)
          })
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
          renderSelectedRow(pick, 'secondary', (instanceId) => {
            const next = removeCreationSkillPickFromTiers(
              relatedSelected,
              secondarySelected,
              instanceId,
            )
            setCreationSkillPicks(occSkillIds, next.related, next.secondary)
          })
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
      allCreationPicks,
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
      <CreationSkillLibraryHeader
        morphus={morphus}
        progressChips={libraryProgressChips}
        globalFilter={libraryAvailabilityFilter}
        onGlobalFilterChange={handleLibraryAvailabilityChange}
        voucherFilterLanes={libraryVoucherFilterLanes}
        onVoucherFilterChange={handleVoucherAvailabilityChange}
      />


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

                  ...filteredBookCategories.map((c) => ({

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

              {category === CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY

                ? CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY

                : category === CREATION_VOUCHERS_LIBRARY_CATEGORY

                  ? CREATION_VOUCHERS_LIBRARY_CATEGORY

                  : category}

            </h3>

            {category === CREATION_VOCATIONAL_FOCUS_LIBRARY_CATEGORY ? (

              <span className="text-sm font-medium text-sky-700">

                {filterCreationBookCategoriesByAvailability(
                  vocationalFocusBookCategories,
                  occCategoryRules,
                  resolveVoucherAvailabilityFilter(VOCATIONAL_FOCUS_FILTER_KEY),
                ).join(', ') || 'Choose a vocational focus category'}

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

        ) : libraryPartitions.browse.length === 0 ? (

          <p className="text-sm opacity-60">No skills match this filter.</p>

        ) : (

          <div className="flex max-h-[480px] min-h-0 flex-col gap-2 text-sm">

            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {libraryPartitions.browse.map((s) => renderLibrarySkill(s))}
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


