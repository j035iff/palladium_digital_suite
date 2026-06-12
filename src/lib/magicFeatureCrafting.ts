import type { PalladiumMagicSpell } from '../types'

const COMMON_FEATURE = 'https://megaverse-companion.local/schemas/palladium-feature-common.schema.json'

export type FeatureQuantitySpec = {
  kind: 'fixed' | 'formula' | 'per_level'
  value?: number
  formula?: string
}

export type MaterialComponentEntry = {
  catalogItemId?: string
  label?: string
  quantity?: FeatureQuantitySpec
  unit?: string
  consumption?: 'destroyed' | 'returned' | 'reusable_tool'
  condition?: string
  timing?: string
  substitutes?: readonly MaterialComponentEntry[]
  notes?: string
}

export type MaterialRequirements = {
  label?: string
  allRequired?: boolean
  entries: readonly MaterialComponentEntry[]
}

export type ForgedItemOutput = {
  catalogItemId?: string
  outputTemplateId?: string
  label?: string
  count?: number
  countFormula?: string
  destination: 'caster_inventory' | 'touch_target_inventory' | 'ground_loot'
  initialPresence?: 'carried' | 'equipped' | 'stashed'
  bindToCaster?: boolean
  charges?: FeatureQuantitySpec
  encodedSpellId?: string
  notes?: string
}

export type MagicRitualProfile = {
  craftingDuration?: Record<string, unknown>
  workspace?: Record<string, unknown>
  materialComponents?: MaterialRequirements
  assistantsRequired?: number
  failureHandling?: string
  notes?: string
}

export type MaterialComponentChecklistRow = {
  key: string
  displayLabel: string
  catalogItemId?: string
  quantityLabel: string
  consumption: string
  timing?: string
  condition?: string
  isSubstituteGroup: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function parseMaterialRequirements(value: unknown): MaterialRequirements | undefined {
  if (!isRecord(value) || !Array.isArray(value.entries)) return undefined
  return value as MaterialRequirements
}

function parseMaterialEntry(
  entry: unknown,
  index: number,
): MaterialComponentChecklistRow | undefined {
  if (!isRecord(entry)) return undefined
  const catalogItemId =
    typeof entry.catalogItemId === 'string' ? entry.catalogItemId : undefined
  const label = typeof entry.label === 'string' ? entry.label : catalogItemId
  if (!label) return undefined

  return {
    key: catalogItemId ?? `material_${index}`,
    displayLabel: label,
    catalogItemId,
    quantityLabel: formatQuantitySpec(entry.quantity),
    consumption:
      typeof entry.consumption === 'string' ? entry.consumption : 'destroyed',
    timing: typeof entry.timing === 'string' ? entry.timing : undefined,
    condition: typeof entry.condition === 'string' ? entry.condition : undefined,
    isSubstituteGroup: Array.isArray(entry.substitutes) && entry.substitutes.length > 0,
  }
}

export function formatQuantitySpec(quantity: unknown): string {
  if (!isRecord(quantity) || typeof quantity.kind !== 'string') return '1'
  if (quantity.kind === 'fixed' && typeof quantity.value === 'number') {
    return String(quantity.value)
  }
  if (typeof quantity.formula === 'string' && quantity.formula.length > 0) {
    return quantity.formula
  }
  return '—'
}

/** Effective material checklist — `ritualProfile.materialComponents` overrides root. */
export function resolveMaterialRequirements(
  spell: Pick<PalladiumMagicSpell, 'materialComponents' | 'ritualProfile'>,
): MaterialRequirements | undefined {
  const ritual = spell.ritualProfile as MagicRitualProfile | undefined
  return (
    parseMaterialRequirements(ritual?.materialComponents) ??
    parseMaterialRequirements(spell.materialComponents)
  )
}

export function listMaterialComponentChecklist(
  spell: Pick<PalladiumMagicSpell, 'materialComponents' | 'ritualProfile'>,
): readonly MaterialComponentChecklistRow[] {
  const requirements = resolveMaterialRequirements(spell)
  if (!requirements) return []
  return requirements.entries.flatMap((entry, index) => {
    const row = parseMaterialEntry(entry, index)
    return row ? [row] : []
  })
}

export function resolveForgedOutputs(
  spell: Pick<PalladiumMagicSpell, 'forgedOutputs' | 'effectProfiles'>,
  effectProfileName?: string,
): readonly ForgedItemOutput[] {
  if (effectProfileName && Array.isArray(spell.effectProfiles)) {
    const profile = spell.effectProfiles.find(
      (row) => isRecord(row) && row.name === effectProfileName,
    )
    if (profile && isRecord(profile) && Array.isArray(profile.forgedOutputs)) {
      return profile.forgedOutputs as ForgedItemOutput[]
    }
  }
  if (Array.isArray(spell.forgedOutputs)) {
    return spell.forgedOutputs as ForgedItemOutput[]
  }
  return []
}

export function spellRequiresMaterialComponents(
  spell: Pick<PalladiumMagicSpell, 'materialComponents' | 'ritualProfile'>,
): boolean {
  return listMaterialComponentChecklist(spell).length > 0
}

export function spellProducesForgedItems(
  spell: Pick<PalladiumMagicSpell, 'forgedOutputs' | 'effectProfiles'>,
): boolean {
  return resolveForgedOutputs(spell).length > 0
}

export function spellIsDowntimeRitual(
  spell: Pick<
    PalladiumMagicSpell,
    'isRitual' | 'magicKind' | 'ritualProfile' | 'materialComponents' | 'forgedOutputs'
  >,
): boolean {
  if (spell.ritualProfile != null) return true
  if (spell.isRitual === true) return true
  if (spell.magicKind === 'ritual' || spell.magicKind === 'enchantment') return true
  return spellRequiresMaterialComponents(spell) || spellProducesForgedItems(spell)
}

export function forgedOutputDisplayLabel(output: ForgedItemOutput): string {
  return output.label ?? output.catalogItemId ?? output.outputTemplateId ?? 'Forged item'
}

/** Schema $id pointers for authoring tools. */
export const PALLADIUM_FEATURE_COMMON_MATERIAL_REQUIREMENTS_REF =
  `${COMMON_FEATURE}#/$defs/materialRequirements` as const

export const PALLADIUM_FEATURE_COMMON_FORGED_ITEM_OUTPUT_REF =
  `${COMMON_FEATURE}#/$defs/forgedItemOutput` as const
