import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useCharacter } from '../context/CharacterContext'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { getSkillById } from '../data/skillLibrary'
import {
  buildLiveSkillPercentDetail,
  buildLiveSkillSections,
  collectLiveOwnedSkillIds,
  filterLiveSkillSections,
  isWeaponProficiencySheetSkill,
  listLiveSkillFilterCategoryOptions,
  LIVE_SKILL_FILTER_ALL_CATEGORIES,
  resolveSheetSkillCatalogId,
  type LiveSkillPercentBreakdownLine,
} from '../lib/liveSkillEngine'
import { similarSkillGroupPlayerNote } from '../lib/skillGlobalRules'
import { clampOverlayTooltipPosition } from '../lib/overlayTooltipPosition'
import {
  formatPhysicalSkillBonusSummary,
  resolveSkillCatalogDescription,
  resolveSkillCatalogDisplayDetails,
} from '../lib/skillDisplayDetails'
import type { SheetSkill } from '../types'

export type SkillListProps = {
  skills: SheetSkill[]
  morphusActive: boolean
  characterLevel: number
}

/**
 * Pillar 8 — Radical Visibility (docs/vision.md): restricted options stay visible,
 * grayed out, with explicit rationale (gating per docs/skill_selection.md).
 * Percentile skills: list shows %; hover % → source breakdown tooltip; click → description.
 * Sub-% tracks expand to `Parent (Sub)` rows; dual-nature physical parents also
 * appear in bottom Physical with bonus summary.
 * Stats-only Physical / W.P.: no self % — bonus summary instead.
 * Category dropdown + name search (AND when both set).
 */
export function SkillList({
  skills,
  morphusActive,
  characterLevel,
}: SkillListProps) {
  const { character, activeForm, morphusSurfaceType } = useCharacter()
  const muted = morphusActive ? '#64748b' : '#94a3b8'
  const text = morphusActive ? '#e2e8f0' : '#0f172a'
  const heading = morphusActive ? '#c4b5fd' : '#1e40af'
  const [openRowId, setOpenRowId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState(
    LIVE_SKILL_FILTER_ALL_CATEGORIES,
  )
  const [nameQuery, setNameQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const allSections = useMemo(() => buildLiveSkillSections(skills), [skills])
  const categoryOptions = useMemo(
    () => listLiveSkillFilterCategoryOptions(allSections),
    [allSections],
  )
  const sections = useMemo(
    () =>
      filterLiveSkillSections(allSections, {
        category: categoryFilter,
        nameQuery,
      }),
    [allSections, categoryFilter, nameQuery],
  )

  useEffect(() => {
    if (!openRowId) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpenRowId(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [openRowId])

  useEffect(() => {
    if (
      categoryFilter !== LIVE_SKILL_FILTER_ALL_CATEGORIES &&
      !categoryOptions.some((o) => o.value === categoryFilter)
    ) {
      setCategoryFilter(LIVE_SKILL_FILTER_ALL_CATEGORIES)
    }
  }, [categoryFilter, categoryOptions])

  const fieldClass = morphusActive
    ? 'rounded-md border border-violet-700 bg-slate-950/80 px-2 py-1.5 text-sm text-violet-50 outline-none focus-visible:ring-2 focus-visible:ring-violet-400'
    : 'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
  const labelClass = morphusActive
    ? 'text-[10px] font-bold uppercase tracking-wide text-violet-300'
    : 'text-[10px] font-bold uppercase tracking-wide text-slate-600'

  if (allSections.length === 0) {
    return (
      <p className="text-sm" style={{ color: muted }}>
        No skills on this form.
      </p>
    )
  }

  return (
    <div ref={rootRef} className="space-y-4">
      <div
        className="grid gap-2 sm:grid-cols-2"
        role="search"
        aria-label="Filter skills"
      >
        <label className="flex min-w-0 flex-col gap-1">
          <span className={labelClass}>Category</span>
          <select
            className={fieldClass}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by skill category"
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className={labelClass}>Search</span>
          <input
            type="search"
            className={fieldClass}
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Skill name"
            aria-label="Search skills by name"
          />
        </label>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm" style={{ color: muted }}>
          No skills match these filters.
        </p>
      ) : (
        sections.map((section) => (
          <section
            key={section.id}
            aria-labelledby={`skill-cat-${section.id}`}
            className="space-y-2"
          >
            <h3
              id={`skill-cat-${section.id}`}
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: heading }}
            >
              {section.label}
            </h3>
            <ul className="space-y-2" role="list">
              {section.rows.map((row) => {
                const { skill, displayName, subPercentTrack } = row
                const catalogId = resolveSheetSkillCatalogId(skill)
                const catalog = getPalladiumSkillCatalogEntryById(catalogId)
                const weaponProficiency = isWeaponProficiencySheetSkill(skill)
                const def = getSkillById(catalogId)
                const weaponBonusSummary =
                  weaponProficiency && def
                    ? resolveSkillCatalogDisplayDetails(def, characterLevel)
                        .weaponBonusSummary
                    : null
                const percentDetail =
                  !section.statsOnlyPhysical &&
                  !weaponProficiency &&
                  !skill.restricted
                    ? buildLiveSkillPercentDetail({
                        character,
                        activeForm,
                        skill,
                        ownedSkills: skills,
                        characterLevel,
                        morphusSurfaceType,
                        subPercentTrack,
                      })
                    : null
                const descriptionSource =
                  subPercentTrack?.description ?? catalog?.description
                const overlapNote =
                  percentDetail?.overlapNote ??
                  (section.statsOnlyPhysical
                    ? similarSkillGroupPlayerNote(catalogId, [
                        ...collectLiveOwnedSkillIds(character, skills),
                      ])
                    : null)
                return (
                  <SkillRow
                    key={row.rowId}
                    rowId={row.rowId}
                    skill={skill}
                    displayName={displayName}
                    statsOnlyPhysical={Boolean(section.statsOnlyPhysical)}
                    weaponProficiency={weaponProficiency}
                    weaponBonusSummary={weaponBonusSummary}
                    morphusActive={morphusActive}
                    muted={muted}
                    text={text}
                    open={openRowId === row.rowId}
                    onToggle={() =>
                      setOpenRowId((id) =>
                        id === row.rowId ? null : row.rowId,
                      )
                    }
                    percentDetail={percentDetail}
                    overlapNote={overlapNote}
                    description={resolveSkillCatalogDescription(
                      descriptionSource,
                    )}
                  />
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

function SkillRow({
  rowId,
  skill,
  displayName,
  statsOnlyPhysical,
  weaponProficiency,
  weaponBonusSummary,
  morphusActive,
  muted,
  text,
  open,
  onToggle,
  percentDetail,
  overlapNote,
  description,
}: {
  rowId: string
  skill: SheetSkill
  displayName: string
  statsOnlyPhysical: boolean
  weaponProficiency: boolean
  weaponBonusSummary: string | null
  morphusActive: boolean
  muted: string
  text: string
  open: boolean
  onToggle: () => void
  percentDetail: ReturnType<typeof buildLiveSkillPercentDetail> | null
  overlapNote: string | null
  description: ReturnType<typeof resolveSkillCatalogDescription>
}) {
  const catalog = getPalladiumSkillCatalogEntryById(
    resolveSheetSkillCatalogId(skill),
  )
  const bonusSummary = statsOnlyPhysical
    ? formatPhysicalSkillBonusSummary(
        (catalog as { physicalSkillBonuses?: Record<string, unknown> } | undefined)
          ?.physicalSkillBonuses,
      )
    : null
  const closedSummary = statsOnlyPhysical
    ? bonusSummary
    : weaponProficiency
      ? weaponBonusSummary
      : null
  const nonPercentile = statsOnlyPhysical || weaponProficiency
  const detailId = `${rowId}-detail`

  if (skill.restricted) {
    return (
      <li className="relative">
        <div
          className="flex flex-col rounded-md border border-dashed px-3 py-2"
          style={{
            borderColor: morphusActive ? '#475569' : '#cbd5e1',
            backgroundColor: morphusActive
              ? 'rgba(15,23,42,0.6)'
              : 'rgba(241,245,249,0.9)',
            color: muted,
          }}
          role="group"
          aria-label={`Restricted skill: ${displayName}`}
          aria-describedby={`${rowId}-why`}
          title={
            skill.restrictionReason
              ? `${skill.restrictionReason} (skill_selection.md: AND/OR gates, O.C.C. tags, secondary rules.)`
              : 'Gated by AND/OR prerequisites, O.C.C.-only tags, or No Secondary rules (skill_selection.md).'
          }
        >
          <span
            className="line-through opacity-80"
            style={{ color: muted }}
            aria-disabled="true"
          >
            {displayName}
          </span>
          <span
            className="mt-1 text-xs font-semibold uppercase tracking-wide"
            style={{ color: morphusActive ? '#fcd34d' : '#b45309' }}
          >
            Restricted
          </span>
          <p
            className="mt-1 text-xs leading-snug"
            style={{ color: morphusActive ? '#94a3b8' : '#64748b' }}
            id={`${rowId}-why`}
          >
            {skill.restrictionReason ??
              'Gated by the dependency engine (prerequisites, O.C.C. tags, or synergy rules).'}
          </p>
        </div>
      </li>
    )
  }

  const impossible = Boolean(percentDetail?.impossibleInMorphus)
  const listPercent =
    !nonPercentile && !impossible ? percentDetail?.listPercent ?? null : null
  const detailPanelStyle = {
    borderColor: morphusActive ? '#a78bfa' : '#3b82f6',
    backgroundColor: morphusActive ? '#1e1b4b' : '#f8fafc',
    color: morphusActive ? '#ede9fe' : '#0f172a',
  } as const

  return (
    <li className="relative">
      <div
        className="flex w-full items-stretch gap-0 rounded-md border transition-[box-shadow,transform] duration-150"
        style={{
          borderColor: morphusActive ? '#5b21b6' : '#93c5fd',
          backgroundColor: morphusActive ? '#312e81' : '#ffffff',
          color: text,
        }}
      >
        <button
          type="button"
          className="min-w-0 flex-1 rounded-l-md px-3 py-2 text-left font-medium hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: morphusActive ? '#c4b5fd' : '#2563eb' }}
          aria-expanded={open}
          aria-controls={detailId}
          onClick={onToggle}
        >
          <span>{displayName}</span>
          {overlapNote ? (
            <span
              className="mt-1 block text-xs font-normal leading-snug"
              style={{ color: muted }}
            >
              {overlapNote}
            </span>
          ) : null}
          {impossible ? (
            <span
              className="ml-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: morphusActive ? '#fca5a5' : '#b91c1c' }}
            >
              Impossible
            </span>
          ) : null}
          {closedSummary && !open ? (
            <span
              className="mt-1 block text-xs font-normal leading-snug"
              style={{ color: muted }}
            >
              {closedSummary}
            </span>
          ) : null}
        </button>
        {listPercent != null && percentDetail ? (
          <SkillPercentHover
            skillId={rowId}
            listPercent={listPercent}
            listPercentTone={percentDetail.listPercentTone}
            breakdownLines={percentDetail.breakdownLines}
            tooltipEquation={percentDetail.tooltipEquation}
            morphusActive={morphusActive}
          />
        ) : null}
      </div>
      {open && impossible ? (
        <div
          id={detailId}
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border-2 px-3 py-2 shadow-lg"
          style={{
            borderColor: morphusActive ? '#f87171' : '#dc2626',
            backgroundColor: morphusActive ? '#450a0a' : '#fef2f2',
            color: morphusActive ? '#fecaca' : '#7f1d1d',
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-wide opacity-90">
            Morphus
          </p>
          <p className="mt-1 font-mono text-lg font-black">Impossible</p>
          <p className="mt-1 text-[11px] leading-snug opacity-90">
            This skill cannot be used in Morphus form.
          </p>
          <SkillDescriptionBlock
            description={description}
            morphusActive={morphusActive}
            bordered={false}
          />
        </div>
      ) : null}
      {open && statsOnlyPhysical ? (
        <div
          id={detailId}
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border-2 px-3 py-2 shadow-lg"
          style={detailPanelStyle}
        >
          <p className="text-[10px] font-black uppercase tracking-wide opacity-90">
            Physical bonuses
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug">
            {bonusSummary ?? 'Attribute / S.D.C. training (no skill %).'}
          </p>
          <p className="mt-1 text-[11px] leading-snug opacity-90">
            No d100 roll — bonuses apply to attributes and combat stats.
          </p>
          <SkillDescriptionBlock
            description={description}
            morphusActive={morphusActive}
          />
        </div>
      ) : null}
      {open && weaponProficiency ? (
        <div
          id={detailId}
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border-2 px-3 py-2 shadow-lg"
          style={detailPanelStyle}
        >
          <p className="text-[10px] font-black uppercase tracking-wide opacity-90">
            Weapon proficiency
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug">
            {weaponBonusSummary ?? 'Combat bonuses by level (no skill %).'}
          </p>
          <p className="mt-1 text-[11px] leading-snug opacity-90">
            No d100 roll — W.P.s grant strike/parry (and related) bonuses.
          </p>
          <SkillDescriptionBlock
            description={description}
            morphusActive={morphusActive}
          />
        </div>
      ) : null}
      {open && !nonPercentile && !impossible ? (
        <div
          id={detailId}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(70vh,28rem)] overflow-y-auto rounded-md border-2 px-3 py-2 shadow-lg"
          style={detailPanelStyle}
        >
          <SkillDescriptionBlock
            description={description}
            morphusActive={morphusActive}
            bordered={false}
          />
        </div>
      ) : null}
    </li>
  )
}

/**
 * Hover/focus on the list % — Bonuses-overlay style fixed tooltip
 * (`clampOverlayTooltipPosition`) with bracketed source equation.
 */
function portionToneClass(
  tone: LiveSkillPercentBreakdownLine['tone'],
  morphusActive: boolean,
): string {
  if (tone === 'bonus') {
    return morphusActive ? 'text-emerald-300' : 'text-emerald-700'
  }
  if (tone === 'penalty') {
    return morphusActive ? 'text-rose-300' : 'text-rose-600'
  }
  return morphusActive ? 'text-violet-50' : 'text-slate-900'
}

function listPercentColorClass(
  tone: 'default' | 'bonus' | 'penalty',
  morphusActive: boolean,
): string {
  if (tone === 'bonus') {
    return morphusActive ? 'text-emerald-300' : 'text-emerald-700'
  }
  if (tone === 'penalty') {
    return morphusActive ? 'text-rose-300' : 'text-rose-600'
  }
  // Joe default: blue
  return morphusActive ? 'text-sky-300' : 'text-blue-700'
}

function SkillPercentHover({
  skillId,
  listPercent,
  listPercentTone,
  breakdownLines,
  tooltipEquation,
  morphusActive,
}: {
  skillId: string
  listPercent: number
  listPercentTone: 'default' | 'bonus' | 'penalty'
  breakdownLines: readonly LiveSkillPercentBreakdownLine[]
  tooltipEquation: string
  morphusActive: boolean
}) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [tipOpen, setTipOpen] = useState(false)
  const [pos, setPos] = useState<{
    top: number
    left: number
    maxWidth: number
  } | null>(null)

  useLayoutEffect(() => {
    if (!tipOpen) return
    const anchorEl = anchorRef.current
    const tipEl = tipRef.current
    if (!anchorEl || !tipEl) return

    const place = () => {
      const dialog = anchorEl.closest('[role="dialog"]')
      const bounds = dialog?.getBoundingClientRect() ?? null
      const tipRect = tipEl.getBoundingClientRect()
      const next = clampOverlayTooltipPosition(
        anchorEl.getBoundingClientRect(),
        { width: tipRect.width || 352, height: tipRect.height || 48 },
        bounds,
      )
      setPos({ top: next.top, left: next.left, maxWidth: next.maxWidth })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [tipOpen, tooltipEquation])

  return (
    <>
      <span
        ref={anchorRef}
        className={`flex shrink-0 items-center rounded-r-md px-3 py-2 font-mono text-base font-bold tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${listPercentColorClass(listPercentTone, morphusActive)}`}
        style={{
          outlineColor: morphusActive ? '#c4b5fd' : '#2563eb',
        }}
        tabIndex={0}
        aria-label={`${listPercent} percent. ${tooltipEquation}`}
        onMouseEnter={() => setTipOpen(true)}
        onMouseLeave={() => setTipOpen(false)}
        onFocus={() => setTipOpen(true)}
        onBlur={() => setTipOpen(false)}
      >
        {listPercent}%
      </span>
      {tipOpen ? (
        <div
          ref={tipRef}
          id={`${skillId}-percent-tip`}
          role="tooltip"
          className={`pointer-events-none fixed z-[60] max-h-48 overflow-y-auto rounded-md border-2 px-2 py-2 font-mono text-[10px] font-semibold leading-snug shadow-lg ${
            morphusActive
              ? 'border-indigo-600/90 bg-black/95'
              : 'border-slate-400 bg-white'
          }`}
          style={{
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            maxWidth: pos?.maxWidth ?? 352,
            visibility: pos ? 'visible' : 'hidden',
          }}
        >
          {breakdownLines.map((line, index) => (
            <span key={`${line.group}-${line.label}-${index}`}>
              {index > 0 ? (
                <span
                  className={
                    morphusActive ? 'text-violet-200/80' : 'text-slate-500'
                  }
                >
                  {' + '}
                </span>
              ) : null}
              <span className={portionToneClass(line.tone, morphusActive)}>
                [{line.label}: {line.value}]
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </>
  )
}

function SkillDescriptionBlock({
  description,
  morphusActive,
  bordered = true,
}: {
  description: ReturnType<typeof resolveSkillCatalogDescription>
  morphusActive: boolean
  bordered?: boolean
}) {
  return (
    <div
      className={bordered ? 'mt-2 border-t pt-2' : undefined}
      style={
        bordered
          ? { borderColor: morphusActive ? '#4c1d95' : '#cbd5e1' }
          : undefined
      }
    >
      <p className="text-[10px] font-black uppercase tracking-wide opacity-90">
        Description
      </p>
      <p
        className={`mt-1 text-[11px] leading-snug ${
          description.isPlaceholder ? 'italic opacity-80' : 'opacity-90'
        }`}
      >
        {description.text}
      </p>
    </div>
  )
}
