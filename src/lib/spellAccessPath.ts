import type {
  OccSpellAccessRule,
  PalladiumMagicSpell,
  PalladiumOcc,
  SpellAccessMetadata,
  SpellCaveat,
} from '../types'
import {
  caveatsForCrossListSpell,
  spellInMagicCrossList,
} from './magicCrossLists'
import { normalizeMagicSchool, occMagicSchools } from './magicSchool'

export type SpellAccessPath = 'native' | 'borrowed'

export type SpellAccessMatch = {
  accessPath: SpellAccessPath
  matchedRule?: OccSpellAccessRule
  crossListId?: string
  caveats: readonly SpellCaveat[]
}

function spellAccessMeta(spell: PalladiumMagicSpell): SpellAccessMetadata | undefined {
  const raw = spell.spellAccess
  if (!raw || typeof raw !== 'object') return undefined
  return raw as SpellAccessMetadata
}

export function occSpellAccessRules(occ: PalladiumOcc): readonly OccSpellAccessRule[] {
  return occ.ppeEngine?.spellAccessRules ?? []
}

function tagMatchesSpell(spell: PalladiumMagicSpell, tag: string): boolean {
  const normalized = tag.toLowerCase()
  const meta = spellAccessMeta(spell)
  if (normalized === 'affects_flesh' && meta?.affectsFlesh === true) return true
  if (meta?.crossLists?.some((id) => id.toLowerCase() === normalized)) return true
  return (spell.tags ?? []).some((t) => t.toLowerCase() === normalized)
}

function spellMatchesTagFilter(
  spell: PalladiumMagicSpell,
  tagFilter: readonly string[] | undefined,
): boolean {
  if (!tagFilter?.length) return false
  return tagFilter.some((tag) => tagMatchesSpell(spell, tag))
}

function spellMatchesAccessRule(
  spell: PalladiumMagicSpell,
  rule: OccSpellAccessRule,
): boolean {
  const school = normalizeMagicSchool(spell.school)
  if (school !== normalizeMagicSchool(rule.school)) return false

  if (rule.accessType === 'except') {
    if (rule.spellIds?.includes(spell.id)) return false
    return true
  }

  if (rule.crossListId) {
    if (spellInMagicCrossList(rule.crossListId, spell.id)) return true
    if (rule.spellIds?.includes(spell.id)) return true
    return false
  }
  if (rule.tagFilter?.length) {
    return spellMatchesTagFilter(spell, rule.tagFilter)
  }
  if (rule.spellIds?.length) {
    return rule.spellIds.includes(spell.id)
  }
  return true
}

function mergeCaveats(...groups: readonly (readonly SpellCaveat[])[]): SpellCaveat[] {
  const seen = new Set<string>()
  const out: SpellCaveat[] = []
  for (const group of groups) {
    for (const caveat of group) {
      const key = `${caveat.kind}:${caveat.summary}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(caveat)
    }
  }
  return out
}

function borrowedCaveatsForSpell(
  spell: PalladiumMagicSpell,
  rule: OccSpellAccessRule,
  crossListId?: string,
): readonly SpellCaveat[] {
  const meta = spellAccessMeta(spell)
  const occKindCaveats = meta?.borrowedCaveats
    ? Object.values(meta.borrowedCaveats).flat()
    : []
  const crossListCaveats = crossListId
    ? caveatsForCrossListSpell(crossListId, spell.id)
    : []
  return mergeCaveats(
    rule.defaultCaveats ?? [],
    crossListCaveats,
    occKindCaveats,
  )
}

export function nativeSupersededBorrowedIds(
  occ: PalladiumOcc,
  spells: readonly PalladiumMagicSpell[],
): ReadonlySet<string> {
  const natives = new Set(occMagicSchools(occ))
  const out = new Set<string>()
  for (const spell of spells) {
    if (!natives.has(spell.school)) continue
    const replaces = spellAccessMeta(spell)?.replacesSpellId
    if (typeof replaces === 'string' && replaces.trim()) {
      out.add(replaces)
    }
  }
  return out
}

/**
 * Whether an O.C.C. has any access path to a spell (native or borrowed).
 * Returns null when the spell should not appear in UI for this O.C.C.
 */
export function resolveSpellAccessMatch(
  occ: PalladiumOcc,
  spell: PalladiumMagicSpell,
  options?: { supersededBorrowedIds?: ReadonlySet<string> },
): SpellAccessMatch | null {
  const school = normalizeMagicSchool(spell.school)
  const nativeSchools = occMagicSchools(occ)
  const rules = occSpellAccessRules(occ)
  const gated = nativeSchools.length > 0 || rules.length > 0

  if (!gated) {
    return { accessPath: 'native', caveats: [] }
  }

  if (nativeSchools.includes(school)) {
    return { accessPath: 'native', caveats: [] }
  }

  for (const rule of rules) {
    if (!spellMatchesAccessRule(spell, rule)) continue
    if (options?.supersededBorrowedIds?.has(spell.id)) continue
    const crossListId = rule.crossListId
    return {
      accessPath: 'borrowed',
      matchedRule: rule,
      crossListId,
      caveats: borrowedCaveatsForSpell(spell, rule, crossListId),
    }
  }

  return null
}

export function spellAccessibleToOcc(
  occ: PalladiumOcc,
  spell: PalladiumMagicSpell,
  options?: { supersededBorrowedIds?: ReadonlySet<string> },
): boolean {
  return resolveSpellAccessMatch(occ, spell, options) != null
}
