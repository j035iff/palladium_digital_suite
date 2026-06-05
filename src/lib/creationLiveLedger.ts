import type {
  AccumulatedHandToHandBonuses,
  ActiveForm,
  Character,
  CharacterAttributes,
  FeatureModifiers,
  PalladiumOcc,
  Race,
  StrengthCapacities,
} from '../types'
import { DEFAULT_HORROR_FACTOR_BY_FORM } from '../data/constants'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { computeCombatMirrorBonuses, computeLiveBonuses } from './characterDerived'
import { creationVitalityPreview } from './creationVitalityPreview'
import { creationHpLabel, creationSdcLabel, creationIspLabel } from './creationFormLabels'
import { listPendingDiceEntries } from './pendingDiceLedger'
import { listOccVariableAttributeBonusTasks } from './occVariableBonus'
import { resolveCreationOccSkillIds } from './occCoreSkillVouchers'
import {
  flattenCreationSkillIds,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from './creationSkillPicks'
import { isDiceNotation, diceNotationBounds } from './diceNotationBounds'
import { formatBonus } from './combatQuickBonuses'
import { computeMaxApm } from './meleeCombat'
import {
  handToHandAttackBonus,
  createEmptyAccumulatedHandToHandBonuses,
} from '../utils/combatCalculator'
import {
  getIqBonuses,
  getMaBonuses,
  getMeBonuses,
  getPbBonuses,
  getPeBonuses,
  getPsBonuses,
  getPpBonuses,
} from './attributeBonuses'
import { aggregateAllPassiveModifiers } from './featureEngine'

export const LEDGER_NA = 'N/A'

export type CreationLedgerLine = {
  label: string
  value: string
  hint?: string
}

export function ledgerBonus(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return LEDGER_NA
  return formatBonus(n)
}

export function ledgerPercent(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return LEDGER_NA
  return `${n >= 0 ? '+' : ''}${n}%`
}

export function ledgerCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return LEDGER_NA
  return String(n)
}

function passiveSum(passive: FeatureModifiers, keys: readonly string[]): number {
  let total = 0
  for (const key of keys) {
    const v = passive[key]
    if (v != null && v !== 0) total += v
  }
  return total
}

function combinedSaveBonus(
  attributePart: number,
  passive: FeatureModifiers,
  passiveKeys: readonly string[],
): string {
  const total = attributePart + passiveSum(passive, passiveKeys)
  return ledgerBonus(total)
}

const COMBAT_KEYS = [
  'strike',
  'parry',
  'dodge',
  'rollWithImpact',
  'pullPunch',
  'apm',
] as const

const STAGING_KEYS = ['sdc', 'ps', 'pp', 'pe', 'spd'] as const

type SkillBonusAgg = {
  combat: Record<string, number>
  staging: Record<string, number>
  sources: Map<string, string[]>
}

function aggregateSkillPhysicalBonuses(skillIds: readonly string[]): SkillBonusAgg {
  const combat: Record<string, number> = {}
  const staging: Record<string, number> = {}
  const sources = new Map<string, string[]>()

  const addSource = (bucket: string, skillName: string) => {
    const list = sources.get(bucket) ?? []
    if (!list.includes(skillName)) list.push(skillName)
    sources.set(bucket, list)
  }

  for (const skillId of skillIds) {
    const entry = getPalladiumSkillCatalogEntryById(skillId)
    const name = entry?.name ?? skillId
    const bonuses = (entry as { physicalSkillBonuses?: Record<string, unknown> })
      ?.physicalSkillBonuses
    if (!bonuses) continue

    for (const [key, raw] of Object.entries(bonuses)) {
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        if ((COMBAT_KEYS as readonly string[]).includes(key)) {
          combat[key] = (combat[key] ?? 0) + raw
          addSource(key, name)
        } else if ((STAGING_KEYS as readonly string[]).includes(key)) {
          staging[key] = (staging[key] ?? 0) + raw
          addSource(`staging.${key}`, name)
        }
      }
    }
  }

  return { combat, staging, sources }
}

function resolveCreationSkillIds(
  character: Character,
  occ: PalladiumOcc | undefined,
): string[] {
  return [
    ...resolveCreationOccSkillIds(
      occ,
      character.occSpecializationId,
      character.creationOccSkillIds ?? [],
      character.creationOccCoreVoucherPicks ?? {},
    ),
    ...flattenCreationSkillIds(getCreationRelatedPicks(character)),
    ...flattenCreationSkillIds(getCreationSecondaryPicks(character)),
  ]
}

/** All eight attributes — always shown with current scores. */
export function buildCreationAttributeBlock(
  attrs: CharacterAttributes,
): CreationLedgerLine[] {
  return [
    { label: 'I.Q.', value: String(attrs.iq) },
    { label: 'M.E.', value: String(attrs.me) },
    { label: 'M.A.', value: String(attrs.ma) },
    { label: 'P.S.', value: String(attrs.ps.score) },
    { label: 'P.P.', value: String(attrs.pp) },
    { label: 'P.E.', value: String(attrs.pe) },
    { label: 'P.B.', value: String(attrs.pb) },
    { label: 'Spd', value: String(attrs.spd) },
  ]
}

/**
 * Attribute exceptional perks not shown in the dedicated Save vs or Combat blocks.
 */
export function buildCreationExceptionalBlock(
  attrs: CharacterAttributes,
): CreationLedgerLine[] {
  const iq = getIqBonuses(attrs.iq)
  const ma = getMaBonuses(attrs.ma)
  const ps = getPsBonuses(attrs.ps.score)
  const pe = getPeBonuses(attrs.pe)
  const pb = getPbBonuses(attrs.pb)
  const occSkill = computeLiveBonuses(attrs).iqOccSkillPercent

  return [
    { label: 'I.Q. O.C.C. skill %', value: ledgerPercent(occSkill) },
    { label: 'I.Q. skill bonus', value: ledgerPercent(iq.skillBonus) },
    { label: 'M.A. trust / intimidate', value: ledgerPercent(ma.trustIntimidate) },
    {
      label: 'M.A. perception penalty (others)',
      value: ledgerBonus(ma.perceptionPenaltyToOthers),
    },
    { label: 'P.B. charm / impress', value: ledgerPercent(pb.charmImpress) },
    {
      label: 'P.E. fatigue rate',
      value: pe.halfFatigue ? '½ rate' : LEDGER_NA,
    },
    {
      label: 'P.S. throw range',
      value: ps.throwRangeBonusFeet > 0 ? `+${ps.throwRangeBonusFeet} ft` : LEDGER_NA,
    },
    { label: 'P.S. lift / carry', value: ledgerPercent(ps.liftCarryBonusPercent) },
  ]
}

export function buildCreationVitalsBlock(opts: {
  character: Character
  attrs: CharacterAttributes
  race: Race | undefined
  occ: PalladiumOcc | undefined
  supportsDualForm: boolean
  psychicTier: string
  activeForm: ActiveForm
  passive: FeatureModifiers
  horrorFactorTotal: number
}): CreationLedgerLine[] {
  const preview = creationVitalityPreview(opts.character, opts.race, opts.occ, {
    psychicTier: opts.psychicTier,
  })
  const iq = getIqBonuses(opts.attrs.iq)
  const showIsp =
    opts.psychicTier !== 'none' || opts.character.psychicGateBypassed === true

  const ar = passiveSum(opts.passive, [
    'ar',
    'natural_armor',
    'armor_rating',
    'natural_armor_rating',
  ])

  const lines: CreationLedgerLine[] = [
    {
      label: creationHpLabel(opts.supportsDualForm, 'human'),
      value: preview.facadeHpHint,
    },
    {
      label: creationSdcLabel(opts.supportsDualForm, 'human'),
      value: preview.facadeSdcHint,
    },
    { label: 'P.P.E.', value: preview.ppeHint },
    {
      label: creationIspLabel(opts.supportsDualForm),
      value: showIsp ? (preview.ispHint ?? LEDGER_NA) : LEDGER_NA,
    },
    {
      label: 'Horror Factor',
      value: opts.horrorFactorTotal > 0 ? String(opts.horrorFactorTotal) : LEDGER_NA,
    },
    { label: 'Natural Armor Rating', value: ar > 0 ? String(ar) : LEDGER_NA },
    { label: 'Perception', value: ledgerPercent(iq.perceptionBonus) },
  ]

  if (opts.supportsDualForm) {
    lines.push(
      {
        label: creationHpLabel(true, 'morphus'),
        value: 'P.E. ×3 + 2D6×4 (resolve at Spawn)',
      },
      {
        label: creationSdcLabel(true, 'morphus'),
        value: 'P.E.×4 + P.S.×2 + 2D6×8 (resolve at Spawn)',
      },
    )
  }

  return lines
}

export function buildCreationSavesBlock(
  attrs: CharacterAttributes,
  passive: FeatureModifiers,
): CreationLedgerLine[] {
  const iq = getIqBonuses(attrs.iq)
  const me = getMeBonuses(attrs.me)
  const pe = getPeBonuses(attrs.pe)

  return [
    {
      label: 'Magic',
      value: combinedSaveBonus(pe.saveMagic, passive, [
        'save_magic',
        'save_magic_spell',
        'save_spell',
        'save_magic_ritual',
        'save_ritual',
      ]),
    },
    {
      label: 'Psionics',
      value: combinedSaveBonus(me.savePsionics, passive, [
        'save_psionics',
        'save_isp',
      ]),
    },
    {
      label: 'Horror Factor',
      value: ledgerBonus(passiveSum(passive, ['save_horror', 'save_horror_factor'])),
    },
    {
      label: 'Illusions',
      value: combinedSaveBonus(iq.saveIllusion, passive, ['save_illusions', 'save_illusion']),
    },
    {
      label: 'Disease',
      value: pe.imperviousDisease
        ? 'Impervious'
        : ledgerBonus(passiveSum(passive, ['save_disease'])),
    },
    {
      label: 'Insanity',
      value: combinedSaveBonus(me.saveInsanity, passive, ['save_insanity']),
    },
    {
      label: 'Poison / Toxins',
      value: combinedSaveBonus(pe.savePoison, passive, [
        'save_poison',
        'save_poison_lethal',
        'save_poison_nonlethal',
        'save_drugs',
        'save_harmful_drugs',
      ]),
    },
    {
      label: 'Possession',
      value: combinedSaveBonus(me.savePossession, passive, ['save_possession']),
    },
    {
      label: 'Mind Control',
      value: ledgerBonus(passiveSum(passive, ['save_mind_control'])),
    },
    {
      label: 'Coma / Death',
      value:
        pe.comaDeathPercent > 0 ? `${pe.comaDeathPercent}%` : LEDGER_NA,
    },
  ]
}

export type CreationCombatLedger = {
  strike: number
  parry: number
  dodge: number
  rollWithPunchFallImpact: number
  pullPunch: number
  initiative: number
  attacksPerMelee: number
  entangle: number
  disarm: number
  handToHandDamage: number
}

export function buildCreationCombatLedger(
  attrs: CharacterAttributes,
  skillIds: readonly string[],
  level: number,
  handToHand?: AccumulatedHandToHandBonuses,
  strengthCapacities?: StrengthCapacities,
): CreationCombatLedger {
  const mirror = computeCombatMirrorBonuses(attrs)
  const skill = aggregateSkillPhysicalBonuses(skillIds)
  const hth = handToHand ?? createEmptyAccumulatedHandToHandBonuses()

  const strike = mirror.strike + (skill.combat.strike ?? 0) + hth.strike
  const parry = mirror.parry + (skill.combat.parry ?? 0) + hth.parry
  const dodge = mirror.dodge + (skill.combat.dodge ?? 0) + hth.dodge
  const peDiv = Math.floor(attrs.pe / 10)
  const spdDiv = Math.floor(attrs.spd / 10)
  const pullPunch = (skill.combat.pullPunch ?? 0) + hth.pullPunch
  const rollWithPunchFallImpact =
    dodge +
    peDiv +
    (skill.combat.rollWithImpact ?? 0) +
    pullPunch +
    hth.rollWithPunch
  const initiative = spdDiv + peDiv + hth.initiative + getPpBonuses(attrs.pp).initiative
  const attacksPerMelee =
    computeMaxApm(attrs, level, handToHandAttackBonus(hth)) +
    (skill.combat.apm ?? 0)

  let handToHandDamage = mirror.handToHandDamage + hth.damage
  if (strengthCapacities?.handToHandDamage.kind === 'supernatural') {
    handToHandDamage = 0
  }

  return {
    strike,
    parry,
    dodge,
    rollWithPunchFallImpact,
    pullPunch,
    initiative,
    attacksPerMelee,
    entangle: hth.entangle,
    disarm: hth.disarm,
    handToHandDamage,
  }
}

/** Dedicated combat block — always lists every row; optional bonuses use N/A when zero. */
export function buildCreationCombatBlock(
  combat: CreationCombatLedger,
  strengthCapacities?: StrengthCapacities,
): CreationLedgerLine[] {
  let hthDamageValue: string
  let hthDamageHint: string | undefined

  if (strengthCapacities?.handToHandDamage.kind === 'supernatural') {
    const d = strengthCapacities.handToHandDamage
    hthDamageValue = d.fullStrengthPunch
    hthDamageHint = `Restrained ${d.restrainedPunch} · Power ${d.powerPunch}`
  } else {
    hthDamageValue =
      combat.handToHandDamage !== 0
        ? formatBonus(combat.handToHandDamage)
        : LEDGER_NA
  }

  return [
    { label: 'Attacks / melee', value: ledgerCount(combat.attacksPerMelee) },
    { label: 'Initiative', value: formatBonus(combat.initiative) },
    { label: 'Strike', value: formatBonus(combat.strike) },
    { label: 'Parry', value: formatBonus(combat.parry) },
    { label: 'Dodge', value: formatBonus(combat.dodge) },
    {
      label: 'Roll w/ punch, fall, impact',
      value: formatBonus(combat.rollWithPunchFallImpact),
    },
    { label: 'Pull punch', value: ledgerBonus(combat.pullPunch) },
    { label: 'Entangle', value: ledgerBonus(combat.entangle) },
    { label: 'Disarm', value: ledgerBonus(combat.disarm) },
    {
      label: 'Hand-to-hand damage (P.S.)',
      value: hthDamageValue,
      hint: hthDamageHint,
    },
  ]
}

export type CreationPhysicalStaging = {
  lines: CreationLedgerLine[]
  pendingDiceLines: CreationLedgerLine[]
}

export function buildCreationPhysicalStaging(
  skillIds: readonly string[],
): CreationPhysicalStaging {
  const skill = aggregateSkillPhysicalBonuses(skillIds)
  const lines: CreationLedgerLine[] = []
  const pendingDiceLines: CreationLedgerLine[] = []

  for (const key of STAGING_KEYS) {
    const amt = skill.staging[key] ?? 0
    if (amt) {
      const src = skill.sources.get(`staging.${key}`)?.join(', ')
      lines.push({
        label: key.toUpperCase(),
        value: formatBonus(amt),
        hint: src ? `On Spawn: ${src}` : 'Applied on Spawn',
      })
    }
  }

  for (const skillId of skillIds) {
    const entry = getPalladiumSkillCatalogEntryById(skillId)
    const name = entry?.name ?? skillId
    const bonuses = (entry as { physicalSkillBonuses?: Record<string, unknown> })
      ?.physicalSkillBonuses
    if (!bonuses) continue
    for (const [key, raw] of Object.entries(bonuses)) {
      if (typeof raw !== 'string' || !isDiceNotation(raw)) continue
      const bounds = diceNotationBounds(raw)
      pendingDiceLines.push({
        label: `${name} — ${key.toUpperCase()}`,
        value: raw,
        hint: `${bounds.min}–${bounds.max} at Spawn`,
      })
    }
  }

  return { lines, pendingDiceLines }
}

export type CreationLiveLedgerSnapshot = {
  attributes: CreationLedgerLine[]
  exceptional: CreationLedgerLine[]
  vitals: CreationLedgerLine[]
  saves: CreationLedgerLine[]
  combat: CreationLedgerLine[]
  physical: CreationPhysicalStaging
  occVariable: CreationLedgerLine[]
  spawnDice: CreationLedgerLine[]
}

export function buildCreationLiveLedgerSnapshot(opts: {
  character: Character
  attrs: CharacterAttributes
  race: Race | undefined
  occ: PalladiumOcc | undefined
  supportsDualForm: boolean
  psychicTier: string
  activeForm: ActiveForm
  strengthCapacities: StrengthCapacities
  handToHand?: AccumulatedHandToHandBonuses
  horrorFactorTotal?: number
}): CreationLiveLedgerSnapshot {
  const skillIds = resolveCreationSkillIds(opts.character, opts.occ)
  const passive = aggregateAllPassiveModifiers(opts.character, opts.activeForm)

  const hfBaseline =
    typeof passive.horror_factor_base === 'number' && passive.horror_factor_base > 0
      ? passive.horror_factor_base
      : DEFAULT_HORROR_FACTOR_BY_FORM[opts.activeForm]
  const horrorFactorTotal =
    opts.horrorFactorTotal ??
    Math.max(0, Math.round(hfBaseline + passiveSum(passive, ['horror_factor', 'save_horror'])))

  const combatLedger = buildCreationCombatLedger(
    opts.attrs,
    skillIds,
    opts.character.level,
    opts.handToHand,
    opts.strengthCapacities,
  )

  const pending = listPendingDiceEntries(opts.character, opts.race, opts.occ, {
    supportsDualForm: opts.supportsDualForm,
    psychicTier: opts.psychicTier,
  })
  const resolutions = opts.character.creationPendingDiceResolutions ?? {}
  const occResolved = opts.character.creationOccVariableResolutions ?? {}

  const occVariable = listOccVariableAttributeBonusTasks(
    opts.occ,
    opts.character.occSpecializationId,
  ).map((t) => {
    const v = occResolved[t.id]
    const done = v != null && v >= t.min && v <= t.max
    return {
      label: t.label,
      value: done ? String(v) : t.notation,
      hint: done ? 'Phase I.2 resolved' : 'Pending — Phase I.2',
    }
  })

  const spawnDice = pending.map((e) => {
    const v = resolutions[e.id]
    const done = v != null && v >= e.min && v <= e.max
    return {
      label: e.label,
      value: done ? String(v) : e.notation,
      hint: done ? 'Resolved' : e.hint ?? `${e.min}–${e.max}`,
    }
  })

  return {
    attributes: buildCreationAttributeBlock(opts.attrs),
    exceptional: buildCreationExceptionalBlock(opts.attrs),
    vitals: buildCreationVitalsBlock({
      character: opts.character,
      attrs: opts.attrs,
      race: opts.race,
      occ: opts.occ,
      supportsDualForm: opts.supportsDualForm,
      psychicTier: opts.psychicTier,
      activeForm: opts.activeForm,
      passive,
      horrorFactorTotal,
    }),
    saves: buildCreationSavesBlock(opts.attrs, passive),
    combat: buildCreationCombatBlock(combatLedger, opts.strengthCapacities),
    physical: buildCreationPhysicalStaging(skillIds),
    occVariable,
    spawnDice,
  }
}
