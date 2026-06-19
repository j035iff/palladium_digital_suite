/**
 * Write sandbox output for nightbane-skills-physical-ab-sandbox brief.
 * Transcribed from Nightbane RPG pp. 53-55 (Physical section); phased A then B.
 * Run: node scripts/write-physical-skills-sandbox.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { isPassACatalogComplete } from './skill-engine-contract.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(
  readFileSync(join(root, 'src/data/schemas/palladium-skill.schema.json'), 'utf8'),
)
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
const validateSkill = ajv.compile(schema)

const src = (pageNumber) => [
  { gameSystem: 'nightbane', reference: 'Nightbane RPG', pageNumber },
]

/** Pass A rows — catalog/chargen */
const passA = [
  {
    id: 'skill_acrobatics',
    name: 'Acrobatics',
    gameSystems: ['nightbane'],
    categories: ['Physical'],
    synergies: [],
    prerequisites: [],
    description:
      'Aerial feats of agility and strength, such as walking a tightrope, high wire, trapeze, and stunts performed above ground. Other physical abilities include rolls, somersaults, leaps, and falls. Provides all of the following.',
    subTasks: [
      { name: 'Sense of balance', basePercent: 60, percentPerLevel: 5 },
      { name: 'Walk tightrope or high wire', basePercent: 60, percentPerLevel: 3 },
      { name: 'Climb rope', basePercent: 80, percentPerLevel: 2 },
      { name: 'Back flip', basePercent: 60, percentPerLevel: 5 },
    ],
    sources: src(53),
  },
  {
    id: 'skill_athletics_general',
    name: 'Athletics (general)',
    gameSystems: ['nightbane'],
    categories: ['Physical'],
    synergies: [],
    prerequisites: [],
    description:
      'Training in, and enjoyment of, vigorous exertion for competitive sports, exercises, and contests of strength, endurance, and agility. Provides the following bonuses.',
    physicalSkillBonuses: { ps: 1, spd: '1D6', sdc: '1D8', parry: 1, dodge: 1, rollWithImpact: 1 },
    sources: src(53),
  },
  {
    id: 'skill_body_building_weight_lifting',
    name: 'Body Building & Weight Lifting',
    gameSystems: ['nightbane'],
    categories: ['Physical'],
    synergies: [],
    prerequisites: [],
    description:
      'The building of muscle tone and body strength through weight lifting and exercise. Provides the following.',
    physicalSkillBonuses: { ps: 2, sdc: 10 },
    sources: src(53),
  },
  {
    id: 'skill_boxing',
    name: 'Boxing',
    gameSystems: ['nightbane'],
    categories: ['Physical'],
    synergies: [],
    prerequisites: [],
    description:
      'Classic art of fighting with fists. Training helps build the body and reflexes. Skilled boxers will automatically knock out opponents on a roll of a natural twenty. The victim of a knockout will remain unconscious for 1D6 melees. Unlike normal knockout/stun, the player does not have to announce that he is trying to knock out his opponent before making a roll to strike. The following bonuses are provided.',
    physicalSkillBonuses: { ps: 2, sdc: '3D6', apm: 1, parry: 2, dodge: 2, rollWithImpact: 1 },
    sources: src(53),
  },
  {
    id: 'skill_climbing',
    name: 'Climbing',
    gameSystems: ['nightbane'],
    categories: ['Physical'],
    synergies: [],
    prerequisites: [],
    basePercent: 40,
    percentPerLevel: 5,
    description:
      'Knowledge of the tools and techniques for climbing up sheer surfaces. Players should roll once for every 20 feet (6 m) of a vertical climb. If the roll fails, it means he is losing his grip; however, every "skilled" climber gets a chance to regain his grip, roll again. Two consecutive failed rolls means the character falls. Rappelling is a specialized, rope climbing skill used in descending from helicopters, scaling walls and cliff facings. For game purposes, rappelling will include ascending and descending climbs.',
    subSkills: [
      {
        id: 'rappelling',
        name: 'Rappelling',
        basePercent: 30,
        percentPerLevel: 5,
        description:
          'Specialized rope climbing for descending from helicopters, scaling walls and cliff facings; includes ascending and descending climbs for game purposes.',
      },
    ],
    sources: src(53),
  },
  {
    id: 'skill_gymnastics',
    name: 'Gymnastics',
    gameSystems: ['nightbane'],
    categories: ['Physical'],
    synergies: [],
    prerequisites: [],
    description:
      'Learning to do falls, rolls, tumbles, cartwheels, somersaults and to work the parallel bars and rings. This sport builds great upper body strength, grace, and balance. Provides all of the following.',
    subTasks: [
      { name: 'Sense of balance', basePercent: 50, percentPerLevel: 5 },
      { name: 'Work parallel bars & rings', basePercent: 60, percentPerLevel: 3 },
      { name: 'Climb rope', basePercent: 70, percentPerLevel: 2 },
      { name: 'Back flip', basePercent: 70, percentPerLevel: 5 },
    ],
    sources: src(53),
  },
  {
    id: 'skill_running',
    name: 'Running',
    gameSystems: ['nightbane'],
    categories: ['Physical'],
    synergies: [],
    prerequisites: [],
    description: 'A routine of running and exercise to build speed and endurance. Provides the following.',
    physicalSkillBonuses: { pe: 1, spd: '4D4', sdc: '1D6' },
    sources: src(54),
  },
  {
    id: 'skill_swimming',
    name: 'Swimming',
    gameSystems: ['nightbane'],
    categories: ['Physical'],
    synergies: [],
    prerequisites: [],
    basePercent: 50,
    percentPerLevel: 5,
    description:
      'The rudimentary skill of keeping afloat, dives, swimming and lifesaving techniques. The percentile number indicates the overall quality of form as well as skill of execution. A character can swim a distance equal to 3x his P.S. in yards/meters per melee. This pace can be maintained for a total of minutes equal to his P.E./endurance.',
    sources: src(54),
  },
  {
    id: 'skill_scuba',
    name: 'S.C.U.B.A.',
    gameSystems: ['nightbane'],
    categories: ['Physical'],
    synergies: [],
    prerequisites: [{ type: 'skill', skillId: 'skill_swimming' }],
    basePercent: 50,
    percentPerLevel: 5,
    description:
      'The letters S.C.U.B.A. stand for Self-Contained Underwater Breathing Apparatus. Individuals learn the methods and equipment needed for skin diving and underwater swimming. A character can swim a distance equal to 2x his P.S. in yards/meters per melee. This pace can be maintained for a total of minutes equal to his P.E./Endurance. Note: The maximum safe depth without getting the bends is about 120 feet (36.5 m). Deeper depths are possible with depressurization, special suits and submarines. Swimming is required to S.C.U.B.A.',
    sources: src(54),
  },
  {
    id: 'skill_wrestling',
    name: 'Wrestling',
    gameSystems: ['nightbane'],
    categories: ['Physical'],
    synergies: [],
    prerequisites: [],
    description:
      'As taught in old high schools and colleges, wrestling is more of a sport than a combat skill, but it does provide some useful combat moves. Provides the following: Body block/tackle does 1D4 damage and the opponent must dodge or parry to avoid being knocked down (lose one melee attack if knocked down). Pin/incapacitate on a roll of 18, 19, or 20. Crush/squeeze does 1D4 damage per squeeze attack.',
    physicalSkillBonuses: { ps: 2, pe: 1, sdc: '4D6', rollWithImpact: 1 },
    sources: src(54),
  },
]

/** Pass B patches keyed by id */
const passBPatches = {
  skill_acrobatics: {
    physicalSkillBonuses: { ps: 1, pp: 1, pe: 1, sdc: '1D6', rollWithImpact: 2 },
    specialAttacks: [
      { name: 'Kick attack', damage: '1D8', notes: 'Automatic at first level.' },
    ],
    conditionalRelatedSkills: [
      {
        skillId: 'skill_climbing',
        summary: '40% base climb ability or adds a +15% to climb skill.',
        bonusIfAlreadyHave: { skillPercentBonus: 15 },
        grantIfMissing: { startingPercent: 40 },
      },
      {
        skillId: 'skill_prowl',
        summary: '30% base prowl ability or adds a +5% to prowl skill.',
        bonusIfAlreadyHave: { skillPercentBonus: 5 },
        grantIfMissing: { startingPercent: 30 },
      },
    ],
  },
  skill_boxing: {
    naturalRollOutcomes: [
      {
        naturalRolls: [20],
        effect: 'Automatic knockout for 1D6 melees; no announcement required before striking.',
        appliesTo: 'Successful boxing strikes',
      },
    ],
  },
  skill_climbing: {
    failureResults: 'Falling.',
    resolutionLogic: {
      type: 'reroll_on_failure',
      maxRerolls: 1,
      condition: 'If the roll fails, it means he is losing his grip.',
      summary:
        "Every 'skilled' climber gets a chance to regain his grip, roll again. Two consecutive failed rolls means the character falls.",
      recurrence: {
        summary: 'Roll once for every 20 feet (6 m) of a vertical climb.',
        intervalValue: 20,
        intervalUnit: 'custom',
      },
    },
  },
  skill_gymnastics: {
    physicalSkillBonuses: { ps: 2, pp: 1, pe: 2, sdc: '2D6', rollWithImpact: 2 },
    specialAttacks: [
      { name: 'Kick attack', damage: '2D4', notes: 'Automatic at first level.' },
    ],
    conditionalRelatedSkills: [
      {
        skillId: 'skill_climbing',
        summary: '25% base climb ability or adds a +7% to climb skill.',
        bonusIfAlreadyHave: { skillPercentBonus: 7 },
        grantIfMissing: { startingPercent: 25 },
      },
      {
        skillId: 'skill_prowl',
        summary: '30% base prowl ability or adds a +5% to prowl skill.',
        bonusIfAlreadyHave: { skillPercentBonus: 5 },
        grantIfMissing: { startingPercent: 30 },
      },
    ],
    sources: [src(53)[0], { gameSystem: 'nightbane', reference: 'Nightbane RPG', pageNumber: 54 }],
  },
  skill_swimming: {
    performanceFormulas: [
      {
        stat: 'distance',
        formula: '3x P.S.',
        unit: 'yards/meters per melee',
        metricKey: 'swim_distance',
        cappedByMetricKey: 'swim_duration',
        capRule: 'custom',
        linkSummary:
          'A character can swim a distance equal to 3x his P.S. in yards/meters per melee. This pace can be maintained for a total of minutes equal to his P.E./endurance.',
      },
      { stat: 'duration', formula: 'P.E.', unit: 'minutes', metricKey: 'swim_duration' },
    ],
  },
  skill_scuba: {
    performanceFormulas: [
      {
        stat: 'distance',
        formula: '2x P.S.',
        unit: 'yards/meters per melee',
        metricKey: 'scuba_distance',
        cappedByMetricKey: 'scuba_duration',
        capRule: 'custom',
        linkSummary:
          'A character can swim a distance equal to 2x his P.S. in yards/meters per melee. This pace can be maintained for a total of minutes equal to his P.E./Endurance.',
      },
      { stat: 'duration', formula: 'P.E.', unit: 'minutes', metricKey: 'scuba_duration' },
    ],
  },
  skill_wrestling: {
    naturalRollOutcomes: [
      {
        naturalRange: { min: 18, max: 20 },
        effect: 'Pin/incapacitate',
        appliesTo: 'Successful wrestling strike/hold',
      },
    ],
    specialAttacks: [
      {
        name: 'Body block/tackle',
        damage: '1D4',
        notes: 'The opponent must dodge or parry to avoid being knocked down.',
        statusEffects: ['knockdown', 'lose_one_melee_attack'],
        saveRequired: {
          summary:
            'Target must dodge or parry to avoid being knocked down and losing one melee attack.',
          saveKind: 'dodge_or_parry',
          appliesTo: 'defender',
        },
      },
      { name: 'Crush/squeeze', damage: '1D4', notes: 'Does 1D4 damage per squeeze attack.' },
    ],
  },
}

function mergePassB(rows) {
  return rows.map((row) => {
    const patch = passBPatches[row.id]
    if (!patch) return row
    return { ...row, ...patch }
  })
}

function validateRows(rows, label) {
  for (const row of rows) {
    if (!validateSkill(row)) {
      throw new Error(`${label} ${row.id} invalid: ${JSON.stringify(validateSkill.errors)}`)
    }
    if (!isPassACatalogComplete(row)) {
      throw new Error(`${label} ${row.id} fails Pass A contract`)
    }
  }
}

const merged = mergePassB(passA)
validateRows(passA, 'Pass A')
validateRows(merged, 'Pass AB')

const outDir = join(root, 'src/data/source/ingest-briefs/output')
const outPath = join(outDir, 'nightbane-skills-physical-sandbox.json')
mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')

const runDir = join(root, 'src/data/source/ingest-briefs/runs/nightbane-skills-physical-ab-sandbox')
mkdirSync(runDir, { recursive: true })
const now = new Date().toISOString()
const checklist = passA.map((r) => ({
  name: r.name,
  status: 'ingested',
  passA: 'complete',
  passB: passBPatches[r.id] ? 'complete' : 'complete',
  pages: String(r.sources[0].pageNumber),
  notes: null,
}))

writeFileSync(
  join(runDir, 'run.json'),
  `${JSON.stringify(
    {
      briefId: 'nightbane-skills-physical-ab-sandbox',
      briefTitle: 'Nightbane Physical Skills AB — sandbox comparison',
      contentType: 'skills',
      pass: 'AB',
      passPhases: ['A', 'B'],
      currentPassPhase: 'B',
      playbook: 'docs/ingest/skills.md',
      status: 'complete',
      phase: 'done',
      sandboxOutput: 'src/data/source/ingest-briefs/output/nightbane-skills-physical-sandbox.json',
      createdAt: now,
      updatedAt: now,
      checklist,
      batches: [
        {
          id: 'batch-a-01',
          status: 'complete',
          pass: 'A',
          pages: { start: 53, end: 53 },
          items: [
            'Acrobatics',
            'Athletics (general)',
            'Body Building & Weight Lifting',
            'Boxing',
            'Climbing',
            'Gymnastics',
          ],
        },
        {
          id: 'batch-a-02',
          status: 'complete',
          pass: 'A',
          pages: { start: 54, end: 54 },
          items: ['Running', 'Swimming', 'S.C.U.B.A.', 'Wrestling'],
        },
        {
          id: 'batch-b-01',
          status: 'complete',
          pass: 'B',
          items: ['Acrobatics', 'Athletics (general)', 'Body Building & Weight Lifting'],
        },
        {
          id: 'batch-b-02',
          status: 'complete',
          pass: 'B',
          items: ['Boxing', 'Climbing', 'Gymnastics'],
        },
        {
          id: 'batch-b-03',
          status: 'complete',
          pass: 'B',
          items: ['Running', 'Swimming', 'S.C.U.B.A.', 'Wrestling'],
        },
      ],
      rulings: [],
      completedBatchIds: [
        'batch-a-01',
        'batch-a-02',
        'batch-b-01',
        'batch-b-02',
        'batch-b-03',
      ],
      validationCommands: ['validate:schemas', 'audit:skills'],
    },
    null,
    2,
  )}\n`,
  'utf8',
)

writeFileSync(join(runDir, 'rulings.json'), '{ "open": [], "resolved": [] }\n', 'utf8')

console.log(`OK  wrote ${outPath} (${merged.length} skills)`)
console.log(`OK  run state ${join(runDir, 'run.json')}`)
