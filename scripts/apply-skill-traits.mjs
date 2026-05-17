/**
 * Applies skill trait tags from source lists onto palladiumSkills.json.
 * Run after editing skills_requiring_*.txt: npm run apply:skill-traits
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const skillsPath = join(root, 'src/data/content/palladiumSkills.json')

const TRAIT_DEXTERITY = 'requires_dexterity'
const TRAIT_LIGHT_TOUCH = 'requires_light_touch'

const NAME_ALIASES = {
  'general repair maintenance': 'skill_general_repair_maintenance',
  'general repair/maintenance': 'skill_general_repair_maintenance',
  'sculpting whittling': 'skill_sculpting_whittling',
  'sculpting/whittling': 'skill_sculpting_whittling',
  'radio basic': 'skill_radio_basic',
  'radio: basic': 'skill_radio_basic',
  'computer programing': 'skill_computer_programming',
  'computer programming': 'skill_computer_programming',
  'play instrument': 'skill_play_instrument',
  'pick locks': 'skill_pick_locks',
  'pick pockets': 'skill_pick_pockets',
  'safe cracking': 'skill_safe_cracking',
  'rope works': 'skill_rope_works',
  'boat building': 'skill_boat_building',
  'first aid': 'skill_first_aid',
  'field armor and munitions': 'skill_field_armor_and_munitions',
  'electrical engineer': 'skill_electrical_engineer',
  'demolitions disposal': 'skill_demolitions_disposal',
  'demolitions underwater': 'skill_demolitions_underwater',
  'basic electronics': 'skill_basic_electronics',
  'basic mechanics': 'skill_basic_mechanics',
  'automotive mechanics': 'skill_automotive_mechanics',
  'aircraft mechanics': 'skill_aircraft_mechanics',
  'computer hacking': 'skill_computer_hacking',
  'computer operation': 'skill_computer_operation',
  'computer repair': 'skill_computer_repair',
  'jury rig': 'skill_jury_rig',
  'jury-rig': 'skill_jury_rig',
  'computer programing': 'skill_computer_programming',
}

function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function readLines(relPath) {
  return readFileSync(join(root, relPath), 'utf8')
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

const skills = JSON.parse(readFileSync(skillsPath, 'utf8'))
const byNorm = new Map()
for (const sk of skills) {
  byNorm.set(norm(sk.name), sk.id)
}

const dexLines = readLines('src/data/source/skill_trait_lists/skills_requiring_dexterity.txt')
const lightLines = readLines('src/data/source/skill_trait_lists/skills_requiring_light_touch.txt')

const traitBySkillId = new Map()
function addTrait(skillId, trait) {
  if (!skillId) return
  const set = traitBySkillId.get(skillId) ?? new Set()
  set.add(trait)
  traitBySkillId.set(skillId, set)
}

const missing = []
for (const line of dexLines) {
  const id = resolveSkillId(line, skills, byNorm)
  if (id) addTrait(id, TRAIT_DEXTERITY)
  else missing.push({ trait: TRAIT_DEXTERITY, line })
}
for (const line of lightLines) {
  const id = resolveSkillId(line, skills, byNorm)
  if (id) addTrait(id, TRAIT_LIGHT_TOUCH)
  else missing.push({ trait: TRAIT_LIGHT_TOUCH, line })
}

for (const sk of skills) {
  const traits = traitBySkillId.get(sk.id)
  if (traits && traits.size > 0) {
    sk.skillTraits = [...traits].sort()
  } else {
    delete sk.skillTraits
  }
}

writeFileSync(skillsPath, `${JSON.stringify(skills, null, 2)}\n`, 'utf8')

const tagged = skills.filter((s) => s.skillTraits?.length).length
console.log(`Tagged ${tagged} skills in palladiumSkills.json`)
if (missing.length) {
  console.warn('Unresolved lines (no catalog id):')
  for (const m of missing) console.warn(`  [${m.trait}] ${m.line}`)
}
