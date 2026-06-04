import type { CharacterAttributes } from '../types'
import {
  getIqBonuses,
  getMaBonuses,
  getMeBonuses,
  getPbBonuses,
  getPeBonuses,
  getPpBonuses,
  getPsBonuses,
} from './attributeBonuses'

export type ExceptionalBonusLine = {
  label: string
  value: string
}

/** Rulebook 16+ attribute bonuses for the Live Ledger (forge-character_creation.md Tab 2). */
export function listExceptionalAttributeBonusLines(
  attrs: CharacterAttributes,
): ExceptionalBonusLine[] {
  const lines: ExceptionalBonusLine[] = []

  const iq = getIqBonuses(attrs.iq)
  if (attrs.iq >= 16) {
    if (iq.skillBonus) lines.push({ label: 'I.Q. skill bonus', value: `+${iq.skillBonus}%` })
    if (iq.perceptionBonus) {
      lines.push({ label: 'I.Q. perception', value: `+${iq.perceptionBonus}%` })
    }
    if (iq.saveIllusion) {
      lines.push({ label: 'Save vs illusion', value: `+${iq.saveIllusion}` })
    }
  }

  const me = getMeBonuses(attrs.me)
  if (attrs.me >= 16) {
    if (me.savePsionics) {
      lines.push({ label: 'Save vs psionics (M.E.)', value: `+${me.savePsionics}` })
    }
    if (me.saveInsanity) {
      lines.push({ label: 'Save vs insanity', value: `+${me.saveInsanity}` })
    }
    if (me.savePossession) {
      lines.push({ label: 'Save vs possession', value: `+${me.savePossession}` })
    }
  }

  const ma = getMaBonuses(attrs.ma)
  if (attrs.ma >= 16 && ma.trustIntimidate) {
    lines.push({ label: 'M.A. trust / intimidate', value: `${ma.trustIntimidate}%` })
  }

  const ps = getPsBonuses(attrs.ps.score)
  if (attrs.ps.score >= 16 && ps.damageBonus) {
    lines.push({ label: 'P.S. damage', value: `+${ps.damageBonus}` })
  }

  const pp = getPpBonuses(attrs.pp)
  if (attrs.pp >= 16) {
    if (pp.strike) {
      lines.push({ label: 'P.P. strike/parry/dodge', value: `+${pp.strike}` })
    }
    if (pp.initiative) {
      lines.push({ label: 'P.P. initiative', value: `+${pp.initiative}` })
    }
  }

  const pe = getPeBonuses(attrs.pe)
  if (attrs.pe >= 16) {
    if (pe.saveMagic) lines.push({ label: 'Save vs magic (P.E.)', value: `+${pe.saveMagic}` })
    if (pe.savePoison) lines.push({ label: 'Save vs poison', value: `+${pe.savePoison}` })
    if (pe.comaDeathPercent) {
      lines.push({ label: 'Coma / death', value: `${pe.comaDeathPercent}%` })
    }
    if (pe.halfFatigue) lines.push({ label: 'Fatigue', value: '½ rate' })
    if (pe.imperviousDisease) lines.push({ label: 'Disease', value: 'Impervious' })
  }

  const pb = getPbBonuses(attrs.pb)
  if (attrs.pb >= 16 && pb.charmImpress) {
    lines.push({ label: 'P.B. charm / impress', value: `${pb.charmImpress}%` })
  }

  return lines
}
