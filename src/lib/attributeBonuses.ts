/**
 * Palladium / Nightbane attribute engine (production port from MegaverseCompanion-v0).
 * Bonuses from 16–30 use table segments; 31+ uses algorithmic extensions.
 */

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

export type IqBonuses = {
  skillBonus: number
  perceptionBonus: number
  saveIllusion: number
}

export const getIqBonuses = (iq: number): IqBonuses => {
  let skillBonus = 0
  let perceptionBonus = 0
  let saveIllusion = 0

  if (iq >= 16 && iq <= 30) {
    skillBonus = iq - 14
  } else if (iq > 30) {
    skillBonus = 16 + Math.floor((iq - 30) / 5) * 2
  }

  if (iq >= 16) {
    perceptionBonus += Math.min(8, Math.floor((iq - 14) / 2))
  }
  if (iq > 30) {
    perceptionBonus += Math.floor((iq - 30) / 10)
    saveIllusion = Math.min(7, Math.floor((iq - 28) / 3))
  }

  return { skillBonus, perceptionBonus, saveIllusion }
}

export type MeBonuses = {
  savePsionics: number
  saveInsanity: number
  savePossession: number
}

export const getMeBonuses = (me: number): MeBonuses => {
  let savePsionics = 0
  let saveInsanity = 0
  let savePossession = 0

  if (me >= 16) {
    const baseSave = Math.min(8, Math.floor((me - 14) / 2))
    savePsionics = baseSave
    saveInsanity = baseSave
  }
  if (me >= 30) {
    savePossession = Math.floor((me - 20) / 10)
  }

  return { savePsionics, saveInsanity, savePossession }
}

export type MaBonuses = {
  trustIntimidate: number
  perceptionPenaltyToOthers: number
  specificSkillBonuses: Record<string, number>
}

export const getMaBonuses = (
  ma: number,
  useHomebrewAverageBonuses = false,
): MaBonuses => {
  let trustIntimidate = 0
  let perceptionPenaltyToOthers = 0
  const specificSkillBonuses: Record<string, number> = {}

  if (ma >= 9 && ma <= 15 && useHomebrewAverageBonuses) {
    trustIntimidate = (ma - 8) * 5
  } else if (ma >= 16 && ma <= 30) {
    trustIntimidate = MA_TRUST_TABLE[ma] ?? 0
  } else if (ma > 30) {
    trustIntimidate = 97
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

  return { trustIntimidate, perceptionPenaltyToOthers, specificSkillBonuses }
}

export type PsBonuses = {
  damageBonus: number
  throwRangeBonusFeet: number
  liftCarryBonusPercent: number
}

export const getPsBonuses = (ps: number): PsBonuses => {
  let damageBonus = 0
  let throwRangeBonusFeet = 0
  let liftCarryBonusPercent = 0

  if (ps >= 16) {
    damageBonus = ps - 15
  }
  if (ps > 30) {
    const intervalsOver30 = Math.floor((ps - 30) / 5)
    throwRangeBonusFeet = intervalsOver30 * 30
    liftCarryBonusPercent = intervalsOver30 * 30
  }

  return { damageBonus, throwRangeBonusFeet, liftCarryBonusPercent }
}

export type PpBonuses = {
  strike: number
  parry: number
  dodge: number
  initiative: number
}

export const getPpBonuses = (pp: number): PpBonuses => {
  let strike = 0
  let parry = 0
  let dodge = 0
  let initiative = 0

  if (pp >= 16) {
    const baseCombatBonus = Math.min(8, Math.floor((pp - 14) / 2))
    strike = baseCombatBonus
    parry = baseCombatBonus
    dodge = baseCombatBonus
  }
  if (pp > 30) {
    initiative = Math.floor((pp - 28) / 3)
  }

  return { strike, parry, dodge, initiative }
}

export type PeBonuses = {
  saveMagic: number
  savePoison: number
  comaDeathPercent: number
  halfFatigue: boolean
  imperviousDisease: boolean
}

export const getPeBonuses = (pe: number): PeBonuses => {
  let saveMagic = 0
  let savePoison = 0
  let comaDeathPercent = 0
  let halfFatigue = false
  let imperviousDisease = false

  if (pe >= 16) {
    const baseSave = Math.min(8, Math.floor((pe - 14) / 2))
    saveMagic = baseSave
    savePoison = baseSave
  }

  if (pe >= 16 && pe <= 30) {
    comaDeathPercent = PE_COMA_TABLE[pe] ?? 0
  } else if (pe > 30) {
    comaDeathPercent = pe
    halfFatigue = true
    imperviousDisease = true
  }

  if (pe === 30) {
    halfFatigue = true
    imperviousDisease = true
  }

  return { saveMagic, savePoison, comaDeathPercent, halfFatigue, imperviousDisease }
}

export type PbBonuses = {
  charmImpress: number
  specificSkillBonuses: Record<string, number>
}

export const getPbBonuses = (
  pb: number,
  useHomebrewAverageBonuses = false,
): PbBonuses => {
  let charmImpress = 0
  const specificSkillBonuses: Record<string, number> = {}

  if (pb >= 11 && pb <= 15 && useHomebrewAverageBonuses) {
    charmImpress = (pb - 10) * 5
  } else if (pb >= 16 && pb <= 30) {
    charmImpress = PB_CHARM_TABLE[pb] ?? 0
  } else if (pb > 30) {
    charmImpress = 92
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

  return { charmImpress, specificSkillBonuses }
}
