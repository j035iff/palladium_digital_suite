/**
 * Parse Morphus trait prose into skill_trait overrides and impossible-in-Morphus flags.
 * Trait membership lists: src/data/source/skill_trait_lists/*.txt (applied via apply:skill-traits).
 */

export const SKILL_TRAIT_DEXTERITY = 'requires_dexterity'
export const SKILL_TRAIT_LIGHT_TOUCH = 'requires_light_touch'

/** Book phrasing → skill_trait registry id (lists in skills_requiring_*.txt). */
const TRAIT_PERCENT_PATTERNS = [
  {
    re: /([+-])(\d+)%\s+to\s+all\s+manual\s+dexterity\s+related\s+skills/i,
    traitId: SKILL_TRAIT_DEXTERITY,
  },
  {
    re: /([+-])(\d+)%\s+to\s+(?:the\s+)?delicate\s+skills/i,
    traitId: SKILL_TRAIT_DEXTERITY,
  },
  {
    re: /([+-])(\d+)%\s+skill\s+penalty\s+on\s+those\s+requiring\s+delicate\s+work\s+or\s+a\s+light\s+touch/i,
    traitId: SKILL_TRAIT_LIGHT_TOUCH,
  },
  {
    re: /([+-])(\d+)%\s+to\s+(?:perform\s+)?any\s+skills?\s+that\s+require\s+a\s+delicate\s+touch/i,
    traitId: SKILL_TRAIT_LIGHT_TOUCH,
  },
  {
    re: /([+-])(\d+)%\s+to\s+skills?\s+requiring\s+(?:a\s+)?(?:delicate|light)\s+touch/i,
    traitId: SKILL_TRAIT_LIGHT_TOUCH,
  },
  {
    re: /([+-])(\d+)%\s+to\s+any\s+skills?\s+requiring\s+a\s+light\s+touch/i,
    traitId: SKILL_TRAIT_LIGHT_TOUCH,
  },
  {
    re: /([+-])(\d+)%\s+on\s+those\s+requiring\s+delicate\s+work/i,
    traitId: SKILL_TRAIT_LIGHT_TOUCH,
  },
  {
    re: /([+-])(\d+)%\s+to\s+skills?\s+like\s+[^.]+requiring\s+(?:a\s+)?delicate\s+touch/i,
    traitId: SKILL_TRAIT_LIGHT_TOUCH,
  },
  {
    re: /([+-])(\d+)%\s+to\s+skills?\s+that\s+require\s+a\s+delicate\s+touch\s+or\s+precision/i,
    traitId: SKILL_TRAIT_LIGHT_TOUCH,
  },
  {
    re: /([+-])(\d+)%\s+on\s+all\s+skills?\s+that\s+require\s+a\s+delicate\s+touch/i,
    traitId: SKILL_TRAIT_LIGHT_TOUCH,
  },
  {
    re: /(?:any\s+)?skills?\s+requiring\s+delicate\s+finger\s+control\s+(?:is\s+)?at\s+([+-])(\d+)%/i,
    traitId: SKILL_TRAIT_DEXTERITY,
  },
  {
    re: /([+-])(\d+)%\s+to\s+perform\s+any\s+skills?\s+that\s+require\s+a\s+delicate\s+touch/i,
    traitId: SKILL_TRAIT_LIGHT_TOUCH,
  },
]

/**
 * @param {string} body
 * @param {(name: string) => string | null} findSkillId
 * @returns {Array<{ targetType: string, targetValue: string, modifierPercent?: number, impossibleInMorphus?: boolean }>}
 */
export function parseTraitAndImpossibleSkillModifiers(body, findSkillId) {
  const normalizedBody = String(body).replace(/([A-Za-z])-\s+([A-Za-z])/g, '$1$2')
  const overrides = []

  for (const { re, traitId } of TRAIT_PERCENT_PATTERNS) {
    const m = normalizedBody.match(re)
    if (!m) continue
    const sign = m[1] === '-' ? -1 : 1
    overrides.push({
      targetType: 'skill_trait',
      targetValue: traitId,
      modifierPercent: sign * Number(m[2]),
    })
  }

  const impossiblePhrases = collectImpossibleSkillPhrases(normalizedBody)
  for (const phrase of impossiblePhrases) {
    for (const part of splitSkillListPhrase(phrase)) {
      const id = findSkillId(part)
      if (!id) continue
      overrides.push({
        targetType: 'skill_id',
        targetValue: id,
        impossibleInMorphus: true,
      })
    }
  }

  return overrides
}

/** @param {string} body */
function collectImpossibleSkillPhrases(body) {
  const phrases = []
  const patterns = [
    /\b([A-Za-z][A-Za-z &/,]+?)\s+are\s+impossible\b/gi,
    /\b([A-Za-z][A-Za-z &/,]+?)\s+is\s+impossible\b/gi,
    /\bimpossible\s+to\s+([A-Za-z][A-Za-z &/]+?)(?:\s+and\s+([A-Za-z][A-Za-z &/]+?))?(?=[\s,.;])/gi,
    /\b([A-Za-z][A-Za-z &/,]+?)\s+impossible\s+in\s+this\s+Morphus/gi,
    /\bSkills?\s+like\s+([A-Za-z][A-Za-z &/,]+?)\s+are\s+(?:likely\s+)?impossible/gi,
  ]

  for (const re of patterns) {
    for (const m of body.matchAll(re)) {
      const raw = [m[1], m[2]].filter(Boolean).join(' and ')
      if (!raw) continue
      if (/clothing|shirts?|jackets?|coats?|shoes?|sleeves?/i.test(raw)) continue
      phrases.push(raw)
    }
  }
  return phrases
}

/** @param {string} phrase */
function splitSkillListPhrase(phrase) {
  return phrase
    .split(/\s+and\s+|,\s*/i)
    .map((s) =>
      s
        .replace(/([a-z])-\s+([a-z])/gi, '$1$2')
        .replace(/\s+skills?$/i, '')
        .trim(),
    )
    .filter((s) => s.length > 1 && !/^(skills?|like)$/i.test(s))
}
