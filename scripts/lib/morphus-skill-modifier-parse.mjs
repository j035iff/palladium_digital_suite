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
  {
    re: /([+-])(\d+)%\s+to\s+all\s+skills?\s+that\s+require\s+a\s+delicate\s+touch\s+and\s+human-sized\s+fingers\/hands/i,
    traitId: SKILL_TRAIT_LIGHT_TOUCH,
  },
  {
    re: /([+-])(\d+)%\s+to\s+any\s+skill\s+that\s+requires\s+seeing\s+fine\s+detail\s+up\s+close/i,
    traitId: SKILL_TRAIT_FOCUS,
  },
]

function signedPercent(signChar, value) {
  return (signChar === '-' ? -1 : 1) * Number(value)
}

function pushCategory(overrides, targetValue, modifierPercent) {
  overrides.push({ targetType: 'category', targetValue, modifierPercent })
}

function pushTrait(overrides, traitId, modifierPercent) {
  overrides.push({ targetType: 'skill_trait', targetValue: traitId, modifierPercent })
}

function pushSkillId(overrides, findSkillId, name, modifierPercent) {
  const cleaned = String(name)
    .replace(/[).,;:]+$/g, '')
    .replace(/\s+\(all\)$/i, '')
    .trim()
  if (!cleaned || /^(all|etc)$/i.test(cleaned)) return
  if (/^performance$/i.test(cleaned)) {
    pushCategory(overrides, 'performance', modifierPercent)
    return
  }
  if (/^medical$/i.test(cleaned)) {
    pushCategory(overrides, 'medical', modifierPercent)
    return
  }
  if (/^demolitions$/i.test(cleaned)) {
    pushCategory(overrides, 'demolitions', modifierPercent)
    return
  }
  if (/^electronics$/i.test(cleaned)) {
    pushTrait(overrides, SKILL_TRAIT_ELECTRICAL, modifierPercent)
    return
  }
  if (/^computers$/i.test(cleaned)) {
    pushCategory(overrides, 'computers', modifierPercent)
    return
  }
  const id = findSkillId(cleaned)
  if (id) overrides.push({ targetType: 'skill_id', targetValue: id, modifierPercent })
}

function pushSkillList(overrides, findSkillId, listText, modifierPercent) {
  for (const part of splitSkillListPhrase(listText)) {
    pushSkillId(overrides, findSkillId, part, modifierPercent)
  }
}

/**
 * Repair PDF watermark text injected into transcribed Morphus prose.
 * @param {string} text
 */
export function repairPdfWatermarkProse(text) {
  let out = String(text)
  out = out.replace(
    /\b(\w+)\s+(?:\d+\s*)?Joe Sifferman \(Order #\d+\)(?:\s*\d+)?\s+(\w+)\b/gi,
    '$1 $2',
  )
  out = out.replace(/(\w+?)(?:\d+\s*)?Joe Sifferman \(Order #\d+\)(?:\s*\d+)?\s*(\w+)/gi, '$1$2')
  out = out.replace(/\s*\d+\s*Joe Sifferman \(Order #\d+\)\s*\d*\s*/gi, ' ')
  out = out.replace(/\bimpossible and\s*\)\.\s*/gi, 'impossible. ')
  out = out.replace(/\s{2,}/g, ' ')
  return out.trim()
}

/** Skill list before "are impossible to use in this Morphus" (handles "etc." in list). */
function extractSkillsLikeImpossibleList(body) {
  const start = body.search(/\bSkills like\s+/i)
  if (start < 0) return null
  const listStart = start + body.slice(start).match(/\bSkills like\s+/i)[0].length
  const end = body.slice(listStart).search(/\s+are impossible to use in this Morphus\b/i)
  if (end < 0) return null
  return body
    .slice(listStart, listStart + end)
    .replace(/etc\.?,?\s*$/i, '')
    .trim()
}

/**
 * Parse common Tier-3 skill modifier prose not covered by per-skill regexes.
 * @param {string} body
 * @param {(name: string) => string | null} findSkillId
 * @returns {{ specificSkillOverrides: object[], globalSkillModifier?: number }}
 */
export function parseExtendedSkillModifierProse(body, findSkillId) {
  const normalizedBody = repairPdfWatermarkProse(
    String(body).replace(/([A-Za-z])-\s+([A-Za-z])/g, '$1$2'),
  )
  const overrides = []
  let globalSkillModifier

  const perfM = normalizedBody.match(/reduce skill performance by (\d+)%/i)
  if (perfM) globalSkillModifier = -Number(perfM[1])

  const rccM = normalizedBody.match(/([+-])(\d+)% on all R\.C\.C\. Skills/i)
  if (rccM) pushCategory(overrides, 'occ', signedPercent(rccM[1], rccM[2]))

  const pilotM = normalizedBody.match(/([+-])(\d+)% to all Piloting skills/i)
  if (pilotM) pushCategory(overrides, 'piloting', signedPercent(pilotM[1], pilotM[2]))

  const commM = normalizedBody.match(/([+-])(\d+)% to all Communications skills/i)
  if (commM) pushCategory(overrides, 'communications', signedPercent(commM[1], commM[2]))

  const prowlParenM = normalizedBody.match(/([+-])(\d+)% to Prowl \([^)]+\)/i)
  if (prowlParenM) pushSkillId(overrides, findSkillId, 'Prowl', signedPercent(prowlParenM[1], prowlParenM[2]))

  const prowlBonusM = normalizedBody.match(/\+(\d+)% bonus to Prowl/i)
  if (prowlBonusM) pushSkillId(overrides, findSkillId, 'Prowl', Number(prowlBonusM[1]))

  const survM = normalizedBody.match(
    /([+-])(\d+)% to all skills involving surveillance, tailing and investigation/i,
  )
  if (survM) {
    const pct = signedPercent(survM[1], survM[2])
    pushCategory(overrides, 'espionage', pct)
    pushSkillId(overrides, findSkillId, 'Tailing', pct)
  }

  const appearPerfM = normalizedBody.match(
    /([+-])(\d+)% to all skills involving appearance and performance, including ([^.;\n]+)/i,
  )
  if (appearPerfM) {
    const pct = signedPercent(appearPerfM[1], appearPerfM[2])
    pushCategory(overrides, 'appearance', pct)
    pushCategory(overrides, 'performance', pct)
    pushSkillList(overrides, findSkillId, appearPerfM[3], pct)
  }

  const appearM = normalizedBody.match(
    /([+-])(\d+)% to all skills involving appearance, including ([^.;\n]+)/i,
  )
  if (appearM) {
    const pct = signedPercent(appearM[1], appearM[2])
    pushCategory(overrides, 'appearance', pct)
    pushSkillList(overrides, findSkillId, appearM[3], pct)
  }

  const combatM = normalizedBody.match(/([+-])(\d+)% to any skills related to combat or destruction/i)
  if (combatM) {
    const pct = signedPercent(combatM[1], combatM[2])
    pushCategory(overrides, 'combat', pct)
    pushCategory(overrides, 'destruction', pct)
  }

  const acroClimbM = normalizedBody.match(/\+(\d+)% to Acrobatics \(balance\) and Climbing/i)
  if (acroClimbM) {
    const pct = Number(acroClimbM[1])
    pushSkillId(overrides, findSkillId, 'Acrobatics', pct)
    pushSkillId(overrides, findSkillId, 'Climbing', pct)
  }

  const followingM = normalizedBody.match(
    /\+(\d+)% to the following skills or skill categories: ([^.;\n]+)/i,
  )
  if (followingM) {
    const pct = Number(followingM[1])
    for (const chunk of followingM[2].split(/,\s*/)) {
      pushSkillId(overrides, findSkillId, chunk.trim(), pct)
    }
  }

  for (const m of normalizedBody.matchAll(
    /([+-])(\d+)% (?:(?:penalty )?on|to) skills? (?:like|such as) ([^.;\n]+)/gi,
  )) {
    pushSkillList(overrides, findSkillId, m[3], signedPercent(m[1], m[2]))
  }

  for (const m of normalizedBody.matchAll(
    /([+-])(\d+)% (?:penalty )?on skills like ([^.;\n]+)/gi,
  )) {
    pushSkillList(overrides, findSkillId, m[3], signedPercent(m[1], m[2]))
  }

  for (const m of normalizedBody.matchAll(
    /([+-])(\d+)% to skills such as ([^.;\n]+)/gi,
  )) {
    pushSkillList(overrides, findSkillId, m[3], signedPercent(m[1], m[2]))
  }

  const handsM = normalizedBody.match(/-(\d+)% to any skill requiring the use of hands/i)
  if (handsM) pushTrait(overrides, SKILL_TRAIT_DEXTERITY, -Number(handsM[1]))

  const globalPerfM = normalizedBody.match(/-(\d+)% on the performance of all skills/i)
  if (globalPerfM) globalSkillModifier = -Number(globalPerfM[1])

  const globalPerf2M = normalizedBody.match(/-(\d+)% on skill performance(?:\.|,|$)/i)
  if (globalPerf2M && globalSkillModifier == null) {
    globalSkillModifier = -Number(globalPerf2M[1])
  }

  const occToolsM = normalizedBody.match(
    /\+(\d+)% to all O\.C\.C\. Skills that relate to the tools and the trade/i,
  )
  if (occToolsM) {
    const pct = Number(occToolsM[1])
    pushCategory(overrides, 'occ', pct)
    pushTrait(overrides, SKILL_TRAIT_MECHANICS, pct)
    pushTrait(overrides, SKILL_TRAIT_ELECTRICAL, pct)
    pushTrait(overrides, SKILL_TRAIT_REPAIR, pct)
  }

  const impUseList = extractSkillsLikeImpossibleList(normalizedBody)
  if (impUseList) {
    for (const part of splitSkillListPhrase(impUseList)) {
      if (/^piloting/i.test(part) || /driving/i.test(part)) {
        overrides.push({
          targetType: 'category',
          targetValue: 'piloting',
          impossibleInMorphus: true,
        })
        continue
      }
      const id = findSkillId(part)
      if (id) overrides.push({ targetType: 'skill_id', targetValue: id, impossibleInMorphus: true })
      else if (/^performance$/i.test(part)) {
        overrides.push({ targetType: 'category', targetValue: 'performance', impossibleInMorphus: true })
      }
    }
  }

  return {
    specificSkillOverrides: overrides,
    ...(globalSkillModifier != null ? { globalSkillModifier } : {}),
  }
}

/**
 * Contextual skill modifiers and player picks from prose/customOneOffs.
 * @param {string} body
 * @returns {{ skillContextModifiers?: object[], playerChoices?: object[] }}
 */
export function parseContextualMorphusFields(body) {
  const normalizedBody = repairPdfWatermarkProse(
    String(body).replace(/([A-Za-z])-\s+([A-Za-z])/g, '$1$2'),
  )
  const out = {}

  const colorM = normalizedBody.match(
    /Color change[^.]*?\+(\d+)% to Prowl or hide and \+(\d+)% to Climb/i,
  )
  if (colorM) {
    out.skillContextModifiers = [
      {
        skillId: 'skill_prowl',
        modifierPercent: Number(colorM[1]),
        context: 'color_change',
      },
      {
        skillId: 'skill_climbing',
        modifierPercent: Number(colorM[2]),
        context: 'color_change',
      },
    ]
  }

  const clownM = normalizedBody.match(
    /\+(\d+)% to any single Espionage skill and \+(\d+)% to any single Rogue skill \(player's choice\)/i,
  )
  if (clownM) {
    out.playerChoices = [
      {
        label: 'Espionage skill bonus',
        options: [`Any single Espionage skill (+${clownM[1]}% in Morphus)`],
        timing: 'character_creation',
      },
      {
        label: 'Rogue skill bonus',
        options: [`Any single Rogue skill (+${clownM[2]}% in Morphus)`],
        timing: 'character_creation',
      },
    ]
  }

  return out
}

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
    /\bSkills?\s+like\s+([A-Za-z][A-Za-z &/,]+?(?:etc\.?,?\s*)?)\s+are\s+(?:likely\s+)?impossible/gi,
  ]

  for (const re of patterns) {
    for (const m of body.matchAll(re)) {
      const tail = body.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 48)
      if (/\bwhile\b|\bunless\b|\bwhen\b/i.test(tail)) continue
      const raw = [m[1], m[2]].filter(Boolean).join(' and ')
      if (!raw) continue
      if (/clothing|shirts?|jackets?|coats?|shoes?|sleeves?/i.test(raw)) continue
      phrases.push(raw)
    }
  }
  const skillsLikeList = extractSkillsLikeImpossibleList(body)
  if (skillsLikeList) phrases.push(skillsLikeList)
  return phrases
}

/** @param {string} phrase */
function splitSkillListPhrase(phrase) {
  return phrase
    .split(/\s+and\s+|,\s*/i)
    .map((s) =>
      s
        .replace(/([a-z])-\s+([a-z])/gi, '$1$2')
        .replace(/\s+in\s+this\s+Morphus.*$/i, '')
        .replace(/\s+in\s+Morphus\s+form.*$/i, '')
        .replace(/\s+skills?$/i, '')
        .trim(),
    )
    .filter((s) => s.length > 1 && !/^(skills?|like)$/i.test(s))
}
