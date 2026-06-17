import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { isWhitelistedForHostGenre } from '../lib/genreGating'
import type {
  CharacterRootState,
  DerivedActiveState,
  DerivedFormState,
  DerivedInventoryItem,
  DerivedSheetSkill,
  FormState,
  InventoryItem,
} from '../types'

export type GenreTransformOptions = {
  inventoryItems?: readonly InventoryItem[]
}

function deriveSkillsForHost(
  skills: FormState['skills'],
  hostGenreId: string,
): DerivedSheetSkill[] {
  return skills.map((skill) => {
    const catalog = getPalladiumSkillCatalogEntryById(skill.id)
    const locked = !isWhitelistedForHostGenre(catalog, hostGenreId)
    if (!locked) return skill
    return {
      ...skill,
      isHostGenreLocked: true,
      restricted: true,
      restrictionReason:
        skill.restrictionReason ??
        `Not available in ${hostGenreId.replace(/_/g, ' ')}`,
    }
  })
}

function deriveFormBranch(
  branch: FormState,
  hostGenreId: string,
): DerivedFormState {
  return {
    ...branch,
    skills: deriveSkillsForHost(branch.skills, hostGenreId),
  }
}

function deriveInventoryForHost(
  items: readonly InventoryItem[],
  hostGenreId: string,
): DerivedInventoryItem[] {
  return items.map((item) => {
    const locked = !isWhitelistedForHostGenre(item, hostGenreId)
    if (!locked) return item
    return { ...item, isHostGenreLocked: true }
  })
}

/**
 * Centralized runtime conversion middleware (master_flow.md §1 Step C).
 * Pure transform: raw save JSON + host genre → derived UI payload.
 */
export function transformCharacterToHostEnvironment(
  rawCharacter: CharacterRootState,
  hostGenreId: string,
  options?: GenreTransformOptions,
): DerivedActiveState {
  const host = hostGenreId.toLowerCase()
  const creation = rawCharacter.creationGenreId.toLowerCase()

  /*
   * FUTURE: Structural conversion pass (creationGenreId !== hostGenreId)
   * ------------------------------------------------------------------
   * When creation !== host, run ordered adaptation rules before UI emit, e.g.:
   * - Map facade/morphus S.D.C. pools → M.D.C. thresholds (100× scaling matrix)
   * - Re-tier Physical Strength (standard → supernatural) per target genre tables
   * - Swap saving-throw baselines and Horror Factor presentation mode
   * - Apply cross-genre ISP/PPE economy conversions from genre manifest hooks
   *
   * if (creation !== host) {
   *   applyStructuralConversionPass(working, creation, host)
   * }
   */

  void creation

  const derived: DerivedActiveState = {
    ...rawCharacter,
    hostGenreId: host,
    primary: deriveFormBranch(rawCharacter.primary, host),
    morphus: deriveFormBranch(rawCharacter.morphus, host),
  }

  if (options?.inventoryItems?.length) {
    void deriveInventoryForHost(options.inventoryItems, host)
  }

  return derived
}

export { deriveInventoryForHost }
