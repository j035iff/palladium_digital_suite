import { useEffect, useMemo, useRef, useState } from 'react'
import { useCharacter } from '../context/CharacterContext'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import {
  buildLiveSkillContext,
  buildLiveSkillPercentDetail,
  buildLiveSkillSections,
  resolveLiveSkillPercent,
  resolveLiveSkillRollTarget,
} from '../lib/liveSkillEngine'
import {
  formatPhysicalSkillBonusSummary,
  resolveSkillCatalogDescription,
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
 * Percentile skills: list shows % without select; tap → breakdown + book description.
 * Stats-only Physical training: no self % — show catalog bonus summary instead.
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
  const [openSkillId, setOpenSkillId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const sections = useMemo(() => buildLiveSkillSections(skills), [skills])

  const morphusSkillCtx = useMemo(
    () =>
      morphusActive
        ? buildLiveSkillContext(character, activeForm, {
            morphusSurfaceType,
          })
        : null,
    [morphusActive, character, activeForm, morphusSurfaceType],
  )

  useEffect(() => {
    if (!openSkillId) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpenSkillId(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [openSkillId])

  if (sections.length === 0) {
    return (
      <p className="text-sm" style={{ color: muted }}>
        No skills on this form.
      </p>
    )
  }

  return (
    <div ref={rootRef} className="space-y-4">
      {sections.map((section) => (
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
            {section.skills.map((skill) => {
              const catalog = getPalladiumSkillCatalogEntryById(skill.id)
              const morphusResolved =
                morphusActive && morphusSkillCtx && catalog
                  ? resolveLiveSkillPercent(
                      {
                        id: skill.id,
                        basePercent: skill.basePercent ?? catalog.basePercent ?? 0,
                        perLevel: catalog.percentPerLevel ?? 0,
                        acquisitionLevel: 1,
                        occBonus: 0,
                        synergyBonuses: 0,
                        scaledAttBonuses: 0,
                        statusModifiers: 0,
                      },
                      character,
                      activeForm,
                      catalog,
                      { morphusSurfaceType },
                    )
                  : null
              const rollTarget =
                !section.statsOnlyPhysical &&
                !skill.restricted &&
                !morphusResolved?.impossibleInMorphus
                  ? resolveLiveSkillRollTarget({
                      character,
                      activeForm,
                      skillBasePercent: skill.basePercent,
                      characterLevel,
                    })
                  : null
              const percentDetail =
                rollTarget != null
                  ? buildLiveSkillPercentDetail({
                      rollTarget,
                      morphusResolved,
                    })
                  : null
              return (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  statsOnlyPhysical={Boolean(section.statsOnlyPhysical)}
                  morphusActive={morphusActive}
                  muted={muted}
                  text={text}
                  open={openSkillId === skill.id}
                  onToggle={() =>
                    setOpenSkillId((id) => (id === skill.id ? null : skill.id))
                  }
                  morphusResolved={morphusResolved}
                  rollTarget={rollTarget}
                  percentDetail={percentDetail}
                  description={resolveSkillCatalogDescription(
                    catalog?.description,
                  )}
                />
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

function SkillRow({
  skill,
  statsOnlyPhysical,
  morphusActive,
  muted,
  text,
  open,
  onToggle,
  morphusResolved,
  rollTarget,
  percentDetail,
  description,
}: {
  skill: SheetSkill
  statsOnlyPhysical: boolean
  morphusActive: boolean
  muted: string
  text: string
  open: boolean
  onToggle: () => void
  morphusResolved: ReturnType<typeof resolveLiveSkillPercent> | null
  rollTarget: ReturnType<typeof resolveLiveSkillRollTarget> | null
  percentDetail: ReturnType<typeof buildLiveSkillPercentDetail> | null
  description: ReturnType<typeof resolveSkillCatalogDescription>
}) {
  const catalog = getPalladiumSkillCatalogEntryById(skill.id)
  const bonusSummary = statsOnlyPhysical
    ? formatPhysicalSkillBonusSummary(
        (catalog as { physicalSkillBonuses?: Record<string, unknown> } | undefined)
          ?.physicalSkillBonuses,
      )
    : null

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
          aria-label={`Restricted skill: ${skill.name}`}
          aria-describedby={`${skill.id}-why`}
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
            {skill.name}
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
            id={`${skill.id}-why`}
          >
            {skill.restrictionReason ??
              'Gated by the dependency engine (prerequisites, O.C.C. tags, or synergy rules).'}
          </p>
        </div>
      </li>
    )
  }

  const impossible = Boolean(morphusResolved?.impossibleInMorphus)
  const listPercent =
    !statsOnlyPhysical && !impossible ? percentDetail?.listPercent ?? null : null
  const detailPanelStyle = {
    borderColor: morphusActive ? '#a78bfa' : '#3b82f6',
    backgroundColor: morphusActive ? '#1e1b4b' : '#f8fafc',
    color: morphusActive ? '#ede9fe' : '#0f172a',
  } as const

  return (
    <li className="relative">
      <button
        type="button"
        className="flex w-full items-baseline justify-between gap-3 rounded-md border px-3 py-2 text-left font-medium transition-[box-shadow,transform] duration-150 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          borderColor: morphusActive ? '#5b21b6' : '#93c5fd',
          backgroundColor: morphusActive ? '#312e81' : '#ffffff',
          color: text,
          outlineColor: morphusActive ? '#c4b5fd' : '#2563eb',
        }}
        aria-expanded={open}
        aria-controls={`${skill.id}-detail`}
        onClick={onToggle}
      >
        <span className="min-w-0 flex-1">
          <span>{skill.name}</span>
          {impossible ? (
            <span
              className="ml-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: morphusActive ? '#fca5a5' : '#b91c1c' }}
            >
              Impossible
            </span>
          ) : null}
          {statsOnlyPhysical && bonusSummary && !open ? (
            <span
              className="mt-1 block text-xs font-normal leading-snug"
              style={{ color: muted }}
            >
              {bonusSummary}
            </span>
          ) : null}
        </span>
        {listPercent != null ? (
          <span
            className="shrink-0 font-mono text-base font-bold tabular-nums"
            style={{ color: morphusActive ? '#c4b5fd' : '#1d4ed8' }}
            aria-label={`${listPercent} percent`}
          >
            {listPercent}%
          </span>
        ) : null}
      </button>
      {open && impossible ? (
        <div
          id={`${skill.id}-detail`}
          role="tooltip"
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
          />
        </div>
      ) : null}
      {open && statsOnlyPhysical ? (
        <div
          id={`${skill.id}-detail`}
          role="tooltip"
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
      {open && rollTarget && percentDetail && !statsOnlyPhysical ? (
        <div
          id={`${skill.id}-detail`}
          role="tooltip"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(70vh,28rem)] overflow-y-auto rounded-md border-2 px-3 py-2 shadow-lg"
          style={detailPanelStyle}
        >
          <p className="text-[10px] font-black uppercase tracking-wide opacity-90">
            Skill %
          </p>
          <p className="mt-1 font-mono text-lg font-black tabular-nums">
            {percentDetail.listPercent}%
            <span className="ml-2 text-xs font-semibold uppercase tracking-wide opacity-80">
              Roll ≤ {rollTarget.target}%
            </span>
          </p>
          <p className="mt-2 text-[10px] font-black uppercase tracking-wide opacity-90">
            Where it comes from
          </p>
          <ul className="mt-1 space-y-0.5 text-[11px] leading-snug">
            {percentDetail.breakdownLines.map((line) => (
              <li
                key={`${line.label}-${line.value}`}
                className="flex justify-between gap-3 font-mono tabular-nums"
              >
                <span className="min-w-0 truncate font-sans opacity-90">
                  {line.label}
                </span>
                <span>
                  {line.value > 0 ? '+' : ''}
                  {line.value}%
                </span>
              </li>
            ))}
          </ul>
          {percentDetail.morphusTotal != null &&
          percentDetail.morphusTotal !== rollTarget.target ? (
            <p className="mt-1 text-[11px] leading-snug opacity-90">
              Morphus total {percentDetail.morphusTotal}%
            </p>
          ) : null}
          <SkillDescriptionBlock
            description={description}
            morphusActive={morphusActive}
          />
        </div>
      ) : null}
    </li>
  )
}

function SkillDescriptionBlock({
  description,
  morphusActive,
}: {
  description: ReturnType<typeof resolveSkillCatalogDescription>
  morphusActive: boolean
}) {
  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: morphusActive ? '#4c1d95' : '#cbd5e1' }}>
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
