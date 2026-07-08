/**
 * Single resolution pass for creation Live Ledger + Review tab (Pillar 9).
 * Facade rows resolve first; Morphus rows build on Facade totals.
 */
import type { Character, MorphusStatModifiers, PalladiumOcc, Race } from '../types'
import { FORGE_ATTRIBUTE_KEYS, type ForgeAttrKey } from './attributeKeys'
import { raceAttrNotation } from './creationAttributeSync'
import {
  buildForgeAttributeStatBonusDetails,
  buildLedgerDiceGroup,
  formatFlatValueTooltip,
  normalizeDiceDisplay,
  type LedgerStatDiceGroupDetail,
} from './ledgerStatBonuses'
import {
  listSpawnPhaseOccAttributeBonusTasks,
  occVariableAttributeResolution,
} from './occVariableBonus'
import {
  collectMorphusExclusiveSkillIds,
  collectMorphusTraitStatDiceContributions,
  morphusTraitAttributeFlatBonus,
  resolveMorphusAttributeTotal,
} from './morphusCreationLedger'
import { NIGHTBANE_MORPHUS_BASE_PROFILE } from './morphusNightbaneBase'
import { applyMorphusAttributeMinFloor } from './morphusPolymorphicResolver'
import { nightbaneMorphusAttributeBump, morphusAttributeFlatBaseline } from './creationStatEngine'
import { createPhysicalPendingRoll } from './creationPhysicalDice'
import type { PendingDiceBlock, PendingDiceGroup } from './spawnDiceBlocks'
import { FACADE_LABEL } from './creationFormLabels'
import {
  addDiceContribution,
  projectStackLine,
  resolveStackLedgerRow,
  sumResolvedRowTotal,
  type CreationLedgerResolutionContext,
  type LedgerContribution,
  type ResolvedLedgerRow,
} from './ledgerRowResolution'

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

function addDiceGroupContributions(
  contributions: LedgerContribution[],
  scope: ResolvedLedgerRow['formScope'],
  blockId: string,
  group: LedgerStatDiceGroupDetail,
  resolutions: Readonly<Record<string, number>>,
): void {
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
}

export function resolveFacadeAttributeRow(
  attr: ForgeAttrKey,
  character: Character,
  occ: PalladiumOcc | undefined,
  skillIds: readonly string[],
  resolutions: Readonly<Record<string, number>>,
  race?: Race,
): ResolvedLedgerRow {
  const blockId = `attr_${attr}`
  const contributions: LedgerContribution[] = []
  const assignments = character.creationAttributeAssignments ?? {}
  const variableResolutions = character.creationOccVariableResolutions ?? {}
  const details = buildForgeAttributeStatBonusDetails(
    attr,
    occ,
    character.occSpecializationId,
    skillIds,
  )

  const poolRoll = assignments[attr]
  if (poolRoll != null && Number.isFinite(poolRoll)) {
    contributions.push({
      kind: 'pool_roll',
      scope: 'facade',
      label: 'Roll',
      amount: poolRoll,
    })
  }

  for (const flat of details.flatBreakdown) {
    contributions.push({
      kind: 'flat',
      scope: 'facade',
      label: flat.label,
      amount: flat.amount,
      notation: flat.notation,
    })
  }

  const variableBonus = occVariableAttributeResolution(
    attr,
    occ,
    character.occSpecializationId,
    variableResolutions,
  )
  if (variableBonus > 0) {
    contributions.push({
      kind: 'occ_variable',
      scope: 'facade',
      label: 'O.C.C. dice',
      amount: variableBonus,
    })
  }

  const spawnOccTasks = listSpawnPhaseOccAttributeBonusTasks(
    occ,
    character.occSpecializationId,
  ).filter((task) => task.statKey === (attr === 'ps' ? 'ps' : attr))

  const existingOccNotations = new Set(
    details.diceGroups
      .filter((g) => g.kind === 'occ')
      .flatMap((g) => g.contributions.map((c) => normalizeDiceDisplay(c.notation))),
  )

  let occIndex =
    details.diceGroups.find((g) => g.kind === 'occ')?.contributions.length ?? 0
  for (const task of spawnOccTasks) {
    if (variableResolutions[task.id] != null) continue
    if (existingOccNotations.has(normalizeDiceDisplay(task.notation))) continue
    const parsed = createPhysicalPendingRoll(
      blockId,
      'occ',
      occIndex,
      'O.C.C. bonus',
      task.notation,
    )
    occIndex += 1
    addDiceContribution(contributions, {
      scope: 'facade',
      bucket: 'occ',
      label: 'O.C.C. bonus',
      notation: task.notation,
      rollId: parsed.roll.id,
      resolvedAmount: resolutions[parsed.roll.id],
    })
  }

  for (const group of details.diceGroups) {
    addDiceGroupContributions(contributions, 'facade', blockId, group, resolutions)
  }

  const total = sumResolvedRowTotal(
    { formScope: 'facade', contributions } as ResolvedLedgerRow,
    ['facade'],
  )
  const hasFlatOrDice =
    details.flatTotal !== 0 || variableBonus !== 0 || details.diceGroups.length > 0
  const hasPool = poolRoll != null

  const hasEnteredDice = contributions.some(
    (c) => c.kind === 'dice_entered' && c.scope === 'facade',
  )

  return {
    id: blockId,
    label: ATTR_BLOCK_LABELS[attr],
    formScope: 'facade',
    section: 'attribute',
    contributions,
    total: hasPool || hasFlatOrDice || hasEnteredDice ? total : null,
    valueModified:
      (details.flatTotal !== 0 ||
        variableBonus !== 0 ||
        hasEnteredDice ||
        details.diceGroups.length > 0) &&
      (hasPool || hasFlatOrDice),
    inlineRaceRoll: race ? raceAttrNotation(race.attributes, attr) : undefined,
  }
}

export function resolveMorphusAttributeRow(
  attr: ForgeAttrKey,
  character: Character,
  facadeRow: ResolvedLedgerRow,
  facadeTotal: number | null,
  skillIds: readonly string[],
  resolutions: Readonly<Record<string, number>>,
  pendingMorphusTotal?: number | null,
): ResolvedLedgerRow {
  const blockId = `morphus_attr_${attr}`
  const contributions: LedgerContribution[] = []

  if (facadeTotal != null) {
    contributions.push({
      kind: 'facade_base',
      scope: 'morphus',
      label: FACADE_LABEL,
      amount: facadeTotal,
    })
  }

  const { morphusDeltas, pendingMinFloor } = resolveMorphusAttributeTotal(
    character,
    attr,
    facadeTotal,
    NIGHTBANE_MORPHUS_BASE_PROFILE,
    0,
  )
  for (const delta of morphusDeltas) {
    contributions.push({
      kind: 'flat',
      scope: 'morphus',
      label: delta.label,
      amount: delta.amount,
    })
  }

  const traitContributions = collectMorphusTraitStatDiceContributions(
    character,
    attr as keyof MorphusStatModifiers,
  )
  traitContributions.forEach((contribution, index) => {
    const parsed = createPhysicalPendingRoll(
      blockId,
      'traits',
      index,
      contribution.label,
      contribution.notation,
    )
    addDiceContribution(contributions, {
      scope: 'morphus',
      bucket: 'traits',
      label: contribution.label,
      notation: contribution.notation,
      rollId: parsed.roll.id,
      resolvedAmount: resolutions[parsed.roll.id],
    })
  })

  const exclusiveIds = collectMorphusExclusiveSkillIds(character, skillIds)
  if (exclusiveIds.length > 0) {
    const exclusiveDetails = buildForgeAttributeStatBonusDetails(
      attr,
      undefined,
      undefined,
      exclusiveIds,
    )
    const skillGroup = exclusiveDetails.diceGroups.find((g) => g.kind === 'skills')
    if (skillGroup) {
      addDiceGroupContributions(contributions, 'morphus', blockId, skillGroup, resolutions)
    }
    for (const flat of exclusiveDetails.flatBreakdown) {
      contributions.push({
        kind: 'flat',
        scope: 'morphus',
        label: flat.label,
        amount: flat.amount,
      })
    }
  }

  const resolvedFromContributions =
    facadeTotal != null
      ? sumResolvedRowTotal({ formScope: 'morphus', contributions } as ResolvedLedgerRow, [
          'facade',
          'morphus',
        ])
      : null

  let total = resolvedFromContributions
  const finalized = character.creationTraitForgeStubComplete === true
  if (total != null && pendingMinFloor != null) {
    total = applyMorphusAttributeMinFloor(
      total,
      finalized ? pendingMinFloor : undefined,
    )
  }

  const traitFlat = morphusTraitAttributeFlatBonus(character, attr, facadeTotal)
  const bump = nightbaneMorphusAttributeBump(attr)
  const pendingFlatBaseline =
    facadeTotal != null
      ? morphusAttributeFlatBaseline(facadeTotal, bump, traitFlat)
      : undefined

  return {
    id: blockId,
    label: facadeRow.label,
    formScope: 'morphus',
    section: 'attribute',
    contributions,
    total,
    pendingFlatBaseline,
    valueModified:
      (facadeTotal != null && total != null && total !== facadeTotal) ||
      traitContributions.length > 0 ||
      exclusiveIds.length > 0 ||
      bump !== 0 ||
      traitFlat !== 0,
    labelSuffix: facadeRow.labelSuffix,
  }
}

export function projectPendingDiceBlockFromRow(
  row: ResolvedLedgerRow,
): PendingDiceBlock | null {
  const pending = row.contributions.filter(
    (c) =>
      (c.kind === 'dice_pending' || c.kind === 'dice_entered') &&
      c.scope === row.formScope &&
      c.rollId,
  )
  const hasFlat = row.contributions.some(
    (c) =>
      c.scope === row.formScope &&
      (c.kind === 'pool_roll' || c.kind === 'flat' || c.kind === 'occ_variable') &&
      (c.amount ?? 0) !== 0,
  )

  if (
    pending.length === 0 &&
    !row.hint &&
    !hasFlat &&
    !row.vitalFlatTerms?.length &&
    !row.skillFlatTerms?.length
  ) {
    return null
  }

  const byBucket = new Map<string, typeof pending>()
  for (const c of pending) {
    if (!c.bucket) continue
    const list = byBucket.get(c.bucket) ?? []
    list.push(c)
    byBucket.set(c.bucket, list)
  }

  const groups: PendingDiceGroup[] = []
  const isPerLevelRoll = (rollId?: string) => rollId?.includes('.per_level.') ?? false

  for (const kind of ['race', 'occ', 'skills', 'traits'] as const) {
    const contribs = byBucket.get(kind)
    if (!contribs?.length) continue

    const perLevel = contribs.filter((c) => isPerLevelRoll(c.rollId))
    const regular = contribs.filter((c) => !isPerLevelRoll(c.rollId))

    if (regular.length > 0) {
      const diceContribs = regular.map((c) => ({
        notation: c.notation ?? '',
        label: c.label,
      }))
      const displayGroup = buildLedgerDiceGroup(kind, diceContribs)
      if (displayGroup) {
        groups.push({
          kind,
          display: displayGroup.display,
          tooltip: displayGroup.tooltip,
          rolls: regular.map((c, index) => {
            const { roll } = createPhysicalPendingRoll(
              row.id,
              kind,
              index,
              c.label,
              c.notation ?? '',
              c.rollId,
            )
            return { ...roll, groupKind: kind, isPerLevel: false }
          }),
        })
      }
    }

    if (perLevel.length > 0) {
      const notation = normalizeDiceDisplay(perLevel[0]!.notation ?? '')
      groups.push({
        kind,
        display: `${notation}/level`,
        tooltip: '',
        rolls: perLevel.map((c) => {
          const { roll } = createPhysicalPendingRoll(
            row.id,
            kind,
            0,
            c.label,
            c.notation ?? '',
            c.rollId,
          )
          return { ...roll, groupKind: kind, isPerLevel: true }
        }),
      })
    }
  }

  const flatParts = row.contributions
    .filter(
      (c) =>
        c.scope === row.formScope &&
        (c.kind === 'flat' || c.kind === 'pool_roll' || c.kind === 'occ_variable') &&
        (c.amount ?? 0) !== 0,
    )
    .map((c) => ({ label: c.label, amount: c.amount ?? 0 }))

  const flatBaseline = row.pendingFlatBaseline ?? row.total ?? sumResolvedRowTotal(row)

  const poolRoll = row.contributions.find(
    (c) => c.kind === 'pool_roll' && c.scope === row.formScope,
  )?.amount
  const rollAnchor =
    row.section === 'attribute' && poolRoll != null && Number.isFinite(poolRoll)
      ? poolRoll
      : row.section === 'attribute' &&
          row.pendingFlatBaseline != null &&
          Number.isFinite(row.pendingFlatBaseline)
        ? row.pendingFlatBaseline
        : undefined

  return {
    id: row.id,
    label: row.label,
    flatBaseline,
    rollAnchor,
    flatTooltip:
      row.precomputedFlatTooltip ??
      (flatParts.length > 0 ? formatFlatValueTooltip(flatParts) : undefined),
    flatTerms: row.vitalFlatTerms,
    skillFlatTerms: row.skillFlatTerms,
    morphusFacadeSdc: row.morphusFacadeSdc,
    hint: row.hint,
    groups,
  }
}

export function resolveFacadeAttributeRows(
  character: Character,
  occ: PalladiumOcc | undefined,
  skillIds: readonly string[],
  race?: Race,
): Partial<Record<ForgeAttrKey, ResolvedLedgerRow>> {
  const resolutions = character.creationPendingDiceResolutions ?? {}
  const out: Partial<Record<ForgeAttrKey, ResolvedLedgerRow>> = {}
  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    out[attr] = resolveFacadeAttributeRow(
      attr,
      character,
      occ,
      skillIds,
      resolutions,
      race,
    )
  }
  return out
}

export function resolveMorphusAttributeRows(
  character: Character,
  facadeRows: Partial<Record<ForgeAttrKey, ResolvedLedgerRow>>,
  skillIds: readonly string[],
  pendingMorphusTotals: Partial<Record<ForgeAttrKey, number>> = {},
): Partial<Record<ForgeAttrKey, ResolvedLedgerRow>> {
  const resolutions = character.creationPendingDiceResolutions ?? {}
  const out: Partial<Record<ForgeAttrKey, ResolvedLedgerRow>> = {}
  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const facadeRow = facadeRows[attr]
    if (!facadeRow) continue
    out[attr] = resolveMorphusAttributeRow(
      attr,
      character,
      facadeRow,
      facadeRow.total,
      skillIds,
      resolutions,
      pendingMorphusTotals[attr],
    )
  }
  return out
}

export function resolveCreationLedgerContext(input: {
  character: Character
  race?: Race
  occ?: PalladiumOcc
  skillIds: readonly string[]
  supportsDualForm?: boolean
  facadeVitals?: Partial<Record<string, ResolvedLedgerRow>>
  morphusVitals?: Partial<Record<string, ResolvedLedgerRow>>
  pendingMorphusTotals?: Partial<Record<ForgeAttrKey, number>>
}): CreationLedgerResolutionContext {
  const facadeAttributes = resolveFacadeAttributeRows(
    input.character,
    input.occ,
    input.skillIds,
    input.race,
  )
  const morphusAttributes = input.supportsDualForm
    ? resolveMorphusAttributeRows(
        input.character,
        facadeAttributes,
        input.skillIds,
        input.pendingMorphusTotals,
      )
    : {}

  const attributeBlocks = FORGE_ATTRIBUTE_KEYS.flatMap((attr) => {
    const facade = facadeAttributes[attr]
    const block = facade ? projectPendingDiceBlockFromRow(facade) : null
    return block ? [block] : []
  })
  const morphusBlocks = FORGE_ATTRIBUTE_KEYS.flatMap((attr) => {
    const morphus = morphusAttributes[attr]
    const block = morphus ? projectPendingDiceBlockFromRow(morphus) : null
    return block ? [block] : []
  })

  const facadeVitals = { ...(input.facadeVitals ?? {}) }
  const morphusVitals = { ...(input.morphusVitals ?? {}) }
  const vitalityPendingBlocks: PendingDiceBlock[] = []
  for (const row of Object.values(facadeVitals)) {
    if (!row) continue
    const projected = projectPendingDiceBlockFromRow(row)
    if (projected) vitalityPendingBlocks.push(projected)
  }
  for (const row of Object.values(morphusVitals)) {
    if (!row) continue
    const projected = projectPendingDiceBlockFromRow(row)
    if (projected) vitalityPendingBlocks.push(projected)
  }

  return {
    facade: { attributes: facadeAttributes, vitals: facadeVitals },
    morphus: { attributes: morphusAttributes, vitals: morphusVitals },
    pendingBlocks: [
      ...attributeBlocks,
      ...vitalityPendingBlocks,
      ...morphusBlocks,
    ],
  }
}

/** Re-resolve Morphus attribute rows after Review-tab dice entry (avoids full bundle rebuild). */
export function refreshMorphusAttributeRowsInContext(
  context: CreationLedgerResolutionContext,
  character: Character,
  skillIds: readonly string[],
  pendingMorphusTotals: Partial<Record<ForgeAttrKey, number>>,
): CreationLedgerResolutionContext {
  const morphusAttributes = resolveMorphusAttributeRows(
    character,
    context.facade.attributes,
    skillIds,
    pendingMorphusTotals,
  )
  const morphusAttrBlocks = FORGE_ATTRIBUTE_KEYS.flatMap((attr) => {
    const morphus = morphusAttributes[attr]
    const block = morphus ? projectPendingDiceBlockFromRow(morphus) : null
    return block ? [block] : []
  })
  const pendingBlocks = [
    ...context.pendingBlocks.filter((block) => !block.id.startsWith('morphus_attr_')),
    ...morphusAttrBlocks,
  ]
  return {
    facade: context.facade,
    morphus: { ...context.morphus, attributes: morphusAttributes },
    pendingBlocks,
  }
}

/** Single resolution bundle for Live Ledger + Review tab (Pillar 9). */
export function resolveCreationLedgerBundle(input: {
  character: Character
  race?: Race
  occ?: PalladiumOcc
  skillIds: readonly string[]
  supportsDualForm?: boolean
  facadeVitals: Partial<Record<string, ResolvedLedgerRow>>
  morphusVitals: Partial<Record<string, ResolvedLedgerRow>>
  pendingMorphusTotals?: Partial<Record<ForgeAttrKey, number>>
}): CreationLedgerResolutionContext {
  return resolveCreationLedgerContext(input)
}
