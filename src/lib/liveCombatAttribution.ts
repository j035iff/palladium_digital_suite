import type { ActiveForm, Character, FeatureModifiers } from '../types'
import { getRaceById, raceCatalogGenreId } from '../data/library/registry'
import { getSkillById } from '../data/skillLibrary'
import { listApplyingFeatures } from './featureEngine'
import { morphusTraitPassiveKeyAttribution } from './morphusCreationLedger'
import { racePassiveModifiers } from './raceEngine'
import { DEFAULT_RACE_ID } from './raceFormPolicy'
import { collectUnlockedSkillIds } from './combatQuickBonuses'
import type { StatStackTerm } from './creationStatEngine'
import type { SheetBonusLine } from './liveStatEngine'

const INITIATIVE_LUMP_LABELS = new Set(['Features', 'Passive initiative'])

function addModifierLine(
  out: SheetBonusLine[],
  mods: Record<string, number> | undefined,
  label: string,
  passiveKey: string,
): void {
  if (!mods) return
  const amount = mods[passiveKey]
  if (amount == null || amount === 0) return
  out.push({ label, amount })
}

/** Per-source attribution for passive combat modifier keys (initiative, entangle, …). */
export function liveCombatPassiveKeyAttribution(
  character: Character,
  activeForm: ActiveForm,
  passiveKey: keyof FeatureModifiers & string,
  opts?: { supportsDualForm?: boolean },
): SheetBonusLine[] {
  const out: SheetBonusLine[] = []

  if (opts?.supportsDualForm && activeForm === 'morphus') {
    out.push(
      ...morphusTraitPassiveKeyAttribution(character, [passiveKey]).map((entry) => ({
        label: entry.label,
        amount: entry.amount,
      })),
    )
  }

  for (const feat of listApplyingFeatures(character.selectedAbilities ?? [], activeForm)) {
    addModifierLine(
      out,
      feat.modifiers as Record<string, number> | undefined,
      feat.identity.name,
      passiveKey,
    )
  }

  for (const skillId of collectUnlockedSkillIds(character, activeForm)) {
    const skill = getSkillById(skillId)
    addModifierLine(
      out,
      skill?.modifiers as Record<string, number> | undefined,
      skill?.name ?? skillId,
      passiveKey,
    )
  }

  if (!(opts?.supportsDualForm && activeForm === 'morphus')) {
    const race = racePassiveModifiers(
      getRaceById(
        character.raceId ?? DEFAULT_RACE_ID,
        raceCatalogGenreId(character.hostGenreId, character.creationGenreId),
      ),
    )
    const amount = race[passiveKey as keyof FeatureModifiers]
    if (amount != null && amount !== 0) {
      out.push({ label: 'Race', amount })
    }
  }

  return out.sort((a, b) => a.label.localeCompare(b.label))
}

/** Replace lump passive initiative/features stack rows with named source lines. */
export function expandInitiativeStackWithAttribution(
  stack: readonly StatStackTerm[],
  attribution: readonly SheetBonusLine[],
): StatStackTerm[] {
  const withoutLump = stack.filter((term) => !INITIATIVE_LUMP_LABELS.has(term.label))
  const extras: StatStackTerm[] = attribution
    .filter((line) => line.amount !== 0)
    .map((line) => ({
      bucket: 'misc' as const,
      label: line.label,
      amount: line.amount,
    }))
  return [...withoutLump, ...extras]
}
