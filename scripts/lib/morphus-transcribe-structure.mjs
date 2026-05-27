/**
 * Parse authoritative Morphus trait prose into structured schema fields.
 * Used during ingest (structure-entries) to minimize customOneOffs / description-only rows.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isPlayableMorphusTrait } from './morphus-trait-filter.mjs'
import { repoRoot } from './morphus-ingest-shared.mjs'

const TRAIT_HEADER = /(\d{2})-(\d{2})%\s+(.{1,120}?)[!:.]\s+/g

const STAT_KEY_MAP = {
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
  skillsByName.set('wardrobe grooming', 'skill_wardrobe_and_grooming')
  skillsByName.set('wardrobe and grooming', 'skill_wardrobe_and_grooming')
  skillsByName.set('escape artist', 'skill_escape_artist')
  return skillsByName
}

function normalizeSkillName(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function splitTraitBlocks(tableText) {
  const headers = [...tableText.matchAll(TRAIT_HEADER)]
  if (!headers.length) return []
  const blocks = []
  for (let i = 0; i < headers.length; i++) {
    const m = headers[i]
    const start = m.index
    const end = i + 1 < headers.length ? headers[i + 1].index : tableText.length
    const name = m[3].trim().replace(/[!.:]+\s*$/, '')
    const body = tableText.slice(start, end)
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
  const flatRe =
    /([+-])(\d+)\s+to\s+(?:the\s+)?(P\.S\.|P\.P\.|P\.E\.|P\.B\.|M\.A\.|M\.E\.|I\.Q\.|Spd|Horror Factor|Perception Rolls|initiative|strike|parry|dodge|entangle|disarm|pull punch|roll with impact)/gi
  for (const m of body.matchAll(flatRe)) {
    const sign = m[1] === '-' ? -1 : 1
    const key = STAT_KEY_MAP[m[3]] ?? null
    if (key) addStat(out, key, { flat: sign * Number(m[2]) })
  }

  const diceAttrRe =
    /([+-])(\d+D\d+(?:x\d+)?(?:\+\d+)?)\s+to\s+(?:the\s+)?(P\.S\.|P\.P\.|P\.E\.|P\.B\.|M\.A\.|M\.E\.|I\.Q\.)/gi
  for (const m of body.matchAll(diceAttrRe)) {
    const key = STAT_KEY_MAP[m[3]]
    if (key) addStat(out, key, { dice: `${m[1] === '-' ? '-' : ''}${m[2].replace(/x/gi, 'x')}` })
  }

  const sdcRe = /([+-])(\d+D\d+(?:x\d+)?(?:\+\d+)?|\d+D\d+)\s+(?:to\s+)?S\.D\.C\./gi
  for (const m of body.matchAll(sdcRe)) {
    addStat(out, 'sdc', { dice: `${m[1] === '-' ? '-' : ''}${m[2].replace(/x/gi, 'x')}` })
  }

  const spdPctRe = /(?:Reduce|reduces?)\s+Spd(?: attribute)?\s+by\s+(\d+)%/i
  const spm = body.match(spdPctRe)
  if (spm) addStat(out, 'spd', { percent: -Number(spm[1]) })

  const hthRe = /([+-])(\d+D\d+|\d+)\s+to\s+damage in (?:hand to hand )?combat/i
  const hm = body.match(hthRe)
  if (hm) {
    const v = hm[2]
    addStat(out, 'bonusHthDamage', v.includes('D') ? { dice: `${hm[1] === '-' ? '-' : ''}${v}` } : { flat: Number(v) * (hm[1] === '-' ? -1 : 1) })
  }

  const hthFlatRe = /([+-])(\d+)\s+to\s+damage(?: in combat)?(?!\s+in)/i
  const hfm = body.match(hthFlatRe)
  if (hfm && !hm) addStat(out, 'bonusHthDamage', { flat: Number(hfm[2]) * (hfm[1] === '-' ? -1 : 1) })
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
  if (/kinetic attacks?.{0,60}half/i.test(body) || /punches to bullets\) do half/i.test(body)) {
    da.kinetic = da.kinetic ?? 0.5
  }
  if (/fire, water and electricity.*double/i.test(body)) {
    da.fire = 2
    da.water = 2
    da.electricity = 2
  }
  if (/cold-based attacks.*half damage/i.test(body)) da.cold = da.cold ?? 0.5
  if (Object.keys(da).length === 0) delete out.damageAffinities
}

function parseSaveModifiers(body, out) {
  const gasRe = /([+-])(\d+)\s+to save vs gas/i
  const gm = body.match(gasRe)
  if (gm) {
    out.saveModifiers = out.saveModifiers ?? {}
    out.saveModifiers.gas = Number(gm[2]) * (gm[1] === '-' ? -1 : 1)
  }
  const nauseaRe = /([+-])(\d+)\s+to save vs nausea/i
  const nm = body.match(nauseaRe)
  if (nm) {
    out.saveModifiers = out.saveModifiers ?? {}
    out.saveModifiers.nauseaVomiting = Number(nm[2]) * (nm[1] === '-' ? -1 : 1)
  }
}

function parseSkillModifiers(body, out) {
  const overrides = []
  const skillPctRe = /([+-])(\d+)%\s+to\s+(?:the\s+)?([A-Za-z][A-Za-z &/]+?)(?:\s+skill)?(?:\s+and\s+([A-Za-z][A-Za-z &/]+?)(?:\s+skill)?)?/gi
  for (const m of body.matchAll(skillPctRe)) {
    const sign = m[1] === '-' ? -1 : 1
    const pct = sign * Number(m[2])
    const names = [m[3], m[4]].filter(Boolean)
    for (const name of names) {
      if (/delicate touch|manual dexterity|fingers/i.test(name)) {
        overrides.push({
          targetType: 'skill_trait',
          targetValue: 'requires_light_touch',
          modifierPercent: pct,
        })
        continue
      }
      if (/Physical skills/i.test(name)) continue
      const id = findSkillId(name)
      if (id) overrides.push({ targetType: 'skill_id', targetValue: id, modifierPercent: pct })
    }
  }
  const grantRe = /(?:base skill of|grantUnlearnedValue|gets the .+ skill at) (\d+)%/i
  const grantM = body.match(/\+(\d+)%.*Disguise|Disguise skill as[^.]+(\d+)%/i)
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
    sen.perceptionSpecialties = { smell: 2 }
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
}

function slugTableId(name) {
  if (!name) return 'unknown'
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
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
  parseStatModifiers(body, out)
  parseDamageAffinities(body, out)
  parseSaveModifiers(body, out)
  parseSkillModifiers(body, out)
  parseMobility(body, out)
  parseSensory(body, out)
  parseCapabilityFields(body, out, entryName)
  parseNaturalWeapons(body, out)
  parseWeightHeight(body, out)
  const role = detectEntryRole(entryName, body)
  if (role) out.entryRole = role
  const leftovers = collectLeftoverNotes(body, out)
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
      target[key] = mergeDeep(
        typeof target[key] === 'object' && target[key] ? { ...target[key] } : {},
        value,
        { fillOnly },
      )
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
  const structured = structureFromTraitBody(body, { entryName: entry.name })
  mergeDeep(entry, structured, { fillOnly })
  if (descriptionText && (!entry.description || /TODO: transcribe/i.test(entry.description))) {
    entry.description = descriptionText.trim()
  }
  if (structured.customOneOffs?.length && !fillOnly) {
    entry.customOneOffs = structured.customOneOffs
  } else if (structured.customOneOffs?.length && !entry.customOneOffs?.length) {
    entry.customOneOffs = structured.customOneOffs
  }
  if (isEmptyObject(entry.morphusRules)) delete entry.morphusRules
  return entry
}

export function matchBlockForEntry(blocks, entry) {
  const want = normTraitName(entry.name)
  return blocks.find((b) => normTraitName(b.name) === want)
}
