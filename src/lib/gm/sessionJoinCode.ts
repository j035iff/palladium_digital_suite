import { createGmId } from './sessionId'

/** Opaque join token rotated whenever a listen cycle starts / sitting opens. */
export type GmJoinCredentials = {
  /** Full secret carried in QR / deep link. */
  joinToken: string
  /** Short human-enterable code (derived; not a second secret). */
  shortCode: string
}

const SHORT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const SHORT_CODE_LEN = 6

/** Derive a stable short code from a join token (no second random secret). */
export function shortCodeFromJoinToken(joinToken: string): string {
  let hash = 2166136261
  for (let i = 0; i < joinToken.length; i += 1) {
    hash ^= joinToken.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  let n = hash >>> 0
  let out = ''
  for (let i = 0; i < SHORT_CODE_LEN; i += 1) {
    out += SHORT_CODE_ALPHABET[n % SHORT_CODE_ALPHABET.length]!
    n = Math.imul(n, 1664525) + 1013904223
    n >>>= 0
  }
  return out
}

/** Rotate-on-open: new credentials each listen / open-sitting cycle. */
export function rotateJoinCredentials(): GmJoinCredentials {
  const joinToken = createGmId('join')
  return {
    joinToken,
    shortCode: shortCodeFromJoinToken(joinToken),
  }
}

export function normalizeShortCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function shortCodesMatch(a: string, b: string): boolean {
  return normalizeShortCode(a) === normalizeShortCode(b)
}
