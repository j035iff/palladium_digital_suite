import type { ActiveForm, Character, MorphusCharacteristic } from '../types'
import { resolveMorphusCharacteristicsByIds } from '../data/library/morphusTableCatalogLoader'
import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import {
  calculateSkillPercent,
  type SkillEquationSkill,
} from './skillEquation'
import { sumFacadePpTraitPenaltiesForSkill } from './facadePpSkillTraitPenalties'
import { sumMorphusSkillPercentForCatalogSkill } from './morphusSkillModifierAggregation'

export type SkillPercentBreakdownLine = {
  label: string
  value: number
}

export type SkillPercentBreakdown = {
  equationPercent: number
  lines: readonly SkillPercentBreakdownLine[]
  total: number
}

/** Build resolution context from sheet state (Skill Engine, W.P. profiles, etc.). */
export function buildSkillPercentContext(
  character: Pick<
    Character,
    'level' | 'facade' | 'activeMorphusCharacteristicIds'
  >,
  activeForm: ActiveForm,
  iqBonus: number,
  maPbBonus = 0,
): SkillPercentResolutionContext {
  return {
    characterLevel: character.level,
    iqBonus,
    maPbBonus,
    activeForm,
    facadePp: character.facade.attributes.pp,
    activeMorphusCharacteristics: resolveMorphusCharacteristicsByIds(
      character.activeMorphusCharacteristicIds ?? [],
    ),
  }
}

export type SkillPercentResolutionContext = {
  characterLevel: number
  iqBonus: number
  maPbBonus?: number
  activeForm: ActiveForm
  /** Facade P.P. for optional low-dexterity / light-touch penalties. */
  facadePp: number
  activeMorphusCharacteristics?: readonly MorphusCharacteristic[]
  /** Apply optional low-P.P. trait penalties (default true). */
  applyFacadePpTraitPenalties?: boolean
}

function clampResolvedSkillPercent(n: number): number {
  if (n <= -50) return 0
  return Math.max(0, n)
}

function catalogForSkillId(skillId: string): PalladiumSkillCatalogEntry | undefined {
  return getPalladiumSkillCatalogEntryById(skillId)
}

/**
 * Master equation + facade P.P. trait penalties + Morphus skill modifiers.
 */
export function resolveSkillPercent(
  skill: SkillEquationSkill & { id: string },
  ctx: SkillPercentResolutionContext,
  catalogEntry?: Pick<
    PalladiumSkillCatalogEntry,
    'id' | 'categories' | 'skillTraits'
  >,
): SkillPercentBreakdown {
  const catalog = catalogEntry ?? catalogForSkillId(skill.id)
  const maPb = ctx.maPbBonus ?? 0
  const equationPercent = calculateSkillPercent(
    {
      ...skill,
      scaledAttBonuses: (skill.scaledAttBonuses ?? 0) + maPb,
    },
    ctx.characterLevel,
    ctx.iqBonus,
  )

  const lines: SkillPercentBreakdownLine[] = []
  const applyPp =
    ctx.applyFacadePpTraitPenalties !== false && catalog?.skillTraits?.length

  if (applyPp) {
    const ppPenalty = sumFacadePpTraitPenaltiesForSkill(
      catalog.skillTraits,
      ctx.facadePp,
    )
    if (ppPenalty !== 0) {
      lines.push({
        label:
          ppPenalty <= -50
            ? 'Facade P.P. (dexterity skills — impaired)'
            : 'Facade P.P. (dexterity / light touch)',
        value: ppPenalty,
      })
    }
  }

  if (
    ctx.activeForm === 'morphus' &&
    ctx.activeMorphusCharacteristics?.length &&
    catalog
  ) {
    const morphus = sumMorphusSkillPercentForCatalogSkill(
      catalog,
      ctx.activeMorphusCharacteristics,
    )
    if (morphus.global !== 0) {
      lines.push({ label: 'Morphus (all skills)', value: morphus.global })
    }
    if (morphus.specific !== 0) {
      lines.push({ label: 'Morphus (this skill)', value: morphus.specific })
    }
  }

  const modifierTotal = lines.reduce((s, l) => s + l.value, 0)
  return {
    equationPercent,
    lines,
    total: clampResolvedSkillPercent(equationPercent + modifierTotal),
  }
}
