/**
 * Live sheet Bonuses overlay view-model (Pillar 9).
 * BONUSES + SAVING THROWS cards — values from attribute / save engines only.
 */
import type { ActiveForm, Character, CharacterAttributes, Race } from '../types'
import { SAVING_THROW_REGISTRY } from '../data/constants'
import { aggregateAllPassiveModifiers } from './featureEngine'
import {
  getIqBonuses,
  getPeBonuses,
} from './attributeBonuses'
import {
  buildSaveStatStack,
  resolveExceptionalDisplayValue,
  statStackTotal,
  statStackToLedgerLines,
  type ExceptionalDisplayKey,
} from './creationStatEngine'
import {
  buildDisplayAttributesForLiveEngine,
} from './liveStatEngine'
import { buildMorphusPassiveBundle } from './morphusPassiveBridge'
import { characterHasDualForms } from './raceFormPolicy'
import {
  computeAttributeSaveProfile,
  type AttributeSaveEntry,
} from './attributeSaves'
import { creationLedgerSaveModifierAttribution } from './saveProfile'
import {
  formatAdditiveSaveTooltip,
  formatOverlayChancePercent,
  formatOverlaySigned,
  formatOverlaySignedPercent,
  formatOverlaySpecial,
  type OverlayCardPrimary,
} from './saveRollDisplay'

export type LiveBonusesOverlayCard = {
  id: string
  label: string
  primary: OverlayCardPrimary
  /** Book/engine targets shown at the bottom of the card (e.g. Spell 12+). */
  footnotes: readonly { label: string; text: string }[]
  tooltipEquation: string
  /** Visual group: black outline (attribute bonuses) vs blue (saves). */
  outline: 'bonus' | 'save'
}

export type LiveBonusesOverlayView = {
  bonusCards: readonly LiveBonusesOverlayCard[]
  /** Exactly the mock fixed set of 10. */
  fixedSaveCards: readonly LiveBonusesOverlayCard[]
  /** Dynamic 3rd row only — empty when there are no extras (row hidden in UI). */
  extraSaveCards: readonly LiveBonusesOverlayCard[]
  /** @deprecated Prefer {@link fixedSaveCards} + {@link extraSaveCards}. */
  saveCards: readonly LiveBonusesOverlayCard[]
}

/** Bottom footnote for situational saves (GM-called / no fixed sheet TN). */
export const OVERLAY_SITUATIONAL_TARGET_FOOTNOTE = {
  label: '',
  text: 'varies',
} as const

const MAGIC_KEYS = [
  'save_magic',
  'save_magic_spell',
  'save_spell',
  'save_magic_ritual',
  'save_ritual',
] as const

const POISON_KEYS = [
  'save_poison',
  'save_poison_lethal',
  'save_poison_nonlethal',
] as const

const HF_SAVE_KEYS = ['save_horror', 'save_horror_factor'] as const
const DISEASE_KEYS = ['save_disease'] as const
const PSIONICS_KEYS = ['save_psionics', 'save_isp'] as const
const ILLUSION_KEYS = ['save_illusions', 'save_illusion'] as const
const INSANITY_KEYS = ['save_insanity'] as const
const POSSESSION_KEYS = ['save_possession'] as const
const MIND_CONTROL_KEYS = ['save_mind_control'] as const
const DRUGS_KEYS = ['save_drugs', 'save_harmful_drugs'] as const

/** Registry / attribute save ids folded into the fixed mock cards (not dynamic). */
const FIXED_SAVE_CONSUMED_IDS = new Set([
  'magic',
  'horror_factor',
  'poison_toxins',
  'disease',
  'coma_death',
  'psionics',
  'illusions',
  'insanity',
  'possession',
  'mind_control',
  'magic_spell',
  'magic_ritual',
  'poison_lethal',
  'poison_nonlethal',
])

function morphusRollBonusesFor(
  character: Character,
  activeForm: ActiveForm,
  supportsDualForm: boolean,
) {
  if (!supportsDualForm || activeForm !== 'morphus') return undefined
  return buildMorphusPassiveBundle(character, 'morphus', {})?.attributeRollBonuses
}

function exceptionalAmount(
  key: ExceptionalDisplayKey,
  attrs: CharacterAttributes,
  morphusRollBonuses?: Parameters<typeof resolveExceptionalDisplayValue>[2],
): number {
  return resolveExceptionalDisplayValue(key, attrs, morphusRollBonuses)
}

function signedPrimary(amount: number): OverlayCardPrimary {
  // Joe: no bonus / +0 → black dash (never print +0).
  if (amount === 0) return { kind: 'empty' }
  return { kind: 'signed', amount }
}

function signedPercentPrimary(amount: number): OverlayCardPrimary {
  if (amount === 0) return { kind: 'empty' }
  return { kind: 'signedPercent', amount }
}

function chancePercentPrimary(amount: number): OverlayCardPrimary {
  if (amount === 0) return { kind: 'empty' }
  return { kind: 'chancePercent', amount }
}

function attributedSaveCard(opts: {
  id: string
  label: string
  character: Character
  activeForm: ActiveForm
  supportsDualForm: boolean
  race?: Race
  keys: readonly string[]
  exceptional?: { label: string; amount: number } | null
  footnotes?: readonly { label: string; text: string }[]
  special?: string | null
  /** When set, tooltip uses a real GM target. */
  tooltipTarget?: number | null
  /** Primary as percent (coma/death). */
  percentAmount?: number | null
}): LiveBonusesOverlayCard {
  if (opts.special) {
    return {
      id: opts.id,
      label: opts.label,
      primary: { kind: 'special', text: opts.special },
      footnotes: opts.footnotes ?? [],
      tooltipEquation: opts.special,
      outline: 'save',
    }
  }

  if (opts.percentAmount != null) {
    const amount = opts.percentAmount
    return {
      id: opts.id,
      label: opts.label,
      primary: signedPercentPrimary(amount),
      footnotes: opts.footnotes ?? [],
      tooltipEquation:
        amount === 0
          ? 'No coma/death bonus'
          : `P.E. coma/death +${amount}%`,
      outline: 'save',
    }
  }

  const attributionParts = creationLedgerSaveModifierAttribution(
    opts.keys,
    opts.character,
    opts.activeForm,
    { supportsDualForm: opts.supportsDualForm, race: opts.race },
  )
  const exceptional =
    opts.exceptional && opts.exceptional.amount !== 0 ? opts.exceptional : null
  const stack = buildSaveStatStack({
    exceptional,
    occParts: [],
    attributionParts,
  })
  const total = statStackTotal(stack)
  const bonuses = statStackToLedgerLines(stack)
  const target = opts.tooltipTarget
  const tooltip =
    target != null && target > 0
      ? formatAdditiveSaveTooltip(target, bonuses, total)
      : formatAdditiveSaveTooltip(0, bonuses, total).replace(
          '[Save vs 0]',
          '[Save bonus]',
        )

  return {
    id: opts.id,
    label: opts.label,
    primary: signedPrimary(total),
    footnotes: opts.footnotes ?? [],
    tooltipEquation: tooltip,
    outline: 'save',
  }
}

function buildBonusCards(
  attrs: CharacterAttributes,
  morphusRollBonuses: Parameters<typeof resolveExceptionalDisplayValue>[2],
): LiveBonusesOverlayCard[] {
  const iq = getIqBonuses(attrs.iq)
  const perception = iq.perceptionBonus
  const skillTotal = iq.skillBonus
  const me = exceptionalAmount('me_save', attrs)
  const psDmg = exceptionalAmount('ps_damage', attrs)
  const pp = exceptionalAmount('pp_combat', attrs)
  const pe = exceptionalAmount('pe_save', attrs)
  const trust = exceptionalAmount('ma_trust', attrs, morphusRollBonuses)
  const charm = exceptionalAmount('pb_charm', attrs, morphusRollBonuses)

  const mk = (
    id: string,
    label: string,
    primary: OverlayCardPrimary,
    tooltip: string,
  ): LiveBonusesOverlayCard => ({
    id,
    label,
    primary,
    footnotes: [],
    tooltipEquation: tooltip,
    outline: 'bonus',
  })

  return [
    mk(
      'perception',
      'Perception',
      signedPrimary(perception),
      perception === 0 ? 'No perception bonus' : `I.Q. perception ${formatOverlaySigned(perception)}`,
    ),
    mk(
      'trust_intimidate',
      'Trust / Intimidate',
      chancePercentPrimary(trust),
      trust === 0
        ? 'No trust / intimidate chance'
        : `M.A. trust / intimidate ${formatOverlayChancePercent(trust)}`,
    ),
    mk(
      'charm_impress',
      'Charm / Impress',
      chancePercentPrimary(charm),
      charm === 0
        ? 'No charm / impress chance'
        : `P.B. charm / impress ${formatOverlayChancePercent(charm)}`,
    ),
    mk(
      'base_skill',
      'Base Skill %',
      signedPercentPrimary(skillTotal),
      skillTotal === 0
        ? 'No I.Q. skill bonus'
        : `I.Q. skill bonus ${formatOverlaySignedPercent(skillTotal)}`,
    ),
    mk(
      'base_me',
      'Base ME',
      signedPrimary(me),
      me === 0 ? 'No M.E. save bonus' : `M.E. ${formatOverlaySigned(me)}`,
    ),
    mk(
      'base_ps_damage',
      'Base PS Damage',
      signedPrimary(psDmg),
      psDmg === 0 ? 'No P.S. damage bonus' : `P.S. damage ${formatOverlaySigned(psDmg)}`,
    ),
    mk(
      'base_pp',
      'Base PP',
      signedPrimary(pp),
      pp === 0 ? 'No P.P. combat bonus' : `P.P. strike/parry/dodge ${formatOverlaySigned(pp)}`,
    ),
    mk(
      'base_pe',
      'Base PE',
      signedPrimary(pe),
      pe === 0 ? 'No P.E. save bonus' : `P.E. ${formatOverlaySigned(pe)}`,
    ),
  ]
}

function attributeSaveToExtraCard(entry: AttributeSaveEntry): LiveBonusesOverlayCard | null {
  // Base P.E. / M.E. live in the BONUSES section; only full saves (Becoming) go here.
  if (entry.id === 'base_pe_bonus' || entry.id === 'base_me_bonus') return null
  if (entry.id !== 'vs_becoming') return null

  const bonus = entry.totalRollBonus ?? 0
  return {
    id: entry.id,
    label: entry.sheetLabel,
    primary: signedPrimary(bonus),
    footnotes:
      entry.baseTarget != null
        ? [{ label: '', text: `${entry.baseTarget}+` }]
        : [],
    tooltipEquation: entry.tooltipEquation,
    outline: 'save',
  }
}

/**
 * Build Bonuses overlay cards for the active form.
 * Fixed SAVING THROWS order matches the product mock; extras follow.
 */
export function buildLiveBonusesOverlay(
  character: Character,
  activeForm: ActiveForm,
  psionicSaveTarget: number,
  supportsDualForm = false,
  race?: Race,
): LiveBonusesOverlayView {
  const passive = aggregateAllPassiveModifiers(character, activeForm)
  const displayAttrs = buildDisplayAttributesForLiveEngine(
    character,
    activeForm,
    passive,
  )
  const morphusRollBonuses = morphusRollBonusesFor(
    character,
    activeForm,
    supportsDualForm,
  )
  const pe = getPeBonuses(displayAttrs.pe)
  const dualForm = characterHasDualForms(character)

  const bonusCards = buildBonusCards(displayAttrs, morphusRollBonuses)

  const peExceptional = (() => {
    const amount = exceptionalAmount('pe_save_magic', displayAttrs)
    return amount !== 0 ? { label: 'P.E.', amount } : null
  })()
  const pePoisonExceptional = (() => {
    const amount = exceptionalAmount('pe_save_poison', displayAttrs)
    return amount !== 0 ? { label: 'P.E.', amount } : null
  })()
  const mePsionics = (() => {
    const amount = exceptionalAmount('me_save_psionics', displayAttrs)
    return amount !== 0 ? { label: 'M.E.', amount } : null
  })()
  const meInsanity = (() => {
    const amount = exceptionalAmount('me_save_insanity', displayAttrs)
    return amount !== 0 ? { label: 'M.E.', amount } : null
  })()
  const mePossession = (() => {
    const amount = exceptionalAmount('me_save_possession', displayAttrs)
    return amount !== 0 ? { label: 'M.E. (31+)', amount } : null
  })()
  const iqIllusion = (() => {
    const amount = exceptionalAmount('iq_save_illusion', displayAttrs)
    return amount !== 0 ? { label: 'I.Q. (31+)', amount } : null
  })()

  const fixedSaves: LiveBonusesOverlayCard[] = [
    attributedSaveCard({
      id: 'magic',
      label: 'SAVE VS. MAGIC',
      character,
      activeForm,
      supportsDualForm,
      race,
      keys: MAGIC_KEYS,
      exceptional: peExceptional,
      footnotes: [
        { label: 'Spell', text: '12+' },
        { label: 'Ritual', text: '16+' },
      ],
      tooltipTarget: 12,
    }),
    attributedSaveCard({
      id: 'horror_factor',
      label: 'SAVE VS. Horror Factor',
      character,
      activeForm,
      supportsDualForm,
      race,
      keys: HF_SAVE_KEYS,
      // Situational — GM calls HF number (Joe: print "varies", not a fake TN).
      footnotes: [OVERLAY_SITUATIONAL_TARGET_FOOTNOTE],
      tooltipTarget: null,
    }),
    attributedSaveCard({
      id: 'poison_toxins',
      label: 'SAVE VS. Poisons/Toxins',
      character,
      activeForm,
      supportsDualForm,
      race,
      keys: POISON_KEYS,
      exceptional: pePoisonExceptional,
      footnotes: [
        { label: 'Lethal', text: '14+' },
        { label: 'Non-Lethal', text: '16+' },
      ],
      tooltipTarget: 14,
    }),
    pe.imperviousDisease
      ? {
          id: 'disease',
          label: 'SAVE VS. Disease',
          primary: formatOverlaySpecial('Impervious'),
          footnotes: [],
          tooltipEquation: 'P.E. 30+ — immune to disease; no save required.',
          outline: 'save' as const,
        }
      : attributedSaveCard({
          id: 'disease',
          label: 'SAVE VS. Disease',
          character,
          activeForm,
          supportsDualForm,
          race,
          keys: DISEASE_KEYS,
          // Disease 14+ not in combat_logic / registry SoT — omit TN (do not invent).
          footnotes: [],
          tooltipTarget: null,
        }),
    attributedSaveCard({
      id: 'coma_death',
      label: 'SAVE VS. Coma/Death',
      character,
      activeForm,
      supportsDualForm,
      race,
      keys: [],
      percentAmount: pe.comaDeathPercent,
      footnotes: [OVERLAY_SITUATIONAL_TARGET_FOOTNOTE],
    }),
    attributedSaveCard({
      id: 'psionics',
      label: 'SAVE VS. PSIONICS',
      character,
      activeForm,
      supportsDualForm,
      race,
      keys: PSIONICS_KEYS,
      exceptional: mePsionics,
      footnotes: [{ label: '', text: `${psionicSaveTarget}+` }],
      tooltipTarget: psionicSaveTarget,
    }),
    attributedSaveCard({
      id: 'illusions',
      label: 'SAVE VS. Illusions',
      character,
      activeForm,
      supportsDualForm,
      race,
      keys: ILLUSION_KEYS,
      exceptional: iqIllusion,
      // No SoT TN — situational-style footnote (do not invent a number).
      footnotes: [OVERLAY_SITUATIONAL_TARGET_FOOTNOTE],
      tooltipTarget: null,
    }),
    attributedSaveCard({
      id: 'insanity',
      label: 'SAVE VS. Insanity',
      character,
      activeForm,
      supportsDualForm,
      race,
      keys: INSANITY_KEYS,
      exceptional: meInsanity,
      footnotes: [{ label: '', text: '12+' }],
      tooltipTarget: 12,
    }),
    attributedSaveCard({
      id: 'possession',
      label: 'SAVE VS. Possession',
      character,
      activeForm,
      supportsDualForm,
      race,
      keys: POSSESSION_KEYS,
      exceptional: mePossession,
      // No SoT TN — situational-style footnote (do not invent a number).
      footnotes: [OVERLAY_SITUATIONAL_TARGET_FOOTNOTE],
      tooltipTarget: null,
    }),
    dualForm
      ? {
          id: 'mind_control',
          label: 'SAVE VS. Mind Control',
          // Engine ledger says Immune; overlay shows Impervious (Joe / Familiar Surface).
          primary: formatOverlaySpecial('Impervious'),
          footnotes: [],
          tooltipEquation:
            'Nightbane — impervious to mind control (both forms; active form sheet).',
          outline: 'save' as const,
        }
      : attributedSaveCard({
          id: 'mind_control',
          label: 'SAVE VS. Mind Control',
          character,
          activeForm,
          supportsDualForm,
          race,
          keys: MIND_CONTROL_KEYS,
          footnotes: [OVERLAY_SITUATIONAL_TARGET_FOOTNOTE],
          tooltipTarget: null,
        }),
  ]

  const extras: LiveBonusesOverlayCard[] = []

  // Registry rows not folded into the fixed mock set (e.g. Harmful Drugs).
  for (const row of SAVING_THROW_REGISTRY) {
    if (FIXED_SAVE_CONSUMED_IDS.has(row.id)) continue
    const base = row.usePsionicsTierBase ? psionicSaveTarget : row.baseTarget
    let exceptional: { label: string; amount: number } | null = null
    if (row.appliesPhysicalEnduranceBonus) {
      const amount = exceptionalAmount('pe_save_magic', displayAttrs)
      if (amount !== 0) exceptional = { label: 'P.E. bonus', amount }
    }
    if (row.appliesMentalEnduranceBonus) {
      const amount = exceptionalAmount(
        row.id === 'insanity' ? 'me_save_insanity' : 'me_save_psionics',
        displayAttrs,
      )
      if (amount !== 0) exceptional = { label: 'M.E. bonus', amount }
    }
    extras.push(
      attributedSaveCard({
        id: row.id,
        label: row.sheetLabel.toUpperCase().startsWith('SAVE')
          ? row.sheetLabel
          : `SAVE VS. ${row.sheetLabel.replace(/^Save vs\.\s*/i, '')}`,
        character,
        activeForm,
        supportsDualForm,
        race,
        keys: row.featureModifierKeys,
        exceptional,
        footnotes: [{ label: '', text: `${base}+` }],
        tooltipTarget: base,
      }),
    )
  }

  // Also surface drugs via creation keys if registry already covered harmful_drugs — skip dup.
  if (!extras.some((c) => c.id === 'harmful_drugs')) {
    const drugCard = attributedSaveCard({
      id: 'harmful_drugs',
      label: 'SAVE VS. Harmful Drugs',
      character,
      activeForm,
      supportsDualForm,
      race,
      keys: DRUGS_KEYS,
      exceptional: pePoisonExceptional,
      footnotes: [{ label: '', text: '15+' }],
      tooltipTarget: 15,
    })
    // Only show when there is a non-zero bonus (dynamic extras stay sparse).
    if (drugCard.primary.kind !== 'empty') {
      extras.push(drugCard)
    }
  }

  const primaryPassive = supportsDualForm
    ? aggregateAllPassiveModifiers(character, 'primary')
    : passive
  const primaryAttrs = supportsDualForm
    ? buildDisplayAttributesForLiveEngine(character, 'primary', primaryPassive)
    : displayAttrs
  const attributeSaves = computeAttributeSaveProfile(
    displayAttrs.pe,
    displayAttrs.me,
    character.level ?? 1,
    supportsDualForm,
    { primaryMe: primaryAttrs.me },
  )
  for (const entry of attributeSaves) {
    const card = attributeSaveToExtraCard(entry)
    if (card) extras.push(card)
  }

  // Joe: hide dynamic row until there is at least one real extra save.
  // Keep Becoming when dual-form (always a character save); drop empty dashes otherwise.
  const dynamicExtras = extras.filter((c) => {
    if (c.primary.kind === 'special') return true
    if (c.id === 'vs_becoming') return supportsDualForm
    if (c.primary.kind === 'empty') return false
    return true
  })

  return {
    bonusCards,
    fixedSaveCards: fixedSaves,
    extraSaveCards: dynamicExtras,
    saveCards: [...fixedSaves, ...dynamicExtras],
  }
}

/** Display string for tests / tooltips — mirrors card primary formatting. */
export function formatLiveBonusesOverlayPrimary(primary: OverlayCardPrimary): string {
  switch (primary.kind) {
    case 'empty':
      return '—'
    case 'signed':
      return formatOverlaySigned(primary.amount)
    case 'signedPercent':
      return formatOverlaySignedPercent(primary.amount)
    case 'chancePercent':
      return formatOverlayChancePercent(primary.amount)
    case 'special':
      return primary.text
  }
}
