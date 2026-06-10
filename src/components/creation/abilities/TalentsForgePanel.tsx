import { useMemo, useState } from 'react'
import {
  ABILITY_LIBRARY,
  type AbilityDef,
} from '../../../data/abilityLibrary'
import { getFeatureById, listPalladiumTalentsForGameSystem } from '../../../data/library/registry'
import { useCharacter } from '../../../context/CharacterContext'
import { abilityPassesOccSupernaturalRules } from '../../../lib/occCreationDerivation'
import { abilityDurationBadgeLabel } from '../../../lib/supernaturalAbilityDisplay'
import type { PalladiumOcc } from '../../../types'

type TalentsForgePanelProps = {
  morphus: boolean
  genreId: string
  isNightbane: boolean
  activeOcc: PalladiumOcc | undefined
  spellCap: number
  talentBudget: number
  talentCount: number
}

export function TalentsForgePanel({
  morphus,
  genreId,
  isNightbane,
  activeOcc,
  spellCap,
  talentBudget,
  talentCount,
}: TalentsForgePanelProps) {
  const { character, addSelectedAbility } = useCharacter()
  const [search, setSearch] = useState('')
  const selectedIds = character.selectedAbilities ?? []

  const talentIdsForGenre = useMemo(
    () =>
      new Set(listPalladiumTalentsForGameSystem(genreId).map((row) => row.id)),
    [genreId],
  )

  const talents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ABILITY_LIBRARY.filter((a) => {
      if (a.category !== 'Talent') return false
      if (a.morphusOnly && !morphus) return false
      if (!talentIdsForGenre.has(a.id)) return false
      if (q === '') return true
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.descriptionMorphus?.toLowerCase().includes(q) ?? false)
      )
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [search, morphus, talentIdsForGenre])

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
      <div
        className="sticky top-0 z-10 border-b p-3"
        style={{ borderColor: morphus ? '#5b21b6' : '#e2e8f0' }}
      >
        <p className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
          Nightbane talent library
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or description…"
          className={`w-full rounded-md border px-3 py-2 text-sm ${
            morphus
              ? 'border-violet-700 bg-slate-950 text-violet-50'
              : 'border-slate-300 bg-white text-slate-900'
          }`}
          aria-label="Search talents"
        />
      </div>
      <ul
        className={`max-h-[min(480px,55vh)] space-y-2 overflow-y-auto p-3 ${drawerStyle}`}
        aria-label="Talent library"
      >
        {talents.length === 0 ? (
          <li
            className={`rounded-md border p-4 text-sm ${
              morphus
                ? 'border-violet-900 text-violet-300'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            No talents match your search.
          </li>
        ) : null}
        {talents.map((a) => (
          <TalentRow
            key={a.id}
            ability={a}
            morphus={morphus}
            isNightbane={isNightbane}
            activeOcc={activeOcc}
            spellCap={spellCap}
            selectedIds={selectedIds}
            talentCount={talentCount}
            talentBudget={talentBudget}
            onSelect={() => addSelectedAbility(a.id)}
            descMorphus={descMorphus}
            descFacade={descFacade}
          />
        ))}
      </ul>
    </div>
  )
}

function TalentRow({
  ability: a,
  morphus,
  isNightbane,
  activeOcc,
  spellCap,
  selectedIds,
  talentCount,
  talentBudget,
  onSelect,
  descMorphus,
  descFacade,
}: {
  ability: AbilityDef
  morphus: boolean
  isNightbane: boolean
  activeOcc: PalladiumOcc | undefined
  spellCap: number
  selectedIds: readonly string[]
  talentCount: number
  talentBudget: number
  onSelect: () => void
  descMorphus: string
  descFacade: string
}) {
  const feature = getFeatureById(a.id)
  const occGate =
    activeOcc && feature
      ? abilityPassesOccSupernaturalRules(activeOcc, feature, spellCap)
      : { allowed: true as const }
  const blocked = !occGate.allowed
  const already = selectedIds.includes(a.id)
  const atCap = talentCount >= talentBudget
  const canSelect = !blocked && !already && !atCap
  const lockedReason = blocked
    ? `Locked: ${occGate.reason ?? 'O.C.C. restriction.'}`
    : already
      ? 'Already selected.'
      : atCap
        ? 'Talent budget full.'
        : 'Select this talent'

  return (
    <li
      className={`rounded-md border p-3 text-sm ${
        blocked
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
            Nightbane Talent · {a.energySource.toUpperCase()}
          </span>
          {blocked ? (
            <span
              className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                morphus
                  ? 'bg-rose-950 text-rose-300'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              Locked
            </span>
          ) : null}
        </div>
        <button
          type="button"
          title={lockedReason}
          disabled={!canSelect}
          onClick={onSelect}
          className="shrink-0 rounded bg-indigo-600 px-2 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Select
        </button>
      </div>
      <p className={`mt-2 text-xs ${morphus ? descMorphus : descFacade}`}>
        {morphus && a.descriptionMorphus ? a.descriptionMorphus : a.description}
      </p>
      {isNightbane ? (
        <div
          className={`mt-2 grid gap-1 rounded border px-2 py-1.5 text-[11px] ${
            morphus
              ? 'border-amber-700/50 bg-amber-950/30 text-amber-100'
              : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}
        >
          <div>
            <span className="font-bold">P.P.E. cost:</span>{' '}
            {a.ppeCost != null ? `${a.ppeCost}` : '—'}
          </div>
          <div>
            <span className="font-bold">Activation cost:</span>{' '}
            {a.activationCost ?? '—'}
          </div>
        </div>
      ) : null}
      <span
        className={`mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          morphus
            ? 'bg-violet-950 text-violet-300'
            : 'bg-slate-200 text-slate-700'
        }`}
      >
        {abilityDurationBadgeLabel(a.durationType)}
      </span>
    </li>
  )
}
