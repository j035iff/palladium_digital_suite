import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import type { ForgeTabView } from '../../lib/forgeNavigation/types'
import { resolveActiveMorphusTraits } from '../../lib/morphusPassiveBridge'
import {
  buildLiveSheetAbilitySections,
  type LiveCatalogAbilityRow,
  type LiveNaturalAbilityRow,
  type LiveSheetAbilityCategoryId,
} from '../../lib/liveSheetAbilities'

const SUB_TAB_PILL_LABELS: Record<LiveSheetAbilityCategoryId, string> = {
  natural: 'Natural',
  occ: 'O.C.C.',
  magic: 'Magic',
  psionics: 'Psionics',
  talents: 'Talents',
}

/**
 * Live sheet Abilities tab — nested Natural / O.C.C. / Magic / Psionics / Talents pills.
 * Empty categories are omitted (Radical Visibility).
 */
export function LiveAbilitiesPanel() {
  const {
    character,
    activeRace,
    effectiveOcc,
    activeForm,
    supportsDualForm,
    creationGenreId,
    hostGenreId,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const genreId = creationGenreId ?? hostGenreId ?? 'nightbane'

  const morphusTraits = useMemo(
    () => resolveActiveMorphusTraits(character),
    [character],
  )

  const sections = useMemo(
    () =>
      buildLiveSheetAbilitySections({
        race: activeRace,
        occ: effectiveOcc,
        characterLevel: character.level,
        selectedAbilityIds: character.selectedAbilities ?? [],
        activeForm,
        genreId,
        morphusTraits,
      }),
    [
      activeRace,
      effectiveOcc,
      character.level,
      character.selectedAbilities,
      activeForm,
      genreId,
      morphusTraits,
    ],
  )

  const [activeCategoryId, setActiveCategoryId] = useState<LiveSheetAbilityCategoryId | null>(
    null,
  )

  useEffect(() => {
    if (sections.length === 0) {
      setActiveCategoryId(null)
      return
    }
    setActiveCategoryId((current) => {
      if (current && sections.some((s) => s.id === current)) return current
      return sections[0]!.id
    })
  }, [sections])

  const headingColor = morphus ? 'text-violet-200' : 'text-blue-900'
  const muted = morphus ? 'text-violet-300/90' : 'text-slate-600'
  const card = morphus
    ? 'rounded-lg border-2 border-violet-700 bg-slate-950/80 text-violet-50'
    : 'rounded-lg border-2 border-slate-200 bg-white text-slate-900'

  const activeSection =
    sections.find((s) => s.id === activeCategoryId) ?? sections[0] ?? null

  const subTabs: ForgeTabView[] = useMemo(
    () =>
      sections.map((section) => ({
        id: section.id,
        label: SUB_TAB_PILL_LABELS[section.id],
        visual:
          section.id === (activeSection?.id ?? activeCategoryId)
            ? 'active'
            : 'available',
        clickable: true,
        blockers: [],
        isViewing: section.id === (activeSection?.id ?? activeCategoryId),
      })),
    [sections, activeSection?.id, activeCategoryId],
  )

  if (sections.length === 0) {
    return (
      <section aria-labelledby="abilities-heading" className="space-y-3">
        <h2
          id="abilities-heading"
          className={`text-sm font-semibold uppercase tracking-wide ${headingColor}`}
        >
          Abilities
        </h2>
        <p className={`text-sm ${muted}`}>
          No natural, O.C.C., magic, psionic, or talent abilities on this record.
        </p>
      </section>
    )
  }

  return (
    <section aria-labelledby="abilities-heading" className="space-y-4">
      <div>
        <h2
          id="abilities-heading"
          className={`text-sm font-semibold uppercase tracking-wide ${headingColor}`}
        >
          Abilities
        </h2>
        <p className={`mt-1 text-xs ${muted}`}>
          Only categories this character has are shown. Morphus trait powers appear under
          Natural. Cast / duration workflow is still target UX.
        </p>
      </div>

      <ForgeNavigationBar
        tabs={subTabs}
        activeTabId={activeSection?.id ?? sections[0]!.id}
        onSelectTab={(id) => setActiveCategoryId(id as LiveSheetAbilityCategoryId)}
        singleRow
      />

      {activeSection ? (
        <div className="space-y-2" role="tabpanel" aria-label={activeSection.label}>
          <ul className="space-y-2">
            {activeSection.naturalRows?.map((row) => (
              <li key={row.id}>
                <NaturalAbilityCard
                  row={row}
                  cardClass={card}
                  muted={muted}
                  morphus={morphus}
                />
              </li>
            ))}
            {activeSection.catalogRows?.map((row) => (
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
        </div>
      ) : null}
    </section>
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
