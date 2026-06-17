import { useEffect, useMemo, useState } from 'react'
import { getAbilityById } from '../../../data/abilityLibrary'
import {
  formatMagicPpeCost,
  getFeatureById,
  listMagicSchoolIdsForGameSystem,
  listPalladiumMagicForGameSystem,
} from '../../../data/library/registry'
import { useCharacter } from '../../../context/CharacterContext'
import { magicSchoolFilterLabel } from '../../../lib/magicSchoolLabels'
import {
  browseMagicSchoolsForOcc,
  formatSpellCaveatLine,
  resolveSpellsForOcc,
  resolvedSpellSchoolTabs,
  type SpellOccAccess,
} from '../../../lib/spellAccessResolver'
import {
  abilityDurationBadgeLabel,
  magicRowIsSelectable,
  type MagicRowSelectContext,
} from '../../../lib/supernaturalAbilityDisplay'
import type { PalladiumOcc } from '../../../types'

type MagicForgePanelProps = {
  morphus: boolean
  genreId: string
  activeOcc: PalladiumOcc | undefined
  spellCap: number
  spellBudget: number
  spellCount: number
}

const ALL_SCHOOLS_TAB = '__all__'

export function MagicForgePanel({
  morphus,
  genreId,
  activeOcc,
  spellCap,
  spellBudget,
  spellCount,
}: MagicForgePanelProps) {
  const { character, addSelectedAbility } = useCharacter()
  const selectedIds = character.selectedAbilities ?? []
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState<string>(ALL_SCHOOLS_TAB)

  const catalogSchools = useMemo(
    () => listMagicSchoolIdsForGameSystem(genreId),
    [genreId],
  )

  const occSpellAccess = useMemo(() => {
    if (!activeOcc) return null
    return resolveSpellsForOcc(activeOcc, {
      gameSystem: genreId,
      characterLevel: 1,
      spellCap,
      genreId,
    })
  }, [activeOcc, genreId, spellCap])

  const availableSchools = useMemo(() => {
    if (occSpellAccess) return resolvedSpellSchoolTabs(occSpellAccess)
    return browseMagicSchoolsForOcc(genreId, activeOcc, catalogSchools)
  }, [occSpellAccess, genreId, activeOcc, catalogSchools])

  useEffect(() => {
    if (availableSchools.length === 0) {
      setSchoolFilter(ALL_SCHOOLS_TAB)
      return
    }
    if (
      schoolFilter !== ALL_SCHOOLS_TAB &&
      !availableSchools.includes(schoolFilter)
    ) {
      setSchoolFilter(availableSchools.length > 1 ? ALL_SCHOOLS_TAB : availableSchools[0])
    }
  }, [availableSchools, schoolFilter])

  const selectCtx = useMemo(
    (): MagicRowSelectContext => ({
      activeOcc,
      spellCap,
      genreId,
      selectedIds,
    }),
    [activeOcc, spellCap, genreId, selectedIds],
  )

  const searchAllSchools = search.trim().length > 0

  const spellRows = useMemo((): SpellOccAccess[] | null => {
    if (occSpellAccess) {
      const q = search.trim().toLowerCase()
      let rows = occSpellAccess
      if (!searchAllSchools && schoolFilter !== ALL_SCHOOLS_TAB) {
        rows = rows.filter((row) => row.canonicalSchool === schoolFilter)
      }
      if (q) {
        rows = rows.filter(
          (row) =>
            row.spell.name.toLowerCase().includes(q) ||
            row.spell.description.toLowerCase().includes(q) ||
            (typeof row.spell.descriptionMorphus === 'string' &&
              row.spell.descriptionMorphus.toLowerCase().includes(q)) ||
            row.displayLabel.toLowerCase().includes(q) ||
            formatSpellCaveatLine(row.caveats).toLowerCase().includes(q),
        )
      }
      return rows
    }
    return null
  }, [occSpellAccess, search, searchAllSchools, schoolFilter])

  const legacyRows = useMemo(() => {
    if (occSpellAccess) return []
    const q = search.trim().toLowerCase()
    let rows = listPalladiumMagicForGameSystem(genreId)
    if (q) {
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.description.toLowerCase().includes(q) ||
          (typeof row.descriptionMorphus === 'string' &&
            row.descriptionMorphus.toLowerCase().includes(q)),
      )
    }
    return [...rows].sort(
      (a, b) => a.spellLevel - b.spellLevel || a.name.localeCompare(b.name),
    )
  }, [occSpellAccess, genreId, search])

  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'
  const drawerStyle = morphus
    ? 'border-violet-800 bg-slate-900/90'
    : 'border-slate-200 bg-slate-50'
  const descMorphus = 'text-violet-200/90 italic leading-relaxed'
  const descPrimaryTheme = 'text-slate-600 leading-relaxed'

  const noCatalogForOcc =
    activeOcc != null &&
    occSpellAccess != null &&
    occSpellAccess.length === 0 &&
    search.trim().length === 0

  const rowCount = spellRows?.length ?? legacyRows.length

  function renderSpellRow(access: SpellOccAccess) {
    const catalog = access.spell
    const a = getAbilityById(catalog.id)
    if (!a) return null
    const selectable = magicRowIsSelectable(catalog, selectCtx)
    const blocked = !access.pickGate.allowed || !selectable
    const already = selectedIds.includes(catalog.id)
    const atCap = spellCount >= spellBudget
    const canSelect = !blocked && !already && !atCap
    const lockedReason = blocked
      ? `Locked: ${access.pickGate.reason ?? 'O.C.C. restriction.'}`
      : already
        ? 'Already selected.'
        : atCap
          ? 'Spell budget full.'
          : 'Select this spell'
    const caveatLine = formatSpellCaveatLine(access.caveats)

    return (
      <li
        key={catalog.id}
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
              {access.displayLabel} · Level {catalog.spellLevel}
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
          {formatMagicPpeCost(catalog)}
          {' · '}
          {abilityDurationBadgeLabel(a.durationType)}
        </p>
        {caveatLine ? (
          <p
            className={`mt-1 text-xs font-medium ${
              morphus ? 'text-amber-200/90' : 'text-amber-800'
            }`}
            title={access.caveats.map((c) => c.detail ?? c.summary).join('\n')}
          >
            {caveatLine}
          </p>
        ) : null}
        <p
          className={`mt-2 text-xs leading-relaxed ${
            morphus ? descMorphus : descPrimaryTheme
          }`}
        >
          {morphus && a.descriptionMorphus ? a.descriptionMorphus : a.description}
        </p>
      </li>
    )
  }

  return (
    <div className={`flex flex-col rounded-lg border ${panelStyle}`}>
      <div
        className="sticky top-0 z-10 border-b p-3"
        style={{ borderColor: morphus ? '#5b21b6' : '#e2e8f0' }}
      >
        <p className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
          Spell library
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your available spells…"
          className={`mb-3 w-full rounded-md border px-3 py-2 text-sm ${
            morphus
              ? 'border-violet-700 bg-slate-950 text-violet-50'
              : 'border-slate-300 bg-white text-slate-900'
          }`}
          aria-label="Search spells"
        />
        {searchAllSchools ? (
          <p className="mb-2 text-[11px] opacity-70">Searching all available spells</p>
        ) : null}
        {!searchAllSchools && availableSchools.length > 1 ? (
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Magic school"
          >
            <button
              key={ALL_SCHOOLS_TAB}
              type="button"
              role="tab"
              aria-selected={schoolFilter === ALL_SCHOOLS_TAB}
              onClick={() => setSchoolFilter(ALL_SCHOOLS_TAB)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                schoolFilter === ALL_SCHOOLS_TAB
                  ? morphus
                    ? 'border-indigo-400 bg-indigo-700 text-white'
                    : 'border-indigo-600 bg-indigo-100 text-indigo-900'
                  : morphus
                    ? 'border-violet-900 text-violet-300'
                    : 'border-slate-300 text-slate-600'
              }`}
            >
              All
            </button>
            {availableSchools.map((schoolId) => (
              <button
                key={schoolId}
                type="button"
                role="tab"
                aria-selected={schoolFilter === schoolId}
                onClick={() => setSchoolFilter(schoolId)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  schoolFilter === schoolId
                    ? morphus
                      ? 'border-indigo-400 bg-indigo-700 text-white'
                      : 'border-indigo-600 bg-indigo-100 text-indigo-900'
                    : morphus
                      ? 'border-violet-900 text-violet-300'
                      : 'border-slate-300 text-slate-600'
                }`}
              >
                {magicSchoolFilterLabel(genreId, schoolId)}
              </button>
            ))}
          </div>
        ) : !searchAllSchools && availableSchools.length === 1 ? (
          <p className="text-[11px] opacity-70">
            {magicSchoolFilterLabel(genreId, availableSchools[0])}
          </p>
        ) : null}
      </div>

      <ul
        className={`max-h-[min(480px,55vh)] space-y-2 overflow-y-auto p-3 ${drawerStyle}`}
        aria-label="Spell library"
      >
        {noCatalogForOcc ? (
          <li
            className={`rounded-md border p-4 text-sm ${
              morphus
                ? 'border-violet-900 text-violet-300'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            No spells are available yet for this O.C.C.&apos;s magic configuration. Content
            may still need authoring.
          </li>
        ) : null}
        {!noCatalogForOcc && rowCount === 0 ? (
          <li
            className={`rounded-md border p-4 text-sm ${
              morphus
                ? 'border-violet-900 text-violet-300'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            No spells match your search and filters.
          </li>
        ) : null}
        {spellRows?.map((access) => renderSpellRow(access))}
        {!spellRows &&
          legacyRows.map((catalog) => {
            const feature = getFeatureById(catalog.id)
            const access: SpellOccAccess = {
              spell: catalog,
              accessPath: 'native',
              canonicalSchool: catalog.school,
              displayLabel: magicSchoolFilterLabel(genreId, catalog.school),
              caveats: [],
              pickGate: { allowed: true },
            }
            if (activeOcc && feature) {
              const occGate = magicRowIsSelectable(catalog, selectCtx)
              access.pickGate = { allowed: occGate }
            }
            return renderSpellRow(access)
          })}
      </ul>
    </div>
  )
}
