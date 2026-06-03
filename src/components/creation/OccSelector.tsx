import { useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { listPalladiumOccsForCreation } from '../../data/library/occCatalogLoader'
import {
  listRacesForCharacterCreation,
  RACE_REGISTRY,
} from '../../data/library/registry'
import { DEFAULT_RACE_ID } from '../../lib/raceFormPolicy'
import { occMatchesAllTags } from '../../lib/genreGating'
import { formatPalladiumSources } from '../../lib/formatPalladiumSources'
import {
  occBaseStatsDice,
  occCharacterCategory,
  occSkillSlotPolicy,
} from '../../lib/occCatalogEngine'
import { getOccXpTableDisplayName } from '../../data/library/registry'
import type { PalladiumOcc } from '../../types'

function splitOccPool(
  pool: readonly PalladiumOcc[],
  activeTags: readonly string[],
): { tier1: PalladiumOcc[]; tier2: PalladiumOcc[] } {
  if (!activeTags.length) {
    return { tier1: [...pool], tier2: [] }
  }
  const tier1: PalladiumOcc[] = []
  const tier2: PalladiumOcc[] = []
  for (const occ of pool) {
    if (occMatchesAllTags(occ.tags, activeTags)) tier1.push(occ)
    else tier2.push(occ)
  }
  tier1.sort((a, b) => a.name.localeCompare(b.name))
  tier2.sort((a, b) => a.name.localeCompare(b.name))
  return { tier1, tier2 }
}

/**
 * Step 0 — pooled O.C.C. picker with dynamic tag pills and multi-tag AND bubbling.
 */
export function OccSelector() {
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

  const tagPills = useMemo(() => {
    const tokens = new Set<string>()
    for (const occ of occPool) {
      for (const tag of occ.tags ?? []) {
        if (tag.trim()) tokens.add(tag.trim().toLowerCase())
      }
    }
    return [...tokens].sort((a, b) => a.localeCompare(b))
  }, [occPool])

  const { tier1, tier2 } = useMemo(
    () => splitOccPool(occPool, activeTags),
    [occPool, activeTags],
  )

  const playerRaces = useMemo(
    () => listRacesForCharacterCreation(RACE_REGISTRY, hostGenreId),
    [hostGenreId],
  )

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const tier2Tooltip =
    activeTags.length > 0
      ? `Not a ${activeTags.join(' AND ')} OCC`
      : undefined

  const specializationBranches = activeOcc?.specializations ?? []

  return (
    <section
      className="mt-0 w-full border-b-2 border-dashed pb-8"
      aria-labelledby="occ-selector-heading"
    >
      <h2
        id="occ-selector-heading"
        className="mb-1 text-sm font-semibold uppercase tracking-wide"
        style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
      >
        Step 0: Choose O.C.C.
      </h2>
      <p
        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"
        style={{ color: morphus ? '#a5b4fc' : '#475569' }}
      >
        Classes are pooled from all book data for{' '}
        <span className="font-mono font-semibold">{creationGenreId}</span>, filtered
        for host <span className="font-mono font-semibold">{hostGenreId}</span>. Toggle
        tag pills to bubble AND matches to the top.
      </p>

      {tagPills.length > 0 ? (
        <div
          className={`mb-4 flex flex-wrap gap-2 rounded-lg border-2 p-3 ${panel}`}
          role="toolbar"
          aria-label="O.C.C. tag filters"
        >
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

      <div className={`mb-4 grid gap-2 sm:grid-cols-2 ${panel} rounded-lg border-2 p-3`}>
        <p
          className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide opacity-80"
          style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
        >
          Race (library)
        </p>
        {playerRaces.map((race) => {
          const selected = (character.raceId ?? DEFAULT_RACE_ID) === race.id
          const citation = formatPalladiumSources(race.sources)
          return (
            <button
              key={race.id}
              type="button"
              onClick={() => setRaceId(race.id)}
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
              title={citation || race.description}
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
            </button>
          )
        })}
      </div>

      {!raceCanPickOcc ? (
        <div
          className={`mb-4 rounded-lg border-2 border-dashed px-4 py-3 text-sm leading-snug ${
            morphus
              ? 'border-amber-500/70 bg-amber-950/30 text-amber-100'
              : 'border-amber-500/80 bg-amber-50 text-amber-950'
          }`}
        >
          <p className="font-bold uppercase tracking-wide">R.C.C. — no separate O.C.C.</p>
          <p className="mt-1 opacity-90">
            {activeRace?.name ?? 'This race'} is self-contained. Character creation skips
            secondary O.C.C. selection.
          </p>
        </div>
      ) : null}

      {raceCanPickOcc ? (
        <div className={`flex flex-col gap-2 ${panel} rounded-lg border-2 p-4`}>
          {[...tier1, ...tier2].map((def) => {
            const inTier1 = tier1.some((o) => o.id === def.id)
            const greyed = activeTags.length > 0 && !inTier1
            const selected = character.occ.id === def.id
            const xpLabel = getOccXpTableDisplayName(def)
            const slotPolicy = occSkillSlotPolicy(def)
            const slotNote =
              slotPolicy.kind === 'psychic_tier'
                ? `Related slots × ${slotPolicy.majorMultiplier} on Major psychic`
                : null
            const base = occBaseStatsDice(def)
            const occCat = occCharacterCategory(def)
            return (
              <button
                key={def.id}
                type="button"
                aria-disabled={greyed}
                title={greyed ? tier2Tooltip : undefined}
                onClick={() => {
                  if (!greyed) setSelectedOcc(def.id)
                }}
                className={`rounded-lg border-2 p-3 text-left transition-[box-shadow,transform] ${
                  greyed
                    ? 'cursor-not-allowed border-slate-700/50 bg-slate-900/40 opacity-40 line-through decoration-slate-500'
                    : selected
                      ? morphus
                        ? 'border-amber-400 bg-violet-950/80 shadow-[0_0_0_2px_rgba(251,191,36,0.35)]'
                        : 'border-blue-600 bg-blue-50 shadow-[0_0_0_2px_rgba(37,99,235,0.25)]'
                      : morphus
                        ? 'border-violet-800 bg-slate-900/60 hover:border-violet-500'
                        : 'border-slate-200 bg-slate-50 hover:border-blue-400'
                }`}
                aria-pressed={selected}
              >
                <p
                  className="text-xs font-black uppercase tracking-wide opacity-70"
                  style={{ color: morphus ? '#c4b5fd' : '#1e3a8a' }}
                >
                  {occCat === 'psychic' ? 'Psychic O.C.C.' : 'O.C.C.'}
                </p>
                <p className="mt-1 text-lg font-bold">{def.name}</p>
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
                <p className="mt-2 text-[11px] leading-snug opacity-80">
                  XP table: {xpLabel}
                  {slotNote ? ` · ${slotNote}` : ''}
                </p>
              </button>
            )
          })}
          {occPool.length === 0 ? (
            <p className="text-sm opacity-80">
              No O.C.C. rows available for this creation / host genre pairing.
            </p>
          ) : null}
        </div>
      ) : null}

      {raceCanPickOcc && specializationBranches.length > 0 ? (
        <div className={`mt-4 grid gap-2 sm:grid-cols-2 ${panel} rounded-lg border-2 p-4`}>
          <p
            className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide opacity-80"
            style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
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
