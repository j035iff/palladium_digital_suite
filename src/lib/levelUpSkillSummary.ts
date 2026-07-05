import type { ActiveForm, Character } from '../types'
import { resolveLiveSkillRollTarget } from './liveSkillEngine'

export type SkillImprovementRow = {
  id: string
  name: string
  before: number
  after: number
  delta: number
}

/**
 * Quick-roll skill targets before vs after a level bump (I.Q. via unified stat engine).
 */
export function summarizeSkillImprovementsForLevel(
  character: Character,
  fromLevel: number,
  toLevel: number,
  opts?: { maxRows?: number; form?: ActiveForm },
): SkillImprovementRow[] {
  const maxRows = opts?.maxRows ?? 5
  const activeForm = opts?.form ?? 'primary'
  const branch = character[activeForm]
  const rows: SkillImprovementRow[] = []

  for (const s of branch.skills) {
    if (s.restricted) continue
    if (s.basePercent == null) continue
    const before = resolveLiveSkillRollTarget({
      character,
      activeForm,
      skillBasePercent: s.basePercent,
      characterLevel: fromLevel,
    }).target
    const after = resolveLiveSkillRollTarget({
      character,
      activeForm,
      skillBasePercent: s.basePercent,
      characterLevel: toLevel,
    }).target
    const delta = after - before
    if (delta === 0) continue
    rows.push({ id: s.id, name: s.name, before, after, delta })
  }

  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return rows.slice(0, maxRows)
}
