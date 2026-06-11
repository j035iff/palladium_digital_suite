import { useMemo, useState, type ReactNode } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { listPalladiumOccsForCreation } from '../../data/library/occCatalogLoader'
import {
  listRacesForCharacterCreation,
  RACE_REGISTRY,
} from '../../data/library/registry'
import { occCharacterCategory } from '../../lib/occCatalogEngine'
import type { PalladiumOcc, Race } from '../../types'
import {
  assessAlignmentConfiguratorTier,
  assessOccConfiguratorTier,
  assessRaceConfiguratorTier,
  buildConfiguratorScrollLayout,
  CONFIGURATOR_ALIGNMENT_OPTIONS,
  CONFIGURATOR_SELECT_OCC_LABEL,
  CONFIGURATOR_SELECT_RACE_LABEL,
  configuratorAlignmentLabel,
  effectiveConfiguratorAlignment,
  filterConfiguratorOccPoolForRace,
  filterConfiguratorListForActiveFilter,
  filterConfiguratorRacePoolForOcc,
  isConfiguratorOccSelected,
  isConfiguratorRaceSelected,
  sortConfiguratorEntries,
  type ConfiguratorMatrixContext,
} from '../../lib/configuratorMatrix'
import {
  createDefaultConfiguratorFilterRoot,
  createDefaultConfiguratorGroupFilterRoot,
  formatConfiguratorFilterExpression,
  isConfiguratorFilterActive,
  listConfiguratorBookCategories,
  type ConfiguratorFilterExpression,
} from '../../lib/configuratorFilterExpression'
import { ConfiguratorFilterBuilder } from './ConfiguratorFilterBuilder'
import { ConfiguratorListItem } from './ConfiguratorListItem'
import { ConfiguratorPackagePanel } from './ConfiguratorPackagePanel'
import { ConfiguratorPinScrollColumn } from './ConfiguratorPinScrollColumn'

/**
 * Step 2 — tri-directional Race / O.C.C. / Alignment matrix with three-tier rendering.
 */
export function ConfiguratorPanel() {
  const {
    character,
    activeForm,
    activeOcc,
    activeRace,
    raceCanPickOcc,
    setSelectedOcc,
    setOccSpecializationId,
    setRaceId,
    supportsDualForm,
    creationGenreId,
    hostGenreId,
    setAlignment,
  } = useCharacter()

  const [configuratorFilterRoot, setConfiguratorFilterRoot] =
    useState<ConfiguratorFilterExpression | null>(null)
  const [hideConfiguratorFilterMismatches, setHideConfiguratorFilterMismatches] =
    useState(true)
  const [hideRaceIncompatibleOccs, setHideRaceIncompatibleOccs] = useState(true)
  const [hideOccIncompatibleRaces, setHideOccIncompatibleRaces] = useState(true)
  const morphus = supportsDualForm && activeForm === 'morphus'
  const panel = morphus
    ? 'border-violet-600 bg-slate-950/90 text-violet-50'
    : 'border-blue-300 bg-white text-slate-900'
  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'

  const occPool = useMemo(
    () => listPalladiumOccsForCreation(creationGenreId, hostGenreId),
    [creationGenreId, hostGenreId],
  )

  const playerRaces = useMemo(
    () => listRacesForCharacterCreation(RACE_REGISTRY, hostGenreId),
    [hostGenreId],
  )

  const raceById = useMemo(
    () => new Map(playerRaces.map((r) => [r.id, r])),
    [playerRaces],
  )
  const occById = useMemo(
    () => new Map(occPool.map((o) => [o.id, o])),
    [occPool],
  )

  const raceCategories = useMemo(
    () =>
      [...playerRaces]
        .map((race) => ({ value: race.id, label: race.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [playerRaces],
  )

  const occCategories = useMemo(() => {
    const byValue = new Map<string, string>()
    for (const occ of occPool) {
      byValue.set(occ.id, occ.name)
      for (const tag of occ.tags ?? []) {
        const value = tag.trim().toLowerCase()
        if (value) byValue.set(value, value.replace(/_/g, ' '))
      }
      if (occCharacterCategory(occ) === 'psychic') {
        byValue.set('psychic', 'psychic')
      }
      const occType = occ.occType?.trim().toLowerCase()
      if (occType) byValue.set(occType, occType.replace(/_/g, ' '))
    }
    return [...byValue.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [occPool])

  const bookCategories = useMemo(
    () => listConfiguratorBookCategories([...playerRaces, ...occPool]),
    [playerRaces, occPool],
  )

  const filterFormatOptions = useMemo(
    () => ({
      raceLabelById: new Map(raceCategories.map((row) => [row.value, row.label])),
      occLabelById: new Map(occCategories.map((row) => [row.value, row.label])),
      bookLabelById: new Map(bookCategories.map((row) => [row.value, row.label])),
    }),
    [raceCategories, occCategories, bookCategories],
  )

  const matrixCtx: ConfiguratorMatrixContext = useMemo(
    () => ({
      configuratorFilter: configuratorFilterRoot,
      filterFormatOptions,
      selectedRaceId: character.raceId ?? null,
      selectedOccId: character.occ?.id || null,
      selectedAlignment: effectiveConfiguratorAlignment(
        character.facade.alignment,
      ),
    }),
    [
      configuratorFilterRoot,
      filterFormatOptions,
      character.raceId,
      character.occ?.id,
      character.facade.alignment,
    ],
  )

  const visibleRacePool = useMemo(
    () =>
      filterConfiguratorRacePoolForOcc(
        playerRaces,
        activeOcc,
        hideOccIncompatibleRaces,
      ),
    [playerRaces, activeOcc, hideOccIncompatibleRaces],
  )

  const hiddenRaceCount = playerRaces.length - visibleRacePool.length

  const sortedRaces = useMemo(
    () =>
      sortConfiguratorEntries(
        visibleRacePool,
        (race) => assessRaceConfiguratorTier(race, matrixCtx, occById),
        (race) => race.name,
      ),
    [visibleRacePool, matrixCtx, occById],
  )

  const visibleOccPool = useMemo(
    () =>
      filterConfiguratorOccPoolForRace(
        occPool,
        activeRace,
        hideRaceIncompatibleOccs,
      ),
    [occPool, activeRace, hideRaceIncompatibleOccs],
  )

  const hiddenOccCount = occPool.length - visibleOccPool.length

  const sortedOccs = useMemo(
    () =>
      sortConfiguratorEntries(
        visibleOccPool,
        (occ) => assessOccConfiguratorTier(occ, matrixCtx, raceById),
        (occ) => occ.name,
      ),
    [visibleOccPool, matrixCtx, raceById],
  )

  const currentAlignment = effectiveConfiguratorAlignment(
    character.facade.alignment,
  )

  const filterActive = isConfiguratorFilterActive(configuratorFilterRoot)

  const raceLayout = useMemo(() => {
    const layout = buildConfiguratorScrollLayout(
      sortedRaces,
      (race) => assessRaceConfiguratorTier(race, matrixCtx, occById),
      character.raceId,
      CONFIGURATOR_SELECT_RACE_LABEL,
    )
    const selectedId = character.raceId?.trim()
    let resolved = layout
    if (selectedId && !layout.pinned) {
      const pinnedRace = raceById.get(selectedId)
      if (pinnedRace) {
        const tier = assessRaceConfiguratorTier(pinnedRace, matrixCtx, occById)
        resolved = {
          ...layout,
          pinned: { item: pinnedRace, filterMismatch: tier.tier !== 1 },
        }
      }
    }
    if (hideConfiguratorFilterMismatches && filterActive) {
      resolved = {
        ...resolved,
        scrollItems: filterConfiguratorListForActiveFilter(
          resolved.scrollItems,
          (race) => assessRaceConfiguratorTier(race, matrixCtx, occById),
          true,
        ),
      }
    }
    return resolved
  }, [
    sortedRaces,
    matrixCtx,
    occById,
    character.raceId,
    raceById,
    hideConfiguratorFilterMismatches,
    filterActive,
  ])

  const occLayout = useMemo(() => {
    const layout = buildConfiguratorScrollLayout(
      sortedOccs,
      (occ) => assessOccConfiguratorTier(occ, matrixCtx, raceById),
      character.occ.id,
      CONFIGURATOR_SELECT_OCC_LABEL,
    )
    const selectedId = character.occ.id?.trim()
    let resolved = layout
    if (selectedId && !layout.pinned) {
      const pinnedOcc = occById.get(selectedId)
      if (pinnedOcc) {
        const tier = assessOccConfiguratorTier(pinnedOcc, matrixCtx, raceById)
        resolved = {
          ...layout,
          pinned: { item: pinnedOcc, filterMismatch: tier.tier !== 1 },
        }
      }
    }
    if (hideConfiguratorFilterMismatches && filterActive) {
      resolved = {
        ...resolved,
        scrollItems: filterConfiguratorListForActiveFilter(
          resolved.scrollItems,
          (occ) => assessOccConfiguratorTier(occ, matrixCtx, raceById),
          true,
        ),
      }
    }
    return resolved
  }, [
    sortedOccs,
    matrixCtx,
    raceById,
    character.occ.id,
    occById,
    hideConfiguratorFilterMismatches,
    filterActive,
  ])

  const hiddenFilterRaceCount = useMemo(() => {
    if (!hideConfiguratorFilterMismatches || !filterActive) return 0
    const selectedId = character.raceId?.trim()
    return sortedRaces.filter((race) => {
      if (selectedId && race.id === selectedId) return false
      return assessRaceConfiguratorTier(race, matrixCtx, occById).tier === 3
    }).length
  }, [
    sortedRaces,
    matrixCtx,
    occById,
    character.raceId,
    hideConfiguratorFilterMismatches,
    filterActive,
  ])

  const hiddenFilterOccCount = useMemo(() => {
    if (!hideConfiguratorFilterMismatches || !filterActive) return 0
    const selectedId = character.occ.id?.trim()
    return sortedOccs.filter((occ) => {
      if (selectedId && occ.id === selectedId) return false
      return assessOccConfiguratorTier(occ, matrixCtx, raceById).tier === 3
    }).length
  }, [
    sortedOccs,
    matrixCtx,
    raceById,
    character.occ.id,
    hideConfiguratorFilterMismatches,
    filterActive,
  ])

  const racePlaceholderSelected = !isConfiguratorRaceSelected(character.raceId)
  const occPlaceholderSelected = !isConfiguratorOccSelected(character.occ.id)

  const specializationBranches = activeOcc?.specializations ?? []
  const headingColor = morphus ? '#c4b5fd' : '#1e40af'
  const subColor = morphus ? '#a5b4fc' : '#475569'

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        aria-labelledby="forge-tab-page-heading"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
      <p
        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"
        style={{ color: subColor }}
      >
        Tri-directional matrix — selections in any column filter the others. Tier 1
        (active) · Tier 2 (red, conflict) · Tier 3 (grey, tag mismatch). Alignment is
        optional; use <strong>Determine attributes</strong> when race and O.C.C. match.
      </p>

      <div className="mb-3 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wide">
        <span className="rounded border border-blue-500/50 bg-blue-50 px-2 py-0.5 text-blue-900 dark:bg-blue-950 dark:text-blue-200">
          Tier 1 — match
        </span>
        <span className="rounded border border-rose-500/60 bg-rose-50 px-2 py-0.5 text-rose-900 dark:bg-rose-950 dark:text-rose-200">
          Tier 2 — conflict
        </span>
        <span className="rounded border border-slate-400/50 bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          Tier 3 — tag filter mismatch
        </span>
        <span className="rounded border border-amber-500/60 bg-amber-50 px-2 py-0.5 text-amber-950 dark:bg-amber-950 dark:text-amber-200">
          Amber — selection vs filters
        </span>
      </div>

      {(raceCategories.length > 0 ||
        occCategories.length > 0 ||
        bookCategories.length > 0) &&
      raceCanPickOcc ? (
        <div
          className={`mb-4 flex flex-col gap-3 rounded-lg border-2 p-3 ${panel}`}
          role="toolbar"
          aria-label="Configurator filters"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
              Matrix filters — Race, O.C.C., Book conditions with AND, OR, NOT, and nested
              groups
            </span>
            {isConfiguratorFilterActive(configuratorFilterRoot) ? (
              <span
                className={`font-mono text-[10px] ${
                  morphus ? 'text-violet-300' : 'text-slate-600'
                }`}
              >
                {formatConfiguratorFilterExpression(
                  configuratorFilterRoot!,
                  filterFormatOptions,
                )}
              </span>
            ) : null}
          </div>
          {configuratorFilterRoot ? (
            <ConfiguratorFilterBuilder
              root={configuratorFilterRoot}
              raceCategories={raceCategories}
              occCategories={occCategories}
              bookCategories={bookCategories}
              morphus={morphus}
              onChange={setConfiguratorFilterRoot}
            />
          ) : (
            <p className="text-xs opacity-80">
              Build expressions like{' '}
              <span className="font-mono">Book: Between the Shadows</span>,{' '}
              <span className="font-mono">Race: Human AND OCC: assassin</span>, or{' '}
              <span className="font-mono">(OCC: psychic OR OCC: magic) AND OCC: combat</span>.
            </p>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hideConfiguratorFilterMismatches}
              disabled={!filterActive}
              onChange={(e) => setHideConfiguratorFilterMismatches(e.target.checked)}
              className="size-4 rounded border-slate-400 disabled:opacity-40"
            />
            <span className={!filterActive ? 'opacity-60' : undefined}>
              Hide options that don&apos;t match filter{' '}
              <span className="font-normal opacity-80">(current selection stays visible)</span>
            </span>
          </label>
          {filterActive && hideConfiguratorFilterMismatches ? (
            <p className="text-xs opacity-80">
              {hiddenFilterRaceCount > 0 || hiddenFilterOccCount > 0 ? (
                <>
                  {hiddenFilterRaceCount > 0 ? (
                    <span>
                      {hiddenFilterRaceCount} race
                      {hiddenFilterRaceCount === 1 ? '' : 's'} hidden
                    </span>
                  ) : null}
                  {hiddenFilterRaceCount > 0 && hiddenFilterOccCount > 0 ? ' · ' : null}
                  {hiddenFilterOccCount > 0 ? (
                    <span>
                      {hiddenFilterOccCount} O.C.C.
                      {hiddenFilterOccCount === 1 ? '' : 's'} hidden
                    </span>
                  ) : null}
                </>
              ) : (
                'All visible options match the active filter.'
              )}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {!configuratorFilterRoot ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setConfiguratorFilterRoot(createDefaultConfiguratorFilterRoot())
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    morphus
                      ? 'border-violet-500 text-violet-200 hover:bg-violet-950/60'
                      : 'border-blue-500 text-blue-800 hover:bg-blue-50'
                  }`}
                >
                  Add filter
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfiguratorFilterRoot(
                      createDefaultConfiguratorGroupFilterRoot(),
                    )
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    morphus
                      ? 'border-violet-500 text-violet-200 hover:bg-violet-950/60'
                      : 'border-blue-500 text-blue-800 hover:bg-blue-50'
                  }`}
                >
                  Add group filter
                </button>
              </>
            ) : null}
            {configuratorFilterRoot ? (
              <button
                type="button"
                onClick={() => setConfiguratorFilterRoot(null)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  morphus
                    ? 'border-slate-600 text-slate-400 hover:text-violet-100'
                    : 'border-slate-300 text-slate-500 hover:text-slate-800'
                }`}
              >
                Clear filter
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {(activeRace && raceCanPickOcc) || (activeOcc && isConfiguratorOccSelected(character.occ.id)) ? (
        <div
          className={`mb-4 flex flex-col gap-2 rounded-lg border-2 px-3 py-2.5 ${panel}`}
        >
          {raceCanPickOcc && activeRace ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hideRaceIncompatibleOccs}
                  onChange={(e) => setHideRaceIncompatibleOccs(e.target.checked)}
                  className="size-4 rounded border-slate-400"
                />
                <span>
                  Hide O.C.C.s <strong>{activeRace.name}</strong> cannot select
                </span>
              </label>
              {hideRaceIncompatibleOccs && hiddenOccCount > 0 ? (
                <span className="text-xs opacity-80">
                  {visibleOccPool.length} of {occPool.length} O.C.C.s shown ·{' '}
                  {hiddenOccCount} hidden
                </span>
              ) : null}
            </div>
          ) : null}
          {activeOcc && isConfiguratorOccSelected(character.occ.id) ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hideOccIncompatibleRaces}
                  onChange={(e) => setHideOccIncompatibleRaces(e.target.checked)}
                  className="size-4 rounded border-slate-400"
                />
                <span>
                  Hide races incompatible with <strong>{activeOcc.name}</strong>
                </span>
              </label>
              {hideOccIncompatibleRaces && hiddenRaceCount > 0 ? (
                <span className="text-xs opacity-80">
                  {visibleRacePool.length} of {playerRaces.length} races shown ·{' '}
                  {hiddenRaceCount} hidden
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <ConfiguratorPinScrollColumn
          panel={panel}
          morphus={morphus}
          ariaLabel="Race"
          placeholderLabel={raceLayout.placeholderLabel}
          placeholderSelected={racePlaceholderSelected}
          onSelectPlaceholder={() => setRaceId(null)}
          pinned={
            raceLayout.pinned ? (
              <RaceRow
                race={raceLayout.pinned.item}
                morphus={morphus}
                selected
                tierResult={assessRaceConfiguratorTier(
                  raceLayout.pinned.item,
                  matrixCtx,
                  occById,
                )}
                filterMismatch={raceLayout.pinned.filterMismatch}
                onSelect={() => setRaceId(raceLayout.pinned!.item.id)}
              />
            ) : null
          }
          scrollItems={raceLayout.scrollItems}
          emptyScrollMessage={
            playerRaces.length === 0 ? (
              <p className="text-sm opacity-80">No races for this host genre.</p>
            ) : visibleRacePool.length === 0 ? (
              <p className="text-sm opacity-80">
                No races match {activeOcc?.name ?? 'this O.C.C.'} with the current
                filters. Turn off “Hide races incompatible with …” to browse all options.
              </p>
            ) : raceLayout.scrollItems.length === 0 ? (
              <p className="text-sm opacity-80">
                No other races match the active filter. Turn off “Hide options that don&apos;t
                match filter” to browse all options.
              </p>
            ) : null
          }
          renderScrollItem={(race) => (
            <RaceRow
              key={race.id}
              race={race}
              morphus={morphus}
              selected={false}
              tierResult={assessRaceConfiguratorTier(race, matrixCtx, occById)}
              onSelect={() => setRaceId(race.id)}
            />
          )}
        />

        {raceCanPickOcc ? (
          <ConfiguratorPinScrollColumn
            panel={panel}
            morphus={morphus}
            ariaLabel="O.C.C."
            placeholderLabel={occLayout.placeholderLabel}
            placeholderSelected={occPlaceholderSelected}
            onSelectPlaceholder={() => setSelectedOcc('')}
            pinned={
              occLayout.pinned ? (
                <OccRow
                  def={occLayout.pinned.item}
                  morphus={morphus}
                  selected
                  tierResult={assessOccConfiguratorTier(
                    occLayout.pinned.item,
                    matrixCtx,
                    raceById,
                  )}
                  filterMismatch={occLayout.pinned.filterMismatch}
                  onSelect={() => setSelectedOcc(occLayout.pinned!.item.id)}
                />
              ) : null
            }
            scrollItems={occLayout.scrollItems}
            emptyScrollMessage={
              occPool.length === 0 ? (
                <p className="text-sm opacity-80">
                  No O.C.C. rows for this creation / host genre.
                </p>
              ) : visibleOccPool.length === 0 ? (
                <p className="text-sm opacity-80">
                  No O.C.C.s match {activeRace?.name ?? 'this race'} with the current
                  filters. Turn off “Hide O.C.C.s … cannot select” to browse all options.
                </p>
              ) : occLayout.scrollItems.length === 0 ? (
                <p className="text-sm opacity-80">
                  No other O.C.C.s match the active filter. Turn off “Hide options that
                  don&apos;t match filter” to browse all options.
                </p>
              ) : null
            }
            renderScrollItem={(def) => (
              <OccRow
                key={def.id}
                def={def}
                morphus={morphus}
                selected={false}
                tierResult={assessOccConfiguratorTier(def, matrixCtx, raceById)}
                onSelect={() => setSelectedOcc(def.id)}
              />
            )}
          />
        ) : (
          <div className={`rounded-lg border-2 p-4 ${panel}`}>
            <p className="text-sm opacity-90">
              {activeRace?.name ?? 'This race'} is an R.C.C. — no separate O.C.C.
            </p>
          </div>
        )}

        <ConfiguratorListColumn panel={panel} ariaLabel="Alignment">
          {CONFIGURATOR_ALIGNMENT_OPTIONS.map((alignment) => (
            <ConfiguratorListItem
              key={alignment || '__undecided__'}
              morphus={morphus}
              selected={currentAlignment === alignment}
              tierResult={assessAlignmentConfiguratorTier(
                alignment,
                matrixCtx,
                raceById,
                occById,
              )}
              onSelect={() => setAlignment(alignment)}
            >
              <span className="text-sm font-semibold">
                {configuratorAlignmentLabel(alignment)}
              </span>
            </ConfiguratorListItem>
          ))}
        </ConfiguratorListColumn>
      </div>

      {raceCanPickOcc && specializationBranches.length > 0 ? (
        <div className={`mt-4 grid gap-2 sm:grid-cols-2 ${panel} rounded-lg border-2 p-4`}>
          <p
            className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide opacity-80"
            style={{ color: headingColor }}
          >
            {activeOcc?.name ?? 'O.C.C.'} — specialization
          </p>
          {specializationBranches.map((spec) => {
            const selected = character.occSpecializationId === spec.id
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => setOccSpecializationId(spec.id)}
                className={`rounded-lg border-2 px-3 py-2 text-left transition-[box-shadow,transform] ${
                  selected
                    ? morphus
                      ? 'border-amber-400 bg-violet-950/80 shadow-[0_0_0_2px_rgba(251,191,36,0.35)]'
                      : 'border-blue-600 bg-blue-50 shadow-[0_0_0_2px_rgba(37,99,235,0.25)]'
                    : morphus
                      ? 'border-violet-800 bg-slate-900/60 hover:border-violet-500'
                      : 'border-slate-200 bg-slate-50 hover:border-blue-400'
                }`}
                aria-pressed={selected}
              >
                <span className="text-sm font-semibold">{spec.name}</span>
                {spec.description ? (
                  <span className="mt-1 block text-[11px] leading-snug opacity-85">
                    {spec.description}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
        </div>
      </section>

      <ConfiguratorPackagePanel
        race={activeRace}
        occ={activeOcc ?? undefined}
        specializationId={character.occSpecializationId}
        raceCanPickOcc={raceCanPickOcc}
        morphus={morphus}
        panelStyle={panelStyle}
      />
    </div>
  )
}

function ConfiguratorListColumn({
  panel,
  children,
  ariaLabel,
}: {
  panel: string
  children: ReactNode
  ariaLabel?: string
}) {
  return (
    <div
      className={`flex flex-col rounded-lg border-2 p-3 ${panel}`}
      aria-label={ariaLabel}
    >
      <div className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  )
}

function RaceRow({
  race,
  morphus,
  selected,
  tierResult,
  filterMismatch,
  onSelect,
}: {
  race: Race
  morphus: boolean
  selected: boolean
  tierResult: ReturnType<typeof assessRaceConfiguratorTier>
  filterMismatch?: boolean
  onSelect: () => void
}) {
  return (
    <ConfiguratorListItem
      morphus={morphus}
      selected={selected}
      tierResult={tierResult}
      filterMismatch={filterMismatch}
      onSelect={onSelect}
      className="p-3"
    >
      <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
        {race.name}
        {!race.canPickOcc ? (
          <span
            className={`rounded px-1 py-0.5 text-[9px] font-black uppercase tracking-wide ${
              morphus ? 'bg-amber-900/80 text-amber-200' : 'bg-amber-100 text-amber-900'
            }`}
          >
            R.C.C.
          </span>
        ) : null}
      </span>
      {race.description?.trim() ? (
        <p className="mt-1 text-[11px] leading-snug opacity-85">{race.description}</p>
      ) : null}
    </ConfiguratorListItem>
  )
}

function OccRow({
  def,
  morphus,
  selected,
  tierResult,
  filterMismatch,
  onSelect,
}: {
  def: PalladiumOcc
  morphus: boolean
  selected: boolean
  tierResult: ReturnType<typeof assessOccConfiguratorTier>
  filterMismatch?: boolean
  onSelect: () => void
}) {
  const occCat = occCharacterCategory(def)

  return (
    <ConfiguratorListItem
      morphus={morphus}
      selected={selected}
      tierResult={tierResult}
      filterMismatch={filterMismatch}
      onSelect={onSelect}
      className="p-3"
    >
      <p
        className="text-xs font-black uppercase tracking-wide opacity-70"
        style={{ color: morphus ? '#c4b5fd' : '#1e3a8a' }}
      >
        {occCat === 'psychic' ? 'Psychic O.C.C.' : 'O.C.C.'}
      </p>
      <p className="mt-1 text-base font-bold">{def.name}</p>
      {def.description?.trim() ? (
        <p className="mt-1 text-[11px] leading-snug opacity-85">{def.description}</p>
      ) : null}
    </ConfiguratorListItem>
  )
}
