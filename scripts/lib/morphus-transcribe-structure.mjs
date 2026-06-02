/**
 * Parse authoritative Morphus trait prose into structured schema fields.
 * Used during ingest (structure-entries) to minimize customOneOffs / description-only rows.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isPlayableMorphusTrait } from './morphus-trait-filter.mjs'
import { repoRoot } from './morphus-ingest-shared.mjs'
import {
  parseTraitAndImpossibleSkillModifiers,
  SKILL_TRAIT_DEXTERITY,
  SKILL_TRAIT_LIGHT_TOUCH,
  SKILL_TRAIT_ELECTRICAL,
  SKILL_TRAIT_REPAIR,
  SKILL_TRAIT_MECHANICS,
  SKILL_TRAIT_TIMING,
  SKILL_TRAIT_FOCUS,
  parseExtendedSkillModifierProse,
} from './morphus-skill-modifier-parse.mjs'
import {
  sanitizeMorphusEntryForNightbane,
  stripMindControlFromMorphusProse,
} from './morphus-nightbane-prose.mjs'

const TRAIT_HEADER = /(\d{2})-(\d{2})%\s+(.{1,120}?)[!:.]\s+/g

const STAT_KEY_MAP = {
  'P.P.E.': 'ppe',
  'Hit Points': 'hp',
  'P.S.': 'ps',
  'P.P.': 'pp',
  'P.E.': 'pe',
  'P.B.': 'pb',
  'M.A.': 'ma',
  'M.E.': 'me',
  'I.Q.': 'iq',
  Spd: 'spd',
  'Horror Factor': 'hf',
  'Perception Rolls': 'perception',
  initiative: 'initiative',
  strike: 'strike',
  parry: 'parry',
  dodge: 'dodge',
  entangle: 'entangle',
  disarm: 'disarm',
  'pull punch': 'pullPunch',
  'roll with impact': 'rollWithPunch',
  'roll with punch': 'rollWithPunch',
}

let skillsByName = null

export function loadSkillNameIndex() {
  if (skillsByName) return skillsByName
  const raw = JSON.parse(
    readFileSync(join(repoRoot, 'src/data/content/palladiumSkills.json'), 'utf8'),
  )
  skillsByName = new Map()
  for (const s of raw) {
    skillsByName.set(normalizeSkillName(s.name), s.id)
  }
  skillsByName.set('undercover ops', 'skill_undercover_ops')
  skillsByName.set('impersonation', 'skill_impersonation')
  skillsByName.set('imitate voices', 'skill_impersonation')
  skillsByName.set('imitate voices and impersonation', 'skill_impersonation')
  skillsByName.set('wardrobe grooming', 'skill_wardrobe_and_grooming')
  skillsByName.set('wardrobe and grooming', 'skill_wardrobe_and_grooming')
  skillsByName.set('escape artist', 'skill_escape_artist')
  return skillsByName
}

function normalizeSkillName(s) {
  return String(s)
    .toLowerCase()
    .replace(/([a-z])-\s+([a-z])/g, '$1$2')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function expandCompoundTraitName(name, bodyStart) {
  if (name.includes(':')) return name
  const m = bodyStart.match(
    /^([A-Za-z][A-Za-z0-9'-]{1,28}): (?!(?:Bonuses|Penalties|The|Note|When|If)\b)/,
  )
  if (m) return `${name}: ${m[1].trim()}`
  return name
}

export function splitTraitBlocks(tableText) {
  const cutoffRe =
    /^(?:Talent Manifestations|New Common Talents|Appendix(?:\s+Talents)?|Elite Talents)\b/m
  const cutoff = tableText.search(cutoffRe)
  const boundedText = cutoff >= 0 ? tableText.slice(0, cutoff) : tableText
  const headers = [...boundedText.matchAll(TRAIT_HEADER)]
  if (!headers.length) return []
  const blocks = []
  for (let i = 0; i < headers.length; i++) {
    const m = headers[i]
    const rawName = m[3].trim()
    if (!rawName || /^[a-z]/.test(rawName)) continue
    const start = m.index
    const end = i + 1 < headers.length ? headers[i + 1].index : boundedText.length
    const bodyStart = boundedText.slice(m.index + m[0].length, m.index + m[0].length + 240)
    const name = expandCompoundTraitName(
      m[3].trim().replace(/[!.:]+\s*$/, ''),
      bodyStart,
    )
    const body = boundedText.slice(start, end)
    blocks.push({
      percent: `${m[1]}-${m[2]}%`,
      name,
      body,
    })
  }
  return blocks.filter((b) => isPlayableMorphusTrait(b.name, b.body, b.body))
}

function normTraitName(s) {
  return normalizeSkillName(s)
}

const TRAIT_NAME_ALIASES = {
  'searchlight s': 'searchlight headlights',
  antenna: 'antennae',
  'no face!': 'no face',
}

function normTraitNameForMatch(s) {
  const key = normTraitName(s)
  return TRAIT_NAME_ALIASES[key] ?? key
}

function findSkillId(skillPhrase) {
  const idx = loadSkillNameIndex()
  const key = normalizeSkillName(skillPhrase.replace(/\s+skill$/i, ''))
  return idx.get(key) ?? null
}

function parseDice(expr) {
  const m = String(expr)
    .replace(/\s/g, '')
    .replace(/×/gi, 'x')
    .match(/([+-]?\d+D\d+(?:x\d+)?(?:[+-]\d+)?|[+-]?\d+)/i)
  return m ? m[1].replace(/x/gi, 'x') : null
}

function ensureStatModifiers(out) {
  if (!out.statModifiers) out.statModifiers = {}
  return out.statModifiers
}

function addStat(out, key, mod) {
  if (!key || !mod) return
  const sm = ensureStatModifiers(out)
  sm[key] = { ...(sm[key] ?? {}), ...mod }
}

function parseStatModifiers(body, out) {
  const statTokenRe =
    /(P\.P\.E\.|Hit Points|P\.S\.|P\.P\.(?!E)|P\.E\.|P\.B\.|M\.A\.|M\.E\.|I\.Q\.|Spd|Horror Factor|Perception Rolls|initiative|strike|parry|dodge|entangle|disarm|pull punch|roll with impact)/gi
  const groupedFlatRe =
    /([+-])(\d+)\s+to\s+(?:the\s+)?((?:(?:P\.P\.E\.|Hit Points|P\.S\.|P\.P\.(?!E)|P\.E\.|P\.B\.|M\.A\.|M\.E\.|I\.Q\.|Spd|Horror Factor|Perception Rolls|initiative|strike|parry|dodge|entangle|disarm|pull punch|roll with impact)(?:\s*(?:,|and)\s*)?)+)/gi
  for (const m of body.matchAll(groupedFlatRe)) {
    const contextStart = Math.max(0, (m.index ?? 0) - 180)
    const context = body.slice(contextStart, m.index ?? 0)
    if (
      /(?:failed|successful)\s+(?:save|roll)\s+means|victim|opponent|target|anybody within|save vs/i.test(
        context,
      )
    ) {
      continue
    }
    const sign = m[1] === '-' ? -1 : 1
    const delta = sign * Number(m[2])
    for (const tokenMatch of m[3].matchAll(statTokenRe)) {
      const key = STAT_KEY_MAP[tokenMatch[1]] ?? null
      if (key) addStat(out, key, { flat: delta })
    }
  }
  const horrorFactorRe = /([+-])(\d+)\s+(?:Awe\/)?Horror Factor\b/gi
  for (const m of body.matchAll(horrorFactorRe)) {
    addStat(out, 'hf', { flat: Number(m[2]) * (m[1] === '-' ? -1 : 1) })
  }

  const flatRe =
    /([+-])(\d+)\s+to\s+(?:the\s+)?(P\.P\.E\.|Hit Points|P\.S\.|P\.P\.(?!E)|P\.E\.|P\.B\.|M\.A\.|M\.E\.|I\.Q\.|Spd|Horror Factor|Perception Rolls|initiative|strike|parry|dodge|entangle|disarm|pull punch|roll with impact)/gi
  for (const m of body.matchAll(flatRe)) {
    const contextStart = Math.max(0, (m.index ?? 0) - 180)
    const context = body.slice(contextStart, m.index ?? 0)
    if (
      /(?:failed|successful)\s+(?:save|roll)\s+means|victim|opponent|target|anybody within|save vs/i.test(
        context,
      )
    ) {
      continue
    }
    const sign = m[1] === '-' ? -1 : 1
    const key = STAT_KEY_MAP[m[3]] ?? null
    if (key) addStat(out, key, { flat: sign * Number(m[2]) })
  }

  const diceAttrRe =
    /([+-])(\d+D\d+(?:x\d+)?(?:\+\d+)?)\s+to\s+(?:the\s+)?(P\.P\.E\.|Hit Points|P\.S\.|P\.P\.(?!E)|P\.E\.|P\.B\.|M\.A\.|M\.E\.|I\.Q\.)/gi
  for (const m of body.matchAll(diceAttrRe)) {
    const key = STAT_KEY_MAP[m[3]]
    if (key) addStat(out, key, { dice: `${m[1] === '-' ? '-' : ''}${m[2].replace(/x/gi, 'x')}` })
  }

  const sdcRe =
    /([+-])?(\d+D\d+(?:x\d+)?(?:\+\d+)?|\d+D\d+)\s+(?:to\s+)?(?:the\s+)?S\.D\.C\./gi
  for (const m of body.matchAll(sdcRe)) {
    const lead = body.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0)
    // Avoid capturing limb S.D.C. statements like "each wing has 1D6x10+11 S.D.C."
    if (/wing has|each wing has|limb has|has \d+D\d+(?:x\d+)?(?:\+\d+)?\s*$/i.test(lead)) continue
    const sign = m[1] === '-' ? '-' : ''
    addStat(out, 'sdc', { dice: `${sign}${m[2].replace(/x/gi, 'x')}` })
  }
  const addSdcRe = /Add\s+(\d+D\d+(?:x\d+)?(?:\+\d+)?)\s+to\s+(?:the\s+)?S\.D\.C\./gi
  for (const m of body.matchAll(addSdcRe)) {
    addStat(out, 'sdc', { dice: m[1].replace(/x/gi, 'x') })
  }

  const hfDiceRe = /(?:add\s+)?\+(\d+D\d+(?:\+\d+)?)\s+to\s+Horror Factor/gi
  for (const m of body.matchAll(hfDiceRe)) {
    addStat(out, 'hf', { dice: m[1].replace(/x/gi, 'x') })
  }
  const hfAweDiceRe = /([+-]?\d+D\d+(?:\+\d+)?)\s+to\s+(?:Awe\/)?Horror Factor/gi
  for (const m of body.matchAll(hfAweDiceRe)) {
    const value = m[1].replace(/^\+/, '').replace(/x/gi, 'x')
    if (/[dD]/.test(value)) addStat(out, 'hf', { dice: value })
  }
  const hfFlatRe = /([+-]\d+)\s+to\s+(?:Awe\/)?Horror Factor/gi
  for (const m of body.matchAll(hfFlatRe)) {
    addStat(out, 'hf', { flat: Number(m[1]) })
  }

  const raisedIncreasedRe =
    /((?:(?:P\.P\.E\.|P\.S\.|P\.P\.(?!E)|P\.E\.|P\.B\.|M\.A\.|M\.E\.|I\.Q\.)(?:\s*(?:,|and)\s*)?)+)\s+(?:is|are)\s+(?:raised|increased)\s+by\s+(\d+)/gi
  for (const m of body.matchAll(raisedIncreasedRe)) {
    for (const tokenMatch of m[1].matchAll(statTokenRe)) {
      const key = STAT_KEY_MAP[tokenMatch[1]]
      if (key) addStat(out, key, { flat: Number(m[2]) })
    }
  }

  const increaseStatRe =
    /Increase\s+((?:(?:P\.P\.E\.|P\.S\.|P\.P\.(?!E)|P\.E\.|P\.B\.|M\.A\.|M\.E\.|I\.Q\.)(?:\s*(?:,|and)\s*)?)+)\s+by\s+(\d+D\d+(?:x\d+)?(?:\+\d+)?|\d+)/gi
  for (const m of body.matchAll(increaseStatRe)) {
    const raw = m[2]
    const mod = /[dD]/.test(raw) ? { dice: raw.replace(/x/gi, 'x') } : { flat: Number(raw) }
    for (const tokenMatch of m[1].matchAll(statTokenRe)) {
      const key = STAT_KEY_MAP[tokenMatch[1]]
      if (key) addStat(out, key, mod)
    }
  }

  const increasePbRe = /increase P\.B\. by (\d+)/gi
  for (const m of body.matchAll(increasePbRe)) {
    addStat(out, 'pb', { flat: Number(m[1]) })
  }

  const sdcByRe = /S\.D\.C\. by (\d+D\d+(?:x\d+)?(?:\+\d+)?|\d+D\d+)/gi
  for (const m of body.matchAll(sdcByRe)) {
    addStat(out, 'sdc', { dice: m[1].replace(/x/gi, 'x') })
  }

  const hfOfRe = /(?:base\s+)?Horror Factor(?:\s+of|\s+is)?\s+(\d+)/gi
  for (const m of body.matchAll(hfOfRe)) {
    addStat(out, 'hf', { flat: Number(m[1]) })
  }

  const superPsHthRe = /\+(\d+D\d+)\s+damage to the usual Supernatural P\.S\./i
  const spm = body.match(superPsHthRe)
  if (spm) addStat(out, 'bonusHthDamage', { dice: spm[1] })

  const reducePsSpdRe = /Reduce\s+P\.S\.\s+and\s+Spd\s+by\s+(\d+)%/i
  const rps = body.match(reducePsSpdRe)
  if (rps) {
    addStat(out, 'ps', { percent: -Number(rps[1]) })
    addStat(out, 'spd', { percent: -Number(rps[1]) })
  }

  const reducePbPctRe = /Reduce\s+P\.B\.\s+by\s+(\d+)%/i
  const rpb = body.match(reducePbPctRe)
  if (rpb) addStat(out, 'pb', { percent: -Number(rpb[1]) })

  const allPercRe = /\+(\d+)\s+to\s+ALL\s+Perception Rolls/i
  const apm = body.match(allPercRe)
  if (apm) addStat(out, 'perception', { flat: Number(apm[1]) })

  const fireHthRe = /fire punches inflict\s+\+(\d+D\d+)\s+S\.D\.C\./i
  const fhm = body.match(fireHthRe)
  if (fhm) addStat(out, 'bonusHthDamage', { dice: fhm[1] })

  const spdPctRe = /(?:Reduce|reduces?)\s+Spd(?: attribute)?\s+by\s+(\d+)%/i
  const spdPctM = body.match(spdPctRe)
  if (spdPctM) addStat(out, 'spd', { percent: -Number(spdPctM[1]) })

  const hthRe = /([+-])(\d+D\d+|\d+)\s+to\s+damage in (?:hand to hand )?combat/i
  const hm = body.match(hthRe)
  if (hm) {
    const v = hm[2]
    addStat(out, 'bonusHthDamage', v.includes('D') ? { dice: `${hm[1] === '-' ? '-' : ''}${v}` } : { flat: Number(v) * (hm[1] === '-' ? -1 : 1) })
  }

  const hthFlatRe = /([+-])(\d+)\s+to\s+damage(?: in combat)?(?!\s+in)/i
  const hfm = body.match(hthFlatRe)
  if (hfm && !hm) addStat(out, 'bonusHthDamage', { flat: Number(hfm[2]) * (hfm[1] === '-' ? -1 : 1) })

  // If we captured both HP dice and the same trailing flat (e.g. +1D6+6), keep dice only.
  if (out.statModifiers?.hp?.dice && Number.isFinite(out.statModifiers?.hp?.flat)) {
    const m = String(out.statModifiers.hp.dice).match(/[+-](\d+)$/)
    if (m && Number(m[1]) === out.statModifiers.hp.flat) {
      delete out.statModifiers.hp.flat
      if (!Object.keys(out.statModifiers.hp).length) delete out.statModifiers.hp
    }
  }
}

function parseDamageAffinities(body, out) {
  if (!out.damageAffinities) out.damageAffinities = {}
  const da = out.damageAffinities
  const impervious = [...body.matchAll(/impervious to ([^.;,\n]+)/gi)]
  for (const m of impervious) {
    for (const part of m[1].split(/\s+and\s+|,\s*/)) {
      const p = part.trim().toLowerCase()
      if (p.includes('cold')) da.cold = 0
      if (p.includes('heat')) da.heat = 0
      if (p.includes('poison') || p.includes('toxin')) da.poison = 0
      if (p.includes('laser')) da.lasers = 0
      if (p.includes('light')) da.light = 0
    }
  }
  if (/half damage from (?:cold|heat)/i.test(body) || /resistant to (?:cold|heat)/i.test(body)) {
    if (/cold/i.test(body)) da.cold = da.cold ?? 0.5
    if (/heat/i.test(body)) da.heat = da.heat ?? 0.5
  }
  if (/half damage from (?:laser|light|energy)/i.test(body)) {
    if (/laser/i.test(body)) da.lasers = 0.5
    if (/light/i.test(body)) da.light = 0.5
    if (/energy/i.test(body)) da.energy = 0.5
  }
  if (/fire does double|fire inflicts double|double damage.*fire/i.test(body)) da.fire = 2
  if (/kinetic attacks?.{0,60}quarter/i.test(body)) da.kinetic = 0.25
  if (/blades?.{0,40}quarter|cut, stab, impale/i.test(body)) da.piercing = 0.25
  if (
    /kinetic attacks?.{0,60}half/i.test(body) ||
    /punches to bullets\) do half/i.test(body) ||
    /physical attacks directed at the character.*do half damage/i.test(body) ||
    /all physical attacks do half damage/i.test(body)
  ) {
    da.kinetic = da.kinetic ?? 0.5
  }
  if (/heat and fire attacks? do no damage/i.test(body)) {
    da.heat = 0
    da.fire = 0
  }
  if (/heat and fire do half damage/i.test(body)) {
    da.heat = da.heat ?? 0.5
    da.fire = da.fire ?? 0.5
  }
  if (/Cold attacks do double/i.test(body)) da.cold = 2
  if (/fire, water and electricity.*double/i.test(body)) {
    da.fire = 2
    da.water = 2
    da.electricity = 2
  }
  if (/cold-based attacks.*half damage/i.test(body)) da.cold = da.cold ?? 0.5
  if (/magic energy does double damage/i.test(body)) da.magicEnergy = 2
  if (Object.keys(da).length === 0) delete out.damageAffinities
}

function parseSaveModifiers(body, out) {
  const saveMap = [
    { re: /night\s*prince|nightlord/i, key: 'nightlordMagic' },
    { re: /\bmagic\b/i, key: 'magic' },
    { re: /\bpsionics?\b/i, key: 'psionics' },
    { re: /\binsanity\b/i, key: 'insanity' },
    { re: /\bpoison\b/i, key: 'poison' },
    { re: /\bgas\b/i, key: 'gas' },
    { re: /\bhorror factor\b/i, key: 'horrorFactor' },
    { re: /\bdisease\b/i, key: 'disease' },
    { re: /\bpossession\b/i, key: 'possession' },
    { re: /\billusions?\b/i, key: 'illusions' },
  ]
  const ensureSaves = () => {
    out.saveModifiers = out.saveModifiers ?? {}
    return out.saveModifiers
  }
  const addSave = (key, delta) => {
    if (!key || !Number.isFinite(delta)) return
    const saves = ensureSaves()
    saves[key] = (saves[key] ?? 0) + delta
  }
  const addImmunity = (token) => {
    const mapped = saveMap.find((row) => row.re.test(token))
    if (!mapped) return
    const saves = ensureSaves()
    const existing = new Set(saves.immunities ?? [])
    existing.add(mapped.key)
    saves.immunities = [...existing]
  }

  const gasRe = /([+-])(\d+)\s+to save vs gas/i
  const gm = body.match(gasRe)
  if (gm) {
    addSave('gas', Number(gm[2]) * (gm[1] === '-' ? -1 : 1))
  }
  const nauseaRe = /([+-])(\d+)\s+to save vs nausea/i
  const nm = body.match(nauseaRe)
  if (nm) {
    addSave('nauseaVomiting', Number(nm[2]) * (nm[1] === '-' ? -1 : 1))
  }

  const genericSaveRe =
    /([+-])(\d+)\s+to\s+save\s+vs\s+([^.;\n]+?)(?=(?:,\s*[+-]\d+\s+to\s+save\s+vs)|[.;\n]|$)/gi
  for (const m of body.matchAll(genericSaveRe)) {
    const delta = Number(m[2]) * (m[1] === '-' ? -1 : 1)
    const clause = String(m[3] ?? '')
    for (const part of clause.split(/\s*(?:,|\band\b)\s*/i)) {
      const text = part.trim()
      if (!text) continue
      if (/^[+-]?\d/i.test(text)) continue
      if (/\beffects?\b|\bduration\b|cast against|aura cannot be read/i.test(text)) continue
      // Prefer specific channel over general ones to avoid double-crediting.
      if (/night\s*prince|nightlord/i.test(text)) {
        addSave('nightlordMagic', delta)
        continue
      }
      const mapped = saveMap.find((row) => row.re.test(text))
      if (mapped) addSave(mapped.key, delta)
    }
  }

  const imperviousRe =
    /impervious to ([^.;\n]+?)(?=(?:,\s*[+-]\d+\s+to\s+save\s+vs)|[.;\n]|$)/gi
  for (const m of body.matchAll(imperviousRe)) {
    const clause = String(m[1] ?? '')
    for (const part of clause.split(/\s*(?:,|\band\b)\s*/i)) {
      const token = part.trim()
      if (!token) continue
      addImmunity(token)
    }
  }
}

function parseProgressionModifiers(body, out) {
  const ppePerLevelRe = /([+-])(\d+D\d+(?:x\d+)?(?:\+\d+)?|\d+)\s+P\.P\.E\.\s+per level/i
  const m = body.match(ppePerLevelRe)
  if (!m) return
  const sign = m[1] === '-' ? -1 : 1
  const raw = m[2].replace(/x/gi, 'x')
  out.progressionModifiers = out.progressionModifiers ?? {}
  if (/[dD]/.test(raw)) {
    out.progressionModifiers.ppePerLevel = {
      dice: `${sign < 0 ? '-' : ''}${raw}`,
    }
  } else {
    out.progressionModifiers.ppePerLevel = { flat: sign * Number(raw) }
  }
}

function parseMagicInteractionModifiers(body, out) {
  const halfIncomingMagic =
    /effects?\s+and\s+duration\s+of\s+magic\s+cast against (?:him|her|them|the character)\s+are\s+half/i
  if (halfIncomingMagic.test(body)) {
    out.magicInteractionModifiers = out.magicInteractionModifiers ?? {}
    out.magicInteractionModifiers.incomingMagic = {
      effectMultiplier: 0.5,
      durationMultiplier: 0.5,
    }
  }
}

function parseSkillModifiers(body, out) {
  const overrides = [
    ...parseTraitAndImpossibleSkillModifiers(body, findSkillId),
  ]
  const skillPctRe =
    /([+-])(\d+)%\s+to\s+(?:the\s+)?([^.;\n]+?)(?:\s+skills?)?(?=(?:,\s*(?:and\s+)?[+-]\d+%\s+to\s)|[.;\n]|$)/gi
  for (const m of body.matchAll(skillPctRe)) {
    const sign = m[1] === '-' ? -1 : 1
    const pct = sign * Number(m[2])
    const names = String(m[3])
      .replace(/\s+skills?$/i, '')
      .split(/\s*(?:,|\band\b)\s*/i)
      .map((n) => n.trim())
      .filter(Boolean)
    for (const rawName of names) {
      const name = rawName
        .replace(/[).,;:]+$/g, '')
        .replace(
          /^(?:skills?\s+(?:such as|like|used to|including)\s+|(?:any|all)\s+skills?\s+used\s+to\s+)/i,
          '',
        )
        .replace(/\s+in\s+morphus.*$/i, '')
        .replace(/^Undercover$/i, 'Undercover Ops')
      if (/manual dexterity/i.test(name)) {
        overrides.push({
          targetType: 'skill_trait',
          targetValue: SKILL_TRAIT_DEXTERITY,
          modifierPercent: pct,
        })
        continue
      }
      if (/^delicate skills$/i.test(name.trim())) {
        overrides.push({
          targetType: 'skill_trait',
          targetValue: SKILL_TRAIT_DEXTERITY,
          modifierPercent: pct,
        })
        continue
      }
      if (/light touch|soft touch|delicate touch|delicate work/i.test(name)) {
        overrides.push({
          targetType: 'skill_trait',
          targetValue: SKILL_TRAIT_LIGHT_TOUCH,
          modifierPercent: pct,
        })
        continue
      }
      if (/electronics|electrical repair|electrical/i.test(name)) {
        overrides.push({
          targetType: 'skill_trait',
          targetValue: SKILL_TRAIT_ELECTRICAL,
          modifierPercent: pct,
        })
        continue
      }
      if (/mechanics|mechanical repair|mechanical/i.test(name)) {
        overrides.push({
          targetType: 'skill_trait',
          targetValue: SKILL_TRAIT_MECHANICS,
          modifierPercent: pct,
        })
        continue
      }
      if (/\brepair\b/i.test(name)) {
        overrides.push({
          targetType: 'skill_trait',
          targetValue: SKILL_TRAIT_REPAIR,
          modifierPercent: pct,
        })
        continue
      }
      if (/timing/i.test(name)) {
        overrides.push({
          targetType: 'skill_trait',
          targetValue: SKILL_TRAIT_TIMING,
          modifierPercent: pct,
        })
        continue
      }
      if (/focus|concentration/i.test(name)) {
        overrides.push({
          targetType: 'skill_trait',
          targetValue: SKILL_TRAIT_FOCUS,
          modifierPercent: pct,
        })
        continue
      }
      if (/fingers/i.test(name)) {
        overrides.push({
          targetType: 'skill_trait',
          targetValue: SKILL_TRAIT_LIGHT_TOUCH,
          modifierPercent: pct,
        })
        continue
      }
      if (/Physical skills/i.test(name)) {
        overrides.push({
          targetType: 'category',
          targetValue: 'physical',
          modifierPercent: pct,
        })
        continue
      }
      if (/Concealment/i.test(name)) {
        const id = findSkillId('Concealment')
        if (id) overrides.push({ targetType: 'skill_id', targetValue: id, modifierPercent: pct })
        continue
      }
      const id = findSkillId(name)
      if (id) overrides.push({ targetType: 'skill_id', targetValue: id, modifierPercent: pct })
    }
  }
  const grantRe = /(?:base skill of|grantUnlearnedValue|gets the .+ skill at) (\d+)%/i
  const grantM = body.match(
    /\+(\d+)%\s+(?:to\s+)?(?:the\s+)?Disguise|Disguise skill as[^.]+?(\d+)%/i,
  )
  if (grantM) {
    const id = findSkillId('Disguise')
    if (id) {
      overrides.push({
        targetType: 'skill_id',
        targetValue: id,
        modifierPercent: 15,
        grantUnlearnedValue: 40,
      })
    }
  }
  if (overrides.length) {
    out.skillModifiers = { specificSkillOverrides: dedupeOverrides(overrides) }
  }
  const extended = parseExtendedSkillModifierProse(body, findSkillId)
  if (extended.globalSkillModifier != null) {
    out.skillModifiers = out.skillModifiers ?? {}
    out.skillModifiers.globalSkillModifier = extended.globalSkillModifier
  }
  if (extended.specificSkillOverrides.length) {
    out.skillModifiers = out.skillModifiers ?? { specificSkillOverrides: [] }
    out.skillModifiers.specificSkillOverrides = dedupeOverrides([
      ...(out.skillModifiers.specificSkillOverrides ?? []),
      ...extended.specificSkillOverrides,
    ])
  }
}

function dedupeOverrides(list) {
  const seen = new Map()
  for (const o of list) {
    const k = `${o.targetType}:${o.targetValue}`
    seen.set(k, { ...seen.get(k), ...o })
  }
  return [...seen.values()]
}

function parseMobility(body, out) {
  const mob = {}
  if (/cannot swim|sinks like a rock/i.test(body)) {
    mob.aquaticTraits = { buoyancy: 'sink' }
  } else if (/floats on water/i.test(body)) {
    mob.aquaticTraits = { buoyancy: 'float' }
  }
  const swimRe = /\+(\d+)%\s+to\s+(?:the\s+)?Swim(?:ming)? skill/i
  const sm = body.match(swimRe)
  if (sm) {
    const id = findSkillId('Swimming')
    if (!out.skillModifiers) out.skillModifiers = { specificSkillOverrides: [] }
    out.skillModifiers.specificSkillOverrides.push({
      targetType: 'skill_id',
      targetValue: id ?? 'skill_swimming',
      modifierPercent: Number(sm[1]),
    })
    out.skillModifiers.specificSkillOverrides = dedupeOverrides(
      out.skillModifiers.specificSkillOverrides,
    )
  }
  const balanceRe = /([+-])(\d+)%\s+to\s+sense of balance/i
  const bm = body.match(balanceRe)
  if (bm) mob.balanceModifierPercent = Number(bm[2]) * (bm[1] === '-' ? -1 : 1)
  const balanceOnRe = /([+-])(\d+)%\s+on balance/i
  const bom = body.match(balanceOnRe)
  if (bom) mob.balanceModifierPercent = Number(bom[2]) * (bom[1] === '-' ? -1 : 1)
  const reachRe = /(\d+)%\s+longer than usual/i
  const rm = body.match(reachRe)
  if (rm) mob.reachPercentBonus = Number(rm[1])
  if (/jump twice/i.test(body)) {
    mob.jumpMultiplier = 2
    const minM = body.match(/(\d+)\s+feet\/\d/i)
    if (minM) mob.minimumJumpFeet = Number(minM[1])
  }
  const waterlogM = body.match(/(\d+D\d+\+\d+|\d+D\d+)\s+minutes/i)
  if (/waterlogged|sinks \(takes/i.test(body) && waterlogM) {
    mob.waterlogMinutesDice = waterlogM[1].replace(/x/gi, 'x')
  }
  if (Object.keys(mob).length) out.mobility = { ...(out.mobility ?? {}), ...mob }
}

function parseSensory(body, out) {
  const sen = {}
  if (/Nightvision\s*\((\d{1,3}(?:,\d{3})?)\s+feet/i.test(body)) {
    const nv = body.match(/Nightvision\s*\((\d{1,3}(?:,\d{3})?)\s+feet/i)
    if (nv) sen.nightvisionRangeFlatBonus = Number(nv[1].replace(/,/g, ''))
  }
  if (/perfect.*vision|20\/20 vision/i.test(body)) sen.sharpVision = true
  if (/(\d+)\s+degrees/i.test(body) && /peripheral/i.test(body)) {
    const pm = body.match(/(\d+)\s+degrees/i)
    if (pm) sen.peripheralVisionDegrees = Number(pm[1])
  }
  if (/does not register on heat sensors/i.test(body)) sen.invisibleToThermalImaging = true
  if (/hide\/Prowl underwater|Prowl underwater/i.test(body)) {
    const um = body.match(/\+(\d+)%\s+to hide\/Prowl underwater/i)
    if (um) sen.prowlUnderwaterModifierPercent = Number(um[1])
  }
  if (/light sensitive|bright lights hurt/i.test(body)) {
    sen.lightSensitivity = {
      daylightVisionMultiplier: 0.5,
      perceptionVisionPenalty: -2,
    }
  }
  if (/track by scent:\s*(\d+)%\s*\+(\d+)% per level/i.test(body)) {
    const tm = body.match(/track by scent:\s*(\d+)%\s*\+(\d+)% per level/i)
    sen.scentTracking = {
      enabled: true,
      baseSuccessPercent: Number(tm[1]),
      perLevelIncrement: Number(tm[2]),
    }
    sen.perceptionSpecialties = { ...(sen.perceptionSpecialties ?? {}), smell: 2 }
  }
  const trackIsRe = /Track by Scent is\s*(\d+)%\s*\+(\d+)% per level/i
  const tim = body.match(trackIsRe)
  if (tim) {
    sen.scentTracking = {
      enabled: true,
      baseSuccessPercent: Number(tim[1]),
      perLevelIncrement: Number(tim[2]),
    }
  }
  const recScentRe = /recognize scent is (\d+)%\s*\+(\d+)% per level/i
  const rsm = body.match(recScentRe)
  if (rsm) {
    sen.scentTracking = {
      ...(sen.scentTracking ?? { enabled: true }),
      recognizeScentBasePercent: Number(rsm[1]),
      recognizeScentPerLevel: Number(rsm[2]),
    }
  }
  const specScentRe = /recognize specific scent[^.]*is (\d+)%\s*\+(\d+)% per level/i
  const ssm = body.match(specScentRe)
  if (ssm) {
    sen.scentTracking = {
      ...(sen.scentTracking ?? { enabled: true }),
      recognizeSpecificScentBasePercent: Number(ssm[1]),
      recognizeSpecificScentPerLevel: Number(ssm[2]),
    }
  }
  if (/\(\+30% for common scents\)/i.test(body)) {
    sen.scentTracking = {
      ...(sen.scentTracking ?? { enabled: true }),
      recognizeCommonScentBonusPercent: 30,
    }
  }
  if (/hawk-like day vision/i.test(body)) sen.hawkLikeDayVision = true
  if (/whisper at (\d+)\s+feet/i.test(body)) {
    const wm = body.match(/whisper at (\d+)\s+feet/i)
    if (wm) sen.whisperHearingRangeFeet = Number(wm[1])
  }
  if (/(\d+)%\s+invisible in darkness/i.test(body)) {
    const dm = body.match(/(\d+)%\s+invisible in darkness/i)
    if (dm) sen.darknessInvisibilityPercent = Number(dm[1])
  }
  if (/Day vision is half normal/i.test(body)) {
    sen.lightSensitivity = {
      ...(sen.lightSensitivity ?? {}),
      daylightVisionMultiplier: 0.5,
    }
  }
  const tasteRe = /discern specific substances by taste[^.]*at (\d+)%\s*\+(\d+)% per level/i
  const ttm = body.match(tasteRe)
  if (ttm) {
    sen.tasteIdentification = {
      baseSuccessPercent: Number(ttm[1]),
      perLevelIncrement: Number(ttm[2]),
    }
  }
  if (/cannot track by scent/i.test(body)) {
    sen.scentTracking = { enabled: false, identifyOdorsModifierPercent: -10 }
  }
  if (/\+(\d+)\s+to Perception Rolls dealing with (sound|scents|vision)/i.test(body)) {
    const pm = body.match(/\+(\d+)\s+to Perception Rolls dealing with (sound|scents|vision)/i)
    if (pm) {
      const spec = pm[2] === 'sound' ? 'sound' : pm[2] === 'scents' ? 'smell' : 'vision'
      sen.perceptionSpecialties = { ...(sen.perceptionSpecialties ?? {}), [spec]: Number(pm[1]) }
    }
  }
  if (Object.keys(sen).length) out.sensory = { ...(out.sensory ?? {}), ...sen }
}

function parseCapabilityFields(body, out, entryName) {
  if (/Mirror Walk at will/i.test(body)) {
    out.atWillAbilities = [
      {
        id: 'mirror_walk',
        label: 'Mirror Walk',
        note: 'At will (core Nightbane rules).',
      },
    ]
  }
  if (/stand motionless|among store mannequins/i.test(body)) {
    out.appearanceConstraints = {
      ...(out.appearanceConstraints ?? {}),
      standMotionlessIndefinitely: /stand motionless/i.test(body),
      hideAmongContext: /mannequins/i.test(body) ? 'store mannequins' : undefined,
    }
    if (/stand motionless/i.test(body)) {
      out.atWillAbilities = [
        ...(out.atWillAbilities ?? []),
        { id: 'stand_motionless', label: 'Stand motionless', note: 'Indefinitely' },
      ]
    }
  }
  if (/tight clothing|oversized|custom(-made)? clothing|custom shoes/i.test(body)) {
    out.appearanceConstraints = {
      ...(out.appearanceConstraints ?? {}),
      clothingFit: /oversized/i.test(body)
        ? 'oversized_required'
        : /custom/i.test(body)
          ? 'custom_required'
          : /loose/i.test(body)
            ? 'loose_required'
            : 'baggy_appearance',
      customFootwearRequired: /custom shoes/i.test(body) || undefined,
      narrowOpeningAccess: /narrow openings|tight spaces/i.test(body)
        ? /trouble fitting|impossible/i.test(body)
          ? 'restricted'
          : /easily fit|fits through small/i.test(body)
            ? 'enhanced'
            : undefined
        : undefined,
    }
  }
  if (/opponents are -(\d+) to strike.*bright light/i.test(body)) {
    const m = body.match(/-(\d+) to strike, parry, and dodge/i)
    out.combatContextModifiers = [
      {
        condition: 'bright_light',
        target: 'opponent',
        strike: m ? -Number(m[1]) : -5,
        parry: m ? -Number(m[1]) : -5,
        dodge: m ? -Number(m[1]) : -5,
      },
    ]
  }
  if (/surprise attacks from behind/i.test(body)) {
    out.combatContextModifiers = [
      ...(out.combatContextModifiers ?? []),
      { condition: 'surprise_from_behind_or_side', target: 'opponent', strike: 2 },
    ]
  }
  if (/hold onto rope with teeth/i.test(body)) {
    out.combatContextModifiers = [
      ...(out.combatContextModifiers ?? []),
      {
        condition: 'grappling',
        grapplingAffordance: 'rope_grip_with_teeth',
      },
    ]
  }
  if (/reforms? in \d+D\d+ minutes/i.test(body)) {
    const rm = body.match(/reforms? in (\d+D\d+(?:\+\d+)?) minutes/i)
    out.recoveryBehaviors = [
      ...(out.recoveryBehaviors ?? []),
      {
        trigger: /explosion|globs/i.test(body) ? 'large_explosion' : 'destruction',
        reformMinutesDice: rm?.[1],
        residualSdcPercent: /half S\.D\.C/i.test(body) ? 50 : undefined,
        lockoutHoursDice: body.match(/(\d+D\d+\+\d+) hours/i)?.[1],
        globCountDice: body.match(/(\d+D\d+x\d+|\d+D\d+) clay globs/i)?.[1],
      },
    ]
  }
  if (/melts the Nightbane|wet clay until dried/i.test(body)) {
    out.recoveryBehaviors = [
      ...(out.recoveryBehaviors ?? []),
      {
        trigger: 'submersion',
        dryHoursDice: body.match(/(\d+D\d+) hours/i)?.[1],
        gardenHoseDamage: '1D4',
        fireHoseDamage: '2D6',
      },
    ]
  }
  if (/waterlogged.*sinks/i.test(body)) {
    out.recoveryBehaviors = [
      ...(out.recoveryBehaviors ?? []),
      { trigger: 'waterlog', note: 'Floats until waterlogged, then sinks' },
    ]
  }
  if (/freezing temperature|Cold-based attacks/i.test(body) && /Spd by half/i.test(body)) {
    out.conditionalPenalties = [
      { trigger: 'cold_attack', apmMultiplier: 0.5, spdMultiplier: 0.5 },
      { trigger: 'freezing_temperature', apmMultiplier: 0.5, spdMultiplier: 0.5 },
    ]
  }
  if (/similar size and weight|cannot impersonate specific/i.test(body)) {
    out.disguiseLimits = {
      similarSizeWeightOnly: /similar size/i.test(body),
      cannotImpersonateIndividuals: /cannot impersonate specific/i.test(body),
      skinColorRequiresMakeup: /makeup|face paint/i.test(body),
    }
  }
  if (/Roll on the .+ Table/i.test(body)) {
    const tm = body.match(/Roll on the ([^(\n]+?) Table/i)
    out.crossTableRoll = {
      targetTableId: tm?.[1].toLowerCase().includes('animal') ? 'animal' : slugTableId(tm?.[1]),
      targetTableName: tm ? `${tm[1].trim()} Table` : undefined,
      note: /half S\.D\.C/i.test(body) ? 'Halve S.D.C., Spd, and bonuses from that result.' : undefined,
    }
  }
  if (/Teddy Bear|player can elect/i.test(body)) {
    out.playerChoices = [
      {
        label: 'Animal form',
        options: ['Roll on Animal Form table', 'Classic giant Teddy Bear'],
        timing: 'character_creation',
      },
    ]
  }
  if (/sickle|machete|scythe/i.test(body) && /Scarecrow/i.test(entryName)) {
    out.playerChoices = [
      {
        label: 'Scarecrow weapon',
        options: ['Sickle/machete (2D6)', 'Scythe (3D6)'],
        timing: 'character_creation',
      },
    ]
    out.livingWeaponRules = {
      sdcPerLevel: 5,
      onlyDamagedWhenTargeted: true,
      vanishesWhenBothZero: true,
      preferredWeapon: true,
      hardToConceal: true,
    }
  }
  if (/Roll twice|two disproportions/i.test(body)) {
    out.tableWorkflow = { stepOneRollCount: 2, excludeSelfFromReroll: true }
  }
  if (/parry bladed weapons.*bare hands/i.test(body)) {
    out.specialCombatInterceptions = [
      ...(out.specialCombatInterceptions ?? []),
      { interceptAction: 'bare_handed_melee_parry', modifierFlat: 0 },
    ]
  }
  if (/80% invisible in darkness/i.test(body)) {
    out.sensory = {
      ...(out.sensory ?? {}),
      darknessInvisibilityPercent: 80,
    }
  }
  if (/\+20% to Prowl.*low-light|low-light environments/i.test(body)) {
    out.skillContextModifiers = [
      ...(out.skillContextModifiers ?? []),
      {
        skillId: 'skill_prowl',
        modifierPercent: 20,
        context: 'darkness',
      },
    ]
    const baseProwl = body.match(/or base of (\d+)%/i)
    if (baseProwl) {
      out.skillModifiers = out.skillModifiers ?? { specificSkillOverrides: [] }
      out.skillModifiers.specificSkillOverrides.push({
        targetType: 'skill_id',
        targetValue: 'skill_prowl',
        modifierPercent: 20,
        grantUnlearnedValue: Number(baseProwl[1]),
      })
      out.skillModifiers.specificSkillOverrides = dedupeOverrides(
        out.skillModifiers.specificSkillOverrides,
      )
    }
  }
  if (/-20% in bright lighting/i.test(body)) {
    out.skillContextModifiers = [
      ...(out.skillContextModifiers ?? []),
      { skillId: 'skill_prowl', modifierPercent: -20, context: 'bright_light' },
    ]
  }
  if (/Escape Artist skill \(or a base of (\d+)%\)/i.test(body)) {
    const em = body.match(/Escape Artist skill \(or a base of (\d+)%\)/i)
    const id = findSkillId('Escape Artist')
    if (id && em) {
      out.skillModifiers = out.skillModifiers ?? { specificSkillOverrides: [] }
      out.skillModifiers.specificSkillOverrides.push({
        targetType: 'skill_id',
        targetValue: id,
        modifierPercent: 20,
        grantUnlearnedValue: Number(em[1]),
      })
      out.skillModifiers.specificSkillOverrides = dedupeOverrides(
        out.skillModifiers.specificSkillOverrides,
      )
    }
  }
  if (/A\.R\.\s+of\s+(\d+).*against grapples/i.test(body)) {
    out.combatContextModifiers = [
      ...(out.combatContextModifiers ?? []),
      {
        condition: 'grapple_defense',
        target: 'self',
        naturalArFlat: Number(body.match(/A\.R\.\s+of\s+(\d+)/i)?.[1] ?? 10),
        note: 'Add dodge bonuses against grapples and holds.',
      },
    ]
  }
  if (/take (\d+D\d+) damage every round they are touching/i.test(body)) {
    const cm = body.match(/take (\d+D\d+) damage every round they are touching/i)
    out.combatContextModifiers = [
      ...(out.combatContextModifiers ?? []),
      {
        condition: 'physical_contact',
        target: 'opponent',
        damagePerRound: cm?.[1] ?? '1D4',
      },
    ]
  }
  if (/enemies are \+(\d+)% to Track/i.test(body)) {
    const tm = body.match(/enemies are \+(\d+)% to Track/i)
    out.combatContextModifiers = [
      ...(out.combatContextModifiers ?? []),
      {
        condition: 'physical_contact',
        target: 'opponent',
        opponentTrackingBonusPercent: Number(tm?.[1] ?? 20),
        note: 'Opponents gain bonus to Track or Tail this character.',
      },
    ]
  }
  if (/save vs Horror Factor or they will be so disgusted/i.test(body)) {
    out.combatContextModifiers = [
      ...(out.combatContextModifiers ?? []),
      {
        condition: 'physical_contact',
        target: 'opponent',
        note: 'Touching character requires save vs Horror Factor or refuse further contact.',
      },
    ]
  }
  if (/blind all who look at him.*\(1-60% chance\)/i.test(body)) {
    out.combatContextModifiers = [
      ...(out.combatContextModifiers ?? []),
      {
        condition: 'bright_light',
        target: 'opponent',
        blindChancePercent: 60,
        note: 'Reflected light may blind onlookers in bright light.',
      },
    ]
  }
  if (/adds 3 to Horror Factor when all of them are screaming/i.test(body)) {
    out.combatContextModifiers = [
      ...(out.combatContextModifiers ?? []),
      {
        condition: 'grappling',
        target: 'self',
        horrorFactorFlat: 3,
        note: 'Hellish chorus when all tiny mouths scream.',
      },
    ]
  }
  if (/controlled directly by the character \(50-50 chance/i.test(body)) {
    out.playerChoices = [
      {
        label: 'Living tattoo control',
        options: ['Emotion-reactive (no control)', 'Player-controlled'],
        timing: 'character_creation',
      },
    ]
  }
  if (/two or more heads resting on his shoulders \(01-75%/i.test(body)) {
    out.variantPercentiles = [
      { roll: '01-75%', label: 'Two heads', description: 'Two heads on shoulders.' },
      { roll: '76-98%', label: 'Three heads', description: 'Three heads on shoulders.' },
      { roll: '99-00%', label: 'Four heads', description: 'Four heads on shoulders.' },
    ]
  }
  if (/Increase body size and weight by (\d+)%/i.test(body)) {
    const wm = body.match(/Increase body size and weight by (\d+)%/i)
    if (wm) out.weightModifier = { percent: Number(wm[1]) }
  }
  if (/stands (\d+D\d+\+\d+) feet/i.test(body)) {
    const hm = body.match(/stands (\d+D\d+\+\d+) feet/i)
    if (hm) out.heightModifier = { dice: hm[1].replace(/\+/g, '+') }
  }
}

function slugTableId(name) {
  if (!name) return 'unknown'
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function parseNaturalAr(body, out) {
  const m = body.match(/Natural\s+A\.R\.\s*(?:of\s+)?(\d+)/i)
  if (m) out.naturalAr = Number(m[1])
  const grappleAr = body.match(/A\.R\.\s+of\s+(\d+)\s*\+\s*dodge bonuses against grapples/i)
  if (grappleAr && !out.naturalAr) out.naturalAr = Number(grappleAr[1])
}

function parseNaturalWeapons(body, out) {
  const weapons = []
  const biteRe = /\+(\d+D\d+|\d+)\s+damage (?:with|to) bite/i
  const bm = body.match(biteRe)
  if (bm) {
    weapons.push({
      limbType: 'bite',
      label: 'Bite',
      damageFormula: bm[1].includes('D') ? bm[1] : '1D4',
      isAdditiveToHth: true,
      ...(body.match(/half.*bite/i) ? { damageModifier: { percent: -50 } } : {}),
    })
  }
  const biteDoRe = /bite attacks? do (\d+D\d+)/i
  const bdm = body.match(biteDoRe)
  if (bdm && !bm) {
    weapons.push({
      limbType: 'bite',
      label: 'Bite',
      damageFormula: bdm[1],
      isAdditiveToHth: true,
    })
  }
  const clawDoRe = /claw attacks? do (\d+D\d+)/i
  const cdm = body.match(clawDoRe)
  if (cdm) {
    weapons.push({
      limbType: 'claws',
      label: 'Claws',
      damageFormula: cdm[1],
      isAdditiveToHth: true,
    })
  }
  const slashRe = /crystals that slash, doing (\d+D\d+) plus punch damage/i
  const sm = body.match(slashRe)
  if (sm) {
    weapons.push({
      limbType: 'claws',
      label: 'Crystal slash',
      damageFormula: sm[1],
      isAdditiveToHth: true,
    })
  }
  const brassRe = /brass knuckles adding (\d+D\d+) to punch damage/i
  const brm = body.match(brassRe)
  if (brm) {
    weapons.push({
      limbType: 'claws',
      label: 'Crystal knuckles',
      damageFormula: brm[1],
      isAdditiveToHth: true,
    })
  }
  const grappleBiteRe = /inflicts (\d+D\d+) damage per mouth/i
  const gbm = body.match(grappleBiteRe)
  if (gbm) {
    weapons.push({
      limbType: 'bite',
      label: 'Tiny mouths (grapple)',
      damageFormula: gbm[1],
      isAdditiveToHth: false,
    })
  }
  const kickBonusRe = /\+(\d+)\s+kick and stomp damage/i
  const km = body.match(kickBonusRe)
  if (km) {
    for (const limb of ['kick', 'stomp']) {
      weapons.push({
        limbType: limb,
        label: `Natural ${limb}`,
        damageFormula: '1D8',
        isAdditiveToHth: true,
        damageModifier: { flat: Number(km[1]) },
      })
    }
  }
  if (weapons.length) out.naturalWeapons = weapons
}

function parseWeightHeight(body, out) {
  if (/Double the character's weight|Double normal body weight/i.test(body)) {
    out.weightModifier = { percent: 100 }
  }
  if (/Reduce weight by (\d+)%/i.test(body)) {
    const wm = body.match(/Reduce weight by (\d+)%/i)
    if (wm) out.weightModifier = { percent: -Number(wm[1]) }
  }
  if (/increase height (\d+D\d+)|Increase length\/height by (\d+)%/i.test(body)) {
    const dm = body.match(/increase height (\d+D\d+)/i)
    if (dm) out.heightModifier = { dice: dm[1] }
    const pm = body.match(/height by (\d+)%/i)
    if (pm) out.heightModifier = { percent: Number(pm[1]) }
  }
}

function detectEntryRole(_name, _body) {
  return undefined
}

function collectLeftoverNotes(body, structured) {
  const notes = []
  if (/roll at creation/i.test(body) && !notes.some((n) => n.includes('creation'))) {
    if (/P\.B\.|M\.A\.|Spd/i.test(body) && /1D4/i.test(body)) {
      notes.push('Roll 1D4 penalties at creation where book specifies dice (see description).')
    }
  }
  if (/unless mostly wood variant/i.test(body)) {
    notes.push('Unless mostly wood Junk Golem variant, cannot swim.')
  }
  if (/weight penalty: double/i.test(body)) {
    notes.push('Weight: double (01–50%) or triple (51–00%) per inner Junk Golem roll.')
  }
  if (structured.crossTableRoll && /Teddy Bear/i.test(body)) {
    /* player choice covers */
  }
  return notes.length ? notes : undefined
}

/**
 * @param {string} body - trait block text from authoritative extract
 * @param {{ entryName?: string }} [options]
 */
export function structureFromTraitBody(body, options = {}) {
  const out = {}
  const entryName = options.entryName ?? ''
  const prose = stripMindControlFromMorphusProse(body)
  parseStatModifiers(prose, out)
  parseProgressionModifiers(prose, out)
  parseDamageAffinities(prose, out)
  parseMagicInteractionModifiers(prose, out)
  parseSaveModifiers(prose, out)
  parseSkillModifiers(prose, out)
  parseMobility(prose, out)
  parseSensory(prose, out)
  parseCapabilityFields(prose, out, entryName)
  parseNaturalAr(prose, out)
  parseNaturalWeapons(prose, out)
  parseWeightHeight(prose, out)
  const role = detectEntryRole(entryName, prose)
  if (role) out.entryRole = role
  const leftovers = collectLeftoverNotes(prose, out)
  if (leftovers) out.customOneOffs = leftovers
  return out
}

function isEmptyObject(o) {
  return !o || (typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === 0)
}

function mergeDeep(target, source, { fillOnly }) {
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue
    if (fillOnly && target[key] != null) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        target[key] = mergeDeep(
          typeof target[key] === 'object' ? { ...target[key] } : {},
          value,
          { fillOnly },
        )
      }
      continue
    }
    if (Array.isArray(value)) {
      if (!fillOnly || !target[key]?.length) target[key] = value
      continue
    }
    if (typeof value === 'object' && value !== null) {
      // In force mode we want parser output to be authoritative for each object key.
      const base =
        fillOnly && typeof target[key] === 'object' && target[key]
          ? { ...target[key] }
          : {}
      target[key] = mergeDeep(base, value, { fillOnly })
      continue
    }
    target[key] = value
  }
  return target
}

/**
 * Apply structured parse onto a catalog entry; set description from book body when TODO.
 */
export function enrichMorphusEntry(entry, body, options = {}) {
  const { fillOnly = true, descriptionText } = options
  const cleanedBody = stripMindControlFromMorphusProse(body)
  const structured = structureFromTraitBody(cleanedBody, { entryName: entry.name })
  mergeDeep(entry, structured, { fillOnly })
  if (
    descriptionText &&
    (!fillOnly ||
      !entry.description ||
      /TODO: transcribe/i.test(entry.description) ||
      entry.description.length < 120)
  ) {
    entry.description = stripMindControlFromMorphusProse(descriptionText).trim()
  }
  sanitizeMorphusEntryForNightbane(entry)
  if (structured.customOneOffs?.length && !fillOnly) {
    entry.customOneOffs = structured.customOneOffs
  } else if (structured.customOneOffs?.length && !entry.customOneOffs?.length) {
    entry.customOneOffs = structured.customOneOffs
  }
  if (isEmptyObject(entry.morphusRules)) delete entry.morphusRules
  return entry
}

export function matchBlockForEntry(blocks, entry) {
  const want = normTraitNameForMatch(entry.name)
  return blocks.find((b) => normTraitNameForMatch(b.name) === want)
}
