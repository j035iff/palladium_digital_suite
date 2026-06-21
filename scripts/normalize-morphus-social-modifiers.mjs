/**
 * Migrates pseudo social skill_ids (invoke_trust, intimidation, charm, performance)
 * to attributeRollBonuses and skill_trait related_to_performance.
 *
 *   node scripts/normalize-morphus-social-modifiers.mjs
 *   node scripts/normalize-morphus-social-modifiers.mjs --check
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tablesDir = join(root, 'src/data/content/morphus/tables')
const checkOnly = process.argv.includes('--check')

const MA_PSEUDO = new Set(['invoke_trust', 'intimidation', 'invoke_trust_intimidate'])
const PB_PSEUDO = new Set(['charm'])
const PERFORMANCE_TRAIT = 'related_to_performance'
const PERFORMANCE_SKILL_IDS = new Set([
  'skill_dance',
  'skill_sing',
  'skill_play_musical_instrument',
  'skill_public_speaking',
])

function isPerformanceTarget(override) {
  if (override.targetType === 'skill_trait' && override.targetValue === 'invoke_trust') {
    return 'ma_trust_impossible'
  }
  if (override.targetType === 'skill_id' && override.targetValue === 'performance') {
    return 'performance'
  }
  if (override.targetType === 'category' && override.targetValue === 'performance') {
    return 'performance'
  }
  if (override.targetType === 'skill_id' && MA_PSEUDO.has(override.targetValue)) {
    return 'ma'
  }
  if (override.targetType === 'skill_id' && PB_PSEUDO.has(override.targetValue)) {
    return 'pb'
  }
  return null
}

function mergeMaPercent(existing, next) {
  if (next == null) return existing
  if (existing == null) return next
  if (Math.sign(existing) === Math.sign(next) && Math.abs(existing) === Math.abs(next)) {
    return existing
  }
  return existing + next
}

function processEntry(entry) {
  let changed = false
  const notes = []

  const attrRoll = { ...(entry.attributeRollBonuses ?? {}) }
  let maPercent = attrRoll.maTrustIntimidatePercent ?? 0
  let pbPercent = attrRoll.pbCharmImpressPercent ?? 0
  let pbMin = attrRoll.pbCharmImpressMinPercent

  const overrides = entry.skillModifiers?.specificSkillOverrides ?? []
  const kept = []
  let hasPerformanceTraitOverride = false

  for (const row of overrides) {
    const kind = isPerformanceTarget(row)

    if (kind === 'ma_trust_impossible') {
      const oneOff = 'Invoke Trust is impossible in Morphus.'
      if (!(entry.customOneOffs ?? []).includes(oneOff)) {
        entry.customOneOffs = [...(entry.customOneOffs ?? []), oneOff]
        changed = true
        notes.push('invoke_trust impossible → customOneOff')
      }
      changed = true
      continue
    }

    if (kind === 'ma') {
      if (row.grantUnlearnedValue != null) {
        kept.push(row)
        continue
      }
      maPercent = mergeMaPercent(maPercent, row.modifierPercent ?? 0)
      changed = true
      notes.push(`${row.targetValue} → maTrustIntimidatePercent`)
      continue
    }

    if (kind === 'pb') {
      if (row.grantUnlearnedValue != null) {
        pbMin =
          pbMin == null
            ? row.grantUnlearnedValue
            : Math.max(pbMin, row.grantUnlearnedValue)
        changed = true
        notes.push(`charm grant ${row.grantUnlearnedValue}% → pbCharmImpressMinPercent`)
        continue
      }
      pbPercent += row.modifierPercent ?? 0
      changed = true
      notes.push(`${row.targetValue} → pbCharmImpressPercent`)
      continue
    }

    if (kind === 'performance') {
      hasPerformanceTraitOverride = true
      kept.push({
        targetType: 'skill_trait',
        targetValue: PERFORMANCE_TRAIT,
        ...(row.modifierPercent != null ? { modifierPercent: row.modifierPercent } : {}),
        ...(row.impossibleInMorphus ? { impossibleInMorphus: true } : {}),
        ...(row.grantUnlearnedValue != null
          ? { grantUnlearnedValue: row.grantUnlearnedValue }
          : {}),
      })
      changed = true
      notes.push(`${row.targetType}:${row.targetValue} → skill_trait ${PERFORMANCE_TRAIT}`)
      continue
    }

    kept.push(row)
  }

  if (hasPerformanceTraitOverride) {
    const filtered = kept.filter((row) => {
      if (
        row.targetType === 'skill_id' &&
        PERFORMANCE_SKILL_IDS.has(row.targetValue) &&
        row.modifierPercent != null
      ) {
        changed = true
        notes.push(`dropped redundant ${row.targetValue} (covered by ${PERFORMANCE_TRAIT})`)
        return false
      }
      return true
    })
    kept.length = 0
    kept.push(...filtered)
  }

  if (entry.skillModifiers?.specificSkillOverrides) {
    if (kept.length === 0) {
      delete entry.skillModifiers.specificSkillOverrides
      if (Object.keys(entry.skillModifiers).length === 0) delete entry.skillModifiers
    } else {
      entry.skillModifiers.specificSkillOverrides = kept
    }
  }

  const nextAttr = {}
  if (maPercent !== 0) nextAttr.maTrustIntimidatePercent = maPercent
  if (pbPercent !== 0) nextAttr.pbCharmImpressPercent = pbPercent
  if (pbMin != null) nextAttr.pbCharmImpressMinPercent = pbMin

  if (Object.keys(nextAttr).length > 0) {
    entry.attributeRollBonuses = nextAttr
    changed = true
  } else if (entry.attributeRollBonuses && Object.keys(nextAttr).length === 0) {
    delete entry.attributeRollBonuses
    changed = true
  }

  const ctxMods = entry.skillContextModifiers ?? []
  if (ctxMods.length > 0) {
    const byContext = new Map()
    for (const scm of ctxMods) {
      if (!MA_PSEUDO.has(scm.skillId)) continue
      const ctx = scm.context
      const prev = byContext.get(ctx) ?? 0
      byContext.set(ctx, mergeMaPercent(prev, scm.modifierPercent ?? 0))
    }

    if (byContext.size > 0 && entry.mobility?.conditionalStanceModifiers) {
      for (const stance of entry.mobility.conditionalStanceModifiers) {
        const bonus = byContext.get(stance.stanceType)
        if (bonus == null || bonus === 0) continue
        stance.attributeRollBonuses = {
          ...(stance.attributeRollBonuses ?? {}),
          maTrustIntimidatePercent: bonus,
        }
        changed = true
        notes.push(`skillContextModifiers (${stance.stanceType}) → stance attributeRollBonuses`)
      }
      entry.skillContextModifiers = ctxMods.filter((scm) => !MA_PSEUDO.has(scm.skillId))
      if (entry.skillContextModifiers.length === 0) delete entry.skillContextModifiers
    }
  }

  if (entry.id === 'victim_face_of_comedy_and_tragedy') {
    entry.statModifiers = entry.statModifiers ?? {}
    if (entry.statModifiers.ma?.flat !== 2) {
      entry.statModifiers.ma = { ...(entry.statModifiers.ma ?? {}), flat: 2 }
      changed = true
      notes.push('+2 M.A.')
    }
    if (entry.statModifiers.me?.flat !== 2) {
      entry.statModifiers.me = { ...(entry.statModifiers.me ?? {}), flat: 2 }
      changed = true
      notes.push('+2 M.E.')
    }

    const skillRows = (entry.skillModifiers?.specificSkillOverrides ?? []).filter(
      (r) => r.targetValue !== 'skill_id_undercover_agent',
    )
    entry.skillModifiers = entry.skillModifiers ?? {}
    entry.skillModifiers.specificSkillOverrides = [
      ...skillRows.filter(
        (r) => !(r.targetValue === 'skill_undercover_ops' && !r.impossibleInMorphus),
      ),
      {
        targetType: 'skill_id',
        targetValue: 'skill_id_undercover_agent',
        grantUnlearnedValue: 90,
      },
      {
        targetType: 'skill_id',
        targetValue: 'skill_disguise',
        impossibleInMorphus: true,
      },
      {
        targetType: 'skill_id',
        targetValue: 'skill_undercover_ops',
        impossibleInMorphus: true,
      },
    ]
    changed = true
    notes.push('skill_id_undercover_agent grant 90%')
  }

  if (entry.id === 'super_being_chiseled_jaw_bold_beautiful') {
    entry.attributeRollBonuses = {
      maTrustIntimidatePercent: 10,
      pbCharmImpressPercent: 10,
    }
    entry.skillModifiers = entry.skillModifiers ?? {}
    entry.skillModifiers.globalSkillModifier = -10
    changed = true
    notes.push('chiseled jaw attributeRollBonuses + globalSkillModifier -10')
  }

  if (changed && notes.length) {
    console.log(`  ${entry.id}: ${notes.join('; ')}`)
  }

  return changed
}

function processFile(filePath) {
  const data = JSON.parse(readFileSync(filePath, 'utf8'))
  let fileChanged = false

  for (const entry of data.entries ?? []) {
    if (processEntry(entry)) fileChanged = true
  }

  if (fileChanged && !checkOnly) {
    writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  }
  return fileChanged
}

let touched = 0
for (const name of readdirSync(tablesDir).filter((f) => f.endsWith('.json'))) {
  if (processFile(join(tablesDir, name))) {
    touched += 1
    console.log(`${checkOnly ? 'WOULD UPDATE' : 'UPDATED'} ${name}`)
  }
}

console.log(
  checkOnly
    ? `Check complete — ${touched} file(s) would change.`
    : `Done — ${touched} file(s) updated.`,
)
