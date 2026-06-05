import type {
  CharacterAttributes,
  CharacterRootState,
  FormState,
  PalladiumOcc,
} from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from './attributeKeys'
import { attributePoolNotationBounds } from './diceNotationBounds'
import type { RaceAttributeFormulas } from '../types'
import { mergeVitalityFromAttributes } from './derivedVitality'
import { listOccVariableBonusTasks } from './occVariableBonus'
import { resolveEffectivePalladiumOcc } from './occComposition'
import { occFlatVitalBonus } from './creationOccBonuses'

export function raceAttrNotation(
  formulas: RaceAttributeFormulas | undefined,
  attr: ForgeAttrKey,
): string {
  const key = attr === 'ps' ? 'ps' : attr
  return formulas?.[key]?.toString() ?? '3D6'
}

/** Pool value must fall within the race dice notation bounds for the target attribute. */
export function valueFitsRaceNotation(value: number, notation: string): boolean {
  if (!Number.isFinite(value)) return false
  const { min, max } = attributePoolNotationBounds(notation)
  return value >= min && value <= max
}

export function poolIndexForAttr(
  slots: Partial<Record<ForgeAttrKey, number>>,
  attr: ForgeAttrKey,
): number {
  const idx = slots[attr]
  return typeof idx === 'number' && idx >= 0 && idx <= 7 ? idx : -1
}

export function attrForPoolSlot(
  slots: Partial<Record<ForgeAttrKey, number>>,
  slotIndex: number,
): ForgeAttrKey | undefined {
  return FORGE_ATTRIBUTE_KEYS.find((a) => slots[a] === slotIndex)
}

/** Resolve slot map; rebuild greedily from values when legacy saves lack slots. */
export function getEffectivePoolSlots(
  pool: readonly (number | null)[],
  assignments: Partial<Record<ForgeAttrKey, number>>,
  storedSlots: Partial<Record<ForgeAttrKey, number>> | undefined,
): Partial<Record<ForgeAttrKey, number>> {
  const stored = storedSlots ?? {}
  const used = new Set<number>()
  let slotsValid = true

  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const v = assignments[attr]
    if (v == null) continue
    const idx = stored[attr]
    if (
      typeof idx !== 'number' ||
      idx < 0 ||
      idx > 7 ||
      pool[idx] !== v ||
      used.has(idx)
    ) {
      slotsValid = false
      break
    }
    used.add(idx)
  }

  if (slotsValid && used.size > 0) return stored

  const rebuilt: Partial<Record<ForgeAttrKey, number>> = {}
  const usedRebuild = new Set<number>()
  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const v = assignments[attr]
    if (v == null) continue
    for (let i = 0; i < pool.length; i++) {
      if (pool[i] === v && !usedRebuild.has(i)) {
        rebuilt[attr] = i
        usedRebuild.add(i)
        break
      }
    }
  }
  return rebuilt
}

export function assessPoolSlotIssue(
  value: number | null,
  slotIndex: number,
  slots: Partial<Record<ForgeAttrKey, number>>,
  pool: readonly (number | null)[],
  formulas: RaceAttributeFormulas | undefined,
  occMinFor: (attr: ForgeAttrKey) => number | undefined,
): string | null {
  if (value == null || !Number.isFinite(value)) return null

  const assignedAttr = attrForPoolSlot(slots, slotIndex)

  if (assignedAttr) {
    const min = occMinFor(assignedAttr)
    if (min != null && value < min) {
      return `Below O.C.C. minimum ${min} for ${assignedAttr.toUpperCase()}`
    }
    const notation = raceAttrNotation(formulas, assignedAttr)
    if (!valueFitsRaceNotation(value, notation)) {
      const { min: nMin, max: nMax } = attributePoolNotationBounds(notation)
      return `Outside ${notation} (${nMin}–${nMax}) for ${assignedAttr.toUpperCase()}`
    }
    return null
  }

  const fitsAny = FORGE_ATTRIBUTE_KEYS.some((attr) =>
    valueFitsRaceNotation(value, raceAttrNotation(formulas, attr)),
  )
  if (!fitsAny) {
    return 'Out of range for every attribute on this race'
  }
  return null
}

export const CREATION_POOL_DRAG_MIME = 'application/x-pds-pool-index'

/** Validate assigning a pool slot to an attribute (does not mutate state). */
export function validatePoolRollAssignment(
  attr: ForgeAttrKey,
  poolIndex: number,
  pool: readonly (number | null)[],
  formulas: RaceAttributeFormulas | undefined,
  occMinFor: (attr: ForgeAttrKey) => number | undefined,
): string | null {
  const value = pool[poolIndex]
  if (value == null || !Number.isFinite(value)) {
    return 'Pool slot is empty.'
  }
  const issue = assessAttributeAssignmentIssue(attr, value, formulas, occMinFor)
  if (issue) return issue
  return null
}

export function assessAttributeAssignmentIssue(
  attr: ForgeAttrKey,
  value: number | undefined,
  formulas: RaceAttributeFormulas | undefined,
  occMinFor: (attr: ForgeAttrKey) => number | undefined,
): string | null {
  if (value == null || !Number.isFinite(value)) return null
  const min = occMinFor(attr)
  if (min != null && value < min) {
    return `Below O.C.C. minimum ${min}`
  }
  const notation = raceAttrNotation(formulas, attr)
  if (!valueFitsRaceNotation(value, notation)) {
    const { min: nMin, max: nMax } = attributePoolNotationBounds(notation)
    return `Outside ${notation} (${nMin}–${nMax})`
  }
  return null
}

function readScalar(attrs: CharacterAttributes, attr: ForgeAttrKey): number {
  if (attr === 'ps') return attrs.ps.score
  return attrs[attr]
}

function writeScalar(
  attrs: CharacterAttributes,
  attr: ForgeAttrKey,
  value: number,
): CharacterAttributes {
  const v = Math.max(1, Math.round(value))
  if (attr === 'ps') {
    return { ...attrs, ps: { ...attrs.ps, score: v } }
  }
  return { ...attrs, [attr]: v }
}

/** Build sheet attributes from pool assignments + O.C.C. flat and resolved dice bonuses. */
export function buildCreationAttributes(
  template: CharacterAttributes,
  assignments: Partial<Record<ForgeAttrKey, number>>,
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  occVariableResolutions: Readonly<Record<string, number>>,
): CharacterAttributes {
  let attrs = { ...template, ps: { ...template.ps } }

  for (const attr of FORGE_ATTRIBUTE_KEYS) {
    const base = assignments[attr]
    if (base != null && Number.isFinite(base)) {
      attrs = writeScalar(attrs, attr, base)
    }
  }

  if (!occ) return attrs
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const staticAttrs = effective.staticBonuses?.attributes
  if (staticAttrs) {
    for (const [key, raw] of Object.entries(staticAttrs)) {
      if (typeof raw !== 'number') continue
      const forge = key as ForgeAttrKey
      if (!FORGE_ATTRIBUTE_KEYS.includes(forge)) continue
      attrs = writeScalar(attrs, forge, readScalar(attrs, forge) + raw)
    }
  }

  for (const task of listOccVariableBonusTasks(occ, specializationId)) {
    if (task.section !== 'attributes') continue
    const resolved = occVariableResolutions[task.id]
    if (resolved == null || !Number.isFinite(resolved)) continue
    const forge = task.statKey as ForgeAttrKey
    if (!FORGE_ATTRIBUTE_KEYS.includes(forge)) continue
    attrs = writeScalar(attrs, forge, readScalar(attrs, forge) + resolved)
  }

  return attrs
}

export function applyCreationAttributesToForm(
  form: FormState,
  assignments: Partial<Record<ForgeAttrKey, number>>,
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  occVariableResolutions: Readonly<Record<string, number>>,
): FormState {
  const attrs = buildCreationAttributes(
    form.attributes,
    assignments,
    occ,
    specializationId,
    occVariableResolutions,
  )
  let next: FormState = { ...form, attributes: attrs }
  next = mergeVitalityFromAttributes(next, attrs)

  const flatSdc = occFlatVitalBonus(occ, specializationId, 'sdc', occVariableResolutions)
  if (flatSdc > 0) {
    const max = Math.max(0, next.structuralDamageCapacity.maximum + flatSdc)
    const cur = Math.min(next.structuralDamageCapacity.current + flatSdc, max)
    next = {
      ...next,
      structuralDamageCapacity: {
        ...next.structuralDamageCapacity,
        maximum: max,
        current: cur,
      },
    }
  }

  return next
}

/** Re-sync facade (+ morphus when not dual-isolated) from creation assignment state. */
export function syncCreationAttributeBranches(
  prev: CharacterRootState,
  occ: PalladiumOcc | undefined,
  opts?: { forms?: ('facade' | 'morphus')[] },
): CharacterRootState {
  const assignments = prev.creationAttributeAssignments ?? {}
  const resolutions = prev.creationOccVariableResolutions ?? {}
  const specId = prev.occSpecializationId
  const forms = opts?.forms ?? (['facade', 'morphus'] as const)

  let next = prev
  for (const key of forms) {
    next = {
      ...next,
      [key]: applyCreationAttributesToForm(
        next[key],
        assignments,
        occ,
        specId,
        resolutions,
      ),
    }
  }
  return next
}
