/**
 * Session-scoped cache of character JSON pushed by joiners via party.snapshot.
 * Not written to pds:gmSession:* or the player's remote file.
 */

type CacheKey = string

const cache = new Map<CacheKey, unknown>()

function key(campaignId: string, characterId: string): CacheKey {
  return `${campaignId}::${characterId}`
}

export function cacheJoinedCharacter(
  campaignId: string,
  characterId: string,
  characterJson: unknown,
): void {
  cache.set(key(campaignId, characterId), characterJson)
}

export function loadCachedJoinedCharacter(
  campaignId: string,
  characterId: string,
): unknown | null {
  return cache.get(key(campaignId, characterId)) ?? null
}

export function clearJoinedCharacterCache(campaignId: string): void {
  const prefix = `${campaignId}::`
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k)
  }
}

/** Test helper. */
export function __resetJoinedCharacterCacheForTests(): void {
  cache.clear()
}
