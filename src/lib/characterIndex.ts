import type { CharacterRootState } from '../types'

export type CharacterIndexEntry = {
  id: string
  name: string
  creationGenreId: string
  hostGenreId: string
  updatedAtMs: number
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

export function listSavedCharacters(): CharacterIndexEntry[] {
  return readIndex().sort((a, b) => a.name.localeCompare(b.name))
}

/** Most recently touched saves (portal “Recently Edited” strip). */
export function listRecentlyEditedCharacters(
  limit = 6,
): CharacterIndexEntry[] {
  return [...readIndex()]
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
    name: state.name,
    creationGenreId: state.creationGenreId,
    hostGenreId: state.hostGenreId,
    updatedAtMs: Date.now(),
  })
  writeIndex(entries)
}

export function deleteCharacterSave(id: string): void {
  localStorage.removeItem(`${SAVE_PREFIX}${id}`)
  writeIndex(readIndex().filter((e) => e.id !== id))
}
