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
  buildSdcStatBonusDetails,
  formatFlatValueTooltip,
  ledgerDiceGroupRowLabel,
  normalizeDiceDisplay,
  type LedgerDiceContribution,
  type LedgerFlatContribution,
  type LedgerStatDiceGroupDetail,
} from './ledgerStatBonuses'
import {
  buildAttrFormulaLedgerFields,
  diceTermsFromAttrFormula,
  resolveIspCreationFormula,
  resolvePpeCreationFormula,
} from './ledgerVitalFormula'
import { formatRaceHpRollHint } from './creationVitalityPreview'

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
  const vitalityBlocks: PendingDiceBlock[] = []

  const hpFormula = race ? (race.vitals?.hpFormula ?? 'PE + 1D6') : null
  const hpFields = buildAttrFormulaLedgerFields(hpFormula, assignments, {
    hintOverride: race ? formatRaceHpRollHint(race.vitals?.hpFormula) : undefined,
  })
  const hpDice = hpFormula ? formulaDiceRolls('hp', hpFormula, 'die') : []
  if (hpFields.hint || hpDice.length > 0) {
    vitalityBlocks.push({
      id: 'hp',
      label: 'H.P.',
      flatBaseline: Number(hpFields.value) || 0,
      flatTooltip: hpFields.valueModified ? hpFields.valueTooltip : undefined,
      hint: hpFields.hint,
      groups:
        hpDice.length > 0
          ? [
              {
                kind: 'race',
                display: hpDice.map((r) => r.notation).join(' + '),
                tooltip: hpFields.hint ? `(${hpFields.hint})` : '(Race)',
                rolls: hpDice,
              },
            ]
          : [],
    })
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
      flatTooltip: formatFlatValueTooltip(sdcDetails.flatBreakdown),
      groups: sdcGroups,
    })
  }

  const ppeFormula =
    race && occ?.id?.trim() ? resolvePpeCreationFormula(race, occ) : null
  const ppeFields = buildAttrFormulaLedgerFields(ppeFormula, assignments, {
    perLevelFormula: occ?.ppeEngine?.perLevelFormula,
  })
  const ppeDice = ppeFormula ? formulaDiceRolls('ppe', ppeFormula, 'die') : []
  if (ppeFields.hint || ppeDice.length > 0) {
    vitalityBlocks.push({
      id: 'ppe',
      label: 'P.P.E.',
      flatBaseline: Number(ppeFields.value) || 0,
      flatTooltip: ppeFields.valueModified ? ppeFields.valueTooltip : undefined,
      hint: ppeFields.hint,
      groups:
        ppeDice.length > 0
          ? [
              {
                kind: 'race',
                display: ppeFields.hint?.split(' + ').filter((p) => /D/i.test(p)).join(' + ') ?? ppeDice.map((r) => r.notation).join(' + '),
                tooltip: ppeFields.hint ? `(${ppeFields.hint})` : '(Dice)',
                rolls: ppeDice,
              },
            ]
          : [],
    })
  }

  const ispFormula = resolveIspCreationFormula(occ, psychicTier, showIsp)
  const ispFields = ispFormula
    ? buildAttrFormulaLedgerFields(ispFormula.base, assignments, {
        perLevelFormula: ispFormula.perLevel,
        hintOverride: undefined,
      })
    : null
  const ispDice = ispFormula ? formulaDiceRolls('isp', ispFormula.base, 'die') : []
  if (showIsp && ispFields && (ispFields.hint || ispDice.length > 0)) {
    vitalityBlocks.push({
      id: 'isp',
      label: 'I.S.P.',
      flatBaseline: Number(ispFields.value) || 0,
      flatTooltip: ispFields.valueModified ? ispFields.valueTooltip : undefined,
      hint: ispFields.hint,
      groups:
        ispDice.length > 0
          ? [
              {
                kind: 'occ',
                display: ispDice.map((r) => r.notation).join('+'),
                tooltip: ispFields.hint ? `(${ispFields.hint})` : '(OCC)',
                rolls: ispDice,
              },
            ]
          : [],
    })
  }

  if (opts?.supportsDualForm) {
    const morphHp = buildAttrFormulaLedgerFields('PEx3 + 2D6*4', assignments, {
      hintOverride: 'P.E. ×3 + 2D6×4 (resolve at Spawn)',
    })
    const morphSdc = buildAttrFormulaLedgerFields('PEx4 + PSx2 + 2D6*8', assignments, {
      hintOverride: 'P.E.×4 + P.S.×2 + 2D6×8 (resolve at Spawn)',
    })
    vitalityBlocks.push({
      id: 'morphus_hp',
      label: 'Morphus H.P.',
      flatBaseline: Number(morphHp.value) || 0,
      flatTooltip: morphHp.valueTooltip,
      hint: morphHp.hint,
      groups: [
        {
          kind: 'race',
          display: '2D6x4',
          tooltip: '(Morphus dice)',
          rolls: formulaDiceRolls('morphus_hp', '2D6*4', 'die'),
        },
      ],
    })
    vitalityBlocks.push({
      id: 'morphus_sdc',
      label: 'Morphus S.D.C.',
      flatBaseline: Number(morphSdc.value) || 0,
      flatTooltip: morphSdc.valueTooltip,
      hint: morphSdc.hint,
      groups: [
        {
          kind: 'race',
          display: '2D6x8',
          tooltip: '(Morphus dice)',
          rolls: formulaDiceRolls('morphus_sdc', '2D6*8', 'die'),
        },
      ],
    })
  }

  return [...attributeBlocks, ...vitalityBlocks]
}

/** Sum entered spawn attribute dice (skill + post-strip O.C.C.) per forge attribute key. */
export function sumPendingAttributeDiceBonuses(
  blocks: readonly PendingDiceBlock[],
  resolutions: Readonly<Record<string, number>>,
): Partial<Record<ForgeAttrKey, number>> {
  const out: Partial<Record<ForgeAttrKey, number>> = {}
  for (const block of blocks) {
    if (!block.id.startsWith('attr_')) continue
    const attr = block.id.slice('attr_'.length) as ForgeAttrKey
    if (!FORGE_ATTRIBUTE_KEYS.includes(attr)) continue
    let sum = 0
    for (const group of block.groups) {
      for (const roll of group.rolls) {
        const value = resolutions[roll.id]
        if (value != null && Number.isFinite(value)) sum += value
      }
    }
    if (sum !== 0) out[attr] = sum
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
