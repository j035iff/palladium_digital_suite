import type { ActiveForm, Character, MorphusCharacteristic } from '../types'
import { resolveActiveMorphusTraits } from './morphusPassiveBridge'
import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import {
  calculateSkillPercent,
  type SkillEquationSkill,
} from './skillEquation'
import { sumMorphusSkillPercentForCatalogSkill } from './morphusSkillModifierAggregation'
import type { MorphusSurfaceType } from '../types'

export type SkillPercentBreakdownLine = {
  label: string
  value: number
}

export type SkillPercentBreakdown = {
  equationPercent: number
  lines: readonly SkillPercentBreakdownLine[]
  total: number
  /** Morphus characteristic marks this skill unusable in Morphus form. */
  impossibleInMorphus?: boolean
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
  morphusSurfaceType: MorphusSurfaceType = 'hard_flat',
): SkillPercentResolutionContext {
  return {
    characterLevel: character.level,
    iqBonus,
    maPbBonus,
    activeForm,
    facadePp: character.facade.attributes.pp,
    morphusSurfaceType,
    activeMorphusCharacteristics: resolveActiveMorphusTraits(character),
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
  /** Terrain surface for Morphus mobility-isolated skill rows (default hard_flat). */
  morphusSurfaceType?: MorphusSurfaceType
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

  if (
    ctx.activeForm === 'morphus' &&
    ctx.activeMorphusCharacteristics?.length &&
    catalog
  ) {
    const surface = ctx.morphusSurfaceType ?? 'hard_flat'
    const morphus = sumMorphusSkillPercentForCatalogSkill(
      catalog,
      ctx.activeMorphusCharacteristics,
      {
        characterLevel: ctx.characterLevel,
        surfaceType: surface,
      },
    )
    if (morphus.impossible) {
      return {
        equationPercent,
        lines: [{ label: 'Morphus', value: 0 }],
        total: 0,
        impossibleInMorphus: true,
      }
    }
    if (morphus.global !== 0) {
      lines.push({ label: 'Morphus (all skills)', value: morphus.global })
    }
    if (morphus.specific !== 0) {
      lines.push({ label: 'Morphus (this skill)', value: morphus.specific })
    }
    if (morphus.grantFloor != null) {
      lines.push({
        label: `Morphus grant floor (${morphus.grantFloor}% at level ${ctx.characterLevel})`,
        value: 0,
      })
    }
    return {
      equationPercent,
      lines,
      total: clampResolvedSkillPercent(equationPercent + morphus.total),
    }
  }

  const modifierTotal = lines.reduce((s, l) => s + l.value, 0)
  return {
    equationPercent,
    lines,
    total: clampResolvedSkillPercent(equationPercent + modifierTotal),
  }
}
