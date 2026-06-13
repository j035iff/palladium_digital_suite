import { useEffect, useMemo, useState } from 'react'
import { getAbilityById } from '../../../data/abilityLibrary'
import {
  formatPsionicIspCost,
  getFeatureById,
  getPsionicPlacementForGenre,
  listPalladiumPsionicsForGenre,
  listPalladiumPsionicsForGenreCategory,
  listPsionicCategoryIdsForGenre,
} from '../../../data/library/registry'
import { useCharacter } from '../../../context/CharacterContext'
import { abilityPassesOccSupernaturalRules } from '../../../lib/occCreationDerivation'
import {
  psychicGatePsionicPickAllowed,
  psychicGatePsionicRulesApply,
  psychicGateRequiredPickCount,
} from '../../../lib/psychicGatePsionicBudget'
import { psionicCategoryFilterLabel } from '../../../lib/psionicCategoryLabels'
import {
  occEnginePsionicPickAllowed,
  occEnginePsionicRulesApply,
} from '../../../lib/occSupernaturalSelection'
import { occSupernaturalGrantedAbilityIds } from '../../../lib/occSupernaturalGrants'
import {
  abilityDurationBadgeLabel,
  psionicCategoryTags,
  psionicRowIsSelectable,
  type PsionicRowSelectContext,
} from '../../../lib/supernaturalAbilityDisplay'
import type { PalladiumOcc } from '../../../types'
import { PsychicGateMajorAllocationPicker } from './PsychicGateMajorAllocationPicker'

type PsionicsForgePanelProps = {
  morphus: boolean
  genreId: string
  activeOcc: PalladiumOcc | undefined
  spellCap: number
  psionicBudget: number
  psionicCount: number
}

export function PsionicsForgePanel({
  morphus,
  genreId,
  activeOcc,
  spellCap,
  psionicBudget,
  psionicCount,
}: PsionicsForgePanelProps) {
  const { character, psychicTier, addSelectedAbility } = useCharacter()
  const selectedIds = character.selectedAbilities ?? []
  const grantedIds = useMemo(
    () =>
      occSupernaturalGrantedAbilityIds(activeOcc, character.occSpecializationId),
    [activeOcc, character.occSpecializationId],
  )
  const playerPsionicCount = useMemo(
    () =>
      selectedIds.filter((id) => {
        if (grantedIds.includes(id)) return false
        return getAbilityById(id)?.category === 'Psionic'
      }).length,
    [selectedIds, grantedIds],
  )
  const [search, setSearch] = useState('')
  const [psionicCategoryFilter, setPsionicCategoryFilter] =
    useState<string>('sensitive')

  const selectCtx = useMemo(
    (): PsionicRowSelectContext => ({
      activeOcc,
      spellCap,
      genreId,
      psychicTier,
      psychicGateBypassed: character.psychicGateBypassed === true,
      majorAllocation: character.creationPsychicGateMajorAllocation,
      selectedIds,
    }),
    [
      activeOcc,
      spellCap,
      genreId,
      psychicTier,
      character.psychicGateBypassed,
      character.creationPsychicGateMajorAllocation,
      selectedIds,
    ],
  )

  const gatePsionics = psychicGatePsionicRulesApply(
    activeOcc,
    psychicTier,
    character.psychicGateBypassed === true,
  )
  const occEngineRules = occEnginePsionicRulesApply(activeOcc)
  const gateRequired =
    psychicGateRequiredPickCount(
      psychicTier,
      character.creationPsychicGateMajorAllocation,
    ) ?? psionicBudget
  const effectivePsionicBudget = gatePsionics ? gateRequired : psionicBudget

  const availablePsionicCategories = useMemo(
    () =>
      listPsionicCategoryIdsForGenre(genreId).filter((categoryId) =>
        listPalladiumPsionicsForGenreCategory(genreId, categoryId).some((row) =>
          psionicRowIsSelectable(row, {
            ...selectCtx,
            viewingCategory: categoryId,
          }),
        ),
      ),
    [genreId, selectCtx],
  )

  useEffect(() => {
    if (availablePsionicCategories.length === 0) return
    if (!availablePsionicCategories.includes(psionicCategoryFilter)) {
      setPsionicCategoryFilter(availablePsionicCategories[0])
    }
  }, [availablePsionicCategories, psionicCategoryFilter])

  const searchAllPsionicPools = search.trim().length > 0

  const psionicRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = searchAllPsionicPools
      ? listPalladiumPsionicsForGenre(genreId)
      : listPalladiumPsionicsForGenreCategory(genreId, psionicCategoryFilter)
    if (q) {
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.description.toLowerCase().includes(q) ||
          (typeof row.descriptionMorphus === 'string' &&
            row.descriptionMorphus.toLowerCase().includes(q)),
      )
    }
    return [...rows].sort((a, b) => a.name.localeCompare(b.name))
  }, [search, searchAllPsionicPools, genreId, psionicCategoryFilter])

  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'
  const drawerStyle = morphus
    ? 'border-violet-800 bg-slate-900/90'
    : 'border-slate-200 bg-slate-50'
  const descMorphus = 'text-violet-200/90 italic leading-relaxed'
  const descFacade = 'text-slate-600 leading-relaxed'

  return (
    <div className={`flex flex-col rounded-lg border ${panelStyle}`}>
      {gatePsionics && psychicTier === 'major' ? (
        <PsychicGateMajorAllocationPicker morphus={morphus} />
      ) : null}
      <div
        className="sticky top-0 z-10 border-b p-3"
        style={{ borderColor: morphus ? '#5b21b6' : '#e2e8f0' }}
      >
        <p className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
          Psionic library
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all psionic pools…"
          className={`mb-3 w-full rounded-md border px-3 py-2 text-sm ${
            morphus
              ? 'border-violet-700 bg-slate-950 text-violet-50'
              : 'border-slate-300 bg-white text-slate-900'
          }`}
          aria-label="Search psionics"
        />
        {searchAllPsionicPools ? (
          <p className="mb-2 text-[11px] opacity-70">Searching all pools</p>
        ) : null}
        {availablePsionicCategories.length > 0 ? (
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Psionic category"
          >
            {availablePsionicCategories.map((categoryId) => (
              <button
                key={categoryId}
                type="button"
                role="tab"
                aria-selected={psionicCategoryFilter === categoryId}
                onClick={() => setPsionicCategoryFilter(categoryId)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  psionicCategoryFilter === categoryId
                    ? morphus
                      ? 'border-indigo-400 bg-indigo-700 text-white'
                      : 'border-indigo-600 bg-indigo-100 text-indigo-900'
                    : morphus
                      ? 'border-violet-900 text-violet-300'
                      : 'border-slate-300 text-slate-600'
                }`}
              >
                {psionicCategoryFilterLabel(genreId, categoryId)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <ul
        className={`max-h-[min(480px,55vh)] space-y-2 overflow-y-auto p-3 ${drawerStyle}`}
        aria-label="Psionic library"
      >
        {psionicRows.length === 0 ? (
          <li
            className={`rounded-md border p-4 text-sm ${
              morphus
                ? 'border-violet-900 text-violet-300'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            No psionics match your search and filters.
          </li>
        ) : null}
        {psionicRows.map((catalog) => {
          const a = getAbilityById(catalog.id)
          if (!a) return null
          const feature = getFeatureById(catalog.id)
          const occGate =
            activeOcc && feature
              ? abilityPassesOccSupernaturalRules(
                  activeOcc,
                  feature,
                  spellCap,
                  genreId,
                )
              : { allowed: true as const }
          const psychicGate = psychicGatePsionicPickAllowed({
            tier: psychicTier,
            majorAllocation: character.creationPsychicGateMajorAllocation,
            psychicGateBypassed: character.psychicGateBypassed === true,
            occ: activeOcc,
            selectedIds,
            candidateId: catalog.id,
            genreId,
            viewingCategory: searchAllPsionicPools
              ? undefined
              : psionicCategoryFilter,
          })
          const occEngine = occEnginePsionicPickAllowed({
            occ: activeOcc,
            selectedIds,
            candidateId: catalog.id,
            genreId,
            viewingCategory: searchAllPsionicPools
              ? undefined
              : psionicCategoryFilter,
            grantedIds,
          })
          const blocked =
            !occGate.allowed ||
            (psychicGate != null && !psychicGate.allowed) ||
            (occEngine != null && !occEngine.allowed)
          const innateStarter = a.innateStarter === true
          const already = selectedIds.includes(catalog.id)
          const atCap =
            !occEngineRules &&
            !gatePsionics &&
            playerPsionicCount >= effectivePsionicBudget
          const canSelect = !blocked && !innateStarter && !already && !atCap
          const lockedReason = innateStarter
            ? 'Granted automatically at 1st level (innate starter).'
            : blocked
              ? `Locked: ${occEngine?.reason ?? psychicGate?.reason ?? occGate.reason ?? 'O.C.C. restriction.'}`
              : already
                ? 'Already selected.'
                : atCap
                  ? 'Psionic budget full.'
                  : 'Select this power'
          const placement = getPsionicPlacementForGenre(catalog, genreId)
          const placementNotes =
            placement &&
            typeof placement.notes === 'string' &&
            placement.notes.length > 0
              ? placement.notes
              : undefined

          return (
            <li
              key={catalog.id}
              className={`rounded-md border p-3 text-sm ${
                blocked || innateStarter
                  ? morphus
                    ? 'border-slate-800 bg-slate-950/40 opacity-80'
                    : 'border-slate-200 bg-slate-100 opacity-80'
                  : morphus
                    ? 'border-violet-800 bg-slate-950/60'
                    : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-semibold">{a.name}</span>
                  <span className="ml-2 text-xs opacity-60">
                    {psionicCategoryTags(
                      catalog,
                      genreId,
                      psionicCategoryFilter,
                      searchAllPsionicPools,
                    )}{' '}
                    · ISP
                  </span>
                  {innateStarter ? (
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        morphus
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Innate
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={!canSelect}
                  title={lockedReason}
                  onClick={() => {
                    if (canSelect) addSelectedAbility(catalog.id)
                  }}
                  className={`shrink-0 rounded-md border px-3 py-1 text-xs font-semibold transition ${
                    canSelect
                      ? morphus
                        ? 'border-violet-500 bg-violet-800 text-white hover:bg-violet-700'
                        : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                      : 'cursor-not-allowed border-slate-400 bg-slate-200 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {already ? 'Selected' : 'Select'}
                </button>
              </div>
              <p className="mt-1 text-xs opacity-70">
                {formatPsionicIspCost(catalog, genreId)}
                {' · '}
                {abilityDurationBadgeLabel(a.durationType)}
              </p>
              {placementNotes ? (
                <p className="mt-1 text-[11px] opacity-60">{placementNotes}</p>
              ) : null}
              <p
                className={`mt-2 text-xs leading-relaxed ${
                  morphus ? descMorphus : descFacade
                }`}
              >
                {morphus && a.descriptionMorphus
                  ? a.descriptionMorphus
                  : a.description}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
