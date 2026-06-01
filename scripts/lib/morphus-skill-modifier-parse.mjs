/**
 * Parse Morphus trait prose into skill_trait overrides and impossible-in-Morphus flags.
 * Trait membership lists: src/data/source/skill_trait_lists/*.txt (applied via apply:skill-traits).
 */

export {
  SKILL_TRAIT_DEXTERITY,
  SKILL_TRAIT_LIGHT_TOUCH,
  SKILL_TRAIT_ELECTRICAL,
  SKILL_TRAIT_REPAIR,
  SKILL_TRAIT_MECHANICS,
  SKILL_TRAIT_TIMING,
  SKILL_TRAIT_FOCUS,
  ALL_SKILL_TRAIT_IDS,
} from './skill-trait-constants.mjs'

import {
  SKILL_TRAIT_DEXTERITY,
  SKILL_TRAIT_LIGHT_TOUCH,
  SKILL_TRAIT_ELECTRICAL,
  SKILL_TRAIT_REPAIR,
  SKILL_TRAIT_MECHANICS,
  SKILL_TRAIT_TIMING,
  SKILL_TRAIT_FOCUS,
} from './skill-trait-constants.mjs'

/** Book phrasing → skill_trait registry id (lists in skills_*.txt). */
export const TRAIT_PERCENT_PATTERNS = [
  {
    re: /([+-])(\d+)%\s+to\s+all\s+manual\s+dexterity\s+related\s+skills/i,
    traitId: SKILL_TRAIT_DEXTERITY,
  },
  {
    re: /([+-])(\d+)%\s+to\s+(?:the\s+)?delicate\s+skills/i,
    traitId: SKILL_TRAIT_DEXTERITY,
  },
  {
    re: /([+-])(\d+)%\s+(?:bonus\s+to\s+)?skills?\s+related\s+to\s+electronics(?:\s+and\s+electrical\s+repair(?:\s+and\s+computers)?)?/i,
    traitId: SKILL_TRAIT_ELECTRICAL,
  },
  {
    re: /([+-])(\d+)%\s+(?:bonus\s+to\s+)?skills?\s+related\s+to\s+mechanics(?:\s+and\s+mechanical\s+repair)?/i,
    traitId: SKILL_TRAIT_MECHANICS,
  },
  {
    re: /([+-])(\d+)%\s+(?:bonus\s+to\s+)?skills?\s+related\s+to\s+(?:electrical|mechanical)\s+repair/i,
    traitId: SKILL_TRAIT_REPAIR,
  },
  {
    re: /([+-])(\d+)%\s+(?:bonus\s+to\s+)?skills?\s+related\s+to\s+repair/i,
    traitId: SKILL_TRAIT_REPAIR,
  },
  {
    re: /([+-])(\d+)%\s+(?:to\s+)?skills?\s+requiring\s+timing/i,
    traitId: SKILL_TRAIT_TIMING,
  },
  {
    re: /([+-])(\d+)%\s+(?:bonus\s+to\s+)?skills?\s+related\s+to\s+time\s+and\s+timing/i,
    traitId: SKILL_TRAIT_TIMING,
  },
  {
    re: /([+-])(\d+)%\s+(?:to\s+)?skills?\s+requiring\s+(?:focus|concentration)/i,
    traitId: SKILL_TRAIT_FOCUS,
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
    signGroup: 1,
    valueGroup: 2,
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

  for (const pattern of TRAIT_PERCENT_PATTERNS) {
    const { re, traitId, signGroup = 1, valueGroup = 2 } = pattern
    const m = normalizedBody.match(re)
    if (!m) continue
    const sign = m[signGroup] === '-' ? -1 : 1
    overrides.push({
      targetType: 'skill_trait',
      targetValue: traitId,
      modifierPercent: sign * Number(m[valueGroup]),
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
