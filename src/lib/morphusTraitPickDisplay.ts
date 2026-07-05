import { getMorphusCharacteristicById, getMorphusTableById } from '../data/library/morphusTableCatalogLoader'
import { buildMorphusCapabilitySummary } from './morphusCharacteristicAggregation'
import { MORPHUS_STAT_KEY_LABELS } from './morphusCustomTrait'
import { formatPolymorphicModifier, hasPolymorphicPayload } from './morphusPolymorphicResolver'
import type {
  MorphusCharacteristic,
  MorphusForgeSlotRequirement,
  MorphusPolymorphicModifier,
  MorphusSaveModifiers,
  MorphusSlotPickOption,
  MorphusStatModifiers,
  MorphusVariantPercentile,
} from '../types'

export type MorphusTraitPickBonusesPenalties = {
  bonuses: string[]
  penalties: string[]
}

export const MORPHUS_STAT_MODIFIERS_BY_TYPE_NOTE = 'Stat modifiers defined by type'

function traitUsesVariantModifierNote(entryId: string, entry?: MorphusCharacteristic): boolean {
  return Boolean(entry?.variantPercentiles?.length && !entryId.includes('::variant:'))
}

const SAVE_LABELS: Record<keyof MorphusSaveModifiers, string> = {
  magic: 'Save vs Magic',
  psionics: 'Save vs Psionics',
  insanity: 'Save vs Insanity',
  poison: 'Save vs Poison',
  gas: 'Save vs Gas',
  horrorFactor: 'Save vs Horror Factor',
  disease: 'Save vs Disease',
  possession: 'Save vs Possession',
  mindControl: 'Save vs Mind Control',
  illusions: 'Save vs Illusions',
  nightlordMagic: 'Save vs Nightlord Magic',
  allSaves: 'All saves',
  nauseaVomiting: 'Save vs nausea/vomiting',
  immunities: 'Save immunities',
  comaDeath: 'Coma / death',
}

function tableLabel(tableId: string, fallback?: string): string {
  if (tableId === 'characteristics') return 'Characteristics'
  return getMorphusTableById(tableId)?.displayName ?? fallback ?? tableId
}

function modifierPolarity(mod: MorphusPolymorphicModifier): 'bonus' | 'penalty' | 'neutral' {
  if (mod.dice) {
    return mod.dice.trim().startsWith('-') ? 'penalty' : 'bonus'
  }
  if (mod.flat != null) return mod.flat >= 0 ? 'bonus' : 'penalty'
  if (mod.percent != null) return mod.percent >= 0 ? 'bonus' : 'penalty'
  return 'neutral'
}

function formatTraitPickBonusFragment(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '—') return trimmed
  if (trimmed.startsWith('+') || trimmed.startsWith('-')) return trimmed
  return `+${trimmed}`
}

/** Remove trailing Bonus/Penalty summary lines still embedded in source descriptions. */
export function stripMorphusDescriptionModifierTail(description?: string): string | undefined {
  if (!description?.trim()) return description
  const marker = /\s+(Bonuses?|Penalties?)\s*:/i.exec(description)
  if (marker?.index != null) {
    const trimmed = description.slice(0, marker.index).trim().replace(/[;,]\s*$/, '').trim()
    return trimmed || undefined
  }
  return description.trim()
}

function pushModifierLine(
  out: MorphusTraitPickBonusesPenalties,
  label: string,
  mod: MorphusPolymorphicModifier | undefined,
): void {
  if (!mod || !hasPolymorphicPayload(mod)) return
  const pol = modifierPolarity(mod)
  const raw = formatPolymorphicModifier(mod)
  if (pol === 'bonus') {
    out.bonuses.push(`${label} ${formatTraitPickBonusFragment(raw)}`)
  } else if (pol === 'penalty') {
    out.penalties.push(`${label} ${raw}`)
  }
}

function collectDirectStatAndSaveModifiers(entry: MorphusCharacteristic): MorphusTraitPickBonusesPenalties {
  const out: MorphusTraitPickBonusesPenalties = { bonuses: [], penalties: [] }

  for (const key of Object.keys(entry.statModifiers ?? {}) as (keyof MorphusStatModifiers)[]) {
    pushModifierLine(out, MORPHUS_STAT_KEY_LABELS[key], entry.statModifiers?.[key])
  }

  for (const key of Object.keys(entry.saveModifiers ?? {}) as (keyof MorphusSaveModifiers)[]) {
    const value = entry.saveModifiers?.[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    const label = SAVE_LABELS[key]
    const text = `${label} ${value >= 0 ? '+' : ''}${value}`
    if (value >= 0) out.bonuses.push(text)
    else out.penalties.push(text)
  }

  const globalSkill = entry.skillModifiers?.globalSkillModifier
  if (typeof globalSkill === 'number' && globalSkill !== 0) {
    const text = `All skills ${globalSkill >= 0 ? '+' : ''}${globalSkill}%`
    if (globalSkill >= 0) out.bonuses.push(text)
    else out.penalties.push(text)
  }

  for (const row of entry.skillModifiers?.specificSkillOverrides ?? []) {
    const pct = row.modifierPercent
    if (typeof pct !== 'number' || !Number.isFinite(pct) || pct === 0) continue
    const name = row.targetValue.replace(/^skill_/, '').replace(/_/g, ' ')
    const text = `${name} ${pct >= 0 ? '+' : ''}${pct}%`
    if (pct >= 0) out.bonuses.push(text)
    else out.penalties.push(text)
  }

  if (entry.naturalAr != null) {
    out.bonuses.push(`Natural A.R. ${formatTraitPickBonusFragment(String(entry.naturalAr))}`)
  }

  for (const weapon of entry.naturalWeapons ?? []) {
    out.bonuses.push(
      `${weapon.label ?? weapon.limbType}: ${formatTraitPickBonusFragment(weapon.damageFormula)}`,
    )
  }

  const aff = entry.damageAffinities
  if (aff) {
    for (const [key, multiplier] of Object.entries(aff)) {
      if (multiplier == null || multiplier === 1) continue
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
      const text =
        multiplier < 1
          ? `${label}: takes ×${multiplier} damage`
          : `${label}: takes ×${multiplier} damage`
      if (multiplier > 1) out.penalties.push(text)
      else out.bonuses.push(text)
    }
  }

  return out
}

function mergeBonusPenaltyLists(
  ...sources: MorphusTraitPickBonusesPenalties[]
): MorphusTraitPickBonusesPenalties {
  const bonuses: string[] = []
  const penalties: string[] = []
  const seenB = new Set<string>()
  const seenP = new Set<string>()
  for (const src of sources) {
    for (const line of src.bonuses) {
      if (!seenB.has(line)) {
        seenB.add(line)
        bonuses.push(line)
      }
    }
    for (const line of src.penalties) {
      if (!seenP.has(line)) {
        seenP.add(line)
        penalties.push(line)
      }
    }
  }
  return { bonuses, penalties }
}

function normalizeTraitPickBonusLines(lines: string[]): string[] {
  return lines.map((line) => {
    if (/\s\+/.test(line) || /:\s*\+/.test(line)) return line

    const colon = /^([^:]+):\s*(.+)$/.exec(line)
    if (colon) {
      const value = colon[2].trim()
      if (value.startsWith('+') || value.startsWith('-')) return line
      return `${colon[1]}: ${formatTraitPickBonusFragment(value)}`
    }

    for (const statLabel of Object.values(MORPHUS_STAT_KEY_LABELS)) {
      const prefix = `${statLabel} `
      if (line.startsWith(prefix)) {
        const value = line.slice(prefix.length).trim()
        if (value.startsWith('+')) return line
        return `${prefix}${formatTraitPickBonusFragment(value)}`
      }
    }

    for (const saveLabel of Object.values(SAVE_LABELS)) {
      const prefix = `${saveLabel} `
      if (line.startsWith(prefix)) {
        const value = line.slice(prefix.length).trim()
        return `${prefix}${value.startsWith('-') ? value : formatTraitPickBonusFragment(value)}`
      }
    }

    if (line.startsWith('All skills ')) {
      const value = line.slice('All skills '.length).trim()
      if (value.startsWith('+') || value.startsWith('-')) return line
      return `All skills ${formatTraitPickBonusFragment(value)}`
    }

    return line
  })
}

/** Bonuses and penalties for a trait pick row (creation Trait Forge). */
export function morphusTraitPickBonusesPenalties(
  entryId: string,
  characterLevel = 1,
): MorphusTraitPickBonusesPenalties {
  const entry = getMorphusCharacteristicById(entryId)
  if (!entry) return { bonuses: [], penalties: [] }

  if (traitUsesVariantModifierNote(entryId, entry)) {
    return { bonuses: [], penalties: [] }
  }

  const direct = collectDirectStatAndSaveModifiers(entry)
  const summary = buildMorphusCapabilitySummary([entry], characterLevel)
  const fromSummary: MorphusTraitPickBonusesPenalties = {
    bonuses: summary.lines
      .filter((line) => line.polarity === 'bonus')
      .map((line) => (line.label === line.detail ? line.label : `${line.label}: ${line.detail}`)),
    penalties: summary.lines
      .filter((line) => line.polarity === 'penalty')
      .map((line) => (line.label === line.detail ? line.label : `${line.label}: ${line.detail}`)),
  }

  const merged = mergeBonusPenaltyLists(direct, fromSummary)
  return {
    bonuses: normalizeTraitPickBonusLines(merged.bonuses),
    penalties: merged.penalties,
  }
}

function formatSlotRequirement(
  slot: MorphusForgeSlotRequirement,
  planLength: number,
): string {
  switch (slot.kind) {
    case 'required':
      return slot.label ?? tableLabel(slot.tableId)
    case 'choice': {
      const labels = slot.options.map((o) => o.label ?? tableLabel(o.tableId))
      const joined = labels.join(' OR ')
      return planLength > 1 && labels.length > 1 ? `(${joined})` : joined
    }
    case 'repeat':
      return `${slot.count}× ${slot.label ?? tableLabel(slot.tableId)}`
    case 'combination_pool':
      return `${slot.countRoll.notation} from ${slot.pool.map((p) => p.label ?? tableLabel(p.tableId)).join(' OR ')}`
    case 'characteristics_multiplier':
      return `${slot.count}× Characteristics`
    default:
      return 'Unknown'
  }
}

/** Human-readable table route for a slot plan (e.g. "(Stigmata OR Nightmare) + Characteristics"). */
export function formatMorphusSlotPlanRoute(
  slotPlan: readonly MorphusForgeSlotRequirement[],
): string {
  const len = slotPlan.length
  return slotPlan.map((slot) => formatSlotRequirement(slot, len)).join(' + ')
}

/** Table routing hint for a trait catalog row (hub routers, cross-table, combos). */
export function morphusTraitTableRouteHint(entry: MorphusCharacteristic): string | undefined {
  if (entry.crossTableRoll) {
    const target = entry.crossTableRoll.targetTableName ?? tableLabel(entry.crossTableRoll.targetTableId)
    return `→ ${target}`
  }
  const budget = entry.subTraitChoicesBudget
  if (budget?.allowedChoicesPool?.length) {
    const count = budget.slotsAvailable ?? budget.allowedChoicesPool.length
    const pool = budget.allowedChoicesPool.map((id) => tableLabel(id)).join(' OR ')
    return `${count}× pick from ${pool}`
  }
  if (entry.tableWorkflow?.stepOneRollCount) {
    return `Roll ${entry.tableWorkflow.stepOneRollCount}× on ${entry.name}`
  }
  return undefined
}

export function morphusVariantMergedEntryId(
  parentEntryId: string,
  variant: Pick<MorphusVariantPercentile, 'label' | 'roll'>,
): string {
  return `${parentEntryId}::variant:${variant.label}`
}

export function buildMorphusVariantPickEntries(
  parentEntryId: string,
  variants: readonly MorphusVariantPercentile[],
): MorphusSlotPickOption[] {
  return variants.map((variant) =>
    enrichMorphusTraitPickOption(morphusVariantMergedEntryId(parentEntryId, variant), {
      id: variant.label,
      name: variant.label,
      description: variant.description,
    }),
  )
}

export function enrichMorphusTraitPickOption(
  entryId: string,
  base: { id: string; name: string; band?: string; description?: string; tableRoute?: string },
  characterLevel = 1,
): MorphusSlotPickOption {
  const entry = getMorphusCharacteristicById(entryId)
  const byType = traitUsesVariantModifierNote(entryId, entry)
  const { bonuses, penalties } = morphusTraitPickBonusesPenalties(entryId, characterLevel)
  const rawDescription = base.description ?? entry?.description
  return {
    ...base,
    description: stripMorphusDescriptionModifierTail(rawDescription),
    tableRoute: base.tableRoute ?? (entry ? morphusTraitTableRouteHint(entry) : undefined),
    bonuses,
    penalties,
    modifierNote: byType ? MORPHUS_STAT_MODIFIERS_BY_TYPE_NOTE : undefined,
  }
}
