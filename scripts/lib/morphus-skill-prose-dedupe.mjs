/**
 * Strip Morphus description / customOneOffs clauses already represented in skillModifiers.
 */
import { TRAIT_PERCENT_PATTERNS } from './morphus-skill-modifier-parse.mjs'
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeProse(text) {
  return String(text)
    .replace(/\[cite:\s*\d+\]/gi, '')
    .replace(/([A-Za-z])-\s+([A-Za-z])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanupProse(text) {
  return (
    text
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/(?:Bonuses|Penalties):\s*(?:,\s*)?(?=[.;]|$)/gi, '')
      .replace(/\(\s*(?:Forgery|Palming|Pick Locks|Sewing)[^)]*\)\s*(?:and\.?)?/gi, '')
      .replace(/,?\s*and\s+any\s+Espionage\s+or\s+Rogue\s+skills,?\s*/gi, ' ')
      .replace(/,?\s*and\s+Undercover\s+Ops\s+skills,?\s*/gi, ' ')
      .replace(/-20%\s+to\s+skills\s+like\s+Disguise,\s*Impersonation,\s*Seduction\s+and\s+Undercover\s+Ops\s+while[^.]*\.\s*/gi, '')
      .replace(/,\s+and\./gi, '.')
      .replace(/\.\s+and\./gi, '.')
      .replace(/impossible to Disguise or engage in Undercover Ops,?\s*/gi, '')
      .replace(/-15%\s+to\s+Disguise\s+and\s+Undercover\s+Ops\s+skills,?\s*/gi, '')
      .replace(/;\s+and\s+/gi, '; ')
      .replace(/,\s*,/g, ',')
      .replace(/,\s+and\s+([.;])/g, '$1')
      .replace(/;\s*;/g, ';')
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
}

/** Fix orphaned fragments after stripping (safe to run on all trait entries). */
export function repairEntryProseArtifacts(entry) {
  const beforeDesc = entry.description ?? ''
  const beforeOneOffs = JSON.stringify(entry.customOneOffs ?? [])
  if (entry.description) entry.description = cleanupProse(entry.description)
  if (Array.isArray(entry.customOneOffs)) {
    entry.customOneOffs = entry.customOneOffs
      .map((line) => cleanupProse(String(line)))
      .filter((line) => line.length > 0)
    if (!entry.customOneOffs.length) delete entry.customOneOffs
  }
  return {
    changed:
      beforeDesc !== (entry.description ?? '') ||
      beforeOneOffs !== JSON.stringify(entry.customOneOffs ?? []),
  }
}

function traitPatternsForId(traitId) {
  return TRAIT_PERCENT_PATTERNS.filter((p) => p.traitId === traitId).map((p) => p.re)
}

function overrideKey(o) {
  return `${o.targetType}:${o.targetValue}:${o.modifierPercent ?? ''}:${o.impossibleInMorphus ?? ''}`
}

function overridesCoverParsed(existing, parsed) {
  const keys = new Set(existing.map(overrideKey))
  return parsed.every((p) => keys.has(overrideKey(p)))
}

/** Build removal patterns from structured overrides (conservative). */
export function buildSkillProseStripPatterns(entry, skillsById) {
  const overrides = entry.skillModifiers?.specificSkillOverrides ?? []
  if (!overrides.length && entry.skillModifiers?.globalSkillModifier == null) return []

  const patterns = []
  const byPct = new Map()

  for (const o of overrides) {
    if (typeof o.modifierPercent !== 'number') continue
    const pct = o.modifierPercent
    const signRe = pct < 0 ? '-' : '\\+'
    const abs = Math.abs(pct)

    if (o.targetType === 'skill_trait') {
      for (const re of traitPatternsForId(o.targetValue)) {
        patterns.push(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))
      }
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+to\\s+all\\s+manual\\s+dexterity\\s+related\\s+skills\\s*\\([^)]+\\)`,
          'gi',
        ),
      )
      continue
    }

    if (o.targetType === 'skill_id') {
      const sk = skillsById.get(o.targetValue)
      const name = sk?.name ?? o.targetValue.replace(/^skill_/, '').replace(/_/g, ' ')
      const nameRe = escapeRe(name)
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+to\\s+(?:the\\s+)?${nameRe}(?:\\s+skills?)?`,
          'gi',
        ),
      )
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+to\\s+[^.;]{0,120}?\\b${nameRe}\\b[^.;]{0,40}?\\s+skills?`,
          'gi',
        ),
      )
      if (!byPct.has(pct)) byPct.set(pct, [])
      byPct.get(pct).push({ type: 'skill_id', id: o.targetValue, name })
      continue
    }

    if (o.targetType === 'category') {
      const cat = escapeRe(o.targetValue)
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+to\\s+(?:any\\s+)?${cat}(?:\\s+or\\s+${cat})?\\s+skills?`,
          'gi',
        ),
      )
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+to\\s+skills?\\s+such\\s+as\\s+[^.;]{0,200}\\b${cat}\\b[^.;]{0,80}`,
          'gi',
        ),
      )
    }
  }

  for (const [pct, items] of byPct) {
    const signRe = pct < 0 ? '-' : '\\+'
    const abs = Math.abs(pct)
    const names = items.map((i) => escapeRe(i.name))
    if (names.length >= 2) {
      const list = names.slice(0, -1).join(',\\s*') + `(?:,\\s*)?and\\s+${names[names.length - 1]}`
      patterns.push(new RegExp(`${signRe}${abs}%\\s+to\\s+${list}\\s+skills?`, 'gi'))
    }
    if (names.length >= 2 && pct < 0) {
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+to\\s+skills\\s+like\\s+${names.join(',\\s*')}(?:\\s+and\\s+${names[names.length - 1]})?[^.]*\\.\\s*`,
          'gi',
        ),
      )
    }
  }

  const g = entry.skillModifiers?.globalSkillModifier
  if (typeof g === 'number') {
    const signRe = g < 0 ? '-' : '\\+'
    const abs = Math.abs(g)
    patterns.push(
      new RegExp(`${signRe}${abs}%\\s+to\\s+ALL\\s+skills\\s+when\\s+in\\s+Morphus`, 'gi'),
    )
    patterns.push(
      new RegExp(`${signRe}${abs}%\\s+on\\s+the\\s+performance\\s+of\\s+all\\s+(?:other\\s+)?skills`, 'gi'),
    )
    patterns.push(
      new RegExp(`global\\s+${signRe}${abs}%\\s+to\\s+all\\s+skills`, 'gi'),
    )
  }

  const hasEspionage = overrides.some(
    (o) => o.targetType === 'category' && o.targetValue === 'espionage' && o.modifierPercent === 5,
  )
  const hasRogue = overrides.some(
    (o) => o.targetType === 'category' && o.targetValue === 'rogue' && o.modifierPercent === 5,
  )
  const hasProwl5 = overrides.some(
    (o) => o.targetValue === 'skill_prowl' && o.modifierPercent === 5,
  )
  if (hasEspionage && hasRogue && hasProwl5) {
    patterns.push(/\+5%\s+to\s+Prowl\s+and\s+any\s+Espionage\s+or\s+Rogue\s+skills,?\s*/gi)
  }

  patterns.push(
    /Provides\s+a\s+\+5%\s+bonus\s+to\s+skills\s+related\s+to\s+time\s+and\s+timing[^.]*\.\s*/gi,
  )

  patterns.push(
    /\+\d+%\s+bonus\s+to\s+skills\s+related\s+to\s+mechanics\s+and\s+mechanical\s+repair\.\s*/gi,
  )

  patterns.push(
    /\+\d+%\s+bonus\s+to\s+skills\s+related\s+to\s+electronics[^.]*\.\s*/gi,
  )

  return patterns
}

export function stripSkillModifierProse(text, patterns) {
  if (!text || !patterns.length) return text
  let out = normalizeProse(text)
  for (const re of patterns) {
    out = out.replace(re, ' ')
  }
  return cleanupProse(out)
}

export function dedupeEntrySkillProse(entry, skillsById) {
  const overrides = entry.skillModifiers?.specificSkillOverrides ?? []
  if (!overrides.length && entry.skillModifiers?.globalSkillModifier == null) {
    return { changed: false }
  }

  const patterns = buildSkillProseStripPatterns(entry, skillsById)
  if (!patterns.length) return { changed: false }

  const beforeDesc = entry.description ?? ''
  const beforeOneOffs = JSON.stringify(entry.customOneOffs ?? [])

  if (entry.description) {
    entry.description = stripSkillModifierProse(entry.description, patterns)
  }

  if (Array.isArray(entry.customOneOffs)) {
    entry.customOneOffs = entry.customOneOffs
      .map((line) => stripSkillModifierProse(String(line), patterns))
      .filter((line) => line.length > 0)
    if (!entry.customOneOffs.length) delete entry.customOneOffs
  }

  const changed =
    beforeDesc !== (entry.description ?? '') || beforeOneOffs !== JSON.stringify(entry.customOneOffs ?? [])

  return { changed }
}

export { overridesCoverParsed, normalizeProse }
