import type { SkillEquationSkill } from '../lib/skillEquation'
import { getEngineSkillDefFromCatalog } from '../lib/creationSkillCatalog'

export type SkillCategory =
  | 'Technical'
  | 'Physical'
  | 'Pilot'
  | 'Espionage'
  | 'Weapon'
  | 'Misc'

export type SkillPrerequisite =
  | { gate: 'and'; skillIds: string[] }
  | { gate: 'or'; skillIds: string[] }
  | { allOf: SkillPrerequisite[] }

/**
 * Sheet-facing skill row (skill equation + creation metadata). Narrow engine subset of the
 * Palladium skill JSON Schema in `src/data/schemas/palladium-skill.schema.json` (see
 * `src/lib/palladiumSchemaPaths.ts`). Full catalog: `src/data/content/skills/*.json`
 * (`PALLADIUM_SKILL_CATALOG` / `getPalladiumSkillCatalogEntryById` in `src/data/library/registry.ts`).
 */
export type EngineSkillDef = SkillEquationSkill & {
  id: string
  name: string
  category: SkillCategory
  /** Book categories from catalog JSON (filters + O.C.C. category rules). */
  bookCategories?: readonly string[]
  /** O.C.C. elective vs O.C.C. related slot (skill_selection / creation flow). */
  slotKind: 'occ' | 'occ_related'
  /** May be purchased with secondary skill slots (no category % bonus). */
  secondaryEligible?: boolean
  prerequisite?: SkillPrerequisite
  /** Physical skills stage S.D.C. / attribute bumps (skill_selection.md §4). */
  isPhysical?: boolean
  physicalStaging?: {
    sdc?: number
    ps?: number
    pp?: number
    pe?: number
    spd?: number
  }
  /** Passive stat bumps when skill is selected (universal schema modifiers block). */
  modifiers?: Record<string, number>
}

function stagingToModifiers(
  staging?: EngineSkillDef['physicalStaging'],
): Record<string, number> | undefined {
  if (!staging) return undefined
  const m: Record<string, number> = {}
  if (staging.sdc) m.sdc = staging.sdc
  if (staging.ps) m.ps = staging.ps
  if (staging.pp) m.pp = staging.pp
  if (staging.pe) m.pe = staging.pe
  if (staging.spd) m.spd = staging.spd
  return Object.keys(m).length ? m : undefined
}

function withModifiers(def: EngineSkillDef): EngineSkillDef {
  return {
    ...def,
    modifiers: def.modifiers ?? stagingToModifiers(def.physicalStaging),
  }
}

const SKILL_LIBRARY_RAW: EngineSkillDef[] = [
  {
    id: 'skill_literacy',
    name: 'Literacy: American',
    category: 'Technical',
    slotKind: 'occ',
    basePercent: 30,
    perLevel: 5,
    acquisitionLevel: 1,
    occBonus: 5,
  },
  {
    id: 'skill_electronics',
    name: 'Electronics: Basic',
    category: 'Technical',
    slotKind: 'occ_related',
    basePercent: 25,
    perLevel: 5,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'skill_mech_eng',
    name: 'Mechanical Engineering',
    category: 'Technical',
    slotKind: 'occ_related',
    basePercent: 12,
    perLevel: 4,
    acquisitionLevel: 1,
    occBonus: 0,
    prerequisite: {
      gate: 'and',
      skillIds: ['skill_literacy', 'skill_electronics'],
    },
  },
  {
    id: 'skill_math_basic',
    name: 'Math: Basic',
    category: 'Technical',
    slotKind: 'occ',
    basePercent: 45,
    perLevel: 5,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'skill_math_advanced',
    name: 'Math: Advanced',
    category: 'Technical',
    slotKind: 'occ_related',
    basePercent: 32,
    perLevel: 5,
    acquisitionLevel: 1,
    occBonus: 0,
    prerequisite: { gate: 'and', skillIds: ['skill_math_basic'] },
  },
  {
    id: 'skill_astronomy',
    name: 'Astronomy',
    category: 'Technical',
    slotKind: 'occ_related',
    basePercent: 18,
    perLevel: 4,
    acquisitionLevel: 1,
    occBonus: 0,
    prerequisite: { gate: 'and', skillIds: ['skill_math_advanced'] },
    synergyBonuses: 0,
  },
  {
    id: 'skill_boxing',
    name: 'Boxing',
    category: 'Physical',
    slotKind: 'occ_related',
    basePercent: 0,
    perLevel: 0,
    acquisitionLevel: 1,
    occBonus: 0,
    isPhysical: true,
    physicalStaging: { pp: 1, sdc: 10 },
  },
  {
    id: 'skill_wrestling',
    name: 'Wrestling',
    category: 'Physical',
    slotKind: 'occ_related',
    basePercent: 0,
    perLevel: 0,
    acquisitionLevel: 1,
    occBonus: 0,
    isPhysical: true,
    physicalStaging: { pe: 1, sdc: 8 },
  },
  {
    id: 'skill_acrobat',
    name: 'Acrobatics',
    category: 'Physical',
    slotKind: 'occ_related',
    basePercent: 20,
    perLevel: 5,
    acquisitionLevel: 1,
    occBonus: 0,
    isPhysical: true,
    physicalStaging: { pp: 1, sdc: 4 },
  },
  {
    id: 'skill_pilot_jet',
    name: 'Pilot: Jet Aircraft',
    category: 'Pilot',
    slotKind: 'occ_related',
    basePercent: 22,
    perLevel: 4,
    acquisitionLevel: 1,
    occBonus: 0,
    prerequisite: { gate: 'and', skillIds: ['skill_math_basic'] },
  },
  {
    id: 'skill_pick_locks',
    name: 'Pick Locks',
    category: 'Espionage',
    slotKind: 'occ_related',
    basePercent: 12,
    perLevel: 4,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'skill_wp_pistol',
    name: 'W.P. Energy Pistol',
    category: 'Weapon',
    slotKind: 'occ_related',
    basePercent: 0,
    perLevel: 3,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'skill_wp_sword',
    name: 'W.P. Sword',
    category: 'Weapon',
    slotKind: 'occ_related',
    basePercent: 0,
    perLevel: 3,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'skill_hand_to_hand_basic',
    name: 'Hand to Hand: Basic',
    category: 'Physical',
    slotKind: 'occ_related',
    basePercent: 22,
    perLevel: 4,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'skill_hand_to_hand_expert',
    name: 'Hand to Hand: Expert',
    category: 'Physical',
    slotKind: 'occ_related',
    basePercent: 22,
    perLevel: 4,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'skill_hand_to_hand_martial_arts',
    name: 'Hand to Hand: Martial Arts',
    category: 'Physical',
    slotKind: 'occ_related',
    basePercent: 22,
    perLevel: 4,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'skill_hand_to_hand_assassin',
    name: 'Hand to Hand: Assassin',
    category: 'Physical',
    slotKind: 'occ_related',
    basePercent: 22,
    perLevel: 4,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'skill_first_aid',
    name: 'First Aid',
    category: 'Misc',
    slotKind: 'occ',
    basePercent: 30,
    perLevel: 5,
    acquisitionLevel: 1,
    occBonus: 5,
  },
]

export const SKILL_LIBRARY: EngineSkillDef[] = SKILL_LIBRARY_RAW.map(withModifiers)

function normalizeWpCategoryKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

const WP_LOOKUP_ALIASES: Record<string, string> = (() => {
  const aliases: Record<string, string> = {}
  for (const def of SKILL_LIBRARY) {
    if (def.category !== 'Weapon') continue
    aliases[normalizeWpCategoryKey(def.id)] = def.id
    aliases[normalizeWpCategoryKey(def.name)] = def.id
  }
  return aliases
})()

/**
 * Map `wpCategory` (e.g. "W.P. Sword") plus optional `linkedWpSkillId` to a Weapon skill row id.
 * Full W.P. ladder / strike rules belong in JSON validated by
 * `src/data/schemas/palladium-weapon-proficiency.schema.json` (`PALLADIUM_WEAPON_PROFICIENCY_SCHEMA_ID`).
 * Shared modern ladders use `src/data/schemas/standard-modern-weapon-progression.schema.json`
 * (`STANDARD_MODERN_WEAPON_PROGRESSION_SCHEMA_ID`) when `usesStandardModernProgression` is true.
 */
export function resolveWeaponProficiencySkillId(
  wpCategory?: string | null,
  linkedWpSkillId?: string | null,
): string | undefined {
  if (linkedWpSkillId?.trim()) {
    const sid = linkedWpSkillId.trim()
    if (getSkillById(sid)?.category === 'Weapon') return sid
  }
  if (!wpCategory?.trim()) return undefined
  const raw = wpCategory.trim()
  const direct = getSkillById(raw)
  if (direct?.category === 'Weapon') return raw
  const key = normalizeWpCategoryKey(raw)
  return WP_LOOKUP_ALIASES[key]
}

export function getSkillById(id: string): EngineSkillDef | undefined {
  const prefixed = id.startsWith('skill_') ? id : `skill_${id}`
  const fromCatalog =
    getEngineSkillDefFromCatalog(id) ?? getEngineSkillDefFromCatalog(prefixed)
  if (fromCatalog) return fromCatalog
  const direct = SKILL_LIBRARY.find((s) => s.id === id)
  if (direct) return direct
  if (prefixed !== id) {
    return SKILL_LIBRARY.find((s) => s.id === prefixed)
  }
  return undefined
}

export {
  PALLADIUM_SKILL_SCHEMA_ID,
  PALLADIUM_SKILL_SCHEMA_PATH,
  PALLADIUM_SKILL_CATALOG_JSON_PATH,
  PALLADIUM_WEAPON_PROFICIENCY_SCHEMA_ID,
  PALLADIUM_WEAPON_PROFICIENCY_SCHEMA_PATH,
  STANDARD_MODERN_WEAPON_PROGRESSION_SCHEMA_ID,
  STANDARD_MODERN_WEAPON_PROGRESSION_SCHEMA_PATH,
  STANDARD_MODERN_WEAPON_PROGRESSION_JSON_PATH,
  WEAPON_PROFICIENCIES_CATALOG_JSON_PATH,
} from '../lib/palladiumSchemaPaths'
