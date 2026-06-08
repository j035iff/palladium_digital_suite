import type { CharacterAttributes } from '../types'

/**
 * Palladium / Nightbane attribute engine (production port from MegaverseCompanion-v0).
 * Exceptional bonuses begin at 17; 17–30 use table segments; 31+ uses algorithmic extensions.
 */

/** Minimum attribute score before exceptional bonuses apply (Palladium table). */
export const EXCEPTIONAL_ATTRIBUTE_MIN = 17

const MA_TRUST_TABLE: Record<number, number> = {
  16: 40, 17: 45, 18: 50, 19: 55, 20: 60, 21: 65, 22: 70, 23: 75,
  24: 80, 25: 84, 26: 88, 27: 92, 28: 94, 29: 96, 30: 97,
}

const PE_COMA_TABLE: Record<number, number> = {
  16: 4, 17: 5, 18: 6, 19: 8, 20: 10, 21: 12, 22: 14, 23: 16,
  24: 18, 25: 20, 26: 22, 27: 24, 28: 26, 29: 28, 30: 30,
}

const PB_CHARM_TABLE: Record<number, number> = {
  16: 30, 17: 35, 18: 40, 19: 45, 20: 50, 21: 55, 22: 60, 23: 65,
  24: 70, 25: 75, 26: 80, 27: 83, 28: 86, 29: 90, 30: 92,
}

function exceptionalTableScore(score: number): number {
  return Math.min(Math.max(score, EXCEPTIONAL_ATTRIBUTE_MIN), 30)
}

/** M.E.-style save/perception step bonus (17 → +1, 18/19 → +2, … capped at +8 through 30). */
export function meStyleStepBonus(score: number): number {
  if (score < EXCEPTIONAL_ATTRIBUTE_MIN) return 0
  return Math.min(8, Math.floor((exceptionalTableScore(score) - 14) / 2))
}

export type IqBonuses = {
  skillBonus: number
  perceptionBonus: number
  saveIllusion: number
  skillBonusStandard: number
  skillBonusSuper: number
  perceptionStandard: number
  perceptionSuper: number
}

export const getIqBonuses = (iq: number): IqBonuses => {
  let skillBonusStandard = 0
  let skillBonusSuper = 0

  if (iq >= EXCEPTIONAL_ATTRIBUTE_MIN && iq <= 30) {
    skillBonusStandard = iq - 14
  } else if (iq > 30) {
    skillBonusStandard = 30 - 14
    skillBonusSuper = Math.floor((iq - 30) / 5) * 2
  }

  const perceptionStandard = meStyleStepBonus(iq)
  const perceptionSuper = iq > 30 ? Math.floor((iq - 30) / 10) : 0
  const saveIllusion =
    iq > 30 ? Math.min(7, Math.floor((iq - 28) / 3)) : 0

  return {
    skillBonus: skillBonusStandard + skillBonusSuper,
    perceptionBonus: perceptionStandard + perceptionSuper,
    saveIllusion,
    skillBonusStandard,
    skillBonusSuper,
    perceptionStandard,
    perceptionSuper,
  }
}

export type MeBonuses = {
  savePsionics: number
  saveInsanity: number
  savePossession: number
  saveStandard: number
  savePossessionSuper: number
}

export const getMeBonuses = (me: number): MeBonuses => {
  const saveStandard = meStyleStepBonus(me)
  const savePossessionSuper = me > 30 ? Math.floor((me - 20) / 10) : 0

  return {
    savePsionics: saveStandard,
    saveInsanity: saveStandard,
    savePossession: savePossessionSuper,
    saveStandard,
    savePossessionSuper,
  }
}

export type MaBonuses = {
  trustIntimidate: number
  perceptionPenaltyToOthers: number
  specificSkillBonuses: Record<string, number>
  trustStandard: number
  trustSuper: number
}

export const getMaBonuses = (
  ma: number,
  useHomebrewAverageBonuses = false,
): MaBonuses => {
  let trustStandard = 0
  let trustSuper = 0
  let perceptionPenaltyToOthers = 0
  const specificSkillBonuses: Record<string, number> = {}

  if (ma >= 9 && ma <= 15 && useHomebrewAverageBonuses) {
    trustStandard = (ma - 8) * 5
  } else if (ma >= EXCEPTIONAL_ATTRIBUTE_MIN && ma <= 30) {
    trustStandard = MA_TRUST_TABLE[exceptionalTableScore(ma)] ?? 0
  } else if (ma > 30) {
    trustStandard = MA_TRUST_TABLE[30] ?? 97
    trustSuper = 0
    perceptionPenaltyToOthers = Math.floor((ma - 30) / 5)
    Object.assign(specificSkillBonuses, {
      findContraband: 5,
      gambling: 5,
      intelligence: 5,
      seduction: 5,
      undercoverOps: 5,
      interrogation: 10,
      performance: 10,
      publicSpeaking: 10,
      sing: 10,
    })
  }

  return {
    trustIntimidate: trustStandard + trustSuper,
    perceptionPenaltyToOthers,
    specificSkillBonuses,
    trustStandard,
    trustSuper,
  }
}

export type PsBonuses = {
  damageBonus: number
  throwRangeBonusFeet: number
  liftCarryBonusPercent: number
  throwRangeSuper: number
  liftCarrySuper: number
}

export const getPsBonuses = (ps: number): PsBonuses => {
  let damageBonus = 0
  let throwRangeSuper = 0
  let liftCarrySuper = 0

  if (ps >= EXCEPTIONAL_ATTRIBUTE_MIN) {
    damageBonus = ps - 15
  }
  if (ps > 30) {
    const intervalsOver30 = Math.floor((ps - 30) / 5)
    throwRangeSuper = intervalsOver30 * 30
    liftCarrySuper = intervalsOver30 * 30
  }

  return {
    damageBonus,
    throwRangeBonusFeet: throwRangeSuper,
    liftCarryBonusPercent: liftCarrySuper,
    throwRangeSuper,
    liftCarrySuper,
  }
}

export type PpBonuses = {
  strike: number
  parry: number
  dodge: number
  initiative: number
  combatStandard: number
  initiativeSuper: number
}

export const getPpBonuses = (pp: number): PpBonuses => {
  const combatStandard = meStyleStepBonus(pp)
  const initiativeSuper = pp > 30 ? Math.floor((pp - 28) / 3) : 0

  return {
    strike: combatStandard,
    parry: combatStandard,
    dodge: combatStandard,
    initiative: initiativeSuper,
    combatStandard,
    initiativeSuper,
  }
}

export type PeBonuses = {
  saveMagic: number
  savePoison: number
  comaDeathPercent: number
  halfFatigue: boolean
  imperviousDisease: boolean
  saveStandard: number
  comaDeathStandard: number
  comaDeathSuper: number
}

export const getPeBonuses = (pe: number): PeBonuses => {
  const saveStandard = meStyleStepBonus(pe)
  let comaDeathStandard = 0
  let comaDeathSuper = 0
  let halfFatigue = false
  let imperviousDisease = false

  if (pe >= EXCEPTIONAL_ATTRIBUTE_MIN && pe <= 30) {
    comaDeathStandard = PE_COMA_TABLE[exceptionalTableScore(pe)] ?? 0
  } else if (pe > 30) {
    comaDeathStandard = PE_COMA_TABLE[30] ?? 30
    comaDeathSuper = pe - 30
    halfFatigue = true
    imperviousDisease = true
  }

  if (pe === 30) {
    comaDeathStandard = PE_COMA_TABLE[30] ?? 30
    halfFatigue = true
    imperviousDisease = true
  }

  return {
    saveMagic: saveStandard,
    savePoison: saveStandard,
    comaDeathPercent: comaDeathStandard + comaDeathSuper,
    halfFatigue,
    imperviousDisease,
    saveStandard,
    comaDeathStandard,
    comaDeathSuper,
  }
}

export type PbBonuses = {
  charmImpress: number
  specificSkillBonuses: Record<string, number>
  charmStandard: number
  charmSuper: number
}

export const getPbBonuses = (
  pb: number,
  useHomebrewAverageBonuses = false,
): PbBonuses => {
  let charmStandard = 0
  let charmSuper = 0
  const specificSkillBonuses: Record<string, number> = {}

  if (pb >= 11 && pb <= 15 && useHomebrewAverageBonuses) {
    charmStandard = (pb - 10) * 5
  } else if (pb >= EXCEPTIONAL_ATTRIBUTE_MIN && pb <= 30) {
    charmStandard = PB_CHARM_TABLE[exceptionalTableScore(pb)] ?? 0
  } else if (pb > 30) {
    charmStandard = PB_CHARM_TABLE[30] ?? 92
    charmSuper = 0
    Object.assign(specificSkillBonuses, {
      cardsharp: 5,
      concealment: 5,
      palming: 5,
      pickPockets: 5,
      performance: 5,
      publicSpeaking: 5,
      seduction: 13,
      prowl: -10,
    })
  }

  return {
    charmImpress: charmStandard + charmSuper,
    specificSkillBonuses,
    charmStandard,
    charmSuper,
  }
}

/** True when any attribute exceeds 30 and has superhuman exceptional perks. */
export function hasSuperExceptionalAttributes(attrs: CharacterAttributes): boolean {
  const iq = getIqBonuses(attrs.iq)
  const me = getMeBonuses(attrs.me)
  const ma = getMaBonuses(attrs.ma)
  const ps = getPsBonuses(attrs.ps.score)
  const pp = getPpBonuses(attrs.pp)
  const pe = getPeBonuses(attrs.pe)
  const pb = getPbBonuses(attrs.pb)
  return (
    attrs.iq > 30 ||
    attrs.me > 30 ||
    attrs.ma > 30 ||
    attrs.ps.score > 30 ||
    attrs.pp > 30 ||
    attrs.pe > 30 ||
    attrs.pb > 30 ||
    iq.skillBonusSuper > 0 ||
    iq.perceptionSuper > 0 ||
    iq.saveIllusion > 0 ||
    me.savePossessionSuper > 0 ||
    ma.perceptionPenaltyToOthers > 0 ||
    Object.keys(ma.specificSkillBonuses).length > 0 ||
    ps.throwRangeSuper > 0 ||
    ps.liftCarrySuper > 0 ||
    pp.initiativeSuper > 0 ||
    pe.comaDeathSuper > 0 ||
    pe.halfFatigue ||
    pe.imperviousDisease ||
    Object.keys(pb.specificSkillBonuses).length > 0
  )
}
