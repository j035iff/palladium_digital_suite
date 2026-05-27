/**
 * Reports which runtime aggregation hooks each Morphus characteristic row would trigger.
 */

const HOOKS = [
  { path: 'statModifiers', label: 'stat modifiers / A.R. shift' },
  { path: 'naturalAr', label: 'natural A.R.' },
  { path: 'saveModifiers', label: 'save modifiers' },
  { path: 'mobility.conditionalTerrainModifiers', label: 'terrain Spd multipliers' },
  { path: 'mobility.jumpModifiers', label: 'jump modifiers' },
  { path: 'mobility.swimSpeedBonus', label: 'swim speed bonus' },
  { path: 'mobility.burrowingEngine', label: 'burrowing engine' },
  { path: 'skillModifiers.specificSkillOverrides', label: 'skill overrides' },
  { path: 'skillModifiers.customSystemRolls', label: 'custom system rolls' },
  { path: 'naturalWeapons', label: 'natural weapons' },
  { path: 'weaponClassBonuses', label: 'weapon class bonuses' },
  { path: 'damageAffinities', label: 'damage affinities' },
  { path: 'sensory.nightvisionRangeFlatBonus', label: 'nightvision bonus' },
  { path: 'sensory.telescopicVision', label: 'telescopic vision' },
  { path: 'sensory.seeInvisible', label: 'see invisible' },
  { path: 'sensory.externalSensoryObfuscation', label: 'sensory obfuscation' },
  { path: 'mobility.flightEngine', label: 'flight engine' },
  { path: 'handCapacityConstraints', label: 'hand capacity' },
  { path: 'companionBlueprint', label: 'companion blueprint' },
  { path: 'isPolymorphicTemplate', label: 'polymorphic template' },
  { path: 'gimmickInventory', label: 'gimmick inventory' },
  { path: 'gimmickToySwitches', label: 'gimmick toy switches' },
  { path: 'disabledNaturalAttackTags', label: 'disabled natural attacks' },
  { path: 'activatedAbilities', label: 'activated abilities (burst)' },
  { path: 'specialCombatInterceptions', label: 'combat interceptions' },
  { path: 'limbDurability', label: 'limb durability components' },
  { path: 'conditionalStanceModifiers', label: 'stance modifiers' },
  { path: 'customOneOffs', label: 'custom one-offs (notes only)' },
  { path: 'variantPercentiles', label: 'variant percentiles (notes)' },
  { path: 'crossTableRoll', label: 'cross-table roll' },
  { path: 'entryRole', label: 'entry role (router/header)' },
  { path: 'appearanceConstraints', label: 'appearance constraints' },
  { path: 'combatContextModifiers', label: 'combat context modifiers' },
  { path: 'recoveryBehaviors', label: 'recovery behaviors' },
  { path: 'conditionalPenalties', label: 'conditional penalties' },
  { path: 'atWillAbilities', label: 'at-will abilities' },
  { path: 'playerChoices', label: 'player choices' },
  { path: 'tableWorkflow', label: 'table workflow' },
  { path: 'livingWeaponRules', label: 'living weapon rules' },
  { path: 'skillContextModifiers', label: 'skill context modifiers' },
  { path: 'disguiseLimits', label: 'disguise limits' },
  { path: 'mobility.balanceModifierPercent', label: 'balance modifier' },
  { path: 'mobility.reachPercentBonus', label: 'reach bonus' },
  { path: 'mobility.jumpMultiplier', label: 'jump multiplier' },
  { path: 'sensory.lightSensitivity', label: 'light sensitivity' },
  { path: 'sensory.scentTracking', label: 'scent tracking' },
  { path: 'sensory.peripheralVisionDegrees', label: 'peripheral vision' },
  { path: 'morphusRules', label: 'legacy morphusRules (deprecated)' },
]

function getAt(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

function hasHook(entry, dotted) {
  const v = getAt(entry, dotted)
  if (v == null) return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v).length > 0
  if (typeof v === 'boolean') return v
  return true
}

export function aggregationCoverageForEntry(entry) {
  return HOOKS.filter((h) => hasHook(entry, h.path)).map((h) => h.label)
}

export function aggregationCoverageReport(entries) {
  return entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    hooks: aggregationCoverageForEntry(entry),
    notesOnly: (() => {
      const hooks = aggregationCoverageForEntry(entry)
      const wired = hooks.filter((h) => h !== 'custom one-offs (notes only)')
      return wired.length === 0 && hooks.includes('custom one-offs (notes only)')
    })(),
  }))
}
