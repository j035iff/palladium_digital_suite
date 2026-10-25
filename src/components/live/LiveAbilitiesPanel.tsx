import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import type { ForgeTabView } from '../../lib/forgeNavigation/types'
import { resolveActiveMorphusTraits } from '../../lib/morphusPassiveBridge'
import { resolveEffectiveCreationAbilityBudget } from '../../lib/creationAbilityBudget'
import {
  buildLiveSheetAbilitySections,
  LIVE_SHEET_ABILITY_CATEGORY_PILL_LABELS,
  type LiveSheetAbilityCategoryId,
} from '../../lib/liveSheetAbilities'
import { LiveAbilityCategoryList } from './LiveAbilityCategoryList'

/**
 * Live sheet Abilities tab — nested Natural / OCC / Magic / Psionics / Talents pills.
 * Empty categories are omitted (strip policy). Combat uses show-if-available.
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
    psychicTier,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const genreId = creationGenreId ?? hostGenreId ?? 'nightbane'

  const morphusTraits = useMemo(
    () => resolveActiveMorphusTraits(character),
    [character],
  )

  const abilityBudget = useMemo(
    () =>
      resolveEffectiveCreationAbilityBudget({
        occ: effectiveOcc,
        raceId: activeRace?.id,
        psychicTier,
        storedBudget: character.creationAbilityBudget,
        creationGenreId: creationGenreId ?? undefined,
        hostGenreId: hostGenreId ?? undefined,
      }),
    [
      effectiveOcc,
      activeRace?.id,
      psychicTier,
      character.creationAbilityBudget,
      creationGenreId,
      hostGenreId,
    ],
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
        abilityBudget,
        emptyPolicy: 'omit',
      }),
    [
      activeRace,
      effectiveOcc,
      character.level,
      character.selectedAbilities,
      activeForm,
      genreId,
      morphusTraits,
      abilityBudget,
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

  const activeSection =
    sections.find((s) => s.id === activeCategoryId) ?? sections[0] ?? null

  const subTabs: ForgeTabView[] = useMemo(
    () =>
      sections.map((section) => ({
        id: section.id,
        label: LIVE_SHEET_ABILITY_CATEGORY_PILL_LABELS[section.id],
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
          Only categories this character has are shown. R.C.C. powers appear under
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
        <LiveAbilityCategoryList
          section={activeSection}
          morphus={morphus}
          genreId={genreId}
        />
      ) : null}
    </section>
  )
}
