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
  isConfiguratorOccSelected,
  isConfiguratorRaceSelected,
  sortConfiguratorEntries,
  type ConfiguratorMatrixContext,
  type OccConfiguratorTagFilter,
  type OccConfiguratorTagFilterMode,
} from '../../lib/configuratorMatrix'
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

  const [tagFilterState, setTagFilterState] = useState<
    Record<string, OccConfiguratorTagFilterMode>
  >({})
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

  const occTagFilters = useMemo(
    (): OccConfiguratorTagFilter[] =>
      Object.entries(tagFilterState).map(([tag, mode]) => ({ tag, mode })),
    [tagFilterState],
  )

  const matrixCtx: ConfiguratorMatrixContext = useMemo(
    () => ({
      occTagFilters,
      selectedRaceId: character.raceId ?? null,
      selectedOccId: character.occ?.id || null,
      selectedAlignment: effectiveConfiguratorAlignment(
        character.facade.alignment,
      ),
    }),
    [
      occTagFilters,
      character.raceId,
      character.occ?.id,
      character.facade.alignment,
    ],
  )

  const sortedRaces = useMemo(
    () =>
      sortConfiguratorEntries(
        playerRaces,
        (race) => assessRaceConfiguratorTier(race, matrixCtx, occById),
        (race) => race.name,
      ),
    [playerRaces, matrixCtx, occById],
  )

  const sortedOccs = useMemo(
    () =>
      sortConfiguratorEntries(
        occPool,
        (occ) => assessOccConfiguratorTier(occ, matrixCtx, raceById),
        (occ) => occ.name,
      ),
    [occPool, matrixCtx, raceById],
  )

  const currentAlignment = effectiveConfiguratorAlignment(
    character.facade.alignment,
  )

  const raceLayout = useMemo(
    () =>
      buildConfiguratorScrollLayout(
        sortedRaces,
        (race) => assessRaceConfiguratorTier(race, matrixCtx, occById),
        character.raceId,
        CONFIGURATOR_SELECT_RACE_LABEL,
      ),
    [sortedRaces, matrixCtx, occById, character.raceId],
  )

  const occLayout = useMemo(
    () =>
      buildConfiguratorScrollLayout(
        sortedOccs,
        (occ) => assessOccConfiguratorTier(occ, matrixCtx, raceById),
        character.occ.id,
        CONFIGURATOR_SELECT_OCC_LABEL,
      ),
    [sortedOccs, matrixCtx, raceById, character.occ.id],
  )

  const racePlaceholderSelected = !isConfiguratorRaceSelected(character.raceId)
  const occPlaceholderSelected = !isConfiguratorOccSelected(character.occ.id)

  const tagPills = useMemo(() => {
    const tokens = new Set<string>()
    for (const occ of occPool) {
      for (const tag of occ.tags ?? []) {
        if (tag.trim()) tokens.add(tag.trim().toLowerCase())
      }
      if (occCharacterCategory(occ) === 'psychic') {
        tokens.add('psychic')
      }
    }
    return [...tokens].sort((a, b) => a.localeCompare(b))
  }, [occPool])

  const setTagFilterMode = (
    tag: string,
    mode: OccConfiguratorTagFilterMode | '',
  ) => {
    setTagFilterState((prev) => {
      if (!mode) {
        const next = { ...prev }
        delete next[tag]
        return next
      }
      return { ...prev, [tag]: mode }
    })
  }

  const formatTagLabel = (tag: string) => tag.replace(/_/g, ' ')

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
          Tier 3 — Only / Not tag mismatch
        </span>
        <span className="rounded border border-amber-500/60 bg-amber-50 px-2 py-0.5 text-amber-950 dark:bg-amber-950 dark:text-amber-200">
          Amber — selection vs filters
        </span>
      </div>

      {tagPills.length > 0 && raceCanPickOcc ? (
        <div
          className={`mb-4 flex flex-wrap gap-2 rounded-lg border-2 p-3 ${panel}`}
          role="toolbar"
          aria-label="O.C.C. tag filters"
        >
          <span className="w-full text-[10px] font-bold uppercase tracking-wide opacity-70">
            O.C.C. tag filters — set each tag to Any, Only (must match), or Not (exclude)
          </span>
          <div className="flex w-full flex-wrap gap-3">
            {tagPills.map((tag) => {
              const mode = tagFilterState[tag] ?? ''
              const tagLabel = formatTagLabel(tag)
              return (
                <label
                  key={tag}
                  className="flex min-w-[7.5rem] flex-col gap-1"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                    {tagLabel}
                  </span>
                  <select
                    value={mode}
                    onChange={(e) =>
                      setTagFilterMode(
                        tag,
                        e.target.value as OccConfiguratorTagFilterMode | '',
                      )
                    }
                    aria-label={`${tagLabel} O.C.C. filter`}
                    className={`rounded-lg border-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                      mode === 'include'
                        ? morphus
                          ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                          : 'border-blue-600 bg-blue-50 text-blue-900'
                        : mode === 'exclude'
                          ? morphus
                            ? 'border-rose-400 bg-rose-500/15 text-rose-100'
                            : 'border-rose-600 bg-rose-50 text-rose-900'
                          : morphus
                            ? 'border-violet-700 bg-slate-900/80 text-violet-100'
                            : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    <option value="">Any</option>
                    <option value="include">Only</option>
                    <option value="exclude">Not</option>
                  </select>
                </label>
              )
            })}
          </div>
          {occTagFilters.length > 0 ? (
            <button
              type="button"
              onClick={() => setTagFilterState({})}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                morphus
                  ? 'border-slate-600 text-slate-400 hover:text-violet-100'
                  : 'border-slate-300 text-slate-500 hover:text-slate-800'
              }`}
            >
              Clear all filters
            </button>
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
