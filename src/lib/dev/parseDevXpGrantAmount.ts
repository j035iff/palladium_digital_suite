/**
 * Parse a Familiar Surface XP grant field into a positive whole-number amount.
 * Rejects empty, non-numeric, zero, negative, and fractional values.
 * Commas as thousands separators are allowed (e.g. "2,000").
 */
export function parseDevXpGrantAmount(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, '')
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return null
  const n = Number(trimmed)
  if (!Number.isSafeInteger(n) || n <= 0) return null
  return n
}

/** History label used when the debug sheet tool grants XP. */
export const DEV_XP_GRANT_HISTORY_LABEL = 'Debug XP' as const
