/**
 * Nightbane-specific Morphus prose cleanup.
 * Nightbane are immune to mind control — omit save/bonus text that references it.
 */

const MIND_CONTROL_RE = /\bmind[- ]control\b/gi

/** True when a customOneOff line only documents a mind-control save (ignored for Nightbane). */
export function isMindControlOnlyNote(text) {
  const t = String(text ?? '').trim()
  if (!MIND_CONTROL_RE.test(t)) return false
  const stripped = stripMindControlFromMorphusProse(t)
  if (!stripped) return true
  return !/[+−-]?\d/.test(stripped) && !/save vs/i.test(stripped)
}

/**
 * Remove mind-control save clauses and list items from Morphus trait prose.
 * @param {string} text
 * @returns {string}
 */
export function stripMindControlFromMorphusProse(text) {
  if (!text) return text
  let s = String(text)

  s = s.replace(
    /\+?\d+\s+to\s+save\s+vs\s+mind[- ]control\s+and\s+possession/gi,
    (m) => m.replace(/mind[- ]control\s+and\s+/i, ''),
  )
  s = s.replace(
    /\+?\d+\s+to\s+save\s+vs\s+possession\s+and\s+mind[- ]control/gi,
    (m) => m.replace(/\s+and\s+mind[- ]control/i, ''),
  )
  s = s.replace(/to save vs mind[- ]control,\s*/gi, 'to save vs ')
  s = s.replace(/\+?\d+\s+to\s+save\s+vs\s+mind[- ]control\b/gi, '')
  s = s.replace(/\bmind[- ]control\s+and\s+/gi, '')
  s = s.replace(/\band\s+mind[- ]control\b/gi, '')
  s = s.replace(/,\s*mind[- ]control\b/gi, '')
  s = s.replace(/\bpossession\s+and\s+mind[- ]control\b/gi, 'possession')
  s = s.replace(/\bmind[- ]control\s+and\s+possession\b/gi, 'possession')
  s = s.replace(
    /\bMesmerism,\s*illusions,\s*mind[- ]control\s+and\s+possession\b/gi,
    'Mesmerism, illusions and possession',
  )
  s = s.replace(
    /\bmesmerism,\s*illusions,\s*mind[- ]control,?\s*or\s+possession\b/gi,
    'mesmerism, illusions, or possession',
  )
  s = s.replace(
    /\bimpervious\s+to\s+possession,\s*the\s+vampire['']s\s+bite\s+and\s+mind[- ]control\s+of\s+the\s+vampire\b/gi,
    "impervious to possession and the vampire's bite",
  )
  s = s.replace(/\bvampire\s+mind[- ]control\b/gi, "the vampire's bite")
  s = s.replace(
    /\bpsionics,\s*mind[- ]control\s+and\s+possession\b/gi,
    'psionics and possession',
  )
  s = s.replace(/to save vs psionics,\s*possession,\s*and/gi, 'to save vs psionics, and')
  s = s.replace(/\/mind[- ]control\b/gi, '')
  s = s.replace(/\bmind[- ]control\//gi, '')
  s = s.replace(/\s{2,}/g, ' ')
  s = s.replace(/\s+,/g, ',')
  s = s.replace(/,\s*,/g, ',')
  s = s.replace(/:\s*,/g, ': ')
  s = s.replace(/\(\s*,/g, '(')
  s = s.replace(/,\s*\)/g, ')')
  return s.trim()
}

/**
 * @param {Record<string, unknown>} entry
 */
export function sanitizeMorphusEntryForNightbane(entry) {
  if (entry.description) {
    entry.description = stripMindControlFromMorphusProse(entry.description)
  }
  if (Array.isArray(entry.customOneOffs)) {
    entry.customOneOffs = entry.customOneOffs
      .map((n) => stripMindControlFromMorphusProse(n))
      .filter((n) => n && !isMindControlOnlyNote(n))
    if (!entry.customOneOffs.length) delete entry.customOneOffs
  }
}
