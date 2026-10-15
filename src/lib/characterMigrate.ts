/**
 * Versioned character save migrator.
 *
 * Runs on every load (`hydrateCharacterFromStorage`) before gameplay hydration.
 * Covers:
 * 1. Persist-field renames (legacy save JSON keys → current shape)
 * 2. Catalog ID remaps (renamed / retired content ids on the save)
 * 3. Orphan detection for catalog ids that no longer resolve (report only)
 *
 * When you rename a persisted Character field or a catalog id that saves reference,
 * add a step or remap entry here and bump {@link CHARACTER_SAVE_SCHEMA_VERSION}.
 */
import { getLibraryOccById, getRaceById } from '../data/library/registry'
import { getMorphusCharacteristicById } from '../data/library/morphusTableCatalogLoader'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { getSkillById } from '../data/skillLibrary'
import {
  coerceTableProjectedAliasId,
  normalizeAliases,
} from './characterAliases'
import {
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from './creationSkillPicks'
import { sheetSkillIdForCreationHandToHandTier } from './creationHandToHandChoice'
import type {
  Character,
  CharacterRootState,
  CreationSkillPick,
  FormState,
  MorphusTraitSlotResolution,
  SheetSkill,
} from '../types'

/** Current save schema version stamped on migrate + serialize. */
export const CHARACTER_SAVE_SCHEMA_VERSION = 2

type LegacyCharacterFields = {
  facade?: Character['primary']
  creationFacadeDiceFinalized?: boolean
  schemaVersion?: number
}

/** `null` = drop the id from list/slot fields (retired content). */
export type CatalogIdRemapTarget = string | null

/**
 * Legacy catalog ids → current ids (or `null` to drop).
 * Add entries whenever content ids rename or retire while saves may still cite them.
 */
export const CATALOG_ID_REMAPS = {
  morphusTrait: {
    mythical_creature_cyclops_giant: 'mythical_creature_cyclops',
  } satisfies Record<string, CatalogIdRemapTarget>,
  race: {} satisfies Record<string, CatalogIdRemapTarget>,
  occ: {} satisfies Record<string, CatalogIdRemapTarget>,
  skill: {} satisfies Record<string, CatalogIdRemapTarget>,
  ability: {} satisfies Record<string, CatalogIdRemapTarget>,
} as const

const LEGACY_FORGE_TAB_IDS: Record<string, string> = {
  tab0_identity: 'tab1_configurator',
  tab5_traits: 'tab6_traits',
  tab6_abilities: 'tab7_abilities',
  tab7_review: 'tab9_review',
  tab8_review: 'tab9_review',
}

export type CatalogIdKind = keyof typeof CATALOG_ID_REMAPS

export type CharacterMigrationReport = {
  fromVersion: number
  toVersion: number
  fieldRenames: string[]
  catalogRemaps: { kind: CatalogIdKind; from: string; to: string | null }[]
  orphanedCatalogIds: { kind: CatalogIdKind | 'morphusTrait'; id: string }[]
}

export type MigrateCharacterSaveResult = {
  character: CharacterRootState
  report: CharacterMigrationReport
}

function readSaveSchemaVersion(input: CharacterRootState): number {
  const raw = (input as CharacterRootState & LegacyCharacterFields).schemaVersion
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
}

function remapCatalogId(
  kind: CatalogIdKind,
  id: string | undefined | null,
  report: CharacterMigrationReport,
): string | null | undefined {
  if (id == null || id === '') return id
  const table = CATALOG_ID_REMAPS[kind] as Record<string, CatalogIdRemapTarget>
  if (!(id in table)) return id
  const to = table[id]!
  report.catalogRemaps.push({ kind, from: id, to })
  return to
}

function remapIdList(
  kind: CatalogIdKind,
  ids: readonly string[] | undefined,
  report: CharacterMigrationReport,
): string[] | undefined {
  if (!ids) return ids
  const out: string[] = []
  for (const id of ids) {
    const next = remapCatalogId(kind, id, report)
    if (next != null && next !== '') out.push(next)
  }
  return out
}

/** Migrate persisted saves that used the legacy `facade` branch id. */
export function migrateCharacterFromLegacyFacade(
  input: CharacterRootState,
): CharacterRootState {
  const legacy = input as CharacterRootState & LegacyCharacterFields
  const primary = input.primary ?? legacy.facade
  if (!primary) return input

  const next = {
    ...input,
    primary,
    creationPrimaryDiceFinalized:
      input.creationPrimaryDiceFinalized ?? legacy.creationFacadeDiceFinalized,
  } as CharacterRootState & LegacyCharacterFields

  delete next.facade
  delete next.creationFacadeDiceFinalized
  return next
}

function migrateLegacyForgeTabFields(
  input: CharacterRootState,
  report: CharacterMigrationReport,
): CharacterRootState {
  let next = { ...input }
  const tab = input.creationForgeTab
  if (tab && LEGACY_FORGE_TAB_IDS[tab]) {
    next = {
      ...next,
      creationForgeTab: LEGACY_FORGE_TAB_IDS[tab] as CharacterRootState['creationForgeTab'],
    }
    report.fieldRenames.push(`creationForgeTab:${tab}→${LEGACY_FORGE_TAB_IDS[tab]}`)
  }

  const completed = input.creationForgeCompleted
  const snapshots = input.creationForgeSnapshots
  if (!completed && !snapshots) return next

  const nextCompleted: Record<string, true> = {
    ...((completed ?? {}) as Record<string, true>),
  }
  const nextSnapshots: Record<string, string> = {
    ...((snapshots ?? {}) as Record<string, string>),
  }
  let touched = false
  for (const [legacy, modern] of Object.entries(LEGACY_FORGE_TAB_IDS)) {
    if (nextCompleted[legacy]) {
      nextCompleted[modern] = true
      delete nextCompleted[legacy]
      report.fieldRenames.push(`creationForgeCompleted:${legacy}→${modern}`)
      touched = true
    }
    if (nextSnapshots[legacy] != null) {
      nextSnapshots[modern] = nextSnapshots[legacy]!
      delete nextSnapshots[legacy]
      report.fieldRenames.push(`creationForgeSnapshots:${legacy}→${modern}`)
      touched = true
    }
  }
  if (!touched) return next
  return {
    ...next,
    creationForgeCompleted: nextCompleted as CharacterRootState['creationForgeCompleted'],
    creationForgeSnapshots: nextSnapshots as CharacterRootState['creationForgeSnapshots'],
  }
}

function migrateCatalogIdsOnSave(
  input: CharacterRootState,
  report: CharacterMigrationReport,
): CharacterRootState {
  let next: CharacterRootState = { ...input }

  const raceId = remapCatalogId('race', next.raceId, report)
  if (raceId !== next.raceId) {
    next = { ...next, raceId: raceId ?? undefined }
  }

  if (next.occ?.id) {
    const occId = remapCatalogId('occ', next.occ.id, report)
    if (occId !== next.occ.id) {
      next = {
        ...next,
        occ: {
          ...next.occ,
          id: occId ?? '',
          name: occId ? next.occ.name : 'Select O.C.C.',
        },
      }
    }
  }

  const activeTraits = remapIdList(
    'morphusTrait',
    next.activeMorphusCharacteristicIds,
    report,
  )
  if (activeTraits !== next.activeMorphusCharacteristicIds) {
    next = { ...next, activeMorphusCharacteristicIds: activeTraits }
  }

  if (next.morphusTraitSlotResolutions?.length) {
    const slots: MorphusTraitSlotResolution[] = []
    for (const slot of next.morphusTraitSlotResolutions) {
      const catalogEntryId = remapCatalogId(
        'morphusTrait',
        slot.catalogEntryId,
        report,
      )
      if (catalogEntryId == null || catalogEntryId === '') continue
      slots.push(
        catalogEntryId === slot.catalogEntryId
          ? slot
          : { ...slot, catalogEntryId },
      )
    }
    next = { ...next, morphusTraitSlotResolutions: slots }
  }

  const abilities = remapIdList('ability', next.selectedAbilities, report)
  if (abilities !== next.selectedAbilities) {
    next = { ...next, selectedAbilities: abilities }
  }

  const occSkills = remapIdList('skill', next.creationOccSkillIds, report)
  if (occSkills !== next.creationOccSkillIds) {
    next = { ...next, creationOccSkillIds: occSkills }
  }

  return next
}

function collectOrphanedCatalogIds(
  character: CharacterRootState,
): CharacterMigrationReport['orphanedCatalogIds'] {
  const orphans: CharacterMigrationReport['orphanedCatalogIds'] = []
  const genre =
    character.creationGenreId ?? character.hostGenreId ?? 'nightbane'

  if (character.raceId?.trim()) {
    if (!getRaceById(character.raceId, genre)) {
      orphans.push({ kind: 'race', id: character.raceId })
    }
  }

  if (character.occ?.id?.trim()) {
    if (!getLibraryOccById(character.occ.id)) {
      orphans.push({ kind: 'occ', id: character.occ.id })
    }
  }

  const traitIds = new Set<string>()
  for (const id of character.activeMorphusCharacteristicIds ?? []) {
    traitIds.add(id)
  }
  for (const slot of character.morphusTraitSlotResolutions ?? []) {
    if (slot.catalogEntryId) traitIds.add(slot.catalogEntryId)
  }
  for (const id of traitIds) {
    // Variant composite ids use `::` — resolve base when present.
    const baseId = id.includes('::') ? id.split('::')[0]! : id
    if (!getMorphusCharacteristicById(baseId) && !getMorphusCharacteristicById(id)) {
      orphans.push({ kind: 'morphusTrait', id })
    }
  }

  return orphans
}

function migrateToVersion1(
  input: CharacterRootState,
  report: CharacterMigrationReport,
): CharacterRootState {
  let next = migrateCharacterFromLegacyFacade(input)
  if ((input as LegacyCharacterFields).facade != null) {
    report.fieldRenames.push('facade→primary')
  }
  if ((input as LegacyCharacterFields).creationFacadeDiceFinalized != null) {
    report.fieldRenames.push(
      'creationFacadeDiceFinalized→creationPrimaryDiceFinalized',
    )
  }
  next = migrateLegacyForgeTabFields(next, report)
  next = migrateCatalogIdsOnSave(next, report)
  return next
}

/** Normalize aliases + coerce stale projected alias ids (identity / Join Table). */
function normalizeIdentityAliasFields(input: CharacterRootState): CharacterRootState {
  const aliases = normalizeAliases(input.aliases)
  const morphusAliases = normalizeAliases(input.morphusAliases)
  const tableProjectedAliasId = coerceTableProjectedAliasId(
    aliases,
    input.tableProjectedAliasId,
  )
  const morphusTableProjectedAliasId = coerceTableProjectedAliasId(
    morphusAliases,
    input.morphusTableProjectedAliasId,
  )
  const presentedForm =
    input.presentedForm === 'morphus' || input.presentedForm === 'primary'
      ? input.presentedForm
      : undefined
  return {
    ...input,
    aliases,
    morphusAliases,
    tableProjectedAliasId,
    morphusTableProjectedAliasId,
    ...(presentedForm ? { presentedForm } : {}),
  }
}

function forEachCreationPick(
  character: CharacterRootState,
  visit: (pick: CreationSkillPick) => void,
): void {
  const add = (pick: CreationSkillPick | undefined) => {
    if (!pick?.instanceId || !pick.skillId) return
    visit(pick)
  }
  for (const pick of getCreationRelatedPicks(character)) add(pick)
  for (const pick of getCreationSecondaryPicks(character)) add(pick)
  for (const pick of Object.values(character.creationOccGrantPickDetails ?? {})) {
    add(pick)
  }
  for (const slots of Object.values(character.creationOccCoreVoucherPicks ?? {})) {
    for (const slot of slots ?? []) {
      if (slot && typeof slot === 'object') add(slot as CreationSkillPick)
    }
  }
  for (const slots of Object.values(
    character.creationOccRelatedVoucherPicks ?? {},
  )) {
    for (const slot of slots ?? []) {
      if (slot && typeof slot === 'object') add(slot as CreationSkillPick)
    }
  }
}

function collectCreationPickCatalogIndex(
  character: CharacterRootState,
): Map<string, string> {
  const byInstance = new Map<string, string>()
  forEachCreationPick(character, (pick) => {
    byInstance.set(pick.instanceId, pick.skillId)
  })
  const hthId = sheetSkillIdForCreationHandToHandTier(
    character.creationHandToHandTier,
  )
  if (hthId) byInstance.set(hthId, hthId)
  for (const id of character.creationOccSkillIds ?? []) {
    byInstance.set(id, id)
  }
  return byInstance
}

function collectCreationPickSelectionCategoryIndex(
  character: CharacterRootState,
): Map<string, string> {
  const byInstance = new Map<string, string>()
  forEachCreationPick(character, (pick) => {
    const cat = pick.selectionCategory?.trim()
    if (cat) byInstance.set(pick.instanceId, cat)
  })
  return byInstance
}

function resolveCatalogSkillIdForSheetRow(
  skill: SheetSkill,
  pickIndex: Map<string, string>,
): string | undefined {
  if (skill.catalogSkillId?.trim()) return skill.catalogSkillId.trim()
  const fromPick = pickIndex.get(skill.id)
  if (fromPick) return fromPick
  if (getPalladiumSkillCatalogEntryById(skill.id) || getSkillById(skill.id)) {
    return skill.id
  }
  return undefined
}

function backfillFormSkillCatalogIds(
  branch: FormState,
  pickIndex: Map<string, string>,
): FormState {
  let changed = false
  const skills = branch.skills.map((skill) => {
    const catalogSkillId = resolveCatalogSkillIdForSheetRow(skill, pickIndex)
    if (!catalogSkillId || catalogSkillId === skill.catalogSkillId) return skill
    changed = true
    return { ...skill, catalogSkillId }
  })
  return changed ? { ...branch, skills } : branch
}

/**
 * Stamp {@link SheetSkill.catalogSkillId} on live form skills when missing.
 * Fixes Skills overlay "Other" dumps for creation instance-id rows (idempotent).
 */
export function backfillSheetSkillCatalogIds(
  input: CharacterRootState,
): CharacterRootState {
  const pickIndex = collectCreationPickCatalogIndex(input)
  const primary = backfillFormSkillCatalogIds(input.primary, pickIndex)
  const morphus = backfillFormSkillCatalogIds(input.morphus, pickIndex)
  if (primary === input.primary && morphus === input.morphus) return input
  return { ...input, primary, morphus }
}

function backfillFormSkillSelectionCategories(
  branch: FormState,
  selectionIndex: Map<string, string>,
): FormState {
  let changed = false
  const skills = branch.skills.map((skill) => {
    if (skill.selectionCategory?.trim()) return skill
    const fromPick = selectionIndex.get(skill.id)
    if (!fromPick) return skill
    changed = true
    return { ...skill, selectionCategory: fromPick }
  })
  return changed ? { ...branch, skills } : branch
}

/**
 * Stamp {@link SheetSkill.selectionCategory} from creation picks when missing
 * (multi-category skills — e.g. Prowl under Rogue vs Physical).
 */
export function backfillSheetSkillSelectionCategories(
  input: CharacterRootState,
): CharacterRootState {
  const selectionIndex = collectCreationPickSelectionCategoryIndex(input)
  if (selectionIndex.size === 0) return input
  const primary = backfillFormSkillSelectionCategories(
    input.primary,
    selectionIndex,
  )
  const morphus = backfillFormSkillSelectionCategories(
    input.morphus,
    selectionIndex,
  )
  if (primary === input.primary && morphus === input.morphus) return input
  return { ...input, primary, morphus }
}

/**
 * Apply all pending save migrations up to {@link CHARACTER_SAVE_SCHEMA_VERSION}.
 *
 * - Persist-field renames are version-gated (run once per bump).
 * - Catalog ID remaps always run (idempotent) so new remap entries apply to
 *   already-stamped saves without requiring a version bump — still bump when
 *   renaming persisted fields.
 * - Orphan catalog ids are always re-checked.
 */
export function migrateCharacterSave(
  input: CharacterRootState,
): MigrateCharacterSaveResult {
  const fromVersion = readSaveSchemaVersion(input)
  const report: CharacterMigrationReport = {
    fromVersion,
    toVersion: CHARACTER_SAVE_SCHEMA_VERSION,
    fieldRenames: [],
    catalogRemaps: [],
    orphanedCatalogIds: [],
  }

  let next = input
  if (fromVersion < 1) {
    next = migrateToVersion1(next, report)
  } else {
    // Already past v1 field renames — still apply catalog remaps.
    next = migrateCatalogIdsOnSave(next, report)
  }

  if (fromVersion < 2) {
    next = normalizeIdentityAliasFields(next)
    report.fieldRenames.push('aliases+tableProjectedAliasId')
  } else {
    // Keep aliases/projection coerce idempotent on current saves.
    next = normalizeIdentityAliasFields(next)
  }

  next = backfillSheetSkillCatalogIds(next)
  next = backfillSheetSkillSelectionCategories(next)

  next = {
    ...next,
    schemaVersion: CHARACTER_SAVE_SCHEMA_VERSION,
  }
  report.orphanedCatalogIds = collectOrphanedCatalogIds(next)
  return { character: next, report }
}
