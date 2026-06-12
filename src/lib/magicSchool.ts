import type { Feature, PalladiumMagicSpell, PalladiumOcc } from '../types'

/** Lowercase slug for a magic school (matches `content/magic/<school>.json` basename). */
export function normalizeMagicSchool(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, '_')
}

/** Parse `magic_<school>_<spell_slug>` → school slug. */
export function parseSchoolFromMagicId(id: string): string | undefined {
  if (!id.startsWith('magic_')) return undefined
  const rest = id.slice('magic_'.length)
  const idx = rest.indexOf('_')
  if (idx <= 0) return undefined
  return normalizeMagicSchool(rest.slice(0, idx))
}

/** Explicit `school` on the row, else id prefix, else optional file basename fallback. */
export function resolveMagicSchool(
  spell: Pick<PalladiumMagicSpell, 'id'> & { school?: string },
  fileBasename?: string,
): string | undefined {
  if (typeof spell.school === 'string' && spell.school.trim()) {
    return normalizeMagicSchool(spell.school)
  }
  const fromId = parseSchoolFromMagicId(spell.id)
  if (fromId) return fromId
  if (fileBasename?.trim()) return normalizeMagicSchool(fileBasename)
  return undefined
}

export function magicSchoolForFeature(feature: Feature): string | undefined {
  const meta = feature.metadata?.school
  if (typeof meta === 'string' && meta.trim()) {
    return normalizeMagicSchool(meta)
  }
  return parseSchoolFromMagicId(feature.identity.id)
}

export function spellLevelForFeature(feature: Feature): number | undefined {
  const level = feature.metadata?.level
  if (typeof level === 'number') return level
  const spellLevel = feature.metadata?.spellLevel
  if (typeof spellLevel === 'number') return spellLevel
  return undefined
}

/** Structured school allow-list from O.C.C. `ppeEngine.magicSchools` (empty = no school gate). */
export function occMagicSchools(occ: PalladiumOcc): readonly string[] {
  const schools = occ.ppeEngine?.magicSchools
  if (!schools?.length) return []
  return schools.map(normalizeMagicSchool)
}

export function spellSchoolAllowedForOcc(
  occ: PalladiumOcc,
  school: string | undefined,
): { allowed: boolean; reason?: string } {
  const allowed = occMagicSchools(occ)
  if (!allowed.length) return { allowed: true }
  if (!school) {
    return { allowed: false, reason: 'Spell school is not defined in the catalog.' }
  }
  const normalized = normalizeMagicSchool(school)
  if (!allowed.includes(normalized)) {
    return {
      allowed: false,
      reason: `O.C.C. permits ${allowed.join(', ')} magic only.`,
    }
  }
  return { allowed: true }
}
