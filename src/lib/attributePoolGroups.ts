import type { RaceAttributeFormulas } from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from './attributeKeys'
import {
  attributePoolNotationBounds,
  diceCoreBounds,
} from './diceNotationBounds'
import { normalizeDiceDisplay, parsePhysicalDiceRoll } from './diceNotation'

function raceAttrNotation(
  formulas: RaceAttributeFormulas | undefined,
  attr: ForgeAttrKey,
): string {
  const key = attr === 'ps' ? 'ps' : attr
  return formulas?.[key]?.toString() ?? '3D6'
}

function flatNd6DiceFaces(diceNotation: string): { dice: number; faces: number } | null {
  const s = diceNotation.trim().replace(/\s+/g, '')
  const m = /^(\d+)d(\d+)$/i.exec(s)
  if (!m) return null
  const dice = Number(m[1])
  const faces = Number(m[2])
  if (!Number.isFinite(dice) || !Number.isFinite(faces) || dice <= 0 || faces <= 0) {
    return null
  }
  return { dice, faces }
}

/** Parse NdM (and NdM*K) dice cores for ascending pool column sort. */
export function parseDiceCoreSortKey(diceCore: string): { dice: number; faces: number } {
  const { diceNotation } = parsePhysicalDiceRoll(diceCore)
  let s = diceNotation.trim().replace(/\s+/g, '')
  if (s.startsWith('-')) s = s.slice(1)
  const m = /^(\d+)d(\d+)(?:\*(\d+))?$/i.exec(s)
  if (!m) return { dice: 99, faces: 99 }
  const dice = Number(m[1])
  const faces = Number(m[2])
  if (!Number.isFinite(dice) || !Number.isFinite(faces) || dice <= 0 || faces <= 0) {
    return { dice: 99, faces: 99 }
  }
  return { dice, faces }
}

/** Sort pool groups: 1D4, 2D4, 3D4, … 1D6, 2D6, 3D6, …; strict before exceptional. */
export function compareAttributePoolGroupOrder(
  a: { diceCore: string; exceptionalEligible: boolean },
  b: { diceCore: string; exceptionalEligible: boolean },
): number {
  const aKey = parseDiceCoreSortKey(a.diceCore)
  const bKey = parseDiceCoreSortKey(b.diceCore)
  if (aKey.faces !== bKey.faces) return aKey.faces - bKey.faces
  if (aKey.dice !== bKey.dice) return aKey.dice - bKey.dice
  if (a.exceptionalEligible !== b.exceptionalEligible) {
    return a.exceptionalEligible ? 1 : -1
  }
  return 0
}

export type AttributePoolDiceGroup = {
  /** Dice portion only (e.g. `2D4` from `2D4+16`). */
  diceCore: string
  /**
   * Flat `2D6` / `3D6` only — allows Palladium extra-dice totals (2D6 → 18, 3D6 → 30).
   * Formulas with a flat modifier (`2D6+4`, `3D6+2`) use strict dice-core bounds.
   */
  exceptionalEligible: boolean
  poolBounds: { min: number; max: number }
  attrs: readonly ForgeAttrKey[]
  /** First index in `creationAttributePool` for this group. */
  slotStart: number
  /** Number of pool slots (= attrs.length). */
  slotCount: number
}

/** Normalize race attribute formula to its dice core (no flat modifier). */
export function raceAttrDiceCore(
  formulas: RaceAttributeFormulas | undefined,
  attr: ForgeAttrKey,
): string {
  const notation = raceAttrNotation(formulas, attr)
  const { diceNotation } = parsePhysicalDiceRoll(notation)
  return normalizeDiceDisplay(diceNotation)
}

/** Flat modifier from a race attribute formula (e.g. +16 from `2D4+16`). */
export function raceAttrFlatBonus(
  formulas: RaceAttributeFormulas | undefined,
  attr: ForgeAttrKey,
): number {
  const notation = raceAttrNotation(formulas, attr)
  return parsePhysicalDiceRoll(notation).flatBonus
}

/**
 * Whether the attribute formula is a flat 2D6 or 3D6 (no `+N`) that allows the
 * Palladium extra-dice rule in the creation pool.
 */
export function raceAttrPoolExceptionalEligible(
  formulas: RaceAttributeFormulas | undefined,
  attr: ForgeAttrKey,
): boolean {
  const notation = raceAttrNotation(formulas, attr)
  const { diceNotation, flatBonus } = parsePhysicalDiceRoll(notation)
  if (flatBonus !== 0) return false
  const flat = flatNd6DiceFaces(diceNotation)
  return flat?.faces === 6 && (flat.dice === 2 || flat.dice === 3)
}

function poolGroupKey(
  formulas: RaceAttributeFormulas | undefined,
  attr: ForgeAttrKey,
): string {
  const diceCore = raceAttrDiceCore(formulas, attr)
  const exceptionalEligible = raceAttrPoolExceptionalEligible(formulas, attr)
  return `${diceCore}|${exceptionalEligible ? 'exc' : 'strict'}`
}

/** Valid range for a dice-only pool entry in a given group profile. */
export function attributePoolDiceCoreBounds(
  diceCore: string,
  exceptionalEligible: boolean,
): { min: number; max: number } {
  if (exceptionalEligible) {
    return attributePoolNotationBounds(diceCore)
  }
  return diceCoreBounds(diceCore)
}

/** Convert a physical dice pool entry to the sheet attribute total. */
export function poolRollToAssignmentValue(
  formulas: RaceAttributeFormulas | undefined,
  attr: ForgeAttrKey,
  poolRoll: number,
): number {
  return Math.round(poolRoll + raceAttrFlatBonus(formulas, attr))
}

/** Recover the dice-only pool entry from a stored attribute total. */
export function assignmentToPoolRoll(
  formulas: RaceAttributeFormulas | undefined,
  attr: ForgeAttrKey,
  assignment: number,
): number {
  return Math.round(assignment - raceAttrFlatBonus(formulas, attr))
}

/**
 * Partition pool slots by dice core and exceptional eligibility.
 * Flat `2D6` and `2D6+4` are separate groups with different allowed ranges.
 */
export function buildAttributePoolDiceGroups(
  formulas: RaceAttributeFormulas | undefined,
): readonly AttributePoolDiceGroup[] {
  const pending = new Map<
    string,
    {
      diceCore: string
      exceptionalEligible: boolean
      attrs: ForgeAttrKey[]
    }
  >()

  FORGE_ATTRIBUTE_KEYS.forEach((attr) => {
    const key = poolGroupKey(formulas, attr)
    const diceCore = raceAttrDiceCore(formulas, attr)
    const exceptionalEligible = raceAttrPoolExceptionalEligible(formulas, attr)
    const entry = pending.get(key)
    if (entry) {
      entry.attrs.push(attr)
    } else {
      pending.set(key, {
        diceCore,
        exceptionalEligible,
        attrs: [attr],
      })
    }
  })

  const ordered = [...pending.values()].sort(compareAttributePoolGroupOrder)

  let slotStart = 0
  const groups: AttributePoolDiceGroup[] = []
  for (const entry of ordered) {
    const poolBounds = attributePoolDiceCoreBounds(
      entry.diceCore,
      entry.exceptionalEligible,
    )
    groups.push({
      diceCore: entry.diceCore,
      exceptionalEligible: entry.exceptionalEligible,
      poolBounds,
      attrs: entry.attrs,
      slotStart,
      slotCount: entry.attrs.length,
    })
    slotStart += entry.attrs.length
  }
  return groups
}

export function poolSlotDiceGroup(
  groups: readonly AttributePoolDiceGroup[],
  slotIndex: number,
): AttributePoolDiceGroup | undefined {
  return groups.find(
    (group) =>
      slotIndex >= group.slotStart &&
      slotIndex < group.slotStart + group.slotCount,
  )
}

export function poolSlotDiceCore(
  formulas: RaceAttributeFormulas | undefined,
  slotIndex: number,
): string | undefined {
  const groups = buildAttributePoolDiceGroups(formulas)
  return poolSlotDiceGroup(groups, slotIndex)?.diceCore
}

/** Whether a pool slot can be dropped on the target attribute. */
export function poolSlotMatchesAttribute(
  formulas: RaceAttributeFormulas | undefined,
  slotIndex: number,
  attr: ForgeAttrKey,
): boolean {
  const group = poolSlotDiceGroup(buildAttributePoolDiceGroups(formulas), slotIndex)
  return group?.attrs.includes(attr) ?? false
}
