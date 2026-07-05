import {
  getMorphusCharacteristicById,
  MORPHUS_TABLE_CATALOG,
} from '../data/library/morphusTableCatalogLoader'
import type {
  MorphusCharacteristic,
  MorphusCustomTraitAllowedField,
  MorphusCustomTraitInstance,
  MorphusCustomTraitResolution,
  MorphusPolymorphicModifier,
  MorphusSaveModifiers,
  MorphusStatModifiers,
  MorphusTraitSlotResolution,
} from '../types'

/** High-frequency stat keys surfaced first in the Custom Trait Workshop. */
export const MORPHUS_COMMON_STAT_KEYS = [
  'sdc',
  'hp',
  'hf',
  'iq',
  'me',
  'ma',
  'ps',
  'pp',
  'pe',
  'pb',
  'spd',
  'ppe',
  'strike',
  'parry',
  'dodge',
  'perception',
  'apm',
] as const satisfies readonly (keyof MorphusStatModifiers)[]

/** Remaining stat keys — expert panel only. */
export const MORPHUS_EXPERT_STAT_KEYS = [
  'initiative',
  'rollWithPunch',
  'pullPunch',
  'entangle',
  'disarm',
  'strikeWithGuns',
  'bonusHthDamage',
  'ar',
] as const satisfies readonly (keyof MorphusStatModifiers)[]

export const MORPHUS_COMMON_SAVE_KEYS = [
  'magic',
  'psionics',
  'insanity',
  'poison',
  'horrorFactor',
  'disease',
  'possession',
  'mindControl',
  'illusions',
  'allSaves',
] as const satisfies readonly (keyof MorphusSaveModifiers)[]

export const MORPHUS_STAT_KEY_LABELS: Record<keyof MorphusStatModifiers, string> = {
  iq: 'I.Q.',
  me: 'M.E.',
  ma: 'M.A.',
  ps: 'P.S.',
  pp: 'P.P.',
  pe: 'P.E.',
  pb: 'P.B.',
  spd: 'Spd',
  sdc: 'S.D.C.',
  hp: 'H.P.',
  ppe: 'P.P.E.',
  hf: 'Horror Factor',
  perception: 'Perception',
  apm: 'Attacks / Melee',
  initiative: 'Initiative',
  strike: 'Strike',
  parry: 'Parry',
  dodge: 'Dodge',
  rollWithPunch: 'Roll w/ Punch',
  pullPunch: 'Pull Punch',
  entangle: 'Entangle',
  disarm: 'Disarm',
  strikeWithGuns: 'Strike (guns)',
  bonusHthDamage: 'Hand-to-Hand dmg',
  ar: 'A.R. shift',
}

export const MORPHUS_SAVE_KEY_LABELS: Record<
  (typeof MORPHUS_COMMON_SAVE_KEYS)[number],
  string
> = {
  magic: 'Save vs Magic',
  psionics: 'Save vs Psionics',
  insanity: 'Save vs Insanity',
  poison: 'Save vs Poison',
  horrorFactor: 'Save vs Horror Factor',
  disease: 'Save vs Disease',
  possession: 'Save vs Possession',
  mindControl: 'Save vs Mind Control',
  illusions: 'Save vs Illusions',
  allSaves: 'All Saves',
}

export function emptyMorphusCustomTraitInstance(): MorphusCustomTraitInstance {
  return {
    displayName: '',
    description: '',
    gmApproved: false,
  }
}

export function listMorphusCustomTraitCatalogEntries(): MorphusCharacteristic[] {
  const out: MorphusCharacteristic[] = []
  for (const table of MORPHUS_TABLE_CATALOG) {
    for (const entry of table.entries) {
      if (entry.customTraitResolution) out.push(entry)
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export function catalogEntryRequiresCustomTrait(
  catalogEntryId: string,
): MorphusCustomTraitResolution | undefined {
  return getMorphusCharacteristicById(catalogEntryId)?.customTraitResolution
}

function stripRouterFields(
  catalog: MorphusCharacteristic,
): Omit<
  MorphusCharacteristic,
  | 'entryRole'
  | 'crossTableRoll'
  | 'subTraitChoicesBudget'
  | 'tableWorkflow'
  | 'customTraitResolution'
  | 'percentile'
> {
  const {
    entryRole: _entryRole,
    crossTableRoll: _crossTableRoll,
    subTraitChoicesBudget: _subTraitChoicesBudget,
    tableWorkflow: _tableWorkflow,
    customTraitResolution: _customTraitResolution,
    percentile: _percentile,
    ...shell
  } = catalog
  return shell
}

/**
 * Merge a catalog shell with a player/G.M. custom instance for aggregation and display.
 */
export function resolveEffectiveMorphusTrait(
  catalog: MorphusCharacteristic,
  customInstance?: MorphusCustomTraitInstance,
  slotId?: string,
): MorphusCharacteristic {
  if (!customInstance) return catalog

  const shell = stripRouterFields(catalog)
  const notes: string[] = [...(customInstance.customOneOffs ?? [])]
  if (!customInstance.gmApproved && catalog.customTraitResolution?.requiresGmApproval !== false) {
    notes.unshift('[Pending G.M. approval]')
  }
  notes.push('[Custom trait — player/G.M. authored]')

  return {
    ...shell,
    id: slotId ? `${catalog.id}::slot::${slotId}` : `${catalog.id}::custom`,
    name: customInstance.displayName.trim() || catalog.name,
    description: customInstance.description.trim() || catalog.description,
    statModifiers: customInstance.statModifiers,
    saveModifiers: customInstance.saveModifiers,
    skillModifiers: customInstance.skillModifiers,
    atWillAbilities: customInstance.atWillAbilities,
    naturalWeapons: customInstance.naturalWeapons,
    sensory: customInstance.sensory,
    mobility: customInstance.mobility,
    naturalAr: customInstance.naturalAr,
    progressionModifiers: customInstance.progressionModifiers,
    customOneOffs: notes.length ? notes : undefined,
  }
}

export function resolveEffectiveMorphusTraitFromSlot(
  slot: MorphusTraitSlotResolution,
): MorphusCharacteristic | undefined {
  const catalog = getMorphusCharacteristicById(slot.catalogEntryId)
  if (!catalog) return undefined
  if (slot.customInstance) {
    return resolveEffectiveMorphusTrait(catalog, slot.customInstance, slot.slotId)
  }
  if (catalog.customTraitResolution) return undefined
  if (slot.selectedSubTraitIds?.length && catalog.gimmickInventory?.length) {
    const selected = new Set(slot.selectedSubTraitIds)
    return {
      ...catalog,
      gimmickInventory: catalog.gimmickInventory.filter(
        (row) => row.id != null && selected.has(row.id),
      ),
    }
  }
  return catalog
}

export function isMorphusCustomTraitSlotComplete(
  slot: MorphusTraitSlotResolution,
): boolean {
  const catalog = getMorphusCharacteristicById(slot.catalogEntryId)
  if (!catalog) return false
  if (!catalog.customTraitResolution) return true
  const instance = slot.customInstance
  if (!instance) return false
  if (!instance.displayName.trim() || !instance.description.trim()) return false
  if (catalog.customTraitResolution.requiresGmApproval !== false && !instance.gmApproved) {
    return false
  }
  return true
}

export function resolveActiveMorphusTraitsFromCharacter(character: {
  activeMorphusCharacteristicIds?: readonly string[]
  morphusTraitSlotResolutions?: readonly MorphusTraitSlotResolution[]
}): MorphusCharacteristic[] {
  const slots = character.morphusTraitSlotResolutions
  if (slots?.length) {
    const out: MorphusCharacteristic[] = []
    for (const slot of slots) {
      const trait = resolveEffectiveMorphusTraitFromSlot(slot)
      if (trait) out.push(trait)
    }
    return out
  }
  const ids = character.activeMorphusCharacteristicIds ?? []
  return ids
    .map((id) => getMorphusCharacteristicById(id))
    .filter((t): t is MorphusCharacteristic => t != null)
}

export function hasEmptyPolymorphicModifier(
  mod: MorphusPolymorphicModifier | undefined,
): boolean {
  if (!mod) return true
  return (
    mod.flat == null &&
    (mod.dice == null || mod.dice.trim() === '') &&
    mod.percent == null &&
    mod.isOverride !== true
  )
}

export function clearEmptyStatModifiers(
  stats: MorphusStatModifiers | undefined,
): MorphusStatModifiers | undefined {
  if (!stats) return undefined
  const out: MorphusStatModifiers = {}
  let any = false
  for (const [key, mod] of Object.entries(stats) as [
    keyof MorphusStatModifiers,
    MorphusPolymorphicModifier | undefined,
  ][]) {
    if (!hasEmptyPolymorphicModifier(mod)) {
      out[key] = mod
      any = true
    }
  }
  return any ? out : undefined
}

export function clearEmptySaveModifiers(
  saves: MorphusSaveModifiers | undefined,
): MorphusSaveModifiers | undefined {
  if (!saves) return undefined
  const out: MorphusSaveModifiers = { ...saves }
  let any = false
  for (const key of Object.keys(out) as (keyof MorphusSaveModifiers)[]) {
    const v = out[key]
    if (v == null || (typeof v === 'number' && !Number.isFinite(v))) {
      delete out[key]
    } else if (key !== 'immunities') {
      any = true
    }
  }
  if (out.immunities?.length) any = true
  return any ? out : undefined
}

export function sanitizeMorphusCustomTraitInstance(
  instance: MorphusCustomTraitInstance,
): MorphusCustomTraitInstance {
  return {
    ...instance,
    displayName: instance.displayName.trim(),
    description: instance.description.trim(),
    statModifiers: clearEmptyStatModifiers(instance.statModifiers),
    saveModifiers: clearEmptySaveModifiers(instance.saveModifiers),
    customOneOffs: instance.customOneOffs?.map((s) => s.trim()).filter(Boolean),
    atWillAbilities: instance.atWillAbilities?.filter((a) => a.label.trim()),
    naturalWeapons: instance.naturalWeapons?.filter((w) => (w.label ?? '').trim()),
  }
}

export function allMorphusCustomTraitSlotsComplete(
  slots: readonly MorphusTraitSlotResolution[] | undefined,
): boolean {
  if (!slots?.length) return true
  return slots.every(isMorphusCustomTraitSlotComplete)
}

export function fieldAllowedForCustomTrait(
  resolution: MorphusCustomTraitResolution | undefined,
  field: MorphusCustomTraitAllowedField,
): boolean {
  if (!resolution?.allowedFields?.length) return true
  return resolution.allowedFields.includes(field)
}
