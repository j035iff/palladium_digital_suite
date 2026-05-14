import type { XpGainEvent } from '../types'

const PREFIX = 'pds:xpHistory:'
const MAX = 30

export function loadXpHistory(characterName: string): XpGainEvent[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}${characterName}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: XpGainEvent[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      if (
        typeof o.id === 'string' &&
        typeof o.amount === 'number' &&
        typeof o.label === 'string' &&
        typeof o.atMs === 'number'
      ) {
        out.push({ id: o.id, amount: o.amount, label: o.label, atMs: o.atMs })
      }
    }
    return out.slice(-MAX)
  } catch {
    return []
  }
}

export function saveXpHistory(characterName: string, events: XpGainEvent[]): void {
  try {
    const slice = events.slice(-MAX)
    localStorage.setItem(`${PREFIX}${characterName}`, JSON.stringify(slice))
  } catch {
    /* ignore */
  }
}
