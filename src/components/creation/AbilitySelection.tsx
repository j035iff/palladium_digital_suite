import { useMemo, useState } from 'react'
import type { AbilityDef, LibraryPowerCategory } from '../../data/abilityLibrary'
import {
  ABILITY_LIBRARY,
  abilityToLibraryCategory,
  getAbilityById,
} from '../../data/abilityLibrary'
import { getFeatureById } from '../../data/library/registry'
import { useCharacter } from '../../context/CharacterContext'
import { abilityPassesOccSupernaturalRules } from '../../lib/occCreationDerivation'

const LIBRARY_FILTERS: Array<'all' | LibraryPowerCategory> = [
  'all',
  'Magic',
  'Psionics',
  'NightbaneTalents',
]

function durationBadgeLabel(d: AbilityDef['durationType']): string {
  if (d === 'instant') return 'Instant'
  if (d === 'melee') return 'Melee (APM)'
  return 'Narrative'
}

function filterLabel(f: (typeof LIBRARY_FILTERS)[number]): string {
  if (f === 'all') return 'All'
  if (f === 'NightbaneTalents') return 'Nightbane Talents'
  return f
}

export function AbilitySelection() {
  const {
    character,
    activeForm,
    activeOcc,
    occCreationDerived,
    supportsDualForm,
    addSelectedAbility,
    removeSelectedAbility,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const isNightbane = character.lineage === 'nightbane'
  const [search, setSearch] = useState('')
  const [libraryFilter, setLibraryFilter] = useState<
    'all' | LibraryPowerCategory
  >('all')

  const budget =
    occCreationDerived?.abilityBudget ??
    character.creationAbilityBudget ?? {
      spellSlots: 8,
      psionicSlots: 6,
      talentSlots: 4,
    }
  const spellCap =
    occCreationDerived?.startingSpellLevelCap ??
    character.startingSpellLevelCap ??
    4
  const selectedIds = character.selectedAbilities

  const counts = useMemo(() => {
    const list = selectedIds ?? []
    const spell = list.filter(
      (id) => getAbilityById(id)?.category === 'Spell',
    ).length
    const psionic = list.filter(
      (id) => getAbilityById(id)?.category === 'Psionic',
    ).length
    const talent = list.filter(
      (id) => getAbilityById(id)?.category === 'Talent',
    ).length
    return { spell, psionic, talent }
  }, [selectedIds])

  const filteredLibrary = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ABILITY_LIBRARY.filter((a) => {
      if (a.morphusOnly && !morphus) return false

      const libCat = abilityToLibraryCategory(a.category)
      const catOk =
        libraryFilter === 'all' || libCat === libraryFilter
      const textOk =
        q === '' ||
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.descriptionMorphus?.toLowerCase().includes(q) ?? false)
      return catOk && textOk
    })
  }, [search, libraryFilter, morphus])

  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'
  const drawerStyle = morphus
    ? 'border-violet-800 bg-slate-900/90'
    : 'border-slate-200 bg-slate-50'
  const descMorphus = 'text-violet-200/90 italic leading-relaxed'
  const descFacade = 'text-slate-600 leading-relaxed'

  return (
    <section
      className="mt-8 w-full border-t-2 border-dashed pt-8"
      aria-labelledby="ability-selection-heading"
    >
      <h2
        id="ability-selection-heading"
        className="mb-1 text-sm font-semibold uppercase tracking-wide"
        style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
      >
        Step 4: Supernatural Abilities
      </h2>
      <p
        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"
        style={{ color: morphus ? '#a5b4fc' : '#475569' }}
      >
        Pick spells, psionics
        {supportsDualForm ? ' and (for Nightbane) Talents' : ''} within your O.C.C.
        budgets. Starting spell level is capped (Pillar 8); higher levels stay
        locked.
        {supportsDualForm ? (
          <>
            {' '}
            Use <strong>Become Morphus</strong> in the header to reveal
            Morphus-only Talents.
          </>
        ) : null}
      </p>

      {isNightbane ? (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-xs font-medium ${
            morphus
              ? 'border-amber-500/60 bg-amber-950/40 text-amber-100'
              : 'border-amber-300 bg-amber-50 text-amber-950'
          }`}
          role="status"
        >
          Nightbane build: Talents show{' '}
          <span className="font-bold">P.P.E. cost</span> and{' '}
          <span className="font-bold">activation cost</span> on each card.
          Morphus-only entries appear only while Morphus is active.
        </div>
      ) : null}

      <div
        className={`mb-4 flex flex-wrap gap-3 rounded-lg border p-3 text-xs ${
          morphus ? 'border-violet-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
        }`}
        aria-label="O.C.C. supernatural pick budgets"
      >
        <span className="font-bold uppercase tracking-wide opacity-80">
          Budget
        </span>
        <span className="tabular-nums">
          Spells: {counts.spell}/{budget.spellSlots}
        </span>
        <span aria-hidden="true" className="opacity-40">
          ·
        </span>
        <span className="tabular-nums">
          Psionics: {counts.psionic}/{budget.psionicSlots}
        </span>
        <span aria-hidden="true" className="opacity-40">
          ·
        </span>
        <span className="tabular-nums">
          Talents: {counts.talent}/{budget.talentSlots}
        </span>
        <span aria-hidden="true" className="opacity-40">
          ·
        </span>
        <span className="tabular-nums">
          Starting spells: Level {spellCap} max
        </span>
      </div>

      {occCreationDerived?.supernaturalSummary.length ? (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 font-mono text-[10px] leading-relaxed ${
            morphus ? 'border-violet-800 bg-slate-900/50 text-violet-200' : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          <p className="mb-1 font-bold uppercase tracking-wide opacity-80">
            O.C.C. supernatural engines
          </p>
          <ul className="list-inside list-disc space-y-0.5">
            {occCreationDerived.supernaturalSummary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`flex flex-col rounded-lg border ${panelStyle}`}>
          <div
            className="sticky top-0 z-10 border-b p-3"
            style={{ borderColor: morphus ? '#5b21b6' : '#e2e8f0' }}
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
              Power library
            </p>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or description…"
              className={`mb-3 w-full rounded-md border px-3 py-2 text-sm ${
                morphus
                  ? 'border-violet-700 bg-slate-950 text-violet-50'
                  : 'border-slate-300 bg-white text-slate-900'
              }`}
              aria-label="Search abilities"
            />
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Category">
              {LIBRARY_FILTERS.map((f) => {
                const talentHighlight =
                  isNightbane && f === 'NightbaneTalents'
                return (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={libraryFilter === f}
                    onClick={() => setLibraryFilter(f)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      libraryFilter === f
                        ? morphus
                          ? 'border-violet-400 bg-violet-600 text-white'
                          : 'border-blue-600 bg-blue-600 text-white'
                        : morphus
                          ? 'border-violet-900 bg-slate-950 text-violet-200'
                          : 'border-slate-300 bg-white text-slate-700'
                    } ${
                      talentHighlight && libraryFilter !== f
                        ? morphus
                          ? 'ring-2 ring-amber-400/80 ring-offset-2 ring-offset-slate-950'
                          : 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white'
                        : ''
                    }`}
                  >
                    {filterLabel(f)}
                  </button>
                )
              })}
            </div>
          </div>

          <ul
            className={`max-h-[min(480px,55vh)] space-y-2 overflow-y-auto p-3 ${drawerStyle}`}
            aria-label="Filtered abilities"
          >
            {filteredLibrary.map((a) => {
              const feature = getFeatureById(a.id)
              const occGate =
                activeOcc && feature
                  ? abilityPassesOccSupernaturalRules(activeOcc, feature, spellCap)
                  : { allowed: true as const }
              const spellBlocked =
                !occGate.allowed ||
                (a.category === 'Spell' &&
                  a.spellLevel != null &&
                  a.spellLevel > spellCap &&
                  !activeOcc)
              const selectedList = selectedIds ?? []
              const already = selectedList.includes(a.id)
              const atCap =
                (a.category === 'Spell' && counts.spell >= budget.spellSlots) ||
                (a.category === 'Psionic' &&
                  counts.psionic >= budget.psionicSlots) ||
                (a.category === 'Talent' &&
                  counts.talent >= budget.talentSlots)
              const canSelect = !spellBlocked && !already && !atCap
              const lockedReason = spellBlocked
                ? (occGate.reason
                    ? `Locked: ${occGate.reason}`
                    : `Locked: spell level ${a.spellLevel} exceeds starting cap (${spellCap}).`)
                : already
                  ? 'Already selected.'
                  : atCap
                    ? 'Category budget full.'
                    : 'Select this ability'

              return (
                <li
                  key={a.id}
                  className={`rounded-md border p-3 text-sm ${
                    spellBlocked
                      ? morphus
                        ? 'border-slate-800 bg-slate-950/40 opacity-50'
                        : 'border-slate-200 bg-slate-100 opacity-60'
                      : morphus
                        ? 'border-violet-800 bg-slate-950/60'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold">{a.name}</span>
                      <span className="ml-2 text-xs opacity-60">
                        {a.category === 'Spell'
                          ? 'Magic'
                          : a.category === 'Psionic'
                            ? 'Psionics'
                            : 'Nightbane Talent'}{' '}
                        · {a.energySource.toUpperCase()}
                        {a.category === 'Spell' && a.spellLevel != null
                          ? ` · Lvl ${a.spellLevel}`
                          : ''}
                      </span>
                      {spellBlocked ? (
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
                      onClick={() => addSelectedAbility(a.id)}
                      className="shrink-0 rounded bg-indigo-600 px-2 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Select
                    </button>
                  </div>
                  <p
                    className={`mt-2 text-xs ${morphus ? descMorphus : descFacade}`}
                  >
                    {morphus && a.descriptionMorphus
                      ? a.descriptionMorphus
                      : a.description}
                  </p>
                  {a.category === 'Talent' && isNightbane ? (
                    <div
                      className={`mt-2 grid gap-1 rounded border px-2 py-1.5 text-[11px] ${
                        morphus
                          ? 'border-amber-700/50 bg-amber-950/30 text-amber-100'
                          : 'border-amber-200 bg-amber-50 text-amber-950'
                      }`}
                    >
                      <div>
                        <span className="font-bold">P.P.E. cost:</span>{' '}
                        {a.ppeCost != null ? `${a.ppeCost}` : '—'}{' '}
                        <span className="opacity-70">(talent line)</span>
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
                    {durationBadgeLabel(a.durationType)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className={`space-y-3 rounded-lg border p-4 ${panelStyle}`}>
          <h3 className="text-xs font-bold uppercase tracking-wide opacity-80">
            Selected powers
          </h3>
          <p className="text-xs opacity-70">
            Saved on the character sheet and in browser storage for refresh
            survival.
          </p>
          {(!selectedIds || selectedIds.length === 0) ? (
            <p className="text-sm opacity-60">Nothing selected yet.</p>
          ) : (
            <ul className="space-y-2">
              {(selectedIds ?? []).map((id) => {
                const a = getAbilityById(id)
                if (!a) {
                  return (
                    <li
                      key={id}
                      className="rounded border border-rose-800/50 p-2 text-xs text-rose-300"
                    >
                      Unknown id: {id}{' '}
                      <button
                        type="button"
                        className="ml-2 underline"
                        onClick={() => removeSelectedAbility(id)}
                      >
                        Remove
                      </button>
                    </li>
                  )
                }
                return (
                  <li
                    key={id}
                    className={`flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3 text-sm ${
                      morphus
                        ? 'border-violet-700 bg-slate-900/80'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-bold">{a.name}</span>
                      <span className="ml-2 text-xs opacity-60">
                        {a.category}
                        {a.spellLevel != null ? ` · L${a.spellLevel}` : ''}
                      </span>
                      {a.category === 'Talent' && isNightbane ? (
                        <p
                          className={`mt-1 text-[11px] ${
                            morphus ? 'text-amber-200/90' : 'text-amber-900'
                          }`}
                        >
                          P.P.E. {a.ppeCost ?? '—'} · {a.activationCost ?? '—'}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedAbility(id)}
                      className="shrink-0 text-xs text-rose-500 underline"
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
