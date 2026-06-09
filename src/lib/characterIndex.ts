import { formatGenreSlug } from '../data/genres'
import { getRaceById } from '../data/library/registry'
import { getLibraryOccById } from '../data/occDefinitions'
import { isCharacterNameFilled } from './characterIdentity'
import { CREATION_PLACEHOLDER_OCC } from './characterRoot'
import { getOccSpecialization } from './occComposition'
import type { CharacterRootState } from '../types'

export type CharacterIndexEntry = {
  id: string
  name: string
  creationGenreId: string
  hostGenreId: string
  updatedAtMs: number
  /** True when saved mid-creation (not yet spawned). */
  inProgress?: boolean
  /** Denormalized for portal list rows (refreshed on save). */
  raceName?: string
  occName?: string
  /** O.C.C. sub-class branch when set; empty string when none. */
  occSpecializationName?: string
}

const INDEX_KEY = 'pds:characterIndex'
const SAVE_PREFIX = 'pds:characterSave:'

function readIndex(): CharacterIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as CharacterIndexEntry[]) : []
  } catch {
    return []
  }
}

function writeIndex(entries: CharacterIndexEntry[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(entries))
  } catch {
    /* ignore */
  }
}

function resolveRaceNameForIndex(state: CharacterRootState): string {
  const raceId = state.raceId?.trim()
  if (!raceId) return '—'
  return getRaceById(raceId)?.name ?? '—'
}

function resolveOccBaseNameForIndex(state: CharacterRootState): string {
  const occId = state.occ?.id?.trim()
  if (!occId || occId === CREATION_PLACEHOLDER_OCC.id) return '—'
  const lib = getLibraryOccById(occId)
  const base = lib?.name ?? state.occ.name?.trim()
  if (!base || base === CREATION_PLACEHOLDER_OCC.name) return '—'
  return base
}

function resolveOccSpecializationNameForIndex(
  state: CharacterRootState,
): string {
  const occId = state.occ?.id?.trim()
  if (!occId || occId === CREATION_PLACEHOLDER_OCC.id) return ''
  const lib = getLibraryOccById(occId)
  const specId = state.occSpecializationId?.trim()
  if (!lib || !specId) return ''
  return getOccSpecialization(lib, specId)?.name?.trim() ?? ''
}

function resolveIndexDisplayName(state: CharacterRootState): string {
  return isCharacterNameFilled(state.name) ? state.name.trim() : 'Unnamed Character'
}

export function isCharacterIndexInProgress(entry: CharacterIndexEntry): boolean {
  if (entry.inProgress === true) return true
  if (entry.inProgress === false) return false
  const save = loadCharacterSave(entry.id)
  return save != null && save.isFinalized !== true
}

function enrichIndexEntryFromSave(entry: CharacterIndexEntry): CharacterIndexEntry {
  const save = loadCharacterSave(entry.id)
  const hasOccFields =
    entry.occName != null && entry.occSpecializationName !== undefined
  const base: CharacterIndexEntry = {
    ...entry,
    name:
      entry.name.trim() && isCharacterNameFilled(entry.name)
        ? entry.name.trim()
        : save
          ? resolveIndexDisplayName(save)
          : entry.name.trim() || 'Unnamed Character',
    inProgress: entry.inProgress ?? (save != null && save.isFinalized !== true),
  }
  if (base.raceName && hasOccFields) return base
  if (!save) return base
  return {
    ...base,
    raceName: base.raceName ?? resolveRaceNameForIndex(save),
    occName: base.occName ?? resolveOccBaseNameForIndex(save),
    occSpecializationName:
      base.occSpecializationName ??
      resolveOccSpecializationNameForIndex(save),
  }
}

export type CharacterIndexRowDisplay = {
  genreLabel: string
  mainLabel: string
  fullLabel: string
}

/** Portal list body: `Name - Race - O.C.C. [- Specialization]`. */
export function resolveCharacterIndexRowDisplay(
  entry: CharacterIndexEntry,
): CharacterIndexRowDisplay {
  const row = enrichIndexEntryFromSave(entry)
  const genreLabel = formatGenreSlug(row.creationGenreId)
  const parts = [
    row.name,
    row.raceName?.trim() || '—',
    row.occName?.trim() || '—',
  ]
  const spec = row.occSpecializationName?.trim()
  if (spec) parts.push(spec)
  const mainLabel = parts.join(' - ')
  return {
    genreLabel,
    mainLabel,
    fullLabel: `${genreLabel} ${mainLabel}`,
  }
}

/** Accessible / tooltip label including genre prefix. */
export function formatCharacterIndexLabel(entry: CharacterIndexEntry): string {
  return resolveCharacterIndexRowDisplay(entry).fullLabel
}

export function listSavedCharacters(): CharacterIndexEntry[] {
  return readIndex()
    .map(enrichIndexEntryFromSave)
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Spawned / live-sheet characters (portal “My Characters”). */
export function listFinalizedCharacters(): CharacterIndexEntry[] {
  return readIndex()
    .filter((e) => !isCharacterIndexInProgress(e))
    .map(enrichIndexEntryFromSave)
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Mid-creation drafts saved via “Save for Later”. */
export function listInProgressCharacters(): CharacterIndexEntry[] {
  return readIndex()
    .filter((e) => isCharacterIndexInProgress(e))
    .map(enrichIndexEntryFromSave)
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
}

/** Most recently touched finalized saves (portal “Recently Edited” strip). */
export function listRecentlyEditedCharacters(
  limit = 6,
): CharacterIndexEntry[] {
  return [...readIndex()]
    .filter((e) => !isCharacterIndexInProgress(e))
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
    .slice(0, limit)
}

export function loadCharacterSave(id: string): CharacterRootState | null {
  try {
    const raw = localStorage.getItem(`${SAVE_PREFIX}${id}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CharacterRootState
    if (!parsed?.id || !parsed.creationGenreId || !parsed.hostGenreId) return null
    return parsed
  } catch {
    return null
  }
}

export function saveCharacterToStorage(state: CharacterRootState): void {
  const payload = JSON.stringify(state)
  localStorage.setItem(`${SAVE_PREFIX}${state.id}`, payload)
  const entries = readIndex().filter((e) => e.id !== state.id)
  entries.push({
    id: state.id,
    name: resolveIndexDisplayName(state),
    creationGenreId: state.creationGenreId,
    hostGenreId: state.hostGenreId,
    updatedAtMs: Date.now(),
    inProgress: state.isFinalized !== true,
    raceName: resolveRaceNameForIndex(state),
    occName: resolveOccBaseNameForIndex(state),
    occSpecializationName: resolveOccSpecializationNameForIndex(state),
  })
  writeIndex(entries)
}

export function deleteCharacterSave(id: string): void {
  localStorage.removeItem(`${SAVE_PREFIX}${id}`)
  writeIndex(readIndex().filter((e) => e.id !== id))
}
