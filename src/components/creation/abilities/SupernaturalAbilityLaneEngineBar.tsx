import { buildSupernaturalLaneEngineLines } from '../../../lib/supernaturalLaneEngineSummary'
import {
  SUPERNATURAL_ABILITY_LANE_LABELS,
  type SupernaturalAbilityForgeLane,
} from '../../../lib/forgeNavigation/supernaturalAbilitiesForge'
import type {
  OccCreationAbilityBudget,
  OccCreationDerived,
} from '../../../lib/occCreationDerivation'
import type { PsychicGateMajorAllocation, PsychicTier } from '../../../types'
import type { PalladiumOcc } from '../../../types'

type SupernaturalAbilityLaneEngineBarProps = {
  lane: SupernaturalAbilityForgeLane
  morphus: boolean
  occ: PalladiumOcc | undefined
  derived: OccCreationDerived | null | undefined
  selectionCount: number
  effectiveBudget?: OccCreationAbilityBudget
  psychicGateContext?: {
    tier: PsychicTier
    psychicGateBypassed?: boolean
    majorAllocation?: PsychicGateMajorAllocation | null
  }
}

export function SupernaturalAbilityLaneEngineBar({
  lane,
  morphus,
  occ,
  derived,
  selectionCount,
  effectiveBudget,
  psychicGateContext,
}: SupernaturalAbilityLaneEngineBarProps) {
  const lines = buildSupernaturalLaneEngineLines(
    lane,
    occ,
    derived,
    selectionCount,
    effectiveBudget,
    psychicGateContext,
  )
  if (lines.length === 0) return null

  return (
    <div
      className={`mb-4 rounded-lg border px-3 py-2 font-mono text-[10px] leading-relaxed ${
        morphus
          ? 'border-violet-800 bg-slate-900/50 text-violet-200'
          : 'border-slate-200 bg-white text-slate-600'
      }`}
      aria-label={`${SUPERNATURAL_ABILITY_LANE_LABELS[lane]} O.C.C. engine`}
    >
      <p className="mb-1 font-bold uppercase tracking-wide opacity-80">
        O.C.C. supernatural engine
      </p>
      <ul className="list-inside list-disc space-y-0.5">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
