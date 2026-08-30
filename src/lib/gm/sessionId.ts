/** Prefix + UUID (or timestamp fallback) for GM session / NPC instance ids. */
export function createGmId(prefix: string): string {
  const rand =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}_${rand}`
}
