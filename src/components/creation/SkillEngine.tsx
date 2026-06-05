import { useMemo, useState } from 'react'

import { useCharacter } from '../../context/CharacterContext'

import type { EngineSkillDef } from '../../data/library/skills'

import type { PsychicTier } from '../../types'

import { getSkillById } from '../../data/library/skills'

import {

  listCreationSkillBookCategories,

  listCreationSkillLibrary,

  matchesSkillBookCategoryFilter,

  sortCreationSkillLibraryResults,

} from '../../lib/creationSkillCatalog'

import { maPbScaledBonuses } from '../../lib/skillEquation'

import { buildSkillPercentContext } from '../../lib/skillPercentResolution'

import {

  missingPrerequisiteMessage,

  prerequisiteSatisfied,

} from '../../lib/skillPrerequisites'

import { computeLiveBonuses } from '../../lib/characterDerived'

import {

  isOccRelatedSkillAllowed,

  isSecondarySkillAllowed,

} from '../../lib/occCreationDerivation'

import {

  applyPsychicOccSkillBonusPercent,

} from '../../lib/creationPsychicSkills'

import {
  collectAllCreationSkillPicks,
  findOccCoreVoucherSlotForPick,
  isOccCoreGrantSkillPick,
  resolveCreationOccSkillIds,
  resolveOccCoreSkillPicks,
} from '../../lib/occCoreSkillVouchers'

import { creationHandToHandElectiveSlotCost } from '../../lib/creationHandToHandChoice'

import {

  resolveSelectionTier,

  resolveSkillCreationDisplay,

  skillAddDisabledReason,

  skillRelatedVsSecondaryPreviewDiffers,

  type SkillPickDisplayTier,

} from '../../lib/skillCreationDisplay'

import {
  buildCreationSkillPick,
  creationSkillIdsSet,
  creationSkillPickHasEditableSpecialization,
  downgradePickToStandard,
  formatCreationSkillPickLabel,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
  getOccCoreVoucherSlotPicks,
  isCreationSkillFullySelected,
  isCreationSkillIdentityTaken,
  professionalQualityLabel,
  skillNeedsPickDialog,
  skillSupportsProfessionalQuality,
  sumCreationSkillPickSlots,
  sumRelatedPoolSlotUsage,
  upgradePickToProfessional,
} from '../../lib/creationSkillPicks'

import { OccCoreSkillVoucherPanel } from './OccCoreSkillVoucherPanel'

import { SkillPickAddDialog, type SkillPickAddDialogState } from './SkillPickAddDialog'

import { SkillSpecializationEditDialog } from './SkillSpecializationEditDialog'

import { SkillStatLines } from './SkillStatLines'

import type { CreationSkillPick } from '../../types'



function formatCategoryRuleLine(

  r: {

    categoryName: string

    accessType: string

    bonusPercent: number

    skillSpecificOverrides?: Readonly<Record<string, number>>

    exceptions?: readonly string[]

  },

  psychicTier: PsychicTier,

): string {

  const rawBonus = r.bonusPercent

  const effectiveBonus = applyPsychicOccSkillBonusPercent(rawBonus, psychicTier)

  const halved = psychicTier === 'major' && effectiveBonus !== rawBonus

  const showBonus = r.accessType !== 'none' && rawBonus > 0



  let line = `${r.categoryName}: ${r.accessType}`

  if (showBonus) {

    line += ` (+${halved ? effectiveBonus : rawBonus}%`

    if (halved) line += ` — book +${rawBonus}% halved for Major psychic`

    line += ')'

  }



  if (r.skillSpecificOverrides && Object.keys(r.skillSpecificOverrides).length > 0) {

    const overrides = Object.entries(r.skillSpecificOverrides)

      .map(([id, pct]) => {

        const eff = applyPsychicOccSkillBonusPercent(pct, psychicTier)

        return halved && eff !== pct

          ? `${id} +${eff}% (book +${pct}%)`

          : `${id} +${pct}%`

      })

      .join(', ')

    line += ` · overrides: ${overrides}`

  }

  if (r.exceptions?.length) {

    line += ` (exceptions: ${r.exceptions.join(', ')})`

  }

  return line

}



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

    hostGenreId,

  } = useCharacter()



  const morphus = supportsDualForm && activeForm === 'morphus'

  const [search, setSearch] = useState('')

  const [category, setCategory] = useState<string>('')

  const [pickDialog, setPickDialog] = useState<SkillPickAddDialogState | null>(null)

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

    ? creationHandToHandElectiveSlotCost(

        effectiveOcc,

        character.creationHandToHandTier,

      )

    : 0

  const relatedSkillCap = Math.max(0, relatedCap - handToHandReserved)

  const relatedPickSlots = sumCreationSkillPickSlots(relatedSelected)

  const relatedSlotsUsed = sumRelatedPoolSlotUsage(
    relatedSelected,
    resolvedOccPicks,
    handToHandReserved,
  )

  const secondaryPickSlots = sumCreationSkillPickSlots(secondarySelected)

  const secondaryCap = occCreationDerived?.secondarySkillSlots ?? 0



  const bookCategories = useMemo(

    () => listCreationSkillBookCategories(hostGenreId),

    [hostGenreId],

  )



  const allSelected = useMemo(

    () =>

      creationSkillIdsSet(resolvedOccSkillIds, relatedSelected, secondarySelected),

    [resolvedOccSkillIds, relatedSelected, secondarySelected],

  )



  const relatedSet = useMemo(

    () => new Set(relatedSelected.map((p) => p.skillId)),

    [relatedSelected],

  )



  const attrs = activeFormState.attributes

  const iqBonus = useMemo(

    () => computeLiveBonuses(attrs).iqOccSkillPercent,

    [attrs],

  )

  const maPbBonus = useMemo(() => maPbScaledBonuses(attrs.ma, attrs.pb), [attrs])



  const skillPercentCtx = useMemo(

    () =>

      buildSkillPercentContext(

        character,

        activeForm,

        iqBonus,

        maPbBonus,

        morphusSurfaceType,

      ),

    [character, activeForm, iqBonus, maPbBonus, morphusSurfaceType],

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

    ],

  )



  const skillLibrary = useMemo(

    () => listCreationSkillLibrary(hostGenreId),

    [hostGenreId],

  )



  const libraryPopulated = category === 'All' ? search.trim().length > 0 : category !== ''



  const filteredLibrary = useMemo(() => {

    if (!libraryPopulated) return []

    const q = search.trim().toLowerCase()

    const filtered = skillLibrary.filter((s) => {

      if (s.slotKind !== 'occ_related' && !s.secondaryEligible) return false

      const catOk = matchesSkillBookCategoryFilter(s, category)

      const nameOk =

        q === '' ||

        s.name.toLowerCase().includes(q) ||

        s.id.toLowerCase().includes(q)

      return catOk && nameOk

    })

    return sortCreationSkillLibraryResults(filtered, category)

  }, [search, category, skillLibrary, libraryPopulated])



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

  function renderSelectedRow(

    pick: CreationSkillPick,

    tier: SkillPickDisplayTier,

    onRemove?: (instanceId: string) => void,

  ) {

    const def = getSkillById(pick.skillId)

    if (!def) return null

    const bad = !prerequisiteSatisfied(def.prerequisite, allSelected)

    const display = resolveDisplay(def, tier, pick)

    const canEdit = creationSkillPickHasEditableSpecialization(pick)

    const canTogglePro = skillSupportsProfessionalQuality(pick.skillId)

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



    return (

      <li

        key={`${tier}-${pick.instanceId}`}

        className={`rounded border px-2 py-1.5 text-sm ${subStyle} ${

          bad ? 'border-amber-500/60' : ''

        }`}

      >

        <div className="flex items-start justify-between gap-2">

          <div className="min-w-0 flex-1">

            <p className="font-medium">

              {formatCreationSkillPickLabel(pick, def.name)}

              {bad ? (

                <span

                  className="ml-1 text-amber-500"

                  title={

                    missingPrerequisiteMessage(def.prerequisite, allSelected) ?? ''

                  }

                >

                  ⚠

                </span>

              ) : null}

            </p>

            <SkillStatLines display={display} />

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

            {onRemove ? (

              <button

                type="button"

                className="text-xs text-rose-400 hover:underline"

                onClick={() => onRemove(pick.instanceId)}

              >

                Remove

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



  function handleSkillAdd(skillId: string, action: 'related' | 'secondary') {

    const existingPicks = action === 'related' ? relatedSelected : secondarySelected

    if (!skillNeedsPickDialog(skillId, existingPicks)) {

      if (isCreationSkillIdentityTaken(allCreationPicks, skillId)) return

      const pick = buildCreationSkillPick(skillId, { professionalQuality: false })

      if (action === 'related') {

        setRelatedSelected([...relatedSelected, pick])

      } else {

        setSecondarySelected([...secondarySelected, pick])

      }

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

    setTarget([...target, pick])

  }



  function renderLibrarySkill(s: EngineSkillDef) {

    const picked = isCreationSkillFullySelected(

      s.id,

      resolvedOccPicks,

      relatedSelected,

      secondarySelected,

    )

    const selectionTier = resolveSelectionTier(

      s.id,

      resolvedOccSkillIds,

      relatedSelected,

      secondarySelected,

    )

    const prereqOk = prerequisiteSatisfied(s.prerequisite, allSelected)

    const warn = picked && !prereqOk

    const relFull = relatedSlotsUsed >= relatedSkillCap

    const secFull = secondaryPickSlots >= secondaryCap

    const relatedBlocked =

      s.slotKind === 'occ_related' &&

      effectiveOcc != null &&

      !isOccRelatedSkillAllowed(

        effectiveOcc,

        s.id,

        s.category,

        character.occSpecializationId,

      )

    const secondaryBlocked =

      s.secondaryEligible &&

      effectiveOcc != null &&

      !isSecondarySkillAllowed(

        effectiveOcc,

        s.id,

        s.category,

        character.occSpecializationId,

      )

    const canAddRelated =

      s.slotKind === 'occ_related' && !picked && !relFull && !relatedBlocked

    const canAddSecondary =

      s.secondaryEligible && !picked && !secFull && !secondaryBlocked



    const relatedDisabledReason = skillAddDisabledReason('related', {

      picked,

      slotsFull: relFull,

      categoryBlocked: relatedBlocked,

      actionAvailable: s.slotKind === 'occ_related',

    })

    const secondaryDisabledReason = skillAddDisabledReason('secondary', {

      picked,

      slotsFull: secFull,

      categoryBlocked: secondaryBlocked,

      actionAvailable: s.secondaryEligible,

    })



    const showRelatedPreview = !picked && s.slotKind === 'occ_related'

    const showSecondaryPreview = !picked && s.secondaryEligible

    const previewRelatedDisplay = showRelatedPreview

      ? resolveDisplay(s, 'preview_related')

      : null

    const previewSecondaryDisplay = showSecondaryPreview

      ? resolveDisplay(s, 'preview_secondary')

      : null

    const previewsDiffer =

      previewRelatedDisplay &&

      previewSecondaryDisplay &&

      skillRelatedVsSecondaryPreviewDiffers(

        previewRelatedDisplay,

        previewSecondaryDisplay,

      )

    const unifiedPreviewDisplay =

      previewSecondaryDisplay ?? previewRelatedDisplay

    const bookCatLabel = (s.bookCategories ?? []).join(', ')



    return (

      <li

        key={s.id}

        className={`rounded-md border p-2 ${subStyle} ${

          picked ? 'opacity-50' : ''

        } ${warn ? 'border-amber-500/70 ring-1 ring-amber-500/40' : ''}`}

      >

        <div className="font-medium">{s.name}</div>

        <div className="text-xs opacity-60">{bookCatLabel || s.category}</div>

        {picked && selectionTier ? (

          <p className="mt-1 text-xs font-semibold text-slate-500">

            Already selected (

            {selectionTier === 'occ'

              ? 'O.C.C. skills'

              : selectionTier === 'related'

                ? 'O.C.C. related'

                : 'secondary'}

            )

          </p>

        ) : null}

        {!picked && previewsDiffer && previewRelatedDisplay ? (

          <div className="mt-1">

            <p className="text-[10px] uppercase tracking-wide opacity-60">

              If taken as O.C.C. related

            </p>

            <SkillStatLines display={previewRelatedDisplay} compact />

          </div>

        ) : null}

        {!picked && previewsDiffer && previewSecondaryDisplay ? (

          <div className="mt-1">

            <p className="text-[10px] uppercase tracking-wide opacity-60">

              If taken as secondary

            </p>

            <SkillStatLines display={previewSecondaryDisplay} compact />

          </div>

        ) : null}

        {!picked && !previewsDiffer && unifiedPreviewDisplay ? (

          <div className="mt-1">

            <SkillStatLines display={unifiedPreviewDisplay} compact />

          </div>

        ) : null}

        {picked && selectionTier ? (

          <div className="mt-1">

            <SkillStatLines

              display={resolveDisplay(

                s,

                selectionTier === 'occ'

                  ? 'occ'

                  : selectionTier === 'related'

                    ? 'related'

                    : 'secondary',

              )}

              compact

            />

          </div>

        ) : null}

        {warn ? (

          <p

            className="mt-1 text-xs font-semibold text-amber-500"

            title={missingPrerequisiteMessage(s.prerequisite, allSelected) ?? ''}

          >

            Missing Prerequisite — still visible (Pillar 8).

          </p>

        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-1">

          {s.slotKind === 'occ_related' ? (

            <>

              <button

                type="button"

                disabled={!canAddRelated}

                title={relatedDisabledReason ?? undefined}

                className="rounded bg-violet-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"

                onClick={() => {

                  if (!canAddRelated) return

                  handleSkillAdd(s.id, 'related')

                }}

              >

                + Related

              </button>

              {relatedDisabledReason ? (

                <span className="text-[10px] text-rose-500">

                  {relatedDisabledReason}

                </span>

              ) : null}

            </>

          ) : null}

          {s.secondaryEligible ? (

            <>

              <button

                type="button"

                disabled={!canAddSecondary}

                title={secondaryDisabledReason ?? undefined}

                className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"

                onClick={() => {

                  if (!canAddSecondary) return

                  handleSkillAdd(s.id, 'secondary')

                }}

              >

                + Secondary

              </button>

              {secondaryDisabledReason ? (

                <span className="text-[10px] text-rose-500">

                  {secondaryDisabledReason}

                </span>

              ) : null}

            </>

          ) : null}

        </div>

      </li>

    )

  }



  return (

    <section className="w-full" aria-labelledby="forge-tab-page-heading">

      <p

        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"

        style={{ color: morphus ? '#a5b4fc' : '#475569' }}

      >

        O.C.C. core skill choices (Hand-to-Hand and vouchers) are resolved above.

        Pick <strong>O.C.C. related</strong> skills (category % bonuses apply) and{' '}

        <strong>secondary</strong> skills (same category access as related, no

        category % bonuses).

      </p>



      {effectiveOcc?.occRelatedSkills.categoryRules.length ? (

        <div

          className={`mb-4 rounded-lg border px-3 py-2 text-[10px] ${

            morphus ? 'border-violet-800 text-violet-200' : 'border-slate-600'

          }`}

        >

          <p className="font-bold uppercase tracking-wide opacity-80">

            Related & secondary skill category rules

          </p>

          <ul className="mt-1 list-inside list-disc space-y-0.5 font-mono">

            {effectiveOcc.occRelatedSkills.categoryRules.map((r) => (

              <li key={r.categoryName}>

                {formatCategoryRuleLine(r, psychicTier)}

              </li>

            ))}

          </ul>

        </div>

      ) : null}



      <OccCoreSkillVoucherPanel />



      <div className={`mb-4 space-y-3 rounded-lg border p-3 ${panelStyle}`}>

        <h3 className="text-xs font-bold uppercase tracking-wide opacity-80">

          Selected skills

        </h3>

        <div>

          <p className="mb-1 text-xs font-semibold opacity-70">O.C.C. skills</p>

          <ul className="space-y-1">

            {resolvedOccPicks.map((pick) => renderSelectedRow(pick, 'occ'))}

            {resolvedOccPicks.length === 0 ? (

              <li className="text-xs opacity-50">None yet.</li>

            ) : null}

          </ul>

        </div>

        <div>

          <p className="mb-1 text-xs font-semibold opacity-70">O.C.C. related</p>

          <ul className="space-y-1">

            {relatedSelected.map((pick) =>

              renderSelectedRow(pick, 'related', (instanceId) =>

                setRelatedSelected(

                  relatedSelected.filter((p) => p.instanceId !== instanceId),

                ),

              ),

            )}

            {relatedSelected.length === 0 ? (

              <li className="text-xs opacity-50">None selected.</li>

            ) : null}

          </ul>

        </div>

        <div>

          <p className="mb-1 text-xs font-semibold opacity-70">Secondary</p>

          <ul className="space-y-1">

            {secondarySelected.map((pick) =>

              renderSelectedRow(pick, 'secondary', (instanceId) =>

                setSecondarySelected(

                  secondarySelected.filter((p) => p.instanceId !== instanceId),

                ),

              ),

            )}

            {secondarySelected.length === 0 ? (

              <li className="text-xs opacity-50">None selected.</li>

            ) : null}

          </ul>

        </div>

      </div>



      <div

        className={`mb-4 grid gap-3 rounded-lg border p-4 sm:grid-cols-2 ${panelStyle}`}

        aria-label="Skill slot tracker"

      >

        <div>

          <p className="text-xs font-bold uppercase tracking-wide opacity-70">

            O.C.C. related skills

          </p>

          <p className="mt-1 font-mono text-2xl font-bold tabular-nums">

            {relatedSlotsUsed} / {relatedCap}

          </p>

          <p className="text-xs opacity-75">

            Category % bonuses apply · base {relatedBase} × {skillSlotMultiplier}

            {skillSlotMultiplier < 1 ? ' (Major psychic)' : ''}

            {handToHandReserved > 0

              ? ` · ${handToHandReserved} reserved for Hand-to-Hand`

              : ''}

          </p>

        </div>

        <div>

          <p className="text-xs font-bold uppercase tracking-wide opacity-70">

            Secondary skills

          </p>

          <p className="mt-1 font-mono text-2xl font-bold tabular-nums">

            {secondaryPickSlots} / {secondaryCap}

          </p>

          <p className="text-xs opacity-75">

            Same category access as related · no category % bonuses.

          </p>

        </div>

      </div>



      <div className="mb-4 flex flex-wrap items-center gap-3">

        <label className="flex items-center gap-2 text-sm">

          <span className="opacity-70">Category</span>

          <select

            value={category}

            onChange={(e) => setCategory(e.target.value)}

            className={`min-w-[10rem] rounded-md border px-2 py-2 text-sm ${

              morphus

                ? 'border-violet-700 bg-slate-900 text-violet-50'

                : 'border-slate-300 bg-white'

            }`}

          >

            <option value="">— select category —</option>

            <option value="All">All (search only)</option>

            {bookCategories.map((c) => (

              <option key={c} value={c}>

                {c}

              </option>

            ))}

          </select>

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

        <h3 className="text-xs font-bold uppercase tracking-wide opacity-80">

          Library

        </h3>

        {!libraryPopulated ? (

          <p className="text-sm opacity-60">

            Select a category to browse skills, or choose All and enter a search

            term.

          </p>

        ) : (

          <ul className="max-h-[480px] space-y-2 overflow-y-auto text-sm">

            {filteredLibrary.length === 0 ? (

              <li className="text-sm opacity-60">No skills match this filter.</li>

            ) : (

              filteredLibrary.map((s) => renderLibrarySkill(s))

            )}

          </ul>

        )}

      </div>



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

    </section>

  )

}


