const PREFIX = 'pds:selectedAbilities:'

export function loadPersistedAbilityIds(characterName: string): string[] | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${characterName}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return null
  }
}

export function savePersistedAbilityIds(
  characterName: string,
  ids: string[],
): void {
  try {
    localStorage.setItem(`${PREFIX}${characterName}`, JSON.stringify(ids))
  } catch {
    /* quota / private mode */
  }
}
