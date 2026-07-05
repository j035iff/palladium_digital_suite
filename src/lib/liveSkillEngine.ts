import type {
  ActiveForm,
  Character,
  MorphusCharacteristic,
  MorphusSurfaceType,
} from '../types'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import { aggregateAllPassiveModifiers } from './featureEngine'
import {
  buildDisplayAttributesForLiveEngine,
  resolveLiveIqSkillBonus,
} from './liveStatEngine'
import { resolveActiveMorphusTraits } from './morphusPassiveBridge'
import type { SkillPercentAttributeScores } from './skillPercentAttributeModifiers'
import { maPbScaledBonuses, type SkillEquationSkill } from './skillEquation'
import {
  resolveSkillPercent,
  type SkillPercentBreakdown,
  type SkillPercentResolutionContext,
} from './skillPercentResolution'

export type { SkillPercentBreakdown, SkillPercentResolutionContext }

export type LiveSkillContext = SkillPercentResolutionContext & {
  iqBonus: number
  maPbBonus: number
  attributeScores: SkillPercentAttributeScores
}

export type LiveSkillRollTarget = {
  target: number
  base: number
  levelBonus: number
  iqBonus: number
}

function catalogForSkillId(skillId: string): PalladiumSkillCatalogEntry | undefined {
  return getPalladiumSkillCatalogEntryById(skillId)
}

/** Demo +5% per character level after 1st (quick-roll shortcut until full level tables wire). */
export function occSkillLevelBonusPercent(level: number): number {
  const lv = Math.max(1, Math.floor(level))
  return Math.max(0, lv - 1) * 5
}

const DEFAULT_SKILL_BASE = 28

/**
 * Unified live/creation skill % context: display I.Q. via stat engine,
 * M.A./P.B. scaling, Morphus traits, and catalog attribute modifiers.
 */
export function buildLiveSkillContext(
  character: Pick<
    Character,
    | 'level'
    | 'primary'
    | 'morphus'
    | 'activeMorphusCharacteristicIds'
    | 'morphusTraitSlotResolutions'
  >,
  activeForm: ActiveForm,
  opts?: { morphusSurfaceType?: MorphusSurfaceType },
): LiveSkillContext {
  const fullCharacter = character as Character
  const passive = aggregateAllPassiveModifiers(fullCharacter, activeForm)
  const displayAttrs = buildDisplayAttributesForLiveEngine(
    fullCharacter,
    activeForm,
    passive,
  )
  const iqBonus = resolveLiveIqSkillBonus(fullCharacter, activeForm)
  const maPbBonus = maPbScaledBonuses(displayAttrs.ma, displayAttrs.pb)
  const attributeScores: SkillPercentAttributeScores = {
    iq: displayAttrs.iq,
    me: displayAttrs.me,
    ma: displayAttrs.ma,
    ps: displayAttrs.ps.score,
    pp: displayAttrs.pp,
    pe: displayAttrs.pe,
    pb: displayAttrs.pb,
    spd: displayAttrs.spd,
  }

  return {
    characterLevel: character.level,
    iqBonus,
    maPbBonus,
    activeForm,
    primaryPp: character.primary.attributes.pp,
    morphusSurfaceType: opts?.morphusSurfaceType ?? 'hard_flat',
    activeMorphusCharacteristics: resolveActiveMorphusTraits(fullCharacter),
    attributeScores,
  }
}

/** Master equation + catalog attribute modifiers + Morphus skill modifiers. */
export function resolveLiveSkillPercent(
  skill: SkillEquationSkill & { id: string },
  character: Pick<
    Character,
    | 'level'
    | 'primary'
    | 'morphus'
    | 'activeMorphusCharacteristicIds'
    | 'morphusTraitSlotResolutions'
  >,
  activeForm: ActiveForm,
  catalogEntry?: PalladiumSkillCatalogEntry,
  opts?: { morphusSurfaceType?: MorphusSurfaceType },
): SkillPercentBreakdown {
  const ctx = buildLiveSkillContext(character, activeForm, opts)
  return resolveSkillPercent(
    skill,
    ctx,
    catalogEntry ?? catalogForSkillId(skill.id),
  )
}

/**
 * Quick d100 target (Pillar 3 — speed): stored base % + level stair + I.Q. via stat engine.
 * Sheet `basePercent` is the spawn-resolved total; level bonus is the demo +5%/level shortcut.
 */
export function resolveLiveSkillRollTarget(opts: {
  character: Character
  activeForm: ActiveForm
  skillBasePercent?: number
  characterLevel?: number
}): LiveSkillRollTarget {
  const level = opts.characterLevel ?? opts.character.level
  const base = Math.max(
    0,
    Math.round(opts.skillBasePercent ?? DEFAULT_SKILL_BASE),
  )
  const levelBonus = occSkillLevelBonusPercent(level)
  const iqBonus = resolveLiveIqSkillBonus(opts.character, opts.activeForm)
  const target = Math.min(98, Math.max(1, base + levelBonus + iqBonus))
  return { target, base, levelBonus, iqBonus }
}
