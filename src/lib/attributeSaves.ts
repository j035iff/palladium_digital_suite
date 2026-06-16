import type { AttributeOnlySaveKind } from '../data/saveKinds'
import { getMeBonuses, getPeBonuses } from './attributeBonuses'
import {
  BECOMING_SAVE_BASE_TARGET,
  nightbaneBecomingLevelBonus,
} from './nightbaneBecomingSave'
import {
  formatAdditiveSaveTooltip,
  formatSaveRollBonus,
  formatSaveVsTarget,
  type SaveRollBonusLine,
} from './saveRollDisplay'

export type AttributeSaveProfileOptions = {
  /** Facade M.E. for Save vs Becoming — always Facade, never Morphus. */
  facadeMe?: number
}

export type AttributeSaveEntry = {
  id: AttributeOnlySaveKind | 'base_pe_bonus' | 'base_me_bonus'
  sheetLabel: string
  /** P.E. or M.E. exceptional bonus from the active form — no other modifiers. */
  attributeBonus: number
  /** Nightbane Becoming level progression (`vs_becoming` only). */
  progressionBonus?: number
  /** GM-called target when this row is a full save (e.g. Becoming vs 12). */
  baseTarget: number | null
  /** Total amount to add to the player’s d20 roll. */
  totalRollBonus: number | null
  rollBonuses: SaveRollBonusLine[]
  rollStyle: 'targeted' | 'bonus_only'
  tooltipEquation: string
  notes?: string
}

export type ResolveAttributeOnlySaveInput = {
  saveKind: AttributeOnlySaveKind
  targetNumber?: number
  displayPe: number
  displayMe: number
  characterLevel: number
  /** Required for `vs_becoming` — Facade M.E., not Morphus. */
  facadeMe?: number
}

export type ResolvedAttributeOnlySave = {
  attributeBonus: number
  progressionBonus: number
  baseTarget: number
  totalRollBonus: number
  rollBonuses: SaveRollBonusLine[]
}

/**
 * Resolve a catalog save that uses only base attribute bonuses (no racial / O.C.C. / skill save mods).
 */
export function resolveAttributeOnlySave(
  input: ResolveAttributeOnlySaveInput,
): ResolvedAttributeOnlySave {
  const peBonus = getPeBonuses(input.displayPe).saveStandard
  const meBonus = getMeBonuses(input.displayMe).saveStandard
  const facadeMeBonus = getMeBonuses(input.facadeMe ?? input.displayMe).saveStandard
  const becomingBonus =
    input.saveKind === 'vs_becoming'
      ? nightbaneBecomingLevelBonus(input.characterLevel)
      : 0

  const baseTarget =
    input.saveKind === 'vs_becoming'
      ? BECOMING_SAVE_BASE_TARGET
      : (input.targetNumber ?? BECOMING_SAVE_BASE_TARGET)

  if (input.saveKind === 'base_pe') {
    return {
      attributeBonus: peBonus,
      progressionBonus: 0,
      baseTarget,
      totalRollBonus: peBonus,
      rollBonuses: peBonus > 0 ? [{ label: 'P.E.', amount: peBonus }] : [],
    }
  }

  if (input.saveKind === 'base_me') {
    return {
      attributeBonus: meBonus,
      progressionBonus: 0,
      baseTarget,
      totalRollBonus: meBonus,
      rollBonuses: meBonus > 0 ? [{ label: 'M.E.', amount: meBonus }] : [],
    }
  }

  const rollBonuses: SaveRollBonusLine[] = [
    ...(facadeMeBonus > 0 ? [{ label: 'Facade M.E.', amount: facadeMeBonus }] : []),
    ...(becomingBonus > 0 ? [{ label: 'Becoming (level)', amount: becomingBonus }] : []),
  ]
  return {
    attributeBonus: facadeMeBonus,
    progressionBonus: becomingBonus,
    baseTarget,
    totalRollBonus: facadeMeBonus + becomingBonus,
    rollBonuses,
  }
}

/** Sheet rows for explicit base P.E. / M.E. bonuses and Nightbane Becoming save. */
export function computeAttributeSaveProfile(
  displayPe: number,
  displayMe: number,
  characterLevel: number,
  supportsDualForm: boolean,
  options?: AttributeSaveProfileOptions,
): AttributeSaveEntry[] {
  const peBonus = getPeBonuses(displayPe).saveStandard
  const meBonus = getMeBonuses(displayMe).saveStandard
  const facadeMe = options?.facadeMe ?? displayMe
  const facadeMeBonus = getMeBonuses(facadeMe).saveStandard

  const rows: AttributeSaveEntry[] = [
    {
      id: 'base_pe_bonus',
      sheetLabel: 'Base P.E. Save Bonus',
      attributeBonus: peBonus,
      baseTarget: null,
      totalRollBonus: peBonus > 0 ? peBonus : null,
      rollBonuses: peBonus > 0 ? [{ label: 'P.E.', amount: peBonus }] : [],
      rollStyle: 'bonus_only',
      tooltipEquation:
        peBonus > 0
          ? `${formatSaveRollBonus(peBonus)} — P.E. exceptional bonus only (no save_magic, racial, or skill modifiers).`
          : 'P.E. below 17 — no exceptional save bonus.',
      notes: 'Add to d20 on saves that call for P.E. bonuses only.',
    },
    {
      id: 'base_me_bonus',
      sheetLabel: 'Base M.E. Save Bonus',
      attributeBonus: meBonus,
      baseTarget: null,
      totalRollBonus: meBonus > 0 ? meBonus : null,
      rollBonuses: meBonus > 0 ? [{ label: 'M.E.', amount: meBonus }] : [],
      rollStyle: 'bonus_only',
      tooltipEquation:
        meBonus > 0
          ? `${formatSaveRollBonus(meBonus)} — M.E. exceptional bonus only (no save_psionics, racial, or skill modifiers).`
          : 'M.E. below 17 — no exceptional save bonus.',
      notes: 'Add to d20 on saves that call for M.E. bonuses only.',
    },
  ]

  if (supportsDualForm) {
    const becomingBonus = nightbaneBecomingLevelBonus(characterLevel)
    const rollBonuses: SaveRollBonusLine[] = [
      ...(facadeMeBonus > 0 ? [{ label: 'Facade M.E.', amount: facadeMeBonus }] : []),
      ...(becomingBonus > 0 ? [{ label: 'Becoming (level)', amount: becomingBonus }] : []),
    ]
    const totalRollBonus = facadeMeBonus + becomingBonus
    rows.push({
      id: 'vs_becoming',
      sheetLabel: 'Save vs Becoming',
      attributeBonus: facadeMeBonus,
      progressionBonus: becomingBonus,
      baseTarget: BECOMING_SAVE_BASE_TARGET,
      totalRollBonus,
      rollBonuses,
      rollStyle: 'targeted',
      tooltipEquation: formatAdditiveSaveTooltip(
        BECOMING_SAVE_BASE_TARGET,
        rollBonuses,
        totalRollBonus,
      ),
      notes:
        'Facade ↔ Morphus shift. Uses Facade M.E. only. Success: one melee action (~3 sec). Failure: one full melee round.',
    })
  }

  return rows
}

export function formatAttributeSaveChipValue(entry: AttributeSaveEntry): string {
  if (entry.rollStyle === 'bonus_only') {
    return entry.totalRollBonus != null && entry.totalRollBonus > 0
      ? formatSaveRollBonus(entry.totalRollBonus)
      : '—'
  }
  if (entry.baseTarget != null) {
    return formatSaveVsTarget(entry.baseTarget)
  }
  return '—'
}

export function formatAttributeSaveChipBonus(entry: AttributeSaveEntry): string | null {
  if (entry.rollStyle !== 'targeted' || entry.totalRollBonus == null) return null
  return formatSaveRollBonus(entry.totalRollBonus)
}
