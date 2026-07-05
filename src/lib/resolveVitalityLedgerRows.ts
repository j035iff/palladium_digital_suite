/**
 * Contributions-first vitality resolution (Pillar 9).
 * Facade vitals resolve before Morphus vitals that depend on Facade S.D.C.
 */
import type { Character, PalladiumOcc, Race } from '../types'
import { FORGE_ATTRIBUTE_KEYS, type ForgeAttrKey } from './attributeKeys'
import { diceNotationBounds, isDiceNotation } from './diceNotationBounds'
import {
  createPhysicalPendingRoll,
  flatBonusesFromDiceContributions,
  physicalDiceContributions,
} from './creationPhysicalDice'
import { listOccVariableBonusTasks, occVariableAttributeResolution } from './occVariableBonus'
import {
  buildForgeAttributeStatBonuses,
  buildSdcStatBonusDetails,
  normalizeDiceDisplay,
  type LedgerDiceContribution,
  type LedgerFlatContribution,
  type LedgerStatDiceGroupDetail,
} from './ledgerStatBonuses'
import {
  buildAttrFormulaLedgerFields,
  diceTermsFromAttrFormula,
  dualFormPpeLedgerFormulaOpts,
  formatHpDiceRollHint,
  formatMorphusSdcValueTooltip,
  formatVitalLedgerTooltip,
  hitPointsPerLevelDiceFormula,
  resolvePpeCreationFormula,
  resolvePpeFormulaParts,
  type VitalAttrFlatTerm,
} from './ledgerVitalFormula'
import {
  buildCreationStatStack,
  resolveMorphusSdcFlatDerivedStat,
  statStackTotal,
} from './creationStatEngine'
import {
  MORPHUS_HIT_POINTS_FORMULA,
  MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA,
  MORPHUS_SDC_BONUS_DICE,
  NIGHTBANE_MORPHUS_BASE_PROFILE,
} from './morphusNightbaneBase'
import {
  buildMorphusTraitHorrorFactorDetails,
  buildMorphusTraitSdcBonusDetails,
} from './morphusCreationLedger'
import {
  addDiceContribution,
  type LedgerContribution,
  type LedgerFormScope,
  type ResolvedLedgerRow,
} from './ledgerRowResolution'
import type { PendingDiceRoll } from './spawnDiceBlocks'
import { resolveIspCreationFormula } from './ledgerVitalFormula'

export type VitalityLedgerRows = {
  facade: Partial<Record<string, ResolvedLedgerRow>>
  morphus: Partial<Record<string, ResolvedLedgerRow>>
}

export type ResolveVitalityLedgerRowsInput = {
  character: Character
  race?: Race
  occ?: PalladiumOcc
  skillIds: readonly string[]
  assignments: Partial<Record<ForgeAttrKey, number>>
  pendingAttrBonuses: Partial<Record<ForgeAttrKey, number>>
  occVariableResolutions: Readonly<Record<string, number>>
  resolutions: Readonly<Record<string, number>>
  showIsp: boolean
  supportsDualForm?: boolean
  ispFormula: ReturnType<typeof resolveIspCreationFormula>
}

function formulaDiceRolls(
  blockId: string,
  formula: string,
  prefix: string,
): PendingDiceRoll[] {
  return diceTermsFromAttrFormula(formula).map((term, index) => {
    const bounds = diceNotationBounds(term.notation)
    return {
      id: `spawn.${blockId}.${prefix}.${index}`,
      notation: term.label,
      min: bounds.min,
      max: bounds.max,
      source: term.label,
    }
  })
}

function perLevelDiceRolls(
  blockId: string,
  perLevelFormula: string | undefined,
): PendingDiceRoll[] {
  const per = perLevelFormula?.trim()
  if (!per || !isDiceNotation(per)) return []
  const bounds = diceNotationBounds(per)
  return [
    {
      id: `spawn.${blockId}.per_level.0`,
      notation: normalizeDiceDisplay(per),
      min: bounds.min,
      max: bounds.max,
      source: `${normalizeDiceDisplay(per)}/level`,
    },
  ]
}

function addDiceRollsToContributions(
  contributions: LedgerContribution[],
  scope: LedgerFormScope,
  blockId: string,
  bucket: LedgerContribution['bucket'],
  rolls: readonly PendingDiceRoll[],
  resolutions: Readonly<Record<string, number>>,
): void {
  if (!bucket) return
  rolls.forEach((roll, index) => {
    const parsed = createPhysicalPendingRoll(
      blockId,
      bucket,
      index,
      roll.source,
      roll.notation,
      roll.id,
    )
    addDiceContribution(contributions, {
      scope,
      bucket,
      label: roll.source,
      notation: roll.notation,
      rollId: parsed.roll.id,
      resolvedAmount: resolutions[parsed.roll.id],
    })
  })
}

function addDiceGroupDetailContributions(
  contributions: LedgerContribution[],
  scope: LedgerFormScope,
  blockId: string,
  group: LedgerStatDiceGroupDetail,
  resolutions: Readonly<Record<string, number>>,
): number {
  let flatFromDice = flatBonusesFromDiceContributions(group.contributions)
  group.contributions.forEach((contribution, index) => {
    const parsed = createPhysicalPendingRoll(
      blockId,
      group.kind,
      index,
      contribution.label,
      contribution.notation,
    )
    addDiceContribution(contributions, {
      scope,
      bucket: group.kind,
      label: contribution.label,
      notation: contribution.notation,
      rollId: parsed.roll.id,
      resolvedAmount: resolutions[parsed.roll.id],
    })
  })
  return flatFromDice
}

function addTraitDiceContributions(
  contributions: LedgerContribution[],
  scope: LedgerFormScope,
  blockId: string,
  traitContributions: readonly LedgerDiceContribution[],
  resolutions: Readonly<Record<string, number>>,
): number {
  const flatFromDice = flatBonusesFromDiceContributions(traitContributions)
  const diceOnly = physicalDiceContributions(traitContributions)
  if (diceOnly.length === 0) return flatFromDice
  diceOnly.forEach((contribution, index) => {
    const parsed = createPhysicalPendingRoll(
      blockId,
      'traits',
      index,
      contribution.label,
      contribution.notation,
    )
    addDiceContribution(contributions, {
      scope,
      bucket: 'traits',
      label: contribution.label,
      notation: contribution.notation,
      rollId: parsed.roll.id,
      resolvedAmount: resolutions[parsed.roll.id],
    })
  })
  return flatFromDice
}

function vitalityRowRunningTotal(
  row: ResolvedLedgerRow,
  resolutions: Readonly<Record<string, number>>,
): number {
  let total = row.pendingFlatBaseline ?? 0
  for (const c of row.contributions) {
    if (c.kind === 'dice_entered' && c.resolvedAmount != null) {
      total += c.resolvedAmount
    } else if (
      c.kind === 'dice_pending' &&
      c.rollId &&
      resolutions[c.rollId] != null
    ) {
      total += resolutions[c.rollId]!
    }
  }
  return total
}

function buildVitalityRow(input: {
  id: string
  label: string
  formScope: LedgerFormScope
  contributions: LedgerContribution[]
  pendingFlatBaseline: number
  resolutions: Readonly<Record<string, number>>
  vitalFlatTerms?: VitalAttrFlatTerm[]
  skillFlatTerms?: LedgerFlatContribution[]
  morphusFacadeSdc?: number
  hint?: string
  precomputedFlatTooltip?: string
  valueModified?: boolean
}): ResolvedLedgerRow {
  const row: ResolvedLedgerRow = {
    id: input.id,
    label: input.label,
    formScope: input.formScope,
    section: 'vitality',
    contributions: input.contributions,
    total: input.pendingFlatBaseline,
    pendingFlatBaseline: input.pendingFlatBaseline,
    vitalFlatTerms: input.vitalFlatTerms,
    skillFlatTerms: input.skillFlatTerms,
    morphusFacadeSdc: input.morphusFacadeSdc,
    hint: input.hint,
    precomputedFlatTooltip: input.precomputedFlatTooltip,
    valueModified:
      input.valueModified ??
      (input.pendingFlatBaseline > 0 ||
        input.contributions.some((c) => c.kind === 'dice_pending')),
  }
  row.total = vitalityRowRunningTotal(row, input.resolutions)
  return row
}

export function resolveVitalityLedgerRows(
  input: ResolveVitalityLedgerRowsInput,
): VitalityLedgerRows {
  const {
    character,
    race,
    occ,
    skillIds,
    assignments,
    occVariableResolutions,
    resolutions,
    showIsp,
    supportsDualForm,
    ispFormula,
  } = input
  const effectivePe = resolveForgeEffectiveAttributeScore(
    'pe',
    character,
    race,
    occ,
    skillIds,
    assignments,
    input.pendingAttrBonuses,
  )
  const facade: Partial<Record<string, ResolvedLedgerRow>> = {}
  const morphus: Partial<Record<string, ResolvedLedgerRow>> = {}

  const hpFormula = race ? (race.vitals?.hpFormula ?? 'PE + 1D6') : null
  const hpPerLevel = hitPointsPerLevelDiceFormula(hpFormula)
  const hpFields = buildAttrFormulaLedgerFields(hpFormula, assignments, {
    hintOverride: race ? formatHpDiceRollHint(race.vitals?.hpFormula) : undefined,
    formulaSources: hpFormula ? { race: hpFormula } : undefined,
  })
  if (hpFields.hint || hpPerLevel) {
    const contributions: LedgerContribution[] = []
    addDiceRollsToContributions(
      contributions,
      'facade',
      'hp',
      'race',
      perLevelDiceRolls('hp', hpPerLevel ?? undefined),
      resolutions,
    )
    const flatBaseline = Number(hpFields.value) || 0
    facade.hp = buildVitalityRow({
      id: 'hp',
      label: 'H.P.',
      formScope: 'facade',
      contributions,
      pendingFlatBaseline: flatBaseline,
      resolutions,
      vitalFlatTerms: hpFields.flatTerms,
      hint: hpFields.hint,
      precomputedFlatTooltip: hpFields.valueModified
        ? formatVitalLedgerTooltip(hpFields.flatTerms ?? [], [], [])
        : undefined,
      valueModified: hpFields.valueModified,
    })
  }

  const sdcDetails = buildSdcStatBonusDetails(
    race,
    occ,
    character.occSpecializationId,
    skillIds,
    occVariableResolutions,
  )
  const occRollNotations = new Set(
    sdcDetails.diceGroups
      .filter((group) => group.kind === 'occ')
      .flatMap((group) =>
        group.contributions.map((c) => normalizeDiceDisplay(c.notation)),
      ),
  )
  let sdcFlatFromDice = 0
  const sdcContributions: LedgerContribution[] = []
  for (const group of sdcDetails.diceGroups) {
    sdcFlatFromDice += addDiceGroupDetailContributions(
      sdcContributions,
      'facade',
      'sdc',
      group,
      resolutions,
    )
  }
  let occVarIndex =
    sdcDetails.diceGroups.find((g) => g.kind === 'occ')?.contributions.length ?? 0
  for (const task of listOccVariableBonusTasks(occ, character.occSpecializationId)) {
    if (task.section !== 'vitals' || task.statKey !== 'sdc') continue
    if (occVariableResolutions[task.id] != null) continue
    if (occRollNotations.has(normalizeDiceDisplay(task.notation))) continue
    const parsed = createPhysicalPendingRoll(
      'sdc',
      'occ',
      occVarIndex,
      `O.C.C. ${task.statKey}`,
      task.notation,
      `spawn.sdc.occ.var.${task.id}`,
    )
    occVarIndex += 1
    sdcFlatFromDice += parsed.flatBonus
    addDiceContribution(sdcContributions, {
      scope: 'facade',
      bucket: 'occ',
      label: `O.C.C. ${task.statKey}`,
      notation: task.notation,
      rollId: parsed.roll.id,
      resolvedAmount: resolutions[parsed.roll.id],
    })
  }
  if (sdcContributions.length > 0 || sdcDetails.flatTotal > 0) {
    const flatBaseline = sdcDetails.flatTotal + sdcFlatFromDice
    facade.sdc = buildVitalityRow({
      id: 'sdc',
      label: 'S.D.C.',
      formScope: 'facade',
      contributions: sdcContributions,
      pendingFlatBaseline: flatBaseline,
      resolutions,
      vitalFlatTerms: sdcDetails.flatVitalTerms,
      skillFlatTerms: sdcDetails.skillFlats,
      precomputedFlatTooltip: formatVitalLedgerTooltip(
        sdcDetails.flatVitalTerms,
        [],
        sdcDetails.skillFlats,
      ),
      valueModified: flatBaseline > 0 || sdcContributions.length > 0,
    })
  }

  const ppeFormula =
    race && occ?.id?.trim() ? resolvePpeCreationFormula(race, occ) : null
  const ppeFormulaParts = resolvePpeFormulaParts(race, occ)
  const ppeDualOpts = supportsDualForm
    ? dualFormPpeLedgerFormulaOpts(effectivePe)
    : {}
  const ppeFields = buildAttrFormulaLedgerFields(ppeFormula, assignments, {
    perLevelFormula: occ?.ppeEngine?.perLevelFormula,
    formulaSources: {
      race: ppeFormulaParts.race,
      occ: ppeFormulaParts.occ,
    },
    ...ppeDualOpts,
  })
  const ppeContributions: LedgerContribution[] = []
  if (ppeFormulaParts.race) {
    addDiceRollsToContributions(
      ppeContributions,
      'facade',
      'ppe',
      'race',
      formulaDiceRolls('ppe', ppeFormulaParts.race, 'race'),
      resolutions,
    )
  }
  if (ppeFormulaParts.occ) {
    addDiceRollsToContributions(
      ppeContributions,
      'facade',
      'ppe',
      'occ',
      formulaDiceRolls('ppe', ppeFormulaParts.occ, 'occ'),
      resolutions,
    )
  }
  addDiceRollsToContributions(
    ppeContributions,
    'facade',
    'ppe',
    'occ',
    perLevelDiceRolls('ppe', occ?.ppeEngine?.perLevelFormula),
    resolutions,
  )
  if (ppeFields.hint || ppeContributions.length > 0) {
    const flatBaseline = Number(ppeFields.value) || 0
    facade.ppe = buildVitalityRow({
      id: 'ppe',
      label: 'P.P.E.',
      formScope: 'facade',
      contributions: ppeContributions,
      pendingFlatBaseline: flatBaseline,
      resolutions,
      vitalFlatTerms: ppeFields.flatTerms,
      hint: ppeFields.hint,
      precomputedFlatTooltip: ppeFields.valueModified
        ? formatVitalLedgerTooltip(ppeFields.flatTerms ?? [], [], [])
        : undefined,
      valueModified: ppeFields.valueModified,
    })
  }

  const ispFields = ispFormula
    ? buildAttrFormulaLedgerFields(ispFormula.base, assignments, {
        perLevelFormula: ispFormula.perLevel,
        hintOverride: undefined,
        formulaSources: { occ: ispFormula.base },
      })
    : null
  if (showIsp && ispFields && ispFormula) {
    const ispContributions: LedgerContribution[] = []
    addDiceRollsToContributions(
      ispContributions,
      'facade',
      'isp',
      'occ',
      formulaDiceRolls('isp', ispFormula.base, 'occ'),
      resolutions,
    )
    addDiceRollsToContributions(
      ispContributions,
      'facade',
      'isp',
      'occ',
      perLevelDiceRolls('isp', ispFormula.perLevel),
      resolutions,
    )
    if (ispFields.hint || ispContributions.length > 0) {
      const flatBaseline = Number(ispFields.value) || 0
      facade.isp = buildVitalityRow({
        id: 'isp',
        label: 'I.S.P.',
        formScope: 'facade',
        contributions: ispContributions,
        pendingFlatBaseline: flatBaseline,
        resolutions,
        vitalFlatTerms: ispFields.flatTerms,
        hint: ispFields.hint,
        precomputedFlatTooltip: ispFields.valueModified
          ? formatVitalLedgerTooltip(ispFields.flatTerms ?? [], [], [])
          : undefined,
        valueModified: ispFields.valueModified,
      })
    }
  }

  if (!supportsDualForm) {
    return { facade, morphus }
  }

  const morphusPe = resolveMorphusPeForSpawn(
    character,
    assignments,
    input.pendingAttrBonuses,
    race,
    occ,
    skillIds,
  )
  const morphHpFields = buildAttrFormulaLedgerFields(
    MORPHUS_HIT_POINTS_FORMULA,
    assignments,
    {
      hintOverride: formatHpDiceRollHint(
        MORPHUS_HIT_POINTS_FORMULA,
        MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA,
      ),
      attrScores: { pe: morphusPe },
      formulaSources: { race: MORPHUS_HIT_POINTS_FORMULA },
    },
  )
  const morphHpContributions: LedgerContribution[] = []
  addDiceRollsToContributions(
    morphHpContributions,
    'morphus',
    'morphus_hp',
    'race',
    perLevelDiceRolls('morphus_hp', MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA),
    resolutions,
  )
  morphus.morphus_hp = buildVitalityRow({
    id: 'morphus_hp',
    label: 'Morphus H.P.',
    formScope: 'morphus',
    contributions: morphHpContributions,
    pendingFlatBaseline: Number(morphHpFields.value) || 0,
    resolutions,
    vitalFlatTerms: morphHpFields.flatTerms,
    hint: morphHpFields.hint,
    precomputedFlatTooltip: formatVitalLedgerTooltip(
      morphHpFields.flatTerms ?? [],
      [],
      [],
    ),
  })

  const primarySdcBaseline = facade.sdc
    ? vitalityRowRunningTotal(facade.sdc, resolutions)
    : sdcDetails.flatTotal
  const traitSdc = buildMorphusTraitSdcBonusDetails(character)
  const morphusSdcContributions: LedgerContribution[] = []
  addDiceRollsToContributions(
    morphusSdcContributions,
    'morphus',
    'morphus_sdc',
    'race',
    formulaDiceRolls('morphus_sdc', MORPHUS_SDC_BONUS_DICE, 'base'),
    resolutions,
  )
  addTraitDiceContributions(
    morphusSdcContributions,
    'morphus',
    'morphus_sdc',
    traitSdc.diceContributions,
    resolutions,
  )
  const morphusSdcFlat = resolveMorphusSdcFlatDerivedStat({
    facadeSdcTotal: primarySdcBaseline,
    traitFlats: traitSdc.flatBreakdown,
    traitFlatFromDice: flatBonusesFromDiceContributions(traitSdc.diceContributions),
  }).total
  morphus.morphus_sdc = buildVitalityRow({
    id: 'morphus_sdc',
    label: 'Morphus S.D.C.',
    formScope: 'morphus',
    contributions: morphusSdcContributions,
    pendingFlatBaseline: morphusSdcFlat,
    resolutions,
    morphusFacadeSdc: primarySdcBaseline,
    skillFlatTerms: traitSdc.flatBreakdown,
    precomputedFlatTooltip: formatMorphusSdcValueTooltip(
      primarySdcBaseline,
      [],
      traitSdc.flatBreakdown,
    ),
    valueModified:
      morphusSdcFlat > 0 ||
      morphusSdcContributions.length > 0 ||
      traitSdc.flatBreakdown.length > 0,
  })

  const traitHf = buildMorphusTraitHorrorFactorDetails(character)
  const morphusHfContributions: LedgerContribution[] = []
  const hfDiceFlat = addTraitDiceContributions(
    morphusHfContributions,
    'morphus',
    'morphus_hf',
    traitHf.diceContributions,
    resolutions,
  )
  const hfFlatBaseline = statStackTotal(
    buildCreationStatStack({
      kind: 'horror_factor_flat',
      form: 'morphus',
      traitFlatTotal: traitHf.flatTotal,
      traitDiceFlat: hfDiceFlat,
    }),
  )
  morphus.morphus_hf = buildVitalityRow({
    id: 'morphus_hf',
    label: 'Morphus H.F.',
    formScope: 'morphus',
    contributions: morphusHfContributions,
    pendingFlatBaseline: hfFlatBaseline,
    resolutions,
    hint: 'Race baseline + trait flats',
    valueModified: hfFlatBaseline > 0 || morphusHfContributions.length > 0,
  })

  return { facade, morphus }
}

function resolveForgeEffectiveAttributeScore(
  attr: ForgeAttrKey,
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  skillIds: readonly string[],
  assignments: Partial<Record<ForgeAttrKey, number>>,
  pendingAttrBonuses: Partial<Record<ForgeAttrKey, number>>,
): number {
  const bundle = buildForgeAttributeStatBonuses(
    attr,
    race,
    occ,
    character.occSpecializationId,
    skillIds,
  )
  const pool =
    assignments[attr] ??
    (attr === 'ps' ? character.primary.attributes.ps.score : character.primary.attributes[attr])
  const variableBonus = occVariableAttributeResolution(
    attr,
    occ,
    character.occSpecializationId,
    character.creationOccVariableResolutions ?? {},
  )
  const pending = pendingAttrBonuses[attr] ?? 0
  return pool + bundle.flatTotal + variableBonus + pending
}

function resolveMorphusPeForSpawn(
  character: Character,
  assignments: Partial<Record<ForgeAttrKey, number>>,
  pendingAttrBonuses: Partial<Record<ForgeAttrKey, number>>,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  skillIds: readonly string[],
): number {
  if (character.morphusForgeState?.baseStatsApplied === true) {
    return character.morphus.attributes.pe
  }
  const effectivePrimaryPe = resolveForgeEffectiveAttributeScore(
    'pe',
    character,
    race,
    occ,
    skillIds,
    assignments,
    pendingAttrBonuses,
  )
  const baseBump = NIGHTBANE_MORPHUS_BASE_PROFILE.attributeBonuses.pe ?? 0
  return effectivePrimaryPe + baseBump
}
