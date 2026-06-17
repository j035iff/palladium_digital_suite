import type { Character, CharacterRootState, PalladiumOcc, Race } from '../types'
import type { SpawnVitalityRolls } from './spawnFinalVitality'
import {
  creationHpLabel,
  creationIspLabel,
  creationSdcLabel,
} from './creationFormLabels'
import { applyPendingAttributeDiceToForms } from './creationAttributeSync'
import { retainCharacterRoot } from './characterRoot'
import { tryApplyNumericSheetPath } from './vitalityPathUpdate'
import {
  buildPendingDiceBlocks,
  filterPendingDiceBlocksByScope,
  pendingDiceBlockRunningTotal,
  type PendingDiceBlock,
} from './spawnDiceBlocks'

/**
 * Build final vitality pools from manually entered dice results (Pillar 5 — no auto-roll).
 */
function blockById(
  blocks: readonly PendingDiceBlock[],
): Record<string, PendingDiceBlock> {
  return Object.fromEntries(blocks.map((block) => [block.id, block]))
}

export function computeSpawnVitalityFromResolutions(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  resolutions: Readonly<Record<string, number>>,
  opts: {
    supportsDualForm: boolean
    psychicTier: string
  },
): SpawnVitalityRolls {
  const blocks = buildPendingDiceBlocks(character, race, occ, opts)
  const byId = blockById(blocks)
  const showIsp =
    opts.psychicTier !== 'none' || character.psychicGateBypassed === true

  const primaryHp = Math.max(
    4,
    byId.hp
      ? pendingDiceBlockRunningTotal(byId.hp, resolutions)
      : character.primary.attributes.pe,
  )
  const primarySdc = Math.max(
    4,
    byId.sdc
      ? pendingDiceBlockRunningTotal(byId.sdc, resolutions)
      : 0,
  )
  const ppeMax = Math.max(
    0,
    byId.ppe ? pendingDiceBlockRunningTotal(byId.ppe, resolutions) : 0,
  )
  const primaryIsp = showIsp && byId.isp
    ? Math.max(0, pendingDiceBlockRunningTotal(byId.isp, resolutions))
    : 0

  if (opts.supportsDualForm) {
    const morphusHp = Math.max(
      10,
      byId.morphus_hp
        ? pendingDiceBlockRunningTotal(byId.morphus_hp, resolutions)
        : 0,
    )
    const morphusSdc = Math.max(
      20,
      byId.morphus_sdc
        ? pendingDiceBlockRunningTotal(byId.morphus_sdc, resolutions)
        : 0,
    )
    return {
      primaryHp,
      primarySdc,
      morphusHp,
      morphusSdc,
      ppeMax,
      morphusIspMax: primaryIsp,
    }
  }

  return {
    primaryHp,
    primarySdc,
    morphusHp: primaryHp,
    morphusSdc: primarySdc,
    ppeMax,
    morphusIspMax: primaryIsp,
  }
}

/** Facade / single-form dice — attributes + H.P./S.D.C./P.P.E./I.S.P. (excludes morphus vitality). */
export function applyPrimaryPendingDiceResolutions(
  prev: CharacterRootState,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts: {
    supportsDualForm: boolean
    psychicTier: string
  },
): CharacterRootState {
  const resolutions = prev.creationPendingDiceResolutions ?? {}
  const allBlocks = buildPendingDiceBlocks(prev, race, occ, opts)
  const primaryBlocks = filterPendingDiceBlocksByScope(
    allBlocks,
    opts.supportsDualForm ? 'primary' : 'all',
  )
  const byId = blockById(allBlocks)
  const rolls = computeSpawnVitalityFromResolutions(
    prev,
    race,
    occ,
    resolutions,
    opts,
  )

  const pairs: [string, number][] = [
    ['primary.hitPoints.maximum', rolls.primaryHp],
    ['primary.hitPoints.current', rolls.primaryHp],
    ['primary.structuralDamageCapacity.maximum', rolls.primarySdc],
    ['primary.structuralDamageCapacity.current', rolls.primarySdc],
    ['ppe.maximum', rolls.ppeMax],
    ['ppe.current', rolls.ppeMax],
  ]

  if (!opts.supportsDualForm) {
    pairs.push(
      ['morphus.hitPoints.maximum', rolls.morphusHp],
      ['morphus.hitPoints.current', rolls.morphusHp],
      ['morphus.structuralDamageCapacity.maximum', rolls.morphusSdc],
      ['morphus.structuralDamageCapacity.current', rolls.morphusSdc],
    )
  }

  if (rolls.morphusIspMax > 0) {
    pairs.push(
      ['morphus.isp.maximum', rolls.morphusIspMax],
      ['morphus.isp.current', rolls.morphusIspMax],
    )
  }

  let next: CharacterRootState = prev
  for (const [path, v] of pairs) {
    const applied = tryApplyNumericSheetPath(next, path, v)
    next = applied ? retainCharacterRoot(prev, applied) : next
  }

  const attrForms: ('primary' | 'morphus')[] = opts.supportsDualForm
    ? ['primary']
    : ['primary', 'morphus']
  next = applyPendingAttributeDiceToForms(
    next,
    primaryBlocks,
    resolutions,
    attrForms,
  )

  return {
    ...next,
    creationPrimaryDiceFinalized: true,
    creationMorphusDiceFinalized: opts.supportsDualForm
      ? next.creationMorphusDiceFinalized
      : true,
  }
}

/** Nightbane morphus vitality dice — H.P. and S.D.C. on the morphus branch. */
export function applyMorphusPendingDiceResolutions(
  prev: CharacterRootState,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts: {
    supportsDualForm: boolean
    psychicTier: string
  },
): CharacterRootState {
  const resolutions = prev.creationPendingDiceResolutions ?? {}
  const allBlocks = buildPendingDiceBlocks(prev, race, occ, opts)
  const byId = blockById(allBlocks)
  const rolls = computeSpawnVitalityFromResolutions(
    prev,
    race,
    occ,
    resolutions,
    opts,
  )

  const pairs: [string, number][] = [
    ['morphus.hitPoints.maximum', rolls.morphusHp],
    ['morphus.hitPoints.current', rolls.morphusHp],
    ['morphus.structuralDamageCapacity.maximum', rolls.morphusSdc],
    ['morphus.structuralDamageCapacity.current', rolls.morphusSdc],
  ]

  let next: CharacterRootState = prev
  for (const [path, v] of pairs) {
    const applied = tryApplyNumericSheetPath(next, path, v)
    next = applied ? retainCharacterRoot(prev, applied) : next
  }

  if (byId.morphus_hp == null && byId.morphus_sdc == null) {
    return { ...next, creationMorphusDiceFinalized: true }
  }

  return { ...next, creationMorphusDiceFinalized: true }
}

/** Write H.P./S.D.C./P.P.E./I.S.P. and attribute dice from entered resolutions. */
export function applyPendingDiceResolutionsToCharacter(
  prev: CharacterRootState,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  opts: {
    supportsDualForm: boolean
    psychicTier: string
    markVitalityCommitted?: boolean
  },
): CharacterRootState {
  const resolutions = prev.creationPendingDiceResolutions ?? {}
  const pendingBlocks = buildPendingDiceBlocks(prev, race, occ, {
    supportsDualForm: opts.supportsDualForm,
    psychicTier: opts.psychicTier,
  })
  const rolls = computeSpawnVitalityFromResolutions(
    prev,
    race,
    occ,
    resolutions,
    {
      supportsDualForm: opts.supportsDualForm,
      psychicTier: opts.psychicTier,
    },
  )
  const pairs: [string, number][] = [
    ['primary.hitPoints.maximum', rolls.primaryHp],
    ['primary.hitPoints.current', rolls.primaryHp],
    ['primary.structuralDamageCapacity.maximum', rolls.primarySdc],
    ['primary.structuralDamageCapacity.current', rolls.primarySdc],
    ['morphus.hitPoints.maximum', rolls.morphusHp],
    ['morphus.hitPoints.current', rolls.morphusHp],
    ['morphus.structuralDamageCapacity.maximum', rolls.morphusSdc],
    ['morphus.structuralDamageCapacity.current', rolls.morphusSdc],
    ['ppe.maximum', rolls.ppeMax],
    ['ppe.current', rolls.ppeMax],
    ['morphus.isp.maximum', rolls.morphusIspMax],
    ['morphus.isp.current', rolls.morphusIspMax],
  ]
  let next: CharacterRootState = prev
  for (const [path, v] of pairs) {
    const applied = tryApplyNumericSheetPath(next, path, v)
    next = applied ? retainCharacterRoot(prev, applied) : next
  }
  next = applyPendingAttributeDiceToForms(next, pendingBlocks, resolutions)
  if (opts.markVitalityCommitted) {
    return { ...next, creationVitalityCommitted: true }
  }
  return next
}

export function vitalityPreviewLines(
  character: Character,
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
  resolutions: Readonly<Record<string, number>>,
  opts: { supportsDualForm: boolean; psychicTier: string },
): { label: string; value: string }[] {
  const rolls = computeSpawnVitalityFromResolutions(
    character,
    race,
    occ,
    resolutions,
    opts,
  )
  const dual = opts.supportsDualForm
  const lines = [
    {
      label: `${creationHpLabel(dual, 'human')} max`,
      value: String(rolls.primaryHp),
    },
    {
      label: `${creationSdcLabel(dual, 'human')} max`,
      value: String(rolls.primarySdc),
    },
    { label: 'P.P.E. max', value: String(rolls.ppeMax) },
  ]
  if (opts.supportsDualForm) {
    lines.push(
      {
        label: `${creationHpLabel(true, 'morphus')} max`,
        value: String(rolls.morphusHp),
      },
      {
        label: `${creationSdcLabel(true, 'morphus')} max`,
        value: String(rolls.morphusSdc),
      },
      {
        label: `${creationIspLabel(true)} max`,
        value: String(rolls.morphusIspMax),
      },
    )
  } else if (rolls.morphusIspMax > 0) {
    lines.push({
      label: `${creationIspLabel(false)} max`,
      value: String(rolls.morphusIspMax),
    })
  }
  return lines
}
