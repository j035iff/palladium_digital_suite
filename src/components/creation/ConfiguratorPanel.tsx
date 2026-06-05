import { useMemo, useState, type ReactNode } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { listPalladiumOccsForCreation } from '../../data/library/occCatalogLoader'
import {
  listRacesForCharacterCreation,
  RACE_REGISTRY,
  getOccXpTableDisplayName,
} from '../../data/library/registry'
import { formatPalladiumSources } from '../../lib/formatPalladiumSources'
import {
  occBaseStatsDice,
  occCharacterCategory,
  occSkillSlotPolicy,
} from '../../lib/occCatalogEngine'
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
  formatOccAttributeRequirements,
  isConfiguratorOccSelected,
  isConfiguratorRaceSelected,
  sortConfiguratorEntries,
  type ConfiguratorMatrixContext,
} from '../../lib/configuratorMatrix'
import { ConfiguratorListItem } from './ConfiguratorListItem'
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

  const [activeTags, setActiveTags] = useState<string[]>([])
  const morphus = supportsDualForm && activeForm === 'morphus'
  const panel = morphus
    ? 'border-violet-600 bg-slate-950/90 text-violet-50'
    : 'border-blue-300 bg-white text-slate-900'

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

  const matrixCtx: ConfiguratorMatrixContext = useMemo(
    () => ({
      activeOccTags: activeTags,
      selectedRaceId: character.raceId ?? null,
      selectedOccId: character.occ?.id || null,
      selectedAlignment: effectiveConfiguratorAlignment(
        character.facade.alignment,
      ),
    }),
    [
      activeTags,
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
    }
    return [...tokens].sort((a, b) => a.localeCompare(b))
  }, [occPool])

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const specializationBranches = activeOcc?.specializations ?? []
  const headingColor = morphus ? '#c4b5fd' : '#1e40af'
  const subColor = morphus ? '#a5b4fc' : '#475569'

  return (
    <section
      className="mt-0 w-full border-b-2 border-dashed pb-8"
      aria-labelledby="forge-tab-page-heading"
    >
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
          Tier 3 — tag mismatch
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
            O.C.C. category tags (AND filter → Tier 3)
          </span>
          {tagPills.map((tag) => {
            const on = activeTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
                  on
                    ? morphus
                      ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                      : 'border-blue-600 bg-blue-100 text-blue-900'
                    : morphus
                      ? 'border-violet-700 bg-slate-900/80 text-violet-200 hover:border-violet-500'
                      : 'border-slate-300 bg-slate-100 text-slate-700 hover:border-blue-400'
                }`}
                aria-pressed={on}
              >
                {tag}
              </button>
            )
          })}
          {activeTags.length > 0 ? (
            <button
              type="button"
              onClick={() => setActiveTags([])}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                morphus
                  ? 'border-slate-600 text-slate-400 hover:text-violet-100'
                  : 'border-slate-300 text-slate-500 hover:text-slate-800'
              }`}
            >
              Clear filters
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
    </section>
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
  const citation = formatPalladiumSources(race.sources)
  return (
    <ConfiguratorListItem
      morphus={morphus}
      selected={selected}
      tierResult={tierResult}
      filterMismatch={filterMismatch}
      onSelect={onSelect}
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
      {citation ? (
        <span
          className={`mt-1 block font-mono text-[10px] font-normal leading-snug ${
            morphus ? 'text-violet-300/85' : 'text-slate-500'
          }`}
        >
          {citation}
        </span>
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
  const xpLabel = getOccXpTableDisplayName(def)
  const slotPolicy = occSkillSlotPolicy(def)
  const slotNote =
    slotPolicy.kind === 'psychic_tier'
      ? `Related × ${slotPolicy.majorMultiplier} on Major psychic`
      : null
  const base = occBaseStatsDice(def)
  const occCat = occCharacterCategory(def)
  const attrReqs = formatOccAttributeRequirements(def)

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
      {def.tags?.length ? (
        <p className="mt-1 font-mono text-[10px] opacity-70">
          {def.tags.join(' · ')}
        </p>
      ) : null}
      <p className="mt-2 font-mono text-[11px] leading-snug opacity-85">
        HP {base.hpDice} · SDC {base.sdcDice}
        {base.ppeDice ? ` · PPE ${base.ppeDice}` : ''}
        {base.ispDice ? ` · ISP ${base.ispDice}` : ''}
      </p>
      <p className="mt-1 text-[11px] leading-snug opacity-80">
        XP: {xpLabel}
        {slotNote ? ` · ${slotNote}` : ''}
      </p>
      {attrReqs ? (
        <p className="mt-1 text-[11px] font-semibold leading-snug text-rose-700 dark:text-rose-300">
          {attrReqs}
        </p>
      ) : null}
    </ConfiguratorListItem>
  )
}
