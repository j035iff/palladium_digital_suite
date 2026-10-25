/**
 * Combat → Abilities: P.P.E. / I.S.P. above category sub-tabs
 * (Natural | OCC | Magic | Psionics | Talents). v1 = lists only; cast UX next.
 */

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

type Props = {
  morphus: boolean
  ppeCurrent: number
  ppeMax: number
  showIsp: boolean
  ispCurrent: number
  ispMax: number
}

export function CombatAbilitiesTab({
  morphus,
  ppeCurrent,
  ppeMax,
  showIsp,
  ispCurrent,
  ispMax,
}: Props) {
  const {
    character,
    activeRace,
    effectiveOcc,
    activeForm,
    creationGenreId,
    hostGenreId,
    psychicTier,
  } = useCharacter()

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
        emptyPolicy: 'show-if-available',
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

  const card = morphus
    ? 'border-violet-500/80 bg-slate-950/90'
    : 'border-blue-300 bg-white'
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

  return (
    <div className="space-y-3" aria-label="Combat abilities">
      <div
        className={`grid gap-2 ${showIsp ? 'sm:grid-cols-2' : 'sm:grid-cols-1 sm:max-w-xs'}`}
      >
        <ResourceCard
          label="P.P.E."
          current={ppeCurrent}
          max={ppeMax}
          morphus={morphus}
          className={card}
        />
        {showIsp ? (
          <ResourceCard
            label="I.S.P."
            current={ispCurrent}
            max={ispMax}
            morphus={morphus}
            className={card}
          />
        ) : null}
      </div>

      {sections.length === 0 ? (
        <p className={`text-xs ${muted}`} role="status">
          No ability categories available for this character.
        </p>
      ) : (
        <>
          <ForgeNavigationBar
            tabs={subTabs}
            activeTabId={activeSection?.id ?? sections[0]!.id}
            onSelectTab={(id) => setActiveCategoryId(id as LiveSheetAbilityCategoryId)}
            singleRow
            onDarkSurface={morphus}
          />
          {activeSection ? (
            <LiveAbilityCategoryList
              section={activeSection}
              morphus={morphus}
              genreId={genreId}
              emptyMessage={`No ${LIVE_SHEET_ABILITY_CATEGORY_PILL_LABELS[activeSection.id].toLowerCase()} abilities yet.`}
            />
          ) : null}
        </>
      )}
    </div>
  )
}

function ResourceCard({
  label,
  current,
  max,
  morphus,
  className,
}: {
  label: string
  current: number
  max: number
  morphus: boolean
  className: string
}) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  return (
    <div className={`rounded-lg border-2 p-3 ${className}`}>
      <p
        className={`text-[10px] font-black uppercase tracking-wide ${
          morphus ? 'text-violet-200' : 'text-blue-900'
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-xl font-black tabular-nums ${
          morphus ? 'text-violet-50' : 'text-slate-900'
        }`}
      >
        {current}
        <span className="opacity-60"> / </span>
        {max}
      </p>
      <div
        className={`mt-2 h-2 w-full overflow-hidden rounded-full ${
          morphus ? 'bg-slate-900' : 'bg-blue-100'
        }`}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label} pool`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            background: morphus
              ? 'linear-gradient(90deg,#a78bfa,#5b21b6)'
              : 'linear-gradient(90deg,#34d399,#047857)',
          }}
        />
      </div>
    </div>
  )
}
