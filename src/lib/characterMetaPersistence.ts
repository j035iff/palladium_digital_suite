export type PersistedCharacterMeta = {
  isFinalized?: boolean
  creationVitalityCommitted?: boolean
}

const PREFIX = 'pds:characterMeta:'

export function loadCharacterMeta(
  characterName: string,
): PersistedCharacterMeta | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${characterName}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    const out: PersistedCharacterMeta = {}
    if (typeof o.isFinalized === 'boolean') out.isFinalized = o.isFinalized
    if (typeof o.creationVitalityCommitted === 'boolean') {
      out.creationVitalityCommitted = o.creationVitalityCommitted
    }
    return Object.keys(out).length ? out : null
  } catch {
    return null
  }
}

export function saveCharacterMeta(
  characterName: string,
  patch: PersistedCharacterMeta,
): void {
  try {
    const prev = loadCharacterMeta(characterName) ?? {}
    const next = { ...prev, ...patch }
    localStorage.setItem(`${PREFIX}${characterName}`, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}
