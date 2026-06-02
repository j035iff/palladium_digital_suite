/**
 * Strip table-level description skill prose when every entry already encodes the same rules.
 */
import { repairEntryProseArtifacts } from './morphus-skill-prose-dedupe.mjs'

function cleanupHeader(text) {
  return repairEntryProseArtifacts({ description: text }).description ?? text
}

function getOverrides(entry) {
  return entry.skillModifiers?.specificSkillOverrides ?? []
}

export function entryHasImpossible(entry, skillId) {
  return getOverrides(entry).some(
    (o) => o.targetType === 'skill_id' && o.targetValue === skillId && o.impossibleInMorphus === true,
  )
}

export function entryHasGrant(entry, skillId, value) {
  return getOverrides(entry).some(
    (o) =>
      o.targetType === 'skill_id' &&
      o.targetValue === skillId &&
      o.grantUnlearnedValue === value,
  )
}

export function entryHasStatFlat(entry, key, value) {
  const v = entry.statModifiers?.[key]
  if (v == null) return false
  if (typeof v === 'number') return v === value
  return v.flat === value
}

export function allEntries(table, predicate) {
  const entries = table.entries ?? []
  return entries.length > 0 && entries.every(predicate)
}

/** Align humanoid/head rows with table-wide impossible-skill rules from the header. */
export function syncHeaderImpossibleSkillsToEntries(table) {
  const desc = table.description ?? ''
  const needsSeduction = /Disguise,\s*Seduction,\s*and\s+Undercover/i.test(desc)
  const needsImpossible = /Disguise.*Undercover Ops.*impossible/i.test(desc)
  if (!needsImpossible) return { changed: false, entriesTouched: 0 }

  const required = needsSeduction
    ? ['skill_disguise', 'skill_seduction', 'skill_undercover_ops']
    : ['skill_disguise', 'skill_undercover_ops']

  let entriesTouched = 0
  for (const entry of table.entries ?? []) {
    const missing = required.filter((id) => !entryHasImpossible(entry, id))
    if (!missing.length) continue

    const prose = [entry.description, ...(entry.customOneOffs ?? [])].join(' ')
    const isPartialForm = /humanoid|head features|head$/i.test(entry.name ?? '')
    const proseSaysNoDisguise = /cannot be disguised|Disguise.*impossible/i.test(prose)
    const siblingFormsHaveRule = true

    if (!proseSaysNoDisguise && !isPartialForm && !siblingFormsHaveRule) continue

    if (!entry.skillModifiers) entry.skillModifiers = { specificSkillOverrides: [] }
    if (!entry.skillModifiers.specificSkillOverrides) {
      entry.skillModifiers.specificSkillOverrides = []
    }
    for (const skillId of missing) {
      entry.skillModifiers.specificSkillOverrides.push({
        targetType: 'skill_id',
        targetValue: skillId,
        impossibleInMorphus: true,
      })
    }
    entriesTouched++
  }

  return { changed: entriesTouched > 0, entriesTouched }
}

const HEADER_STRIP_RULES = [
  {
    testHeader: (d) => /Disguise,\s*Seduction,\s*and\s+Undercover Ops skills are impossible/i.test(d),
    conforms: (t) =>
      allEntries(t, (e) =>
        ['skill_disguise', 'skill_seduction', 'skill_undercover_ops'].every((id) =>
          entryHasImpossible(e, id),
        ),
      ),
    strip: /\s*In most cases, Disguise, Seduction, and Undercover Ops skills are impossible\.?/gi,
  },
  {
    testHeader: (d) => /Disguise and Undercover Ops are impossible/i.test(d),
    conforms: (t) =>
      allEntries(t, (e) => entryHasImpossible(e, 'skill_disguise') && entryHasImpossible(e, 'skill_undercover_ops')),
    strip: /\s*In most cases, Disguise and Undercover Ops(?: skills)? are impossible\.?/gi,
  },
  {
    testHeader: (d) => /All feline characters get \+2 to roll with punch\/fall\/impact and instinctively Climb at 45%, Swim at 40%, and Prowl at 20% in Morphus/i.test(d),
    conforms: (t) =>
      allEntries(
        t,
        (e) =>
          entryHasStatFlat(e, 'rollWithPunch', 2) &&
          entryHasGrant(e, 'skill_climbing', 45) &&
          entryHasGrant(e, 'skill_swimming', 40) &&
          entryHasGrant(e, 'skill_prowl', 20),
      ),
    strip:
      /\s*All feline characters get \+2 to roll with punch\/fall\/impact and instinctively Climb at 45%, Swim at 40%, and Prowl at 20% in Morphus\.?/gi,
  },
  {
    testHeader: (d) => /All canine characters instinctively get Tracking at 40% and Swimming at 50% in Morphus/i.test(d),
    conforms: (t) =>
      allEntries(
        t,
        (e) => entryHasGrant(e, 'skill_tracking', 40) && entryHasGrant(e, 'skill_swimming', 50),
      ),
    strip: /\s*All canine characters instinctively get Tracking at 40% and Swimming at 50% in Morphus\.?/gi,
  },
  {
    testHeader: (d) => /All bat characters instinctively Climb at 45% and Prowl at 20% in Morphus/i.test(d),
    conforms: (t) =>
      allEntries(
        t,
        (e) => entryHasGrant(e, 'skill_climbing', 45) && entryHasGrant(e, 'skill_prowl', 20),
      ),
    strip: /\s*All bat characters instinctively Climb at 45% and Prowl at 20% in Morphus\.?/gi,
  },
  {
    testHeader: (d) => /All reptilians instinctively Swim at 45% and Climb at 35% in Morphus/i.test(d),
    conforms: (t) =>
      allEntries(
        t,
        (e) => entryHasGrant(e, 'skill_swimming', 45) && entryHasGrant(e, 'skill_climbing', 35),
      ),
    strip: /\s*All reptilians instinctively Swim at 45% and Climb at 35% in Morphus\.?/gi,
  },
  {
    testHeader: (d) => /All snake Nightbane instinctively Swim at 55% and Climb at 40% in Morphus unless a row states otherwise/i.test(d),
    conforms: (t) =>
      allEntries(
        t,
        (e) => entryHasGrant(e, 'skill_swimming', 55) && entryHasGrant(e, 'skill_climbing', 40),
      ),
    strip:
      /\s*All snake Nightbane instinctively Swim at 55% and Climb at 40% in Morphus unless a row states otherwise\.?/gi,
  },
  {
    testHeader: (d) => /All arachnid Nightbane instinctively Climb at 55% and Prowl at 25% in Morphus/i.test(d),
    conforms: (t) =>
      allEntries(
        t,
        (e) => entryHasGrant(e, 'skill_climbing', 55) && entryHasGrant(e, 'skill_prowl', 25),
      ),
    strip: /\s*All arachnid Nightbane instinctively Climb at 55% and Prowl at 25% in Morphus\.?/gi,
  },
  {
    testHeader: (d) => /All rows instinctively get Swimming at 65% and Climbing at 30% in Morphus/i.test(d),
    conforms: (t) =>
      allEntries(
        t,
        (e) => entryHasGrant(e, 'skill_swimming', 65) && entryHasGrant(e, 'skill_climbing', 30),
      ),
    strip: /\s*All rows instinctively get Swimming at 65% and Climbing at 30% in Morphus\.?/gi,
  },
]

/**
 * @param {object} table morphus_trait_table document
 */
export function dedupeTableHeaderSkillProse(table) {
  if (table.kind !== 'morphus_trait_table' || !table.description) {
    return { changed: false }
  }

  syncHeaderImpossibleSkillsToEntries(table)

  let desc = table.description
  const before = desc

  for (const rule of HEADER_STRIP_RULES) {
    if (!rule.testHeader(desc) || !rule.conforms(table)) continue
    desc = desc.replace(rule.strip, '')
  }

  desc = cleanupHeader(desc)
  if (desc !== before) {
    table.description = desc
    return { changed: true }
  }
  return { changed: false }
}
