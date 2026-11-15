/**
 * Live sheet Persistent Core — three-line identity header + book rollover.
 * Unified Path: one builder for Race ≡ R.C.C. hide, Line 2 OCC/RCC name,
 * and rollover union (OCC/RCC/Race + Specialization / Skill Package).
 * Mechanical Integrity: catalog sources only — never invent book/page.
 */

import type { PalladiumOcc, PalladiumSourceRef, Race } from '../types'
import { formatPalladiumSourceCitation } from './formatPalladiumSources'
import { getOccSpecialization } from './occComposition'
import { isRccRace } from './raceComposition'

export type LiveSheetIdentityHeaderLines = {
  /** Line 1 — character name (display only on strip). */
  name: string
  /** Line 2 — O.C.C. / R.C.C. display name (no specialization suffix). */
  classLine: string
  /** Line 3 — `RACE - ALIGNMENT` or alignment-only when Race ≡ R.C.C. */
  raceAlignmentLine: string
  /** True when Race was omitted because Race ≡ R.C.C. (incl. Nightbane). */
  hideRace: boolean
  raceLabel: string
  alignmentLabel: string
}

export type LiveSheetIdentityRolloverBlockKind =
  | 'occ'
  | 'rcc'
  | 'race'
  | 'specialization'
  | 'skillPackage'

export type LiveSheetIdentityRolloverBlock = {
  kind: LiveSheetIdentityRolloverBlockKind
  /** Section heading shown in the rollover. */
  heading: string
  /** Catalog description when present; empty string when not ingested. */
  description: string
  /** Book citation (page omitted when missing until ingest fills it). */
  citation: string
}

export type BuildLiveSheetIdentityHeaderInput = {
  name: string
  /** Active-form alignment label (e.g. UNPRINCIPLED) — Morphus header held separately. */
  alignmentLabel: string
  race: Race | undefined
  /** Library OCC row (base — specialization applied separately for rollover). */
  occ: PalladiumOcc | undefined
  /** Bound character OCC name fallback when library row missing. */
  occDisplayName: string
  occSpecializationId?: string | null
}

function formatCitations(
  sources: readonly PalladiumSourceRef[] | undefined,
): string {
  if (!sources?.length) return ''
  return sources.map(formatPalladiumSourceCitation).filter(Boolean).join(' · ')
}

/** Catalog skill-package OCC rows (Nightbane `nightbane_rcc`, etc.). */
export function isLiveSheetSkillPackageOcc(
  occ: PalladiumOcc | undefined,
): boolean {
  if (!occ) return false
  const type = (occ.occType ?? '').toLowerCase()
  if (type === 'nightbane_rcc') return true
  if (type.includes('skill_package')) return true
  const name = occ.name.toLowerCase()
  return name.includes('skill package')
}

/** Shadow / pure R.C.C. skill-program OCC (Guardian, Wampyr, …). */
export function isLiveSheetRccSkillProgramOcc(
  occ: PalladiumOcc | undefined,
): boolean {
  if (!occ) return false
  const type = (occ.occType ?? '').toLowerCase()
  return type === 'rcc_skill_program' || type.endsWith('_rcc_skill_program')
}

/**
 * Strip trailing “O.C.C.” / “R.C.C.” book suffixes for Familiar Surface Line 2
 * (mockup shows “Sorcerer”, not “Sorcerer O.C.C.”).
 */
export function shortenOccDisplayName(name: string): string {
  return name
    .replace(/\s*[—–-]\s*Basic Skill Package\s*$/i, '')
    .replace(/\s+O\.C\.C\.\s*$/i, '')
    .replace(/\s+R\.C\.C\.\s*Skills?\s*$/i, '')
    .replace(/\s+R\.C\.C\.\s*$/i, '')
    .trim()
}

/**
 * Race-hide when Race ≡ R.C.C. (Nightbane Sorcerer included — Line 2 may still
 * show an O.C.C./package name while Line 3 is alignment-only).
 */
export function shouldHideRaceOnIdentityHeader(
  race: Race | undefined,
): boolean {
  return isRccRace(race)
}

/**
 * Line 2 = O.C.C./R.C.C. display name (ruling #6).
 * Mockup use cases: pure/package R.C.C. → race name; specialized OCC on an
 * R.C.C. race (Nightbane Sorcerer) → `{Race} {OCC}`; otherwise OCC name.
 */
export function liveSheetIdentityClassLine(input: {
  occ: PalladiumOcc | undefined
  occDisplayName: string
  race: Race | undefined
}): string {
  const raceName = input.race?.name?.trim() || ''
  const occName =
    input.occ?.name?.trim() || input.occDisplayName?.trim() || ''
  const shortOcc = occName ? shortenOccDisplayName(occName) : ''

  if (isRccRace(input.race)) {
    const canPick = input.race?.canPickOcc !== false
    if (
      canPick &&
      input.occ &&
      !isLiveSheetSkillPackageOcc(input.occ) &&
      !isLiveSheetRccSkillProgramOcc(input.occ)
    ) {
      // Specialized O.C.C. made for a particular R.C.C. (use case 4).
      if (raceName && shortOcc) {
        if (shortOcc.toLowerCase().startsWith(raceName.toLowerCase())) {
          return shortOcc
        }
        return `${raceName} ${shortOcc}`
      }
      return shortOcc || raceName || '—'
    }
    // Skill package or pure R.C.C. — Line 2 is the R.C.C. name (use cases 3, 5).
    return raceName || shortOcc || '—'
  }

  return shortOcc || '—'
}

export function buildLiveSheetIdentityHeaderLines(
  input: BuildLiveSheetIdentityHeaderInput,
): LiveSheetIdentityHeaderLines {
  const hideRace = shouldHideRaceOnIdentityHeader(input.race)
  const raceLabel = input.race?.name?.trim() ? input.race.name.trim() : '—'
  const alignmentLabel = input.alignmentLabel.trim() || '—'
  const classLine = liveSheetIdentityClassLine({
    occ: input.occ,
    occDisplayName: input.occDisplayName,
    race: input.race,
  })
  const raceAlignmentLine = hideRace
    ? alignmentLabel.toUpperCase()
    : `${raceLabel.toUpperCase()} - ${alignmentLabel.toUpperCase()}`

  return {
    name: input.name,
    classLine,
    raceAlignmentLine,
    hideRace,
    raceLabel,
    alignmentLabel,
  }
}

/**
 * Rollover union: applicable OCC and/or RCC and/or Race + optional
 * Specialization / Skill Package, each with book citation when catalog has sources.
 */
export function buildLiveSheetIdentityRolloverBlocks(
  input: BuildLiveSheetIdentityHeaderInput,
): LiveSheetIdentityRolloverBlock[] {
  const blocks: LiveSheetIdentityRolloverBlock[] = []
  const rcc = isRccRace(input.race)
  const canPickOcc = input.race?.canPickOcc !== false
  const specId = input.occSpecializationId?.trim() || null
  const spec =
    input.occ && specId
      ? getOccSpecialization(input.occ, specId)
      : undefined
  const skillPackage =
    rcc && canPickOcc && isLiveSheetSkillPackageOcc(input.occ)

  if (rcc) {
    blocks.push({
      kind: 'rcc',
      heading: 'R.C.C. Description',
      description:
        input.race?.description?.trim() ||
        (isLiveSheetRccSkillProgramOcc(input.occ)
          ? input.occ?.description?.trim() || ''
          : ''),
      citation:
        formatCitations(input.race?.sources) ||
        formatCitations(input.occ?.sources),
    })

    if (skillPackage && input.occ) {
      blocks.push({
        kind: 'skillPackage',
        heading: 'Skill Package',
        description: input.occ.description?.trim() || input.occ.name,
        citation: formatCitations(input.occ.sources),
      })
    } else if (
      canPickOcc &&
      input.occ &&
      !isLiveSheetRccSkillProgramOcc(input.occ)
    ) {
      blocks.push({
        kind: 'occ',
        heading: 'O.C.C. Description',
        description: input.occ.description?.trim() || '',
        citation: formatCitations(input.occ.sources),
      })
    }
  } else if (input.occ) {
    blocks.push({
      kind: 'occ',
      heading: 'O.C.C. Description',
      description: input.occ.description?.trim() || '',
      citation: formatCitations(input.occ.sources),
    })
    if (input.race) {
      blocks.push({
        kind: 'race',
        heading: 'Race Description',
        description: input.race.description?.trim() || '',
        citation: formatCitations(input.race.sources),
      })
    }
  } else if (input.race) {
    blocks.push({
      kind: 'race',
      heading: 'Race Description',
      description: input.race.description?.trim() || '',
      citation: formatCitations(input.race.sources),
    })
  }

  if (spec) {
    blocks.push({
      kind: 'specialization',
      heading: 'Specialization',
      description: spec.description?.trim() || spec.name,
      citation: formatCitations(input.occ?.sources),
    })
  }

  return blocks.filter(
    (b) => b.description.trim().length > 0 || b.citation.trim().length > 0,
  )
}
