/**
 * Applies skill trait tags from source lists onto palladiumSkills.json.
 * Run after editing skill_trait_lists/*.txt: npm run apply:skill-traits
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SKILL_TRAIT_LIST_FILES } from './lib/skill-trait-constants.mjs'
import {
  loadSkillsFromDir,
  writeSkillsToDir,
} from './lib/skills-catalog-fs.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const skillsDir = join(root, 'src/data/content/skills')
const listsDir = join(root, 'src/data/source/skill_trait_lists')

const NAME_ALIASES = {
  'general repair maintenance': 'skill_general_repair_maintenance',
  'general repair/maintenance': 'skill_general_repair_maintenance',
  'general repair and maintenance': 'skill_general_repair_maintenance',
  'sculpting whittling': 'skill_sculpting_whittling',
  'sculpting/whittling': 'skill_sculpting_whittling',
  'radio basic': 'skill_radio_basic',
  'radio: basic': 'skill_radio_basic',
  'computer programing': 'skill_computer_programming',
  'computer programming': 'skill_computer_programming',
  'play instrument': 'skill_play_instrument',
  'play musical instrument': 'skill_play_instrument',
  'pick locks': 'skill_pick_locks',
  'pick pockets': 'skill_pick_pockets',
  'safe cracking': 'skill_safe_cracking',
  'safe-cracking': 'skill_safe_cracking',
  'rope works': 'skill_rope_works',
  'boat building': 'skill_boat_building',
  'first aid': 'skill_first_aid',
  'field armor and munitions': 'skill_field_armor_and_munitions',
  'electrical engineer': 'skill_electrical_engineer',
  'demolitions disposal': 'skill_demolitions_disposal',
  'demolitions underwater': 'skill_demolitions_underwater',
  'demolitions: underwater': 'skill_demolitions_underwater',
  'basic electronics': 'skill_basic_electronics',
  'basic mechanics': 'skill_basic_mechanics',
  'automotive mechanics': 'skill_automotive_mechanics',
  'aircraft mechanics': 'skill_aircraft_mechanics',
  'mechanical engineer': 'skill_mechanical_engineer',
  'computer hacking': 'skill_computer_hacking',
  'computer operation': 'skill_computer_operation',
  'computer repair': 'skill_computer_repair',
  'jury rig': 'skill_jury_rig',
  'jury-rig': 'skill_jury_rig',
  'mathematics basic': 'skill_mathematics_basic',
  'mathematics advanced': 'skill_mathematics_advanced',
  'tv/video': 'skill_tv_video',
  't v video': 'skill_tv_video',
  'general repair & maintenance': 'skill_general_repair_maintenance',
  'weapons engineer': 'skill_weapons_engineer',
  'vehicle armorer': 'skill_vehicle_armorer',
  'id undercover agent': 'skill_undercover_ops',
  'imitate voices': 'skill_impersonation',
  'read sensory equipment': 'skill_read_sensory_equipment',
  'find contraband': 'skill_find_contraband',
  'land navigation': 'skill_land_navigation',
}

function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function readLines(fileName) {
  return readFileSync(join(listsDir, fileName), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

function resolveSkillId(line, skills, byNorm) {
  const n = norm(line)
  if (NAME_ALIASES[n]) return NAME_ALIASES[n]
  if (byNorm.has(n)) return byNorm.get(n)
  const snake = n.replace(/ /g, '_')
  const prefixed = snake.startsWith('skill_') ? snake : `skill_${snake}`
  if (skills.some((s) => s.id === prefixed)) return prefixed
  if (skills.some((s) => s.id === snake)) return snake
  return null
}

const skills = loadSkillsFromDir(skillsDir)
const byNorm = new Map()
for (const sk of skills) {
  byNorm.set(norm(sk.name), sk.id)
}

const traitBySkillId = new Map()
function addTrait(skillId, trait) {
  if (!skillId) return
  const set = traitBySkillId.get(skillId) ?? new Set()
  set.add(trait)
  traitBySkillId.set(skillId, set)
}

const missing = []
for (const [traitId, fileName] of Object.entries(SKILL_TRAIT_LIST_FILES)) {
  for (const line of readLines(fileName)) {
    const id = resolveSkillId(line, skills, byNorm)
    if (id) addTrait(id, traitId)
    else missing.push({ trait: traitId, line })
  }
}

for (const sk of skills) {
  const traits = traitBySkillId.get(sk.id)
  if (traits && traits.size > 0) {
    sk.skillTraits = [...traits].sort()
  } else {
    delete sk.skillTraits
  }
}

writeSkillsToDir(skillsDir, skills)

const tagged = skills.filter((s) => s.skillTraits?.length).length
console.log(`Tagged ${tagged} skills in content/skills`)
if (missing.length) {
  console.warn('Unresolved lines (no catalog id):')
  for (const m of missing) console.warn(`  [${m.trait}] ${m.line}`)
}
