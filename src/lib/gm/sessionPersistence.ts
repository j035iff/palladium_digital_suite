import { isGenreId } from '../../data/genres'
import { hydratePlaySessions } from './playSession'
import type { GmSessionIndexEntry, GmSessionRecord } from './sessionTypes'

const INDEX_KEY = 'pds:gmSessionIndex'
const ACTIVE_KEY = 'pds:gmActiveSessionId'
const SAVE_PREFIX = 'pds:gmSession:'

function readIndex(): GmSessionIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as GmSessionIndexEntry[]) : []
  } catch {
    return []
  }
}

function writeIndex(entries: GmSessionIndexEntry[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(entries))
  } catch {
    /* quota */
  }
}

function toIndexEntry(session: GmSessionRecord): GmSessionIndexEntry {
  return {
    id: session.id,
    name: session.name,
    hostGenreId: session.hostGenreId,
    updatedAtMs: session.updatedAtMs,
  }
}

function isSessionRecord(value: unknown): value is GmSessionRecord {
  if (value == null || typeof value !== 'object') return false
  const row = value as Partial<GmSessionRecord>
  return (
    typeof row.id === 'string' &&
    typeof row.name === 'string' &&
    typeof row.hostGenreId === 'string' &&
    isGenreId(row.hostGenreId) &&
    Array.isArray(row.partyCharacterIds) &&
    Array.isArray(row.npcs) &&
    row.combat != null &&
    typeof row.combat === 'object'
  )
}

export function listGmSessions(): GmSessionIndexEntry[] {
  return [...readIndex()].sort((a, b) => b.updatedAtMs - a.updatedAtMs)
}

export function loadGmSession(id: string): GmSessionRecord | null {
  try {
    const raw = localStorage.getItem(`${SAVE_PREFIX}${id}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isSessionRecord(parsed)) return null
    return hydratePlaySessions(parsed)
  } catch {
    return null
  }
}

export function saveGmSession(session: GmSessionRecord): void {
  try {
    localStorage.setItem(`${SAVE_PREFIX}${session.id}`, JSON.stringify(session))
    const entries = readIndex().filter((e) => e.id !== session.id)
    entries.push(toIndexEntry(session))
    writeIndex(entries)
    localStorage.setItem(ACTIVE_KEY, session.id)
  } catch {
    /* quota */
  }
}

export function deleteGmSession(id: string): void {
  try {
    localStorage.removeItem(`${SAVE_PREFIX}${id}`)
    writeIndex(readIndex().filter((e) => e.id !== id))
    if (localStorage.getItem(ACTIVE_KEY) === id) {
      localStorage.removeItem(ACTIVE_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function loadActiveGmSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function setActiveGmSessionId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* ignore */
  }
}

