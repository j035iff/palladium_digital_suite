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

  const facadeHp = Math.max(
    4,
    byId.hp
      ? pendingDiceBlockRunningTotal(byId.hp, resolutions)
      : character.facade.attributes.pe,
  )
  const facadeSdc = Math.max(
    4,
    byId.sdc
      ? pendingDiceBlockRunningTotal(byId.sdc, resolutions)
      : 0,
  )
  const ppeMax = Math.max(
    0,
    byId.ppe ? pendingDiceBlockRunningTotal(byId.ppe, resolutions) : 0,
  )
  const facadeIsp = showIsp && byId.isp
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
      facadeHp,
      facadeSdc,
      morphusHp,
      morphusSdc,
      ppeMax,
      morphusIspMax: facadeIsp,
    }
  }

  return {
    facadeHp,
    facadeSdc,
    morphusHp: facadeHp,
    morphusSdc: facadeSdc,
    ppeMax,
    morphusIspMax: facadeIsp,
  }
}

/** Write H.P./S.D.C./P.P.E./I.S.P. and Review attribute dice from entered resolutions. */
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
    ['facade.hitPoints.maximum', rolls.facadeHp],
    ['facade.hitPoints.current', rolls.facadeHp],
    ['facade.structuralDamageCapacity.maximum', rolls.facadeSdc],
    ['facade.structuralDamageCapacity.current', rolls.facadeSdc],
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
      value: String(rolls.facadeHp),
    },
    {
      label: `${creationSdcLabel(dual, 'human')} max`,
      value: String(rolls.facadeSdc),
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
