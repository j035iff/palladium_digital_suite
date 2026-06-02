/**
 * Strip Morphus description / customOneOffs clauses already represented in skillModifiers.
 */
import {
  TRAIT_PERCENT_PATTERNS,
  repairPdfWatermarkProse,
} from './morphus-skill-modifier-parse.mjs'

function stripSkillsLikeImpossibleBlock(text) {
  const start = text.search(/\bSkills like\s+/i)
  if (start < 0) return text
  const prefix = text.slice(start).match(/\bSkills like\s+/i)[0]
  const listStart = start + prefix.length
  const tail = text.slice(listStart)
  const endRel = tail.search(/\s+are impossible to use in this Morphus\b/i)
  if (endRel < 0) return text
  const end = listStart + endRel + ' are impossible to use in this Morphus'.length
  let out = `${text.slice(0, start)} ${text.slice(end)}`
  const punct = out.slice(start).match(/^\s*([.;])/)
  if (punct) {
    out = `${out.slice(0, start)}${punct[1]}${out.slice(start + punct[0].length)}`
  }
  return out
}
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Printed names in Morphus prose that differ from catalog `name`. */
const SKILL_PROSE_ALIASES = {
  skill_impersonation: ['Impersonation'],
}

function proseNamesForSkill(sk, skillId) {
  const names = new Set([sk?.name, ...(SKILL_PROSE_ALIASES[skillId] ?? [])].filter(Boolean))
  return [...names]
}

function normalizeProse(text) {
  return repairPdfWatermarkProse(
    String(text)
      .replace(/\[cite:\s*\d+\]/gi, '')
      .replace(/([A-Za-z])-\s+([A-Za-z])/g, '$1$2')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

function cleanupProse(text) {
  return (
    text
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/(?:Bonuses|Penalties):\s*(?:,\s*)?(?=[.;]|$)/gi, '')
      .replace(/,\s+adding a Penalties:/gi, '. Penalties:')
      .replace(/\band and\b/gi, 'and')
      .replace(/\.\s+and\.\s*$/gi, '.')
      .replace(/\s+and\.\s*$/gi, '.')
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
      .replace(/\.\.+/g, '.')
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
}

/** Fix orphaned fragments after stripping (safe to run on all trait entries). */
export function repairEntryProseArtifacts(entry) {
  const beforeDesc = entry.description ?? ''
  const beforeOneOffs = JSON.stringify(entry.customOneOffs ?? [])
  if (entry.description) {
    entry.description = cleanupProse(repairPdfWatermarkProse(entry.description))
  }
  if (Array.isArray(entry.customOneOffs)) {
    entry.customOneOffs = entry.customOneOffs
      .map((line) => cleanupProse(repairPdfWatermarkProse(String(line))))
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
  const hasStructuredSkillRules =
    overrides.length > 0 ||
    entry.skillModifiers?.globalSkillModifier != null ||
    (entry.playerChoices?.length ?? 0) > 0 ||
    (entry.skillContextModifiers?.length ?? 0) > 0
  if (!hasStructuredSkillRules) return []

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
      const names = proseNamesForSkill(sk, o.targetValue)
      const primaryName = names[0] ?? o.targetValue.replace(/^skill_/, '').replace(/_/g, ' ')
      for (const name of names) {
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
      }
      if (!byPct.has(pct)) byPct.set(pct, [])
      byPct.get(pct).push({ type: 'skill_id', id: o.targetValue, name: primaryName, aliases: names })
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
          `${signRe}${abs}%\\s+to\\s+all\\s+skills\\s+involving\\s+${cat}[^.]{0,80}`,
          'gi',
        ),
      )
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+to\\s+skills?\\s+such\\s+as\\s+[^.;]{0,200}\\b${cat}\\b[^.;]{0,80}`,
          'gi',
        ),
      )
      if (o.targetValue === 'combat') {
        patterns.push(
          new RegExp(
            `${signRe}${abs}%\\s+to\\s+any\\s+skills\\s+related\\s+to\\s+combat\\s+or\\s+destruction\\.?`,
            'gi',
          ),
        )
      }
      if (o.targetValue === 'appearance') {
        patterns.push(
          new RegExp(
            `${signRe}${abs}%\\s+to\\s+all\\s+skills\\s+involving\\s+appearance(?:\\s+and\\s+performance)?,\\s+including[^.]*\\.?`,
            'gi',
          ),
        )
      }
      if (o.targetValue === 'occ') {
        patterns.push(new RegExp(`\\+${abs}%\\s+on\\s+all\\s+R\\.C\\.C\\.\\s+Skills`, 'gi'))
      }
      if (o.targetValue === 'espionage') {
        patterns.push(
          new RegExp(
            `${signRe}${abs}%\\s+to\\s+all\\s+skills\\s+involving\\s+surveillance,\\s+tailing\\s+and\\s+investigation`,
            'gi',
          ),
        )
      }
    }
  }

  for (const [pct, items] of byPct) {
    const signRe = pct < 0 ? '-' : '\\+'
    const abs = Math.abs(pct)
    const names = [
      ...new Set(
        items.flatMap((i) => [i.name, ...(i.aliases ?? [])].map((n) => escapeRe(n))),
      ),
    ]
    if (names.length >= 2) {
      const list = names.slice(0, -1).join(',\\s*') + `(?:,\\s*)?and\\s+${names[names.length - 1]}`
      patterns.push(new RegExp(`${signRe}${abs}%\\s+to\\s+${list}\\s+skills?`, 'gi'))
    }
    if (names.length >= 2 && pct < 0) {
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+(?:penalty )?on skills like [^.]*\\.?\\s*`,
          'gi',
        ),
      )
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+to\\s+skills\\s+like\\s+[^.;]+\\.\\s*`,
          'gi',
        ),
      )
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+(?:penalty )?on skills like ${names.join(',\\s*')}(?:\\s+and\\s+${names[names.length - 1]})?[^.]*\\.?\\s*`,
          'gi',
        ),
      )
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+to\\s+skills\\s+like\\s+${names.join(',\\s*')}(?:\\s+and\\s+${names[names.length - 1]})?[^.]*\\.\\s*`,
          'gi',
        ),
      )
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+to\\s+skills\\s+such\\s+as\\s+[^.;]+\\.\\s*`,
          'gi',
        ),
      )
      patterns.push(
        new RegExp(
          `${signRe}${abs}%\\s+to\\s+the\\s+Disguise\\s+and\\s+Impersonation\\s+skills?\\.?\\s*`,
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
      new RegExp(`reduce skill performance by ${abs}%`, 'gi'),
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

  patterns.push(/reduce skill performance by \d+%\.?\s*/gi)
  patterns.push(/\+(\d+)% to the following skills or skill categories:[^.]*\.?\s*/gi)
  patterns.push(/\+(\d+)% to Acrobatics \(balance\) and Climbing when[^.]*\.?\s*/gi)
  patterns.push(/-(\d+)% to any skill requiring the use of hands[^.]*\.?\s*/gi)
  patterns.push(/Skills like [^.]+ are impossible to use in this Morphus\.?\s*/gi)
  patterns.push(
    /Skills requiring manual dexterity and fingers are often impossible \(-\d+% to skill performance\)\.?/gi,
  )
  patterns.push(
    /Color change \(one melee action\) grants \+\d+% to Prowl or hide and \+\d+% to Climb[^.]*\.?\s*/gi,
  )
  patterns.push(
    /\+\d+% to any single Espionage skill and \+\d+% to any single Rogue skill \(player's choice\)\.?/gi,
  )
  patterns.push(
    /\+\d+% to all O\.C\.C\. Skills that relate to the tools and the trade[^.]*\.?\s*/gi,
  )

  for (const row of entry.skillContextModifiers ?? []) {
    if (row.context === 'color_change') {
      patterns.push(
        /Color change \(one melee action\) grants \+\d+% to Prowl or hide and \+\d+% to Climb[^.]*\.?\s*/gi,
      )
    }
  }

  if ((entry.playerChoices?.length ?? 0) > 0) {
    patterns.push(
      /\+\d+% to any single Espionage skill and \+\d+% to any single Rogue skill \(player's choice\)\.?/gi,
    )
  }

  return patterns
}

export function stripSkillModifierProse(text, patterns) {
  if (!text) return text
  let out = normalizeProse(text)
  out = stripSkillsLikeImpossibleBlock(out)
  if (!patterns.length) return cleanupProse(out)
  for (const re of patterns) {
    out = out.replace(re, ' ')
  }
  return cleanupProse(out)
}

export function dedupeEntrySkillProse(entry, skillsById) {
  const overrides = entry.skillModifiers?.specificSkillOverrides ?? []
  const hasStructuredSkillRules =
    overrides.length > 0 ||
    entry.skillModifiers?.globalSkillModifier != null ||
    (entry.playerChoices?.length ?? 0) > 0 ||
    (entry.skillContextModifiers?.length ?? 0) > 0
  if (!hasStructuredSkillRules) {
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
