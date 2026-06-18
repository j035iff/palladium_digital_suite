import type { CharacterAttributes } from '../types'
import {
  EXCEPTIONAL_ATTRIBUTE_MIN,
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

/** Rulebook 17+ attribute bonuses for the Live Ledger (docs/forge/character_creation.md Tab 2). */
export function listExceptionalAttributeBonusLines(
  attrs: CharacterAttributes,
): ExceptionalBonusLine[] {
  const lines: ExceptionalBonusLine[] = []

  const iq = getIqBonuses(attrs.iq)
  if (attrs.iq >= EXCEPTIONAL_ATTRIBUTE_MIN) {
    if (iq.skillBonusStandard) {
      lines.push({ label: 'I.Q. skill bonus', value: `+${iq.skillBonusStandard}%` })
    }
    if (iq.perceptionStandard) {
      lines.push({
        label: 'I.Q. perception bonus',
        value: `+${iq.perceptionStandard}`,
      })
    }
  }

  const me = getMeBonuses(attrs.me)
  if (attrs.me >= EXCEPTIONAL_ATTRIBUTE_MIN && me.saveStandard) {
    lines.push({
      label: 'M.E. save vs psionic / insanity',
      value: `+${me.saveStandard}`,
    })
  }

  const ma = getMaBonuses(attrs.ma)
  if (attrs.ma >= EXCEPTIONAL_ATTRIBUTE_MIN && ma.trustStandard) {
    lines.push({
      label: 'M.A. trust / intimidate',
      value: `${ma.trustStandard}%`,
    })
  }

  const ps = getPsBonuses(attrs.ps.score)
  if (attrs.ps.score >= EXCEPTIONAL_ATTRIBUTE_MIN && ps.damageBonus) {
    lines.push({ label: 'P.S. HtH combat damage', value: `+${ps.damageBonus}` })
  }

  const pp = getPpBonuses(attrs.pp)
  if (attrs.pp >= EXCEPTIONAL_ATTRIBUTE_MIN && pp.combatStandard) {
    lines.push({
      label: 'P.P. strike / parry / dodge',
      value: `+${pp.combatStandard}`,
    })
  }

  const pe = getPeBonuses(attrs.pe)
  if (attrs.pe >= EXCEPTIONAL_ATTRIBUTE_MIN) {
    if (pe.saveStandard) {
      lines.push({
        label: 'P.E. save vs magic / poisons',
        value: `+${pe.saveStandard}`,
      })
    }
    if (pe.comaDeathStandard) {
      lines.push({
        label: 'P.E. save vs coma / death',
        value: `+${pe.comaDeathStandard}%`,
      })
    }
  }

  const pb = getPbBonuses(attrs.pb)
  if (attrs.pb >= EXCEPTIONAL_ATTRIBUTE_MIN && pb.charmStandard) {
    lines.push({
      label: 'P.B. charm / impress',
      value: `${pb.charmStandard}%`,
    })
  }

  return lines
}
