import type { SkillEquationSkill } from '../lib/skillEquation'

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

export type EngineSkillDef = SkillEquationSkill & {
  id: string
  name: string
  category: SkillCategory
  /** O.C.C. vs O.C.C. related slot (skill_selection / creation flow). */
  slotKind: 'occ' | 'occ_related'
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
}

export const SKILL_LIBRARY: EngineSkillDef[] = [
  {
    id: 'literacy',
    name: 'Literacy: American',
    category: 'Technical',
    slotKind: 'occ',
    basePercent: 30,
    perLevel: 5,
    acquisitionLevel: 1,
    occBonus: 5,
  },
  {
    id: 'electronics',
    name: 'Electronics: Basic',
    category: 'Technical',
    slotKind: 'occ_related',
    basePercent: 25,
    perLevel: 5,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'mech_eng',
    name: 'Mechanical Engineering',
    category: 'Technical',
    slotKind: 'occ_related',
    basePercent: 12,
    perLevel: 4,
    acquisitionLevel: 1,
    occBonus: 0,
    prerequisite: {
      gate: 'and',
      skillIds: ['literacy', 'electronics'],
    },
  },
  {
    id: 'math_basic',
    name: 'Math: Basic',
    category: 'Technical',
    slotKind: 'occ',
    basePercent: 45,
    perLevel: 5,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'math_advanced',
    name: 'Math: Advanced',
    category: 'Technical',
    slotKind: 'occ_related',
    basePercent: 32,
    perLevel: 5,
    acquisitionLevel: 1,
    occBonus: 0,
    prerequisite: { gate: 'and', skillIds: ['math_basic'] },
  },
  {
    id: 'astronomy',
    name: 'Astronomy',
    category: 'Technical',
    slotKind: 'occ_related',
    basePercent: 18,
    perLevel: 4,
    acquisitionLevel: 1,
    occBonus: 0,
    prerequisite: { gate: 'and', skillIds: ['math_advanced'] },
    synergyBonuses: 0,
  },
  {
    id: 'boxing',
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
    id: 'wrestling',
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
    id: 'acrobat',
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
    id: 'pilot_jet',
    name: 'Pilot: Jet Aircraft',
    category: 'Pilot',
    slotKind: 'occ_related',
    basePercent: 22,
    perLevel: 4,
    acquisitionLevel: 1,
    occBonus: 0,
    prerequisite: { gate: 'and', skillIds: ['math_basic'] },
  },
  {
    id: 'pick_locks',
    name: 'Pick Locks',
    category: 'Espionage',
    slotKind: 'occ_related',
    basePercent: 12,
    perLevel: 4,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'wp_pistol',
    name: 'W.P. Energy Pistol',
    category: 'Weapon',
    slotKind: 'occ_related',
    basePercent: 0,
    perLevel: 0,
    acquisitionLevel: 1,
    occBonus: 0,
  },
  {
    id: 'first_aid',
    name: 'First Aid',
    category: 'Misc',
    slotKind: 'occ',
    basePercent: 30,
    perLevel: 5,
    acquisitionLevel: 1,
    occBonus: 5,
  },
]

export function getSkillById(id: string): EngineSkillDef | undefined {
  return SKILL_LIBRARY.find((s) => s.id === id)
}
