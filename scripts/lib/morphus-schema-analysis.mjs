/**
 * Compare extracted book text and optional target JSON against palladium-morphus.schema.json.
 * Run after extract, before transcribing content (npm run morphus:ingest -- analyze-schema <id>).
 */

import { morphusSchemaPathExists } from './morphus-schema-paths.mjs'
import { detectUnmatchedMechanicalProse } from './morphus-schema-apply.mjs'
import { isPlayableMorphusTrait } from './morphus-trait-filter.mjs'

const TRAIT_HEADER = /(\d{2}-\d{2})%\s+([^:\n]+):/g

/** Book prose → schema paths (first match wins for reporting). */
const MECHANIC_PATTERNS = [
  {
    id: 'spd_override',
    re: /Spd attribute is replaced|replaces?(?:\s+with)?\s+\d+D/i,
    schemaPaths: ['statModifiers.spd.isOverride', 'statModifiers.spd.dice'],
    severity: 'info',
  },
  {
    id: 'natural_ar',
    re: /Natural A\.R\.|natural A\.R\./i,
    schemaPaths: ['naturalAr', 'statModifiers.ar'],
    severity: 'info',
  },
  {
    id: 'terrain_speed',
    re: /Double the Nightbane'?s speed on|half speed on|spdMultiplier|hard, flat surfaces/i,
    schemaPaths: ['mobility.conditionalTerrainModifiers'],
    severity: 'info',
  },
  {
    id: 'skill_percent',
    re: /[+-]\d+%\s+to\s+(?:the\s+)?(?:skills?|Physical skills)/i,
    schemaPaths: ['skillModifiers.specificSkillOverrides'],
    severity: 'info',
  },
  {
    id: 'skill_named_percent',
    re: /[+-]\d+%\s+to\s+(?:the\s+)?[A-Za-z][A-Za-z /]+?\s+skill/i,
    schemaPaths: ['skillModifiers.specificSkillOverrides'],
    severity: 'info',
  },
  {
    id: 'stat_flat_attribute',
    re: /[+-]\d+\s+to\s+the\s+(?:P\.E\.|I\.Q\.|P\.P\.|P\.S\.|M\.E\.|M\.A\.|P\.B\.)\s+attribut/i,
    schemaPaths: ['statModifiers'],
    severity: 'info',
  },
  {
    id: 'bonuses_penalties_block',
    re: /Bonuses?:[\s\S]{0,400}Penalties?:/i,
    schemaPaths: ['statModifiers', 'skillModifiers', 'customOneOffs'],
    severity: 'info',
  },
  {
    id: 'skill_grant_level',
    re: /gets the \w+ skill at \d+%\s*\+\d+%\s+per level/i,
    schemaPaths: ['skillModifiers.specificSkillOverrides.grantUnlearnedValue', 'skillModifiers.specificSkillOverrides.perLevelIncrement'],
    severity: 'info',
  },
  {
    id: 'save_bonus',
    re: /[+-]\d+\s+to save vs/i,
    schemaPaths: ['saveModifiers'],
    severity: 'info',
  },
  {
    id: 'natural_weapon',
    re: /inflicts? \d+D\d+|kick damage|blunt weapon|damage in addition to/i,
    schemaPaths: ['naturalWeapons'],
    severity: 'info',
  },
  {
    id: 'weapon_class',
    re: /strike with (?:his |the )?(?:pocker cards|thrown|bow|rifle)/i,
    schemaPaths: ['weaponClassBonuses'],
    severity: 'info',
  },
  {
    id: 'hand_capacity',
    re: /two-handed weapons cannot|occupies both hands|held, meaning that no two-handed/i,
    schemaPaths: ['handCapacityConstraints'],
    severity: 'info',
  },
  {
    id: 'activated_burst',
    re: /every hour|per encounter|melee round|chargesPerPeriod|activated every hour|video game powers/i,
    schemaPaths: ['activatedAbilities'],
    severity: 'info',
  },
  {
    id: 'gimmick_spawn',
    re: /never runs out|pulls out a new deck|gimmick|spawned|Joy Buzzer|Seltzer/i,
    schemaPaths: ['gimmickInventory'],
    severity: 'info',
  },
  {
    id: 'gimmick_toy_switches',
    re: /Gimmick Toy Switches|wind-up key|knobs, push buttons|presetEffectCatalog/i,
    schemaPaths: ['gimmickToySwitches'],
    severity: 'info',
  },
  {
    id: 'limb_component',
    re: /only be struck from behind|Called Shot|controller has \d+ S\.D\.C|much tougher than usual \(\d+ S\.D\.C/i,
    schemaPaths: ['limbDurability'],
    severity: 'info',
  },
  {
    id: 'damage_affinity',
    re: /50% more damage from|half damage|impervious to|double damage to demons/i,
    schemaPaths: ['damageAffinities', 'customOneOffs'],
    severity: 'info',
  },
  {
    id: 'companion_mount',
    re: /companionBlueprint|let other people ride|mount may look like/i,
    schemaPaths: ['companionBlueprint', 'customOneOffs'],
    severity: 'info',
  },
  {
    id: 'burrow',
    re: /burrow|feet per melee round.*substrate/i,
    schemaPaths: ['mobility.burrowingEngine'],
    severity: 'info',
  },
  {
    id: 'stance',
    re: /stance|War-Chief|Cavalry.*stance/i,
    schemaPaths: ['mobility.conditionalStanceModifiers'],
    severity: 'info',
  },
  {
    id: 'sdc_dice',
    re: /\+(\d+D\d+(?:x\d+)?(?:\+\d+)?)\s+S\.D\.C\.|\+(\d+D\d+)\s+to\s+S\.D\.C\./i,
    schemaPaths: ['statModifiers.sdc'],
    severity: 'info',
  },
  {
    id: 'horror_factor',
    re: /[+-]\d+\s+(?:to|from)\s+Horror Factor/i,
    schemaPaths: ['statModifiers.hf', 'customOneOffs'],
    severity: 'info',
  },
  {
    id: 'perception_rolls',
    re: /[+-]\d+\s+on\s+Perception Rolls?/i,
    schemaPaths: ['statModifiers.perception', 'sensory.perceptionSpecialties'],
    severity: 'info',
  },
  {
    id: 'initiative',
    re: /[+-]\d+\s+on\s+initiative/i,
    schemaPaths: ['statModifiers.initiative'],
    severity: 'info',
  },
  {
    id: 'roll_with_impact',
    re: /[+-]\d+\s+to\s+roll with impact/i,
    schemaPaths: ['statModifiers.rollWithPunch'],
    severity: 'info',
  },
  {
    id: 'hth_damage',
    re: /[+-]\d+\s+to\s+damage in (?:hand to hand|combat|hth)|[+-]\d+D\d+\s+to\s+damage in combat/i,
    schemaPaths: ['statModifiers.bonusHthDamage', 'naturalWeapons'],
    severity: 'info',
  },
  {
    id: 'aquatic_buoyancy',
    re: /cannot swim|sinks like a rock|floats on water/i,
    schemaPaths: ['mobility.aquaticTraits.buoyancy', 'customOneOffs'],
    severity: 'info',
  },
  {
    id: 'height_increase',
    re: /increase height \d+D\d+|add one foot/i,
    schemaPaths: ['heightModifier'],
    severity: 'info',
  },
  {
    id: 'weight_multiplier',
    re: /double (?:the )?weight|triple weight|Reduce weight by \d+%/i,
    schemaPaths: ['weightModifier'],
    severity: 'info',
  },
  {
    id: 'bite_damage',
    re: /[+-]\d+D\d+\s+damage (?:with|to) bite|bite attacks/i,
    schemaPaths: ['naturalWeapons', 'statModifiers.bonusHthDamage'],
    severity: 'info',
  },
  {
    id: 'called_shot',
    re: /Called Shot|only be struck from behind/i,
    schemaPaths: ['limbDurability', 'combatContextModifiers'],
    severity: 'info',
  },
  {
    id: 'mirror_walk',
    re: /Mirror Walk at will/i,
    schemaPaths: ['atWillAbilities'],
    severity: 'info',
  },
  {
    id: 'reform',
    re: /reforms? in \d+D\d+|reform in \d+D\d+ minutes/i,
    schemaPaths: ['recoveryBehaviors'],
    severity: 'info',
  },
  {
    id: 'inner_percentile',
    re: /\d{2}-\d{2}%\s+A human body|\d{2}-\d{2}%\s+A smooth, featureless/i,
    schemaPaths: ['variantPercentiles'],
    severity: 'info',
  },
  {
    id: 'cross_table',
    re: /Roll on the \w+(?:\s+\w+)* Table/i,
    schemaPaths: ['crossTableRoll', 'customOneOffs'],
    severity: 'info',
  },
  {
    id: 'impervious',
    re: /impervious to (?:cold|heat|poison|laser|light)/i,
    schemaPaths: ['damageAffinities'],
    severity: 'info',
  },
  {
    id: 'kinetic_quarter',
    re: /kinetic attacks?.{0,40}quarter their normal damage|do half damage from/i,
    schemaPaths: ['damageAffinities.kinetic', 'customOneOffs'],
    severity: 'info',
  },
  {
    id: 'disguise_penalty',
    re: /[+-]\d+%\s+to\s+Disguise|impossible to disguise|cannot be disguised/i,
    schemaPaths: ['skillModifiers.specificSkillOverrides', 'customOneOffs'],
    severity: 'info',
  },
  {
    id: 'prowl_modifier',
    re: /[+-]\d+%\s+to\s+Prowl/i,
    schemaPaths: ['skillModifiers.specificSkillOverrides'],
    severity: 'info',
  },
  {
    id: 'living_weapon',
    re: /weapon is a living part|Scarecrow weapon/i,
    schemaPaths: ['naturalWeapons', 'limbDurability', 'livingWeaponRules'],
    severity: 'info',
  },
  {
    id: 'appearance_clothing',
    re: /tight clothing|oversized|custom(-made)? clothing|custom shoes/i,
    schemaPaths: ['appearanceConstraints'],
    severity: 'info',
  },
  {
    id: 'combat_context_bright',
    re: /opponents are -?\d+ to strike.*bright light|surprise attacks from behind/i,
    schemaPaths: ['combatContextModifiers'],
    severity: 'info',
  },
  {
    id: 'scent_track',
    re: /track by scent|cannot track by scent/i,
    schemaPaths: ['sensory.scentTracking'],
    severity: 'info',
  },
  {
    id: 'balance_reach',
    re: /sense of balance|longer than usual/i,
    schemaPaths: ['mobility.balanceModifierPercent', 'mobility.reachPercentBonus'],
    severity: 'info',
  },
  {
    id: 'at_will_stand',
    re: /stand motionless|indistinguishable among/i,
    schemaPaths: ['atWillAbilities', 'appearanceConstraints'],
    severity: 'info',
  },
  {
    id: 'table_workflow',
    re: /Roll twice|Step One/i,
    schemaPaths: ['tableWorkflow', 'entryRole'],
    severity: 'info',
  },
  {
    id: 'player_weapon_choice',
    re: /player chooses|player can elect/i,
    schemaPaths: ['playerChoices'],
    severity: 'info',
  },
  {
    id: 'disguise_limits',
    re: /similar size and weight|cannot impersonate specific/i,
    schemaPaths: ['disguiseLimits'],
    severity: 'info',
  },
  {
    id: 'conditional_cold',
    re: /freezing temperature|attacks per melee and Spd by half/i,
    schemaPaths: ['conditionalPenalties'],
    severity: 'info',
  },
  {
    id: 'light_sensitivity',
    re: /light sensitive|bright lights hurt/i,
    schemaPaths: ['sensory.lightSensitivity'],
    severity: 'info',
  },
  {
    id: 'peripheral_vision',
    re: /peripheral vision \(\d+ degrees\)/i,
    schemaPaths: ['sensory.peripheralVisionDegrees'],
    severity: 'info',
  },
  {
    id: 'polymorphic',
    re: /polymorphic|Face Paint|dynamic archetype/i,
    schemaPaths: ['isPolymorphicTemplate'],
    severity: 'info',
  },
  {
    id: 'nightvision',
    re: /nightvision|see the invisible|see(?:s)? as if.*nightvision/i,
    schemaPaths: ['sensory.nightvisionRangeFlatBonus', 'sensory.seeInvisible'],
    severity: 'info',
  },
  {
    id: 'jump',
    re: /leap from any height|jump.*feet|float down/i,
    schemaPaths: ['mobility.jumpModifiers', 'customOneOffs'],
    severity: 'info',
  },
  {
    id: 'height_weight',
    re: /add one foot|normal height|normal weight|-\d+% normal weight/i,
    schemaPaths: ['heightModifier', 'weightModifier'],
    severity: 'info',
  },
  {
    id: 'custom_narrative_roll',
    re: /Spontaneous Insight|baseSuccessChance|customSystemRolls/i,
    schemaPaths: ['skillModifiers.customSystemRolls'],
    severity: 'info',
  },
  {
    id: 'or_choice_stat',
    re: /\+2 to the I\.Q\. or \+2 to the P\.P\.|choose one/i,
    schemaPaths: ['customOneOffs'],
    severity: 'warn',
    note: 'Player choice — document in customOneOffs unless schema gains explicit choice blocks.',
  },
  {
    id: 'permanent_ppe',
    re: /permanent.*P\.P\.E|from permanent base P\.P\.E/i,
    schemaPaths: ['customOneOffs', 'statModifiers.ppe'],
    severity: 'warn',
    note: 'Permanent P.P.E. burn may need customOneOffs; statModifiers.ppe is Morphus-only shift.',
  },
  {
    id: 'rider_bonuses',
    re: /Anyone riding|Rider in the saddle|receives \+\d+ to initiative/i,
    schemaPaths: ['customOneOffs', 'companionBlueprint'],
    severity: 'warn',
  },
  {
    id: 'storage_capacity',
    re: /stores? up to \d+ pounds|capable of storing/i,
    schemaPaths: ['customOneOffs', 'gimmickInventory'],
    severity: 'warn',
  },
]

const UNMAPPED_HIGH_RISK = [
  {
    id: 'multi_power_menu',
    re: /(?:Three|several).{0,40}powers?.{0,40}activated every hour/i,
    schemaPaths: ['activatedAbilities', 'customOneOffs'],
    severity: 'warn',
    note: 'Large power menus: use activatedAbilities for bursts with charges + customOneOffs for the rest.',
  },
]

function splitTraitBlocks(tableText) {
  const headers = [...tableText.matchAll(TRAIT_HEADER)]
  if (!headers.length) return []
  const blocks = []
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index
    const end = i + 1 < headers.length ? headers[i + 1].index : tableText.length
    const percent = `${headers[i][1]}%`
    const name = headers[i][2].trim()
    const body = tableText.slice(start, end)
    blocks.push({ percent, name, body })
  }
  return blocks
}

function detectPatterns(body) {
  const hits = []
  const allPatterns = [...MECHANIC_PATTERNS, ...UNMAPPED_HIGH_RISK]
  for (const pat of allPatterns) {
    if (pat.re.test(body)) {
      hits.push({
        patternId: pat.id,
        schemaPaths: pat.schemaPaths,
        severity: pat.severity,
        note: pat.note ?? null,
      })
    }
    pat.re.lastIndex = 0
  }
  return hits
}

function auditTargetEntries(entries, allowedTop) {
  const unknownKeys = []
  const perEntry = []
  for (const entry of entries) {
    const tops = new Set()
    for (const key of collectKeys(entry)) {
      const top = key.split('.')[0]
      tops.add(top)
      if (!allowedTop.has(top)) unknownKeys.push({ id: entry.id, key })
    }
    perEntry.push({
      id: entry.id,
      name: entry.name,
      topLevelKeys: [...tops].sort(),
    })
  }
  return { unknownKeys, perEntry }
}

function collectKeys(obj, prefix = '') {
  const keys = new Set()
  if (obj == null || typeof obj !== 'object') return keys
  if (Array.isArray(obj)) {
    for (const item of obj) collectKeys(item, prefix).forEach((k) => keys.add(k))
    return keys
  }
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    keys.add(path)
    if (v && typeof v === 'object') {
      collectKeys(v, path).forEach((nested) => keys.add(nested))
    }
  }
  return keys
}

/**
 * @param {object} options
 * @param {string} options.tableText - authoritative extract
 * @param {string[]} options.schemaKeys - top-level characteristic keys
 * @param {object|null} options.targetTable - existing table JSON
 * @param {object|null} options.traitsIndex - merged traits-index.json
 */
export function analyzeMorphusSchemaFit(options) {
  const { tableText, schemaKeys, targetTable, traitsIndex } = options
  const allowedTop = new Set(schemaKeys)
  const traitBlocks = splitTraitBlocks(tableText)

  const edgeCases = []
  const perTrait = traitBlocks
    .filter((b) => isPlayableMorphusTrait(b.name, b.body, b.body))
    .map((block) => {
      const indexRow = traitsIndex?.traits?.find(
        (t) => t.name === block.name || t.percent === block.percent,
      )
      const patterns = detectPatterns(block.body)
      const missingPaths = []
      for (const pat of patterns) {
        for (const sp of pat.schemaPaths) {
          if (!morphusSchemaPathExists(sp)) missingPaths.push(sp)
        }
      }
      if (missingPaths.length) {
        edgeCases.push({
          kind: 'missing_schema_path',
          trait: block.name,
          percent: block.percent,
          missingPaths: [...new Set(missingPaths)],
          note: 'Extend palladium-morphus.schema.json (+ types.ts); run schema-loop.',
        })
      }
      const structuredBp = /Bonuses?:/i.test(block.body) && /Penalties?:/i.test(block.body)
      if (patterns.length === 0 && !structuredBp && detectUnmatchedMechanicalProse(block.body)) {
        edgeCases.push({
          kind: 'unmatched_mechanical_prose',
          trait: block.name,
          percent: block.percent,
          note: 'Book text has mechanical rules but no catalog pattern matched — add MECHANIC_PATTERNS or schema fields.',
        })
      }
      return {
        percent: block.percent,
        name: block.name,
        pageNumber: indexRow?.sources?.find((s) => s.authoritative)?.pageNumber ?? indexRow?.sources?.[0]?.pageNumber ?? null,
        patterns,
        suggestedTopLevelKeys: [
          ...new Set(patterns.flatMap((p) => p.schemaPaths.map((s) => s.split('.')[0]))),
        ].filter((k) => allowedTop.has(k)),
      }
    })

  const blocking = []

  let targetAudit = null
  if (targetTable?.entries?.length) {
    targetAudit = auditTargetEntries(targetTable.entries, allowedTop)
    for (const u of targetAudit.unknownKeys) {
      edgeCases.push({
        kind: 'unknown_target_key',
        trait: u.id,
        key: u.key,
        note: 'Add schema support or remove key from target JSON.',
      })
    }
  }

  for (const edge of edgeCases) {
    blocking.push({
      trait: edge.trait,
      kind: edge.kind,
      action: edge.note,
      detail: edge.missingPaths ?? edge.key ?? null,
    })
  }

  const usedPaths = new Set(perTrait.flatMap((t) => t.suggestedTopLevelKeys))
  const unusedSchemaKeys = schemaKeys.filter(
    (k) => !['id', 'name', 'tableCategory', 'description', 'gameSystems', 'sources', '$schema'].includes(k) && !usedPaths.has(k),
  )

  const readyToTranscribe = edgeCases.length === 0
  const schemaActions = []

  if (readyToTranscribe) {
    schemaActions.push({
      priority: 'ready',
      action: 'Schema covers detected book mechanics. Proceed: npm run morphus:ingest -- build <table>',
    })
  } else {
    schemaActions.unshift({
      priority: 'blocking',
      action: 'Resolve edgeCases in schema-analysis.json (schema-loop applies safe patches automatically).',
    })
  }

  if (unusedSchemaKeys.length) {
    schemaActions.push({
      priority: 'info',
      action: `Optional schema fields not detected in this table: ${unusedSchemaKeys.join(', ')}`,
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    workflowStep: 'analyze-schema (phase 1 of prepare; loop with apply-schema until ready)',
    schemaTopLevelKeys: schemaKeys,
    traitCount: perTrait.length,
    perTrait,
    targetAudit,
    edgeCases,
    schemaActions,
    blocking,
    readyToTranscribe,
  }
}

export function printSchemaAnalysisSummary(analysis) {
  console.log(`OK  schema analysis — ${analysis.traitCount} trait(s) in book text`)
  if (analysis.readyToTranscribe) {
    console.log('    Schema ready — proceed to build (create JSON).')
  } else {
    console.log(`WARN ${analysis.edgeCases?.length ?? 0} edge case(s) — schema-loop will apply patches or request manual edits`)
    for (const e of analysis.edgeCases ?? []) {
      console.log(`    • [${e.kind}] ${e.trait}: ${e.note}`)
    }
  }
  for (const a of analysis.schemaActions) {
    if (a.priority !== 'ready') console.log(`    [${a.priority}] ${a.action}`)
  }
}
