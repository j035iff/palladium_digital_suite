import type { SheetSkill } from '../types'

export type SkillListProps = {
  skills: SheetSkill[]
  morphusActive: boolean
}

/**
 * Pillar 8 — Radical Visibility (docs/vision.md): restricted options stay visible,
 * grayed out, with explicit rationale (gating per docs/skill_selection.md).
 */
export function SkillList({ skills, morphusActive }: SkillListProps) {
  const muted = morphusActive ? '#64748b' : '#94a3b8'
  const text = morphusActive ? '#e2e8f0' : '#0f172a'

  return (
    <ul className="space-y-2" role="list">
      {skills.map((skill) => (
        <li key={skill.id}>
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
            <div
              className="rounded-md border px-3 py-2 font-medium"
              style={{
                borderColor: morphusActive ? '#5b21b6' : '#93c5fd',
                backgroundColor: morphusActive ? '#312e81' : '#ffffff',
                color: text,
              }}
            >
              {skill.name}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
