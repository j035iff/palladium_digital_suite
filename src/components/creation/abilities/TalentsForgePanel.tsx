import { useMemo, useState, type ReactNode } from 'react'
import { getAbilityById } from '../../../data/abilityLibrary'
import {
  getFeatureById,
  listPalladiumTalentsForGameSystem,
} from '../../../data/library/registry'
import { useCharacter } from '../../../context/CharacterContext'
import { abilityPassesOccSupernaturalRules } from '../../../lib/occCreationDerivation'
import { resolveMorphusForgeState } from '../../../lib/morphusForgeNavigation'
import { abilityDurationBadgeLabel } from '../../../lib/supernaturalAbilityDisplay'
import {
  formatTalentActivationCost,
  formatTalentPpeAcquireCost,
} from '../../../lib/talentDisplay'
import {
  assessTalentSelectionGate,
  collectCharacterMorphusTableIds,
  CREATION_CHARACTER_LEVEL,
  groupEntriesByTalentLevelGate,
  talentCatalogTier,
  talentMinimumLevelRequirement,
  type TalentCatalogTier,
  type TalentSelectionGateContext,
} from '../../../lib/talentSelectionGates'
import type { AbilityDef } from '../../../data/abilityLibrary'
import type { PalladiumOcc, PalladiumTalent } from '../../../types'

type TalentsForgePanelProps = {
  morphus: boolean
  genreId: string
  isNightbane: boolean
  activeOcc: PalladiumOcc | undefined
  spellCap: number
  talentBudget: number
  talentCount: number
}

type TalentListEntry = {
  talent: PalladiumTalent
  ability: AbilityDef | undefined
  gate: ReturnType<typeof assessTalentSelectionGate>
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
  const [hideMorphusLockedElite, setHideMorphusLockedElite] = useState(true)
  const selectedIds = character.selectedAbilities ?? []

  const morphusForgeState = useMemo(
    () => resolveMorphusForgeState(character),
    [character.morphusForgeState, character.creationTraitForgeStubComplete],
  )

  const gateContext = useMemo((): TalentSelectionGateContext => {
    return {
      characterLevel: CREATION_CHARACTER_LEVEL,
      morphusTableIds: collectCharacterMorphusTableIds(
        morphusForgeState,
        character.morphusForgeSlotState,
      ),
      selectedTalentIds: selectedIds,
      activeOcc,
      spellCap,
    }
  }, [
    morphusForgeState,
    character.morphusForgeSlotState,
    selectedIds,
    activeOcc,
    spellCap,
  ])

  const catalogEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return listPalladiumTalentsForGameSystem(genreId)
      .map((talent) => {
        const ability = getAbilityById(talent.id)
        if (ability?.morphusOnly && !morphus) return null
        if (q) {
          const haystack = [
            talent.name,
            talent.description,
            talent.descriptionMorphus ?? '',
          ]
            .join(' ')
            .toLowerCase()
          if (!haystack.includes(q)) return null
        }
        return {
          talent,
          ability,
          gate: assessTalentSelectionGate(talent, gateContext),
        } satisfies TalentListEntry
      })
      .filter((row): row is TalentListEntry => row != null)
  }, [genreId, search, morphus, gateContext])

  const commonTalents = useMemo(
    () => catalogEntries.filter((row) => talentCatalogTier(row.talent) === 'common'),
    [catalogEntries],
  )

  const eliteTalents = useMemo(
    () => catalogEntries.filter((row) => talentCatalogTier(row.talent) === 'elite'),
    [catalogEntries],
  )

  const hiddenEliteCount = useMemo(() => {
    if (!hideMorphusLockedElite) return 0
    return eliteTalents.filter(
      (row) => row.gate.morphusTraitMismatch && !selectedIds.includes(row.talent.id),
    ).length
  }, [eliteTalents, hideMorphusLockedElite, selectedIds])

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

      <div className="grid gap-3 p-3 lg:grid-cols-2">
        <TalentColumn
          title="Common Talents"
          subtitle="Available to all Nightbane"
          tier="common"
          entries={commonTalents}
          morphus={morphus}
          isNightbane={isNightbane}
          activeOcc={activeOcc}
          spellCap={spellCap}
          selectedIds={selectedIds}
          talentCount={talentCount}
          talentBudget={talentBudget}
          drawerStyle={drawerStyle}
          descMorphus={descMorphus}
          descFacade={descFacade}
          onSelect={addSelectedAbility}
        />
        <TalentColumn
          title="Elite Talents"
          subtitle="Gated by Morphus traits"
          tier="elite"
          entries={eliteTalents}
          morphus={morphus}
          isNightbane={isNightbane}
          activeOcc={activeOcc}
          spellCap={spellCap}
          selectedIds={selectedIds}
          talentCount={talentCount}
          talentBudget={talentBudget}
          drawerStyle={drawerStyle}
          descMorphus={descMorphus}
          descFacade={descFacade}
          onSelect={addSelectedAbility}
          hideMorphusLocked={hideMorphusLockedElite}
          onHideMorphusLockedChange={setHideMorphusLockedElite}
          hiddenCount={hiddenEliteCount}
        />
      </div>
    </div>
  )
}

function TalentColumn({
  title,
  subtitle,
  tier,
  entries,
  morphus,
  isNightbane,
  activeOcc,
  spellCap,
  selectedIds,
  talentCount,
  talentBudget,
  drawerStyle,
  descMorphus,
  descFacade,
  onSelect,
  hideMorphusLocked,
  onHideMorphusLockedChange,
  hiddenCount,
}: {
  title: string
  subtitle: string
  tier: TalentCatalogTier
  entries: TalentListEntry[]
  morphus: boolean
  isNightbane: boolean
  activeOcc: PalladiumOcc | undefined
  spellCap: number
  selectedIds: readonly string[]
  talentCount: number
  talentBudget: number
  drawerStyle: string
  descMorphus: string
  descFacade: string
  onSelect: (id: string) => void
  hideMorphusLocked?: boolean
  onHideMorphusLockedChange?: (next: boolean) => void
  hiddenCount?: number
}) {
  const visibleEntries = useMemo(() => {
    if (tier !== 'elite' || !hideMorphusLocked) return entries
    return entries.filter(
      (row) =>
        selectedIds.includes(row.talent.id) ||
        !row.gate.morphusTraitMismatch,
    )
  }, [entries, tier, hideMorphusLocked, selectedIds])

  const sections = useMemo(
    () => groupEntriesByTalentLevelGate(visibleEntries),
    [visibleEntries],
  )

  return (
    <div className={`flex min-h-0 flex-col rounded-lg border ${drawerStyle}`}>
      <div
        className="border-b px-3 py-2"
        style={{ borderColor: morphus ? '#4c1d95' : '#e2e8f0' }}
      >
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs opacity-70">{subtitle}</p>
        {tier === 'elite' && onHideMorphusLockedChange ? (
          <div className="mt-2 flex flex-col gap-1">
            <label className="flex cursor-pointer items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={hideMorphusLocked}
                onChange={(e) => onHideMorphusLockedChange(e.target.checked)}
                className="mt-0.5 size-3.5 rounded border-slate-400"
              />
              <span>
                Hide Elite talents your Morphus cannot select
              </span>
            </label>
            {hideMorphusLocked && (hiddenCount ?? 0) > 0 ? (
              <span className="text-[11px] opacity-70">
                {visibleEntries.length} of {entries.length} shown · {hiddenCount}{' '}
                hidden
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <ul
        className="max-h-[min(480px,55vh)] space-y-2 overflow-y-auto p-3"
        aria-label={`${title} library`}
      >
        {visibleEntries.length === 0 ? (
          <li
            className={`rounded-md border p-4 text-sm ${
              morphus
                ? 'border-violet-900 text-violet-300'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            {entries.length === 0
              ? 'No talents match your search.'
              : hideMorphusLocked
                ? 'No Elite talents match your Morphus traits. Turn off the hide filter to browse locked options.'
                : 'No talents to display.'}
          </li>
        ) : null}
        {sections.flatMap((section) => {
          const nodes: ReactNode[] = []
          if (section.kind === 'level_gate') {
            nodes.push(
              <li key={`break-${section.level}`} role="presentation" className="list-none">
                <TalentListSectionBreak label={section.label} morphus={morphus} />
              </li>,
            )
          }
          for (const { talent, ability, gate } of section.entries) {
            nodes.push(
              <TalentRow
                key={talent.id}
                talent={talent}
                ability={ability}
                gate={gate}
                morphus={morphus}
                isNightbane={isNightbane}
                activeOcc={activeOcc}
                spellCap={spellCap}
                selectedIds={selectedIds}
                talentCount={talentCount}
                talentBudget={talentBudget}
                onSelect={() => onSelect(talent.id)}
                descMorphus={descMorphus}
                descFacade={descFacade}
              />,
            )
          }
          return nodes
        })}
      </ul>
    </div>
  )
}

function TalentListSectionBreak({
  label,
  morphus,
}: {
  label: string
  morphus: boolean
}) {
  return (
    <div
      className={`mb-2 mt-3 border-t pt-3 ${morphus ? 'border-violet-800' : 'border-slate-300'}`}
      role="separator"
      aria-label={label}
    >
      <p
        className={`text-center text-[11px] font-bold uppercase tracking-wide ${
          morphus ? 'text-violet-300' : 'text-slate-500'
        }`}
      >
        {label}
      </p>
    </div>
  )
}

function TalentRow({
  talent,
  ability,
  gate,
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
  talent: PalladiumTalent
  ability: AbilityDef | undefined
  gate: ReturnType<typeof assessTalentSelectionGate>
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
  const feature = getFeatureById(talent.id)
  const occGate =
    activeOcc && feature
      ? abilityPassesOccSupernaturalRules(activeOcc, feature, spellCap)
      : { allowed: true as const }

  const blocked = !occGate.allowed || gate.locked
  const already = selectedIds.includes(talent.id)
  const atCap = talentCount >= talentBudget
  const canSelect = !blocked && !already && !atCap && gate.selectable
  const lockedReason = !occGate.allowed
    ? `Locked: ${occGate.reason ?? 'O.C.C. restriction.'}`
    : gate.reason
      ? gate.reason
      : already
        ? 'Already selected.'
        : atCap
          ? 'Talent budget full.'
          : 'Select this talent'

  const ppeAcquire = formatTalentPpeAcquireCost(talent.ppe)
  const activationCost = formatTalentActivationCost(talent.ppe, talent.activation?.cost)
  const description =
    morphus && talent.descriptionMorphus
      ? talent.descriptionMorphus
      : talent.description
  const durationType =
    (ability?.durationType as 'instant' | 'melee' | 'narrative' | undefined) ??
    'narrative'

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
          <span className="font-semibold">{talent.name}</span>
          <span className="ml-2 text-xs opacity-60">
            Nightbane Talent · PPE
          </span>
          {talentMinimumLevelRequirement(talent) > CREATION_CHARACTER_LEVEL ? (
            <span
              className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                morphus
                  ? 'bg-amber-950 text-amber-200'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              Lvl {talentMinimumLevelRequirement(talent)}+
            </span>
          ) : null}
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
        {description}
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
            <span className="font-bold">P.P.E. cost:</span> {ppeAcquire ?? '—'}
          </div>
          <div>
            <span className="font-bold">Activation cost:</span>{' '}
            {activationCost ?? '—'}
          </div>
        </div>
      ) : null}
      {gate.reason && blocked ? (
        <p
          className={`mt-2 text-[11px] ${
            morphus ? 'text-rose-300/90' : 'text-rose-700'
          }`}
        >
          {gate.reason}
        </p>
      ) : null}
      <span
        className={`mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          morphus
            ? 'bg-violet-950 text-violet-300'
            : 'bg-slate-200 text-slate-700'
        }`}
      >
        {abilityDurationBadgeLabel(durationType)}
      </span>
    </li>
  )
}
