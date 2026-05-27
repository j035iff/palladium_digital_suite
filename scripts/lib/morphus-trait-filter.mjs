/**
 * Playable Morphus traits only — skip table routers, "Other", roll-twice rows, etc.
 * Keep in sync with scripts/lib/morphus-extract-table.py (is_non_playable_trait).
 */

const ROLL_OTHER_RE = /other:\s*roll/i

/** Step-One body-area picks and similar non-trait rows (Disproportion, etc.). */
const STEP_ONE_ROUTER_NAMES = new Set([
  'head',
  'torso',
  'arms & hands',
  'arms and hands',
  'legs & feet',
  'legs and feet',
])

const NON_PLAYABLE_NAME_RES = [
  /^other\b/i,
  /^roll twice\b/i,
  /^step one\b/i,
  /^step two\b/i,
  /^disproportionate\s/i,
  /^roll (?:on|again|twice|percentile)\b/i,
  /^combination of two\b/i,
]

export function normTraitName(name) {
  return String(name)
    .toLowerCase()
    .replace(/'/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string} name
 * @param {string} [bodySnippet] - start of trait prose after the name
 * @param {string} [fullBody] - full trait block when available
 * @returns {{ playable: boolean, reason?: string }}
 */
export function classifyMorphusTrait(name, bodySnippet = '', fullBody = '') {
  const n = normTraitName(name)
  const head = bodySnippet.slice(0, 300)
  const body = (fullBody || '').trim()

  if (ROLL_OTHER_RE.test(head)) {
    return { playable: false, reason: 'other_roll_row' }
  }
  if (n === 'other' || n === 'other, but related') {
    return { playable: false, reason: 'other' }
  }

  for (const re of NON_PLAYABLE_NAME_RES) {
    if (re.test(name)) {
      return { playable: false, reason: 'non_playable_name' }
    }
  }

  if (STEP_ONE_ROUTER_NAMES.has(n)) {
    const hasMechanics = /Bonuses?:|Penalties?:|[+-]\d/i.test(body)
    if (body.length < 80 || !hasMechanics) {
      return { playable: false, reason: 'step_one_router' }
    }
  }

  if (/^roll (?:on|see|refer to|use the)\s/i.test(body) && !/Bonuses?:/i.test(body)) {
    return { playable: false, reason: 'instruction_only' }
  }

  return { playable: true }
}

export function isPlayableMorphusTrait(name, bodySnippet = '', fullBody = '') {
  return classifyMorphusTrait(name, bodySnippet, fullBody).playable
}

/** @param {{ name: string, skip?: boolean, [key: string]: unknown }} trait */
export function traitIndexRowIsPlayable(trait) {
  if (trait.skip === true) return false
  return isPlayableMorphusTrait(trait.name)
}

/** Filter catalog entries; drops routers and instruction rows. */
export function filterPlayableEntries(entries) {
  const kept = []
  const skipped = []
  for (const entry of entries) {
    if (entry.entryRole === 'table_router' || entry.entryRole === 'subtable_header') {
      skipped.push({ id: entry.id, name: entry.name, reason: entry.entryRole })
      continue
    }
    const body = entry.description ?? ''
    const { playable, reason } = classifyMorphusTrait(entry.name, body, body)
    if (!playable) {
      skipped.push({ id: entry.id, name: entry.name, reason })
      continue
    }
    kept.push(entry)
  }
  return { kept, skipped }
}
