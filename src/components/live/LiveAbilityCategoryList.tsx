import { useEffect, useMemo, useState } from 'react'
import {
  filterLiveSheetAbilitySection,
  LIVE_ABILITY_FILTER_ALL_TYPES,
  listLiveSheetAbilityTypeFilterOptions,
  type LiveCatalogAbilityRow,
  type LiveNaturalAbilityRow,
  type LiveSheetAbilitySection,
} from '../../lib/liveSheetAbilities'

type Props = {
  section: LiveSheetAbilitySection
  morphus: boolean
  genreId: string
  emptyMessage?: string
}

/**
 * Shared ability row list for strip Abilities + Combat Abilities (Unified Path).
 * Name search + type filter (AND); type filter omitted when the category has no types.
 */
export function LiveAbilityCategoryList({
  section,
  morphus,
  genreId,
  emptyMessage = 'No abilities in this category yet.',
}: Props) {
  const muted = morphus ? 'text-violet-300/90' : 'text-slate-600'
  const card = morphus
    ? 'rounded-lg border-2 border-violet-700 bg-slate-950/80 text-violet-50'
    : 'rounded-lg border-2 border-slate-200 bg-white text-slate-900'
  const labelClass = morphus
    ? 'text-[10px] font-bold uppercase tracking-wide text-violet-300'
    : 'text-[10px] font-bold uppercase tracking-wide text-slate-600'
  const fieldClass = morphus
    ? 'rounded-md border border-violet-700 bg-slate-950 px-2 py-1.5 text-sm text-violet-50'
    : 'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900'

  const typeOptions = useMemo(
    () => listLiveSheetAbilityTypeFilterOptions(section, genreId),
    [section, genreId],
  )
  const showTypeFilter = typeOptions.length > 1

  const [typeKey, setTypeKey] = useState(LIVE_ABILITY_FILTER_ALL_TYPES)
  const [nameQuery, setNameQuery] = useState('')

  useEffect(() => {
    setTypeKey(LIVE_ABILITY_FILTER_ALL_TYPES)
    setNameQuery('')
  }, [section.id])

  useEffect(() => {
    if (
      typeKey !== LIVE_ABILITY_FILTER_ALL_TYPES &&
      !typeOptions.some((o) => o.value === typeKey)
    ) {
      setTypeKey(LIVE_ABILITY_FILTER_ALL_TYPES)
    }
  }, [typeKey, typeOptions])

  const filtered = useMemo(
    () =>
      filterLiveSheetAbilitySection(section, {
        typeKey: showTypeFilter ? typeKey : LIVE_ABILITY_FILTER_ALL_TYPES,
        nameQuery,
      }),
    [section, showTypeFilter, typeKey, nameQuery],
  )

  const naturalRows = filtered.naturalRows ?? []
  const catalogRows = filtered.catalogRows ?? []
  const sectionEmpty =
    (section.naturalRows?.length ?? 0) === 0 &&
    (section.catalogRows?.length ?? 0) === 0
  const filterEmpty = naturalRows.length === 0 && catalogRows.length === 0
  const filtersActive =
    Boolean(nameQuery.trim()) ||
    (showTypeFilter && typeKey !== LIVE_ABILITY_FILTER_ALL_TYPES)

  return (
    <div className="space-y-2" role="tabpanel" aria-label={section.label}>
      {!sectionEmpty ? (
        <div
          className={`grid gap-2 ${showTypeFilter ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}
          role="search"
          aria-label={`Filter ${section.label}`}
        >
          {showTypeFilter ? (
            <label className="flex min-w-0 flex-col gap-1">
              <span className={labelClass}>Type</span>
              <select
                className={fieldClass}
                value={typeKey}
                onChange={(e) => setTypeKey(e.target.value)}
                aria-label={`Filter ${section.label} by type`}
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex min-w-0 flex-col gap-1">
            <span className={labelClass}>Search</span>
            <input
              type="search"
              className={fieldClass}
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Ability name"
              aria-label={`Search ${section.label} by name`}
            />
          </label>
        </div>
      ) : null}

      {sectionEmpty ? (
        <p
          className={`rounded-lg border border-dashed px-3 py-4 text-center text-xs ${muted}`}
          role="status"
        >
          {emptyMessage}
        </p>
      ) : filterEmpty ? (
        <p className={`text-xs ${muted}`} role="status">
          {filtersActive
            ? 'No abilities match these filters.'
            : emptyMessage}
        </p>
      ) : (
        <ul className="space-y-2">
          {naturalRows.map((row) => (
            <li key={row.id}>
              <NaturalAbilityCard
                row={row}
                cardClass={card}
                muted={muted}
                morphus={morphus}
              />
            </li>
          ))}
          {catalogRows.map((row) => (
            <li key={row.id}>
              <CatalogAbilityCard
                row={row}
                cardClass={card}
                muted={muted}
                morphus={morphus}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NaturalAbilityCard({
  row,
  cardClass,
  muted,
  morphus,
}: {
  row: LiveNaturalAbilityRow
  cardClass: string
  muted: string
  morphus: boolean
}) {
  return (
    <article
      className={`px-3 py-2.5 ${cardClass} ${row.formRestricted ? 'opacity-55' : ''}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-bold leading-snug">{row.name}</h4>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {row.metaLine ? (
            <span className={`font-mono text-[11px] font-semibold ${muted}`}>
              {row.metaLine}
            </span>
          ) : null}
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${muted}`}>
            {row.sourceLabel}
          </span>
        </div>
      </div>
      {row.morphusOnly ? (
        <p
          className={`mt-1 text-[10px] font-black uppercase tracking-wide ${
            morphus ? 'text-amber-300' : 'text-amber-800'
          }`}
        >
          Morphus only
        </p>
      ) : null}
      {row.formRestricted ? (
        <p
          className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${
            morphus ? 'text-amber-200/90' : 'text-amber-900'
          }`}
        >
          Not available in the active form
        </p>
      ) : null}
      {row.percentileLine ? (
        <p className={`mt-1 font-mono text-[11px] font-semibold ${muted}`}>
          {row.percentileLine}
        </p>
      ) : null}
      {row.detailLines && row.detailLines.length > 0 ? (
        <ul className={`mt-1.5 list-disc space-y-0.5 pl-4 text-xs leading-relaxed ${muted}`}>
          {row.detailLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {row.description ? (
        <p className={`mt-1.5 text-xs leading-relaxed ${muted}`}>{row.description}</p>
      ) : null}
    </article>
  )
}

function CatalogAbilityCard({
  row,
  cardClass,
  muted,
  morphus,
}: {
  row: LiveCatalogAbilityRow
  cardClass: string
  muted: string
  morphus: boolean
}) {
  return (
    <article
      className={`px-3 py-2.5 ${cardClass} ${
        row.formRestricted ? 'opacity-55' : ''
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-bold leading-snug">{row.name}</h4>
        {row.metaLine ? (
          <span className={`font-mono text-[11px] font-semibold ${muted}`}>
            {row.metaLine}
          </span>
        ) : null}
      </div>
      {row.morphusOnly ? (
        <p
          className={`mt-1 text-[10px] font-black uppercase tracking-wide ${
            morphus ? 'text-amber-300' : 'text-amber-800'
          }`}
        >
          Morphus only
        </p>
      ) : null}
      {row.formRestricted ? (
        <p
          className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${
            morphus ? 'text-amber-200/90' : 'text-amber-900'
          }`}
        >
          Not available in the active form
        </p>
      ) : null}
      {row.description ? (
        <p className={`mt-1.5 text-xs leading-relaxed ${muted}`}>{row.description}</p>
      ) : null}
    </article>
  )
}
