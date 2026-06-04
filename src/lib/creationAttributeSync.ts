import type {
  CharacterAttributes,
  CharacterRootState,
  FormState,
  PalladiumOcc,
} from '../types'
import type { ForgeAttrKey } from './attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from './attributeKeys'
import { diceNotationBounds } from './diceNotationBounds'
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
  const { min, max } = diceNotationBounds(notation)
  return value >= min && value <= max
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
