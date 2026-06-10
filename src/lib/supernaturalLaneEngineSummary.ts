import type { SupernaturalAbilityForgeLane } from './forgeNavigation/supernaturalAbilitiesForge'
import type {
  OccCreationAbilityBudget,
  OccCreationDerived,
} from './occCreationDerivation'
import {
  psychicGateEngineSummaryLines,
  psychicGatePsionicRulesApply,
} from './psychicGatePsionicBudget'
import type { PsychicGateMajorAllocation, PsychicTier } from '../types'
import type { OccSupernaturalProgressionStep, PalladiumOcc } from '../types'

function sumRoadmapSelections(
  roadmap: readonly OccSupernaturalProgressionStep[] | undefined,
  maxLevel: number,
): number {
  if (!roadmap?.length) return 0
  return roadmap
    .filter((s) => s.level <= maxLevel)
    .reduce((sum, s) => sum + s.selectionsGained, 0)
}

/** O.C.C. engine copy for one supernatural forge lane (P.P.E./I.S.P., caps, categories, budget). */
export function buildSupernaturalLaneEngineLines(
  lane: SupernaturalAbilityForgeLane,
  occ: PalladiumOcc | undefined,
  derived: OccCreationDerived | null | undefined,
  selectionCount: number,
  effectiveBudget?: OccCreationAbilityBudget,
  psychicGateContext?: {
    tier: PsychicTier
    psychicGateBypassed?: boolean
    majorAllocation?: PsychicGateMajorAllocation | null
  },
): readonly string[] {
  if (!occ || !derived) return []

  const budget = effectiveBudget ?? derived.abilityBudget
  const lines: string[] = []

  if (lane === 'magic') {
    if (occ.ppeEngine) {
      lines.push(
        `P.P.E.: ${occ.ppeEngine.baseFormula} (+ ${occ.ppeEngine.perLevelFormula}/level)`,
      )
    }
    if (budget.spellSlots > 0) {
      lines.push(`Spell strength cap at 1st level: ${derived.startingSpellLevelCap}`)
      if (derived.spellRestrictions.length) {
        lines.push(`Spell categories: ${derived.spellRestrictions.join('; ')}`)
      }
      lines.push(
        `Selection budget: ${selectionCount}/${budget.spellSlots} spell${budget.spellSlots === 1 ? '' : 's'}`,
      )
    }
    return lines
  }

  if (lane === 'psionics') {
    const gateApplies =
      psychicGateContext &&
      psychicGatePsionicRulesApply(
        occ,
        psychicGateContext.tier,
        psychicGateContext.psychicGateBypassed === true,
      )

    if (gateApplies) {
      return psychicGateEngineSummaryLines(
        psychicGateContext.tier,
        psychicGateContext.majorAllocation,
        selectionCount,
      )
    }

    if (occ.ispEngine) {
      lines.push(
        `I.S.P.: ${occ.ispEngine.baseFormula} (+ ${occ.ispEngine.perLevelFormula}/level) · save class ${occ.ispEngine.savingThrowClass}`,
      )
    }
    if (budget.psionicSlots > 0) {
      if (derived.psionicRestrictions.length) {
        lines.push(`Psionic categories: ${derived.psionicRestrictions.join('; ')}`)
      }
      lines.push(
        `Selection budget: ${selectionCount}/${budget.psionicSlots} psionic power${budget.psionicSlots === 1 ? '' : 's'}`,
      )
    }
    return lines
  }

  if (budget.talentSlots > 0) {
    lines.push(
      `Selection budget: ${selectionCount}/${budget.talentSlots} talent${budget.talentSlots === 1 ? '' : 's'}`,
    )
  }
  for (const engine of occ.customAbilityEngines ?? []) {
    const n = sumRoadmapSelections(engine.progressionRoadmap, 1)
    if (n > 0) {
      lines.push(`${engine.label}: ${n} pick${n === 1 ? '' : 's'} at level 1`)
    }
  }
  return lines
}
