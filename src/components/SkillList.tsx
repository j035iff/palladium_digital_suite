import { useEffect, useMemo, useRef, useState } from 'react'
import { useCharacter } from '../context/CharacterContext'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import {
  buildLiveSkillContext,
  resolveLiveSkillPercent,
  resolveLiveSkillRollTarget,
} from '../lib/liveSkillEngine'
import type { SheetSkill } from '../types'

export type SkillListProps = {
  skills: SheetSkill[]
  morphusActive: boolean
  characterLevel: number
}

/**
 * Pillar 8 — Radical Visibility (docs/vision.md): restricted options stay visible,
 * grayed out, with explicit rationale (gating per docs/skill_selection.md).
 * Quick Roll (vision.md — speed): d100 target = base + level bonus + I.Q. skill bonus.
 */
export function SkillList({
  skills,
  morphusActive,
  characterLevel,
}: SkillListProps) {
  const { character, activeForm, morphusSurfaceType } = useCharacter()
  const muted = morphusActive ? '#64748b' : '#94a3b8'
  const text = morphusActive ? '#e2e8f0' : '#0f172a'
  const [openSkillId, setOpenSkillId] = useState<string | null>(null)
  const rootRef = useRef<HTMLUListElement>(null)

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

  return (
    <ul ref={rootRef} className="space-y-2" role="list">
      {skills.map((skill) => {
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
        const roll =
          !skill.restricted && !morphusResolved?.impossibleInMorphus
            ? resolveLiveSkillRollTarget({
                character,
                activeForm,
                skillBasePercent: skill.basePercent,
                characterLevel,
              })
            : null
        const open = openSkillId === skill.id

        return (
          <li key={skill.id} className="relative">
            {skill.restricted ? (
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
            ) : (
              <>
                <button
                  type="button"
                  className="w-full rounded-md border px-3 py-2 text-left font-medium transition-[box-shadow,transform] duration-150 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    borderColor: morphusActive ? '#5b21b6' : '#93c5fd',
                    backgroundColor: morphusActive ? '#312e81' : '#ffffff',
                    color: text,
                    outlineColor: morphusActive ? '#c4b5fd' : '#2563eb',
                  }}
                  aria-expanded={open}
                  aria-controls={`${skill.id}-quickroll`}
                  onClick={() => setOpenSkillId((id) => (id === skill.id ? null : skill.id))}
                >
                  <span>{skill.name}</span>
                  {morphusResolved?.impossibleInMorphus ? (
                    <span
                      className="ml-2 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: morphusActive ? '#fca5a5' : '#b91c1c' }}
                    >
                      Impossible
                    </span>
                  ) : null}
                </button>
                {open && morphusResolved?.impossibleInMorphus ? (
                  <div
                    id={`${skill.id}-quickroll`}
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
                  </div>
                ) : null}
                {open && roll ? (
                  <div
                    id={`${skill.id}-quickroll`}
                    role="tooltip"
                    className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border-2 px-3 py-2 shadow-lg"
                    style={{
                      borderColor: morphusActive ? '#a78bfa' : '#3b82f6',
                      backgroundColor: morphusActive ? '#1e1b4b' : '#f8fafc',
                      color: morphusActive ? '#ede9fe' : '#0f172a',
                    }}
                  >
                    <p className="text-[10px] font-black uppercase tracking-wide opacity-90">
                      Quick roll (d100)
                    </p>
                    <p className="mt-1 font-mono text-lg font-black tabular-nums">
                      Roll ≤ {roll.target}%
                    </p>
                    <p className="mt-1 text-[11px] leading-snug opacity-90">
                      Base {roll.base}% + Level {roll.levelBonus}% + I.Q. {roll.iqBonus}%
                      {morphusResolved && !morphusResolved.impossibleInMorphus
                        ? ` → Morphus ${morphusResolved.total}%`
                        : ''}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}
