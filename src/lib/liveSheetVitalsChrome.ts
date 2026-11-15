/**
 * Persistent Core Layer 2 vitals chip — which energy pools to show.
 * Unified Path with Combat Abilities category availability
 * (`isLiveSheetAbilityCategoryAvailable`): PPE when magic or talents usable;
 * ISP when psionics usable. All characters may have a PPE pool — hide when unusable.
 */

import type { PalladiumOcc, Race } from '../types'
import {
  isLiveSheetAbilityCategoryAvailable,
  type LiveSheetAbilityBudgetHint,
} from './liveSheetAbilities'

export type LiveSheetVitalsChromeFlags = {
  showPpe: boolean
  showIsp: boolean
}

export function resolveLiveSheetVitalsChromeFlags(input: {
  race: Race | undefined
  occ: PalladiumOcc | undefined
  abilityBudget?: LiveSheetAbilityBudgetHint | null
}): LiveSheetVitalsChromeFlags {
  const budget = input.abilityBudget ?? null
  const showPpe =
    isLiveSheetAbilityCategoryAvailable({
      categoryId: 'magic',
      race: input.race,
      occ: input.occ,
      abilityBudget: budget,
    }) ||
    isLiveSheetAbilityCategoryAvailable({
      categoryId: 'talents',
      race: input.race,
      occ: input.occ,
      abilityBudget: budget,
    })
  const showIsp = isLiveSheetAbilityCategoryAvailable({
    categoryId: 'psionics',
    race: input.race,
    occ: input.occ,
    abilityBudget: budget,
  })
  return { showPpe, showIsp }
}

/** Chip order: SDC → HP → PPE (if shown) → ISP (if shown). */
export function formatLiveSheetVitalsChipParts(input: {
  sdcCurrent: number
  sdcMax: number
  hpCurrent: number
  hpMax: number
  ppeCurrent: number
  ppeMax: number
  ispCurrent: number
  ispMax: number
  showPpe: boolean
  showIsp: boolean
}): string[] {
  const parts = [
    `SDC ${input.sdcCurrent}/${input.sdcMax}`,
    `HP ${input.hpCurrent}/${input.hpMax}`,
  ]
  if (input.showPpe) {
    parts.push(`PPE ${input.ppeCurrent}/${input.ppeMax}`)
  }
  if (input.showIsp) {
    parts.push(`ISP ${input.ispCurrent}/${input.ispMax}`)
  }
  return parts
}
