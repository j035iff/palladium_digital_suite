import type { Character, PalladiumOcc, Race } from '../types'
import { FORGE_ATTRIBUTE_KEYS, type ForgeAttrKey } from './attributeKeys'
import { diceNotationBounds } from './diceNotationBounds'
import {
  listOccVariableBonusTasks,
  listSpawnPhaseOccAttributeBonusTasks,
  occVariableAttributeResolution,
} from './occVariableBonus'
import { resolveCreationOccSkillIds } from './occCoreSkillVouchers'
import {
  flattenCreationSkillIds,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from './creationSkillPicks'
import {
  buildForgeAttributeStatBonusDetails,
  buildForgeAttributeStatBonuses,
  buildSdcStatBonusDetails,
  ledgerDiceGroupRowLabel,
  normalizeDiceDisplay,
  formatFlatValueTooltip,
  type LedgerDiceContribution,
  type LedgerFlatContribution,
  type LedgerStatDiceGroupDetail,
} from './ledgerStatBonuses'
import {
  buildAttrFormulaLedgerFields,
  diceTermsFromAttrFormula,
  dualFormPpeLedgerFormulaOpts,
  formatVitalDiceTooltipTerm,
  formatVitalLedgerTooltip,
  formatMorphusSdcValueTooltip,
  hitPointsPerLevelDiceFormula,
  resolveIspCreationFormula,
  resolvePpeCreationFormula,
  resolvePpeFormulaParts,
  type VitalAttrFlatTerm,
  type VitalDiceTooltipTerm,
} from './ledgerVitalFormula'
import { FACADE_LABEL } from './creationFormLabels'
import { formatRaceHpRollHint } from './creationVitalityPreview'
import { isDiceNotation } from './diceNotationBounds'
import {
  MORPHUS_HIT_POINTS_FORMULA,
  MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA,
  MORPHUS_SDC_BONUS_DICE,
  NIGHTBANE_MORPHUS_BASE_PROFILE,
} from './morphusNightbaneBase'
import { buildMorphusTraitSdcBonusDetails } from './morphusCreationLedger'

export type PendingDiceRoll = {
  id: string
  notation: string
  min: number
  max: number
  source: string
}

export type PendingDiceGroup = {
  kind: 'race' | 'occ' | 'skills'
  display: string
  tooltip: string
  rolls: PendingDiceRoll[]
}

export type PendingDiceBlock = {
  id: string
  label: string
  flatBaseline: number
  flatTooltip?: string
  flatTerms?: VitalAttrFlatTerm[]
  skillFlatTerms?: LedgerFlatContribution[]
  /** Facade S.D.C. total carried into Morphus S.D.C. (dual-form only). */
  morphusFacadeSdc?: number
  hint?: string
  groups: PendingDiceGroup[]
}

const ATTR_BLOCK_LABELS: Record<ForgeAttrKey, string> = {
  iq: 'I.Q.',
  me: 'M.E.',
  ma: 'M.A.',
  ps: 'P.S.',
  pp: 'P.P.',
  pe: 'P.E.',
  pb: 'P.B.',
  spd: 'Spd',
}

function rollFromContribution(
  blockId: string,
  groupKind: string,
  index: number,
  contribution: LedgerDiceContribution,
): PendingDiceRoll {
  const bounds = diceNotationBounds(contribution.notation)
  return {
    id: `spawn.${blockId}.${groupKind}.${index}`,
    notation: normalizeDiceDisplay(contribution.notation),
    min: bounds.min,
    max: bounds.max,
    source: contribution.label,
  }
}

function groupFromLedgerDetail(
  blockId: string,
  group: LedgerStatDiceGroupDetail,
): PendingDiceGroup {
  return {
    kind: group.kind,
    display: group.display,
    tooltip: group.tooltip,
    rolls: group.contributions.map((contribution, index) =>
      rollFromContribution(blockId, group.kind, index, contribution),
    ),
  }
}

function racePpeFormulaPart(race: Race | undefined): string | null {
  return resolvePpeFormulaParts(race, undefined).race ?? null
}

/** Entered vitality dice with Race / O.C.C. / per-level labels for ledger tooltips. */
export function collectVitalityDiceTooltipTerms(
  block: PendingDiceBlock,
  resolutions: Readonly<Record<string, number>>,
): VitalDiceTooltipTerm[] {
  const out: VitalDiceTooltipTerm[] = []
  for (const group of block.groups) {
    for (const roll of group.rolls) {
      const value = resolutions[roll.id]
      if (value == null || !Number.isFinite(value)) continue
      if (roll.id.includes('.per_level.')) {
        out.push({ kind: 'perLevel', notation: roll.notation, amount: value })
        continue
      }
      if (group.kind === 'race') {
        out.push({ kind: 'raceRoll', notation: roll.notation, amount: value })
      } else if (group.kind === 'occ') {
        out.push({ kind: 'occRoll', notation: roll.notation, amount: value })
      } else {
        out.push({
          kind: 'skillRoll',
          label: roll.source,
          notation: roll.notation,
          amount: value,
        })
      }
    }
  }
  return out
}

export function formatVitalityBlockValueTooltip(
  flatTerms: readonly VitalAttrFlatTerm[],
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
  skillFlats: readonly LedgerFlatContribution[] = [],
): string | undefined {
  if (block?.id === 'morphus_sdc') {
    return formatMorphusSdcValueTooltip(
      block.morphusFacadeSdc ?? 0,
      block ? collectVitalityDiceTooltipTerms(block, resolutions) : [],
      [...skillFlats, ...(block.skillFlatTerms ?? [])],
    )
  }
  const diceTerms = block ? collectVitalityDiceTooltipTerms(block, resolutions) : []
  const mergedSkillFlats = [
    ...skillFlats,
    ...(block?.skillFlatTerms ?? []),
  ]
  return formatVitalLedgerTooltip(flatTerms, diceTerms, mergedSkillFlats)
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

function appendPerLevelRolls(
  block: PendingDiceBlock,
  perLevelFormula: string | undefined,
  kind: PendingDiceGroup['kind'] = 'occ',
): PendingDiceBlock {
  const rolls = perLevelDiceRolls(block.id, perLevelFormula)
  if (!rolls.length) return block
  return {
    ...block,
    groups: [
      ...block.groups,
      {
        kind,
        display: `${rolls[0]!.notation}/level`,
        tooltip: `(Per level: ${rolls[0]!.notation})`,
        rolls,
      },
    ],
  }
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

function buildAttributePendingDiceBlocks(
  character: Character,
  occ: PalladiumOcc | undefined,
  skillIds: readonly string[],
): PendingDiceBlock[] {
  const assignments = character.creationAttributeAssignments ?? {}
  const variableResolutions = character.creationOccVariableResolutions ?? {}
  const blocks: PendingDiceBlock[] = []

  const spawnOccTasksByAttr = new Map<string, ReturnType<typeof listSpawnPhaseOccAttributeBonusTasks>>()
  for (const task of listSpawnPhaseOccAttributeBonusTasks(
    occ,
    character.occSpecializationId,
  )) {
    if (variableResolutions[task.id] != null) continue
    const list = spawnOccTasksByAttr.get(task.statKey) ?? []
    list.push(task)
    spawnOccTasksByAttr.set(task.statKey, list)
  }

  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const details = buildForgeAttributeStatBonusDetails(
      attr,
      occ,
      character.occSpecializationId,
      skillIds,
    )
    const skillGroup = details.diceGroups.find((group) => group.kind === 'skills')
    const spawnOccTasks = spawnOccTasksByAttr.get(attr === 'ps' ? 'ps' : attr) ?? []
    const blockId = `attr_${attr}`
    const groups: PendingDiceGroup[] = []

    if (spawnOccTasks.length > 0) {
      const contributions: LedgerDiceContribution[] = spawnOccTasks.map((task) => ({
        notation: task.notation,
        label: 'O.C.C. bonus',
      }))
      groups.push({
        kind: 'occ',
        display: contributions.map((c) => normalizeDiceDisplay(c.notation)).join('+'),
        tooltip: `(${contributions.map((c) => `O.C.C. bonus: ${normalizeDiceDisplay(c.notation)}`).join(', ')})`,
        rolls: contributions.map((contribution, index) =>
          rollFromContribution(blockId, 'occ', index, contribution),
        ),
      })
    }

    if (skillGroup && skillGroup.contributions.length > 0) {
      groups.push(groupFromLedgerDetail(blockId, skillGroup))
    }

    if (groups.length === 0) continue

    const poolRoll = assignments[attr]
    const pool = poolRoll != null && Number.isFinite(poolRoll) ? poolRoll : 0
    const variableBonus = occVariableAttributeResolution(
      attr,
      occ,
      character.occSpecializationId,
      variableResolutions,
    )
    const flatParts: LedgerFlatContribution[] = []
    if (pool > 0) flatParts.push({ label: 'Pool roll', amount: pool })
    if (variableBonus > 0) flatParts.push({ label: 'O.C.C. dice', amount: variableBonus })
    flatParts.push(...details.flatBreakdown)

    blocks.push({
      id: blockId,
      label: ATTR_BLOCK_LABELS[attr],
      flatBaseline: pool + details.flatTotal + variableBonus,
      flatTooltip: formatFlatValueTooltip(flatParts),
      groups,
    })
  }

  return blocks
}

function resolveCreationSkillIds(character: Character, occ?: PalladiumOcc): string[] {
  if (!occ) return []
  return resolveCreationOccSkillIds(
    occ,
    character.occSpecializationId,
    character.creationOccSkillIds ?? [],
    character.creationOccCoreVoucherPicks ?? {},
  )
    .concat(flattenCreationSkillIds(getCreationRelatedPicks(character)))
    .concat(flattenCreationSkillIds(getCreationSecondaryPicks(character)))
}

/** Spawn dice grouped to mirror the live ledger (flat baseline + Race/OCC/Skills dice rows). */
export function buildPendingDiceBlocks(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts?: { supportsDualForm?: boolean; psychicTier?: string },
): PendingDiceBlock[] {
  const assignments = character.creationAttributeAssignments ?? {}
  const resolutions = character.creationOccVariableResolutions ?? {}
  const psychicTier = opts?.psychicTier ?? 'none'
  const showIsp =
    psychicTier !== 'none' || character.psychicGateBypassed === true
  const skillIds = resolveCreationSkillIds(character, occ)
  const attributeBlocks = buildAttributePendingDiceBlocks(character, occ, skillIds)
  const pendingAttrBonuses = sumPendingAttributeDiceBonuses(
    attributeBlocks,
    character.creationPendingDiceResolutions ?? {},
  )
  const effectivePe = resolveForgeEffectiveAttributeScore(
    'pe',
    character,
    race,
    occ,
    skillIds,
    assignments,
    pendingAttrBonuses,
  )
  const vitalityBlocks: PendingDiceBlock[] = []

  const hpFormula = race ? (race.vitals?.hpFormula ?? 'PE + 1D6') : null
  const hpPerLevel = hitPointsPerLevelDiceFormula(hpFormula)
  const hpFields = buildAttrFormulaLedgerFields(hpFormula, assignments, {
    hintOverride: race ? formatRaceHpRollHint(race.vitals?.hpFormula) : undefined,
    formulaSources: hpFormula ? { race: hpFormula } : undefined,
  })
  if (hpFields.hint || hpPerLevel) {
    vitalityBlocks.push(
      appendPerLevelRolls(
        {
          id: 'hp',
          label: 'H.P.',
          flatBaseline: Number(hpFields.value) || 0,
          flatTooltip: hpFields.valueModified ? hpFields.valueTooltip : undefined,
          flatTerms: hpFields.flatTerms,
          hint: hpFields.hint,
          groups: [],
        },
        hpPerLevel,
        'race',
      ),
    )
  }

  const sdcDetails = buildSdcStatBonusDetails(
    race,
    occ,
    character.occSpecializationId,
    skillIds,
    resolutions,
  )
  const sdcGroups = sdcDetails.diceGroups.map((group) =>
    groupFromLedgerDetail('sdc', group),
  )
  const occRollNotations = new Set(
    sdcDetails.diceGroups
      .filter((group) => group.kind === 'occ')
      .flatMap((group) =>
        group.contributions.map((contribution) =>
          normalizeDiceDisplay(contribution.notation),
        ),
      ),
  )
  for (const task of listOccVariableBonusTasks(occ, character.occSpecializationId)) {
    if (task.section !== 'vitals' || task.statKey !== 'sdc') continue
    if (resolutions[task.id] != null) continue
    if (occRollNotations.has(normalizeDiceDisplay(task.notation))) continue
    const bounds = diceNotationBounds(task.notation)
    const occGroup = sdcGroups.find((g) => g.kind === 'occ')
    const roll: PendingDiceRoll = {
      id: `spawn.sdc.occ.var.${task.id}`,
      notation: normalizeDiceDisplay(task.notation),
      min: bounds.min,
      max: bounds.max,
      source: `O.C.C. ${task.statKey}`,
    }
    if (occGroup) {
      occGroup.rolls.push(roll)
      occGroup.display = [occGroup.display, roll.notation].filter(Boolean).join('+')
    } else {
      sdcGroups.push({
        kind: 'occ',
        display: roll.notation,
        tooltip: `(O.C.C.: ${roll.notation})`,
        rolls: [roll],
      })
    }
  }
  if (sdcGroups.length > 0 || sdcDetails.flatTotal > 0) {
    vitalityBlocks.push({
      id: 'sdc',
      label: 'S.D.C.',
      flatBaseline: sdcDetails.flatTotal,
      flatTooltip: formatVitalLedgerTooltip(
        sdcDetails.flatVitalTerms,
        [],
        sdcDetails.skillFlats,
      ),
      flatTerms: sdcDetails.flatVitalTerms,
      skillFlatTerms: sdcDetails.skillFlats,
      groups: sdcGroups,
    })
  }

  const ppeFormula =
    race && occ?.id?.trim() ? resolvePpeCreationFormula(race, occ) : null
  const racePpePart = racePpeFormulaPart(race)
  const occPpePart = occ?.ppeEngine?.baseFormula?.trim() || null
  const ppeDualOpts = opts?.supportsDualForm
    ? dualFormPpeLedgerFormulaOpts(effectivePe)
    : {}
  const ppeFields = buildAttrFormulaLedgerFields(ppeFormula, assignments, {
    perLevelFormula: occ?.ppeEngine?.perLevelFormula,
    formulaSources: {
      race: racePpePart,
      occ: occPpePart,
    },
    ...ppeDualOpts,
  })
  const ppeRaceDice = racePpePart ? formulaDiceRolls('ppe', racePpePart, 'race') : []
  const ppeOccDice = occPpePart ? formulaDiceRolls('ppe', occPpePart, 'occ') : []
  const ppeGroups: PendingDiceGroup[] = []
  if (ppeRaceDice.length > 0) {
    ppeGroups.push({
      kind: 'race',
      display: ppeRaceDice.map((roll) => roll.notation).join(' + '),
      tooltip: racePpePart ? `(${normalizeDiceDisplay(racePpePart)})` : '(Race)',
      rolls: ppeRaceDice,
    })
  }
  if (ppeOccDice.length > 0) {
    ppeGroups.push({
      kind: 'occ',
      display: ppeOccDice.map((roll) => roll.notation).join(' + '),
      tooltip: occPpePart ? `(${normalizeDiceDisplay(occPpePart)})` : '(O.C.C.)',
      rolls: ppeOccDice,
    })
  }
  if (ppeFields.hint || ppeGroups.length > 0) {
    vitalityBlocks.push(
      appendPerLevelRolls(
        {
          id: 'ppe',
          label: 'P.P.E.',
          flatBaseline: Number(ppeFields.value) || 0,
          flatTooltip: ppeFields.valueModified ? ppeFields.valueTooltip : undefined,
          flatTerms: ppeFields.flatTerms,
          hint: ppeFields.hint,
          groups: ppeGroups,
        },
        occ?.ppeEngine?.perLevelFormula,
      ),
    )
  }

  const ispFormula = resolveIspCreationFormula(occ, psychicTier, showIsp)
  const ispFields = ispFormula
    ? buildAttrFormulaLedgerFields(ispFormula.base, assignments, {
        perLevelFormula: ispFormula.perLevel,
        hintOverride: undefined,
        formulaSources: { occ: ispFormula.base },
      })
    : null
  const ispDice = ispFormula ? formulaDiceRolls('isp', ispFormula.base, 'occ') : []
  if (showIsp && ispFields && (ispFields.hint || ispDice.length > 0)) {
    vitalityBlocks.push(
      appendPerLevelRolls(
        {
          id: 'isp',
          label: 'I.S.P.',
          flatBaseline: Number(ispFields.value) || 0,
          flatTooltip: ispFields.valueModified ? ispFields.valueTooltip : undefined,
          flatTerms: ispFields.flatTerms,
          hint: ispFields.hint,
          groups:
            ispDice.length > 0
              ? [
                  {
                    kind: 'occ',
                    display: ispDice.map((r) => r.notation).join('+'),
                    tooltip: ispFields.hint ? `(${ispFields.hint})` : '(O.C.C.)',
                    rolls: ispDice,
                  },
                ]
              : [],
        },
        ispFormula?.perLevel,
      ),
    )
  }

  if (opts?.supportsDualForm) {
    const morphusPe = resolveMorphusPeForSpawn(
      character,
      assignments,
      pendingAttrBonuses,
      race,
      occ,
      skillIds,
    )
    const morphHp = buildAttrFormulaLedgerFields(MORPHUS_HIT_POINTS_FORMULA, assignments, {
      hintOverride: `P.E. ×2 + ${normalizeDiceDisplay(MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA)}/level`,
      attrScores: { pe: morphusPe },
      formulaSources: { race: MORPHUS_HIT_POINTS_FORMULA },
    })
    const pendingResolutions = character.creationPendingDiceResolutions ?? {}
    const primarySdcBlock = vitalityBlocks.find((block) => block.id === 'sdc')
    const primarySdcBaseline = primarySdcBlock
      ? pendingDiceBlockRunningTotal(primarySdcBlock, pendingResolutions)
      : sdcDetails.flatTotal
    const traitSdc = buildMorphusTraitSdcBonusDetails(character)
    const morphusSdcRolls = formulaDiceRolls('morphus_sdc', MORPHUS_SDC_BONUS_DICE, 'base')
    const traitSdcRolls = traitSdc.diceContributions.map((contribution, index) => {
      const bounds = diceNotationBounds(contribution.notation)
      return {
        id: `spawn.morphus_sdc.trait.${index}`,
        notation: normalizeDiceDisplay(contribution.notation),
        min: bounds.min,
        max: bounds.max,
        source: contribution.label,
      }
    })
    const morphusSdcGroups: PendingDiceGroup[] = []
    if (morphusSdcRolls.length > 0) {
      morphusSdcGroups.push({
        kind: 'race',
        display: normalizeDiceDisplay(MORPHUS_SDC_BONUS_DICE),
        tooltip: '(Morphus base dice)',
        rolls: morphusSdcRolls,
      })
    }
    if (traitSdcRolls.length > 0) {
      morphusSdcGroups.push({
        kind: 'skills',
        display: traitSdcRolls.map((roll) => roll.notation).join(' + '),
        tooltip: `(${traitSdc.diceContributions
          .map((row) => `${row.label}: ${normalizeDiceDisplay(row.notation)}`)
          .join(', ')})`,
        rolls: traitSdcRolls,
      })
    }
    vitalityBlocks.push(
      appendPerLevelRolls(
        {
          id: 'morphus_hp',
          label: 'Morphus H.P.',
          flatBaseline: Number(morphHp.value) || 0,
          flatTooltip: morphHp.valueTooltip,
          flatTerms: morphHp.flatTerms,
          hint: morphHp.hint,
          groups: [],
        },
        MORPHUS_HIT_POINTS_PER_LEVEL_FORMULA,
        'race',
      ),
    )
    vitalityBlocks.push({
      id: 'morphus_sdc',
      label: 'Morphus S.D.C.',
      flatBaseline: primarySdcBaseline + traitSdc.flatTotal,
      morphusFacadeSdc: primarySdcBaseline,
      skillFlatTerms: traitSdc.flatBreakdown,
      flatTooltip: formatMorphusSdcValueTooltip(
        primarySdcBaseline,
        [],
        traitSdc.flatBreakdown,
      ),
      hint: `${FACADE_LABEL} + ${normalizeDiceDisplay(MORPHUS_SDC_BONUS_DICE)} + traits`,
      groups: morphusSdcGroups,
    })
  }

  return [...attributeBlocks, ...vitalityBlocks]
}

export type PendingDiceBlockScope = 'primary' | 'morphus' | 'all'

export function filterPendingDiceBlocksByScope(
  blocks: readonly PendingDiceBlock[],
  scope: PendingDiceBlockScope,
): PendingDiceBlock[] {
  if (scope === 'all') return [...blocks]
  if (scope === 'primary') {
    return blocks.filter((block) => !block.id.startsWith('morphus_'))
  }
  return blocks.filter((block) => block.id.startsWith('morphus_'))
}

/** Sum entered spawn attribute dice (skill + post-strip O.C.C.) per forge attribute key. */
export function sumPendingAttributeDiceBonuses(
  blocks: readonly PendingDiceBlock[],
  resolutions: Readonly<Record<string, number>>,
): Partial<Record<ForgeAttrKey, number>> {
  const breakdown = pendingAttributeDiceBreakdown(blocks, resolutions)
  const out: Partial<Record<ForgeAttrKey, number>> = {}
  for (const [attr, rolls] of Object.entries(breakdown)) {
    const sum = rolls.reduce((total, roll) => total + roll.amount, 0)
    if (sum !== 0) out[attr as ForgeAttrKey] = sum
  }
  return out
}

/** Per-source entered attribute dice for ledger value tooltips. */
export function pendingAttributeDiceBreakdown(
  blocks: readonly PendingDiceBlock[],
  resolutions: Readonly<Record<string, number>>,
): Partial<Record<ForgeAttrKey, LedgerFlatContribution[]>> {
  const out: Partial<Record<ForgeAttrKey, LedgerFlatContribution[]>> = {}
  for (const block of blocks) {
    if (!block.id.startsWith('attr_')) continue
    const attr = block.id.slice('attr_'.length) as ForgeAttrKey
    if (!FORGE_ATTRIBUTE_KEYS.includes(attr)) continue
    const rolls = collectEnteredPendingDiceContributions(block, resolutions)
    if (rolls.length > 0) out[attr] = rolls
  }
  return out
}

/** Entered spawn dice rolls with catalog source labels (for ledger tooltips). */
export function collectEnteredPendingDiceContributions(
  block: PendingDiceBlock | undefined,
  resolutions: Readonly<Record<string, number>>,
): LedgerFlatContribution[] {
  if (!block) return []
  const out: LedgerFlatContribution[] = []
  for (const group of block.groups) {
    for (const roll of group.rolls) {
      const value = resolutions[roll.id]
      if (value == null || !Number.isFinite(value)) continue
      out.push({ label: roll.source, amount: value, notation: roll.notation })
    }
  }
  return out
}

export function flattenPendingDiceRolls(
  blocks: readonly PendingDiceBlock[],
): PendingDiceRoll[] {
  return blocks.flatMap((block) => block.groups.flatMap((group) => group.rolls))
}

export function pendingDiceBlockRunningTotal(
  block: PendingDiceBlock,
  resolutions: Readonly<Record<string, number>>,
): number {
  let total = block.flatBaseline
  for (const group of block.groups) {
    for (const roll of group.rolls) {
      const value = resolutions[roll.id]
      if (value != null && Number.isFinite(value)) {
        total += value
      }
    }
  }
  return total
}

export function pendingDiceBlocksComplete(
  blocks: readonly PendingDiceBlock[],
  resolutions: Readonly<Record<string, number>>,
): boolean {
  const rolls = flattenPendingDiceRolls(blocks)
  return rolls.every((roll) => {
    const value = resolutions[roll.id]
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= roll.min &&
      value <= roll.max
    )
  })
}

export function formatPendingDiceGroupLabel(kind: PendingDiceGroup['kind']): string {
  return ledgerDiceGroupRowLabel(kind)
}
