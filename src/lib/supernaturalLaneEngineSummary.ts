import type { SupernaturalAbilityForgeLane } from './forgeNavigation/supernaturalAbilitiesForge'
import { magicSchoolFilterLabel } from './magicSchoolLabels'
import { occMagicSchools } from './magicSchool'
import type {
  OccCreationAbilityBudget,
  OccCreationDerived,
} from './occCreationDerivation'
import {
  psychicGateEngineSummaryLines,
  psychicGatePsionicRulesApply,
} from './psychicGatePsionicBudget'
import {
  formatOccEnginePsionicRequirementLabel,
  occEnginePsionicRulesApply,
} from './occSupernaturalSelection'
import { occSupernaturalGrantedAbilityIds } from './occSupernaturalGrants'
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
  selectedIds?: readonly string[] | null,
  genreId?: string,
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
      const schools = occMagicSchools(occ)
      if (schools.length) {
        lines.push(
          `Magic schools: ${schools.map((s) => magicSchoolFilterLabel(undefined, s)).join(', ')}`,
        )
      }
      if (derived.spellRestrictions.length) {
        lines.push(`Spell level rules: ${derived.spellRestrictions.join('; ')}`)
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
      if (occEnginePsionicRulesApply(occ) && selectedIds) {
        lines.push(
          formatOccEnginePsionicRequirementLabel(
            occ,
            selectedIds,
            genreId ?? 'nightbane',
            occSupernaturalGrantedAbilityIds(occ, undefined),
          ),
        )
      } else {
        lines.push(
          `Selection budget: ${selectionCount}/${budget.psionicSlots} psionic power${budget.psionicSlots === 1 ? '' : 's'}`,
        )
      }
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
