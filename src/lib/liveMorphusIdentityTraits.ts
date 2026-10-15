/**
 * Live-sheet Morphus identity — Familiar Surface breakdown of creation trait picks.
 * Unified Path: reads the same creation storage as Trait Forge / Review
 * (`morphusForgeState` + `morphusForgeSlotState`, else `morphusTraitSlotResolutions` /
 * `activeMorphusCharacteristicIds` via {@link resolveActiveMorphusTraits}).
 * Does not invent catalog rows.
 */
import { getMorphusTableById } from '../data/library/morphusTableCatalogLoader'
import type {
  Character,
  MorphusCharacteristic,
  MorphusForgeSlotState,
  MorphusForgeState,
} from '../types'
import { formatPolymorphicModifier, hasPolymorphicPayload } from './morphusPolymorphicResolver'
import { resolveActiveMorphusTraits } from './morphusPassiveBridge'
import {
  buildMorphusSelectedTraitsPanelSections,
  type MorphusTraitPanelPathSection,
} from './morphusSelectedTraitsPanel'

export type LiveMorphusIdentityTraitRow = {
  /** Familiar Surface trait name (never catalog id). */
  name: string
  /** Table / category label when known. */
  tableLabel?: string
  /** Optional short mechanic hints (height/weight identity mods only). */
  identityHints?: string[]
}

export type LiveMorphusIdentityTraitBreakdown = {
  /** Archetype / path subtitle when forge state still present. */
  subtitle?: string
  /** Path section title when forge state present (Appearance / Personality). */
  sectionTitle?: string
  rows: LiveMorphusIdentityTraitRow[]
  /** True when creation forge tree is available (richer pick nesting). */
  fromForgeTree: boolean
}

function tableLabelForTrait(trait: MorphusCharacteristic): string | undefined {
  const fromCatalog = trait.tableCategory
    ? getMorphusTableById(trait.tableCategory)?.displayName
    : undefined
  if (fromCatalog?.trim()) return fromCatalog.trim()
  if (trait.tableCategory?.trim()) {
    return trait.tableCategory.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return undefined
}

function identityHintsForTrait(trait: MorphusCharacteristic): string[] {
  const hints: string[] = []
  if (trait.heightModifier && hasPolymorphicPayload(trait.heightModifier)) {
    hints.push(`Height ${formatPolymorphicModifier(trait.heightModifier)}`)
  }
  if (trait.weightModifier && hasPolymorphicPayload(trait.weightModifier)) {
    hints.push(`Weight ${formatPolymorphicModifier(trait.weightModifier)}`)
  }
  return hints
}

function rowsFromResolvedTraits(
  traits: readonly MorphusCharacteristic[],
): LiveMorphusIdentityTraitRow[] {
  const rows: LiveMorphusIdentityTraitRow[] = []
  for (const trait of traits) {
    const name = trait.name?.trim()
    if (!name) continue
    const hints = identityHintsForTrait(trait)
    rows.push({
      name,
      tableLabel: tableLabelForTrait(trait),
      ...(hints.length ? { identityHints: hints } : {}),
    })
  }
  return rows
}

function rowsFromForgeSections(
  sections: readonly MorphusTraitPanelPathSection[],
): LiveMorphusIdentityTraitRow[] {
  const rows: LiveMorphusIdentityTraitRow[] = []
  const seen = new Set<string>()
  for (const section of sections) {
    for (const tree of section.characteristicTrees) {
      for (const entry of tree.entries) {
        const name = entry.name.trim()
        if (!name || seen.has(name)) continue
        seen.add(name)
        rows.push({ name })
      }
    }
    for (const box of section.boxes) {
      for (const pick of box.resolvedPicks) {
        const name = pick.trim()
        if (!name || seen.has(name)) continue
        seen.add(name)
        rows.push({ name, tableLabel: box.title })
      }
    }
  }
  return rows
}

/**
 * Build the Morphus identity traits list for the live sheet.
 * Prefer forge pick tree when still on the save; else effective resolved traits.
 */
export function buildLiveMorphusIdentityTraitBreakdown(
  character: Pick<
    Character,
    | 'morphusForgeState'
    | 'morphusForgeSlotState'
    | 'morphusTraitSlotResolutions'
    | 'activeMorphusCharacteristicIds'
  >,
): LiveMorphusIdentityTraitBreakdown {
  const forgeState = character.morphusForgeState as MorphusForgeState | undefined
  const slotState = character.morphusForgeSlotState as MorphusForgeSlotState | undefined

  if (forgeState?.path) {
    const sections = buildMorphusSelectedTraitsPanelSections(forgeState, slotState)
    const rows = rowsFromForgeSections(sections)
    if (rows.length > 0) {
      const section = sections[0]
      return {
        subtitle: section?.subtitle,
        sectionTitle: section?.title,
        rows,
        fromForgeTree: true,
      }
    }
  }

  const traits = resolveActiveMorphusTraits(character)
  return {
    rows: rowsFromResolvedTraits(traits),
    fromForgeTree: false,
  }
}
