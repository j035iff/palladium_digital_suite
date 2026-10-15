/**
 * Character portrait plumbing (Unified Path).
 * Single-form characters use `primary` only; Nightbane dual-form stores
 * Facade (`primary`) and Morphus (`morphus`) independently. Active-form
 * display resolves through {@link resolveActivePortrait}.
 */
import type { ActiveForm, CharacterIdentityProfile } from '../types'

export type CharacterPortraitFormKey = 'primary' | 'morphus'

/** Device-picked portrait data URLs keyed by form (Facade = primary). */
export type CharacterIdentityPortraits = {
  primary?: string
  morphus?: string
}

export const ACCEPTED_PORTRAIT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type AcceptedPortraitMimeType =
  (typeof ACCEPTED_PORTRAIT_MIME_TYPES)[number]

/** Longest edge after resize — keeps localStorage saves workable. */
export const PORTRAIT_MAX_EDGE_PX = 512

export const PORTRAIT_JPEG_QUALITY = 0.82

/** Soft cap on persisted data-URL length (~300KB). */
export const PORTRAIT_MAX_DATA_URL_CHARS = 400_000

export const PORTRAIT_ACCEPT_ATTR = ACCEPTED_PORTRAIT_MIME_TYPES.join(',')

export const PORTRAIT_TYPE_ERROR =
  'Use a JPEG, PNG, or WebP image from your device.'

export const PORTRAIT_READ_ERROR = 'Could not read that image. Try another file.'

export const PORTRAIT_SIZE_ERROR =
  'That image is still too large after resize. Try a smaller photo.'

export function isAcceptedPortraitMimeType(
  mime: string | undefined | null,
): mime is AcceptedPortraitMimeType {
  if (!mime) return false
  return (ACCEPTED_PORTRAIT_MIME_TYPES as readonly string[]).includes(
    mime.toLowerCase(),
  )
}

export function normalizeIdentityPortraits(
  portraits?: CharacterIdentityPortraits | null,
): CharacterIdentityPortraits {
  const primary =
    typeof portraits?.primary === 'string' && portraits.primary.startsWith('data:image/')
      ? portraits.primary
      : undefined
  const morphus =
    typeof portraits?.morphus === 'string' && portraits.morphus.startsWith('data:image/')
      ? portraits.morphus
      : undefined
  const out: CharacterIdentityPortraits = {}
  if (primary) out.primary = primary
  if (morphus) out.morphus = morphus
  return out
}

/**
 * Portrait shown for the active form. Non–dual-form callers pass `primary`
 * (or any form — Morphus key is unused when the character is not Nightbane).
 */
export function resolveActivePortrait(
  portraits: CharacterIdentityPortraits | undefined,
  activeForm: ActiveForm,
): string | undefined {
  const normalized = normalizeIdentityPortraits(portraits)
  if (activeForm === 'morphus') return normalized.morphus
  return normalized.primary
}

export function withPortraitForForm(
  portraits: CharacterIdentityPortraits | undefined,
  formKey: CharacterPortraitFormKey,
  dataUrl: string | undefined,
): CharacterIdentityPortraits {
  const next = { ...normalizeIdentityPortraits(portraits) }
  if (dataUrl && dataUrl.startsWith('data:image/')) {
    next[formKey] = dataUrl
  } else {
    delete next[formKey]
  }
  return next
}

/** Familiar Surface labels — never expose form keys to the player. */
export function portraitSlotLabel(
  formKey: CharacterPortraitFormKey,
  dualForm: boolean,
): string {
  if (!dualForm) return 'Character Image'
  return formKey === 'morphus' ? 'Morphus Image' : 'Facade Image'
}

export function portraitFormKeysForCharacter(
  dualForm: boolean,
): CharacterPortraitFormKey[] {
  return dualForm ? ['primary', 'morphus'] : ['primary']
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error(PORTRAIT_READ_ERROR))
        return
      }
      resolve(result)
    }
    reader.onerror = () => reject(new Error(PORTRAIT_READ_ERROR))
    reader.readAsDataURL(file)
  })
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(PORTRAIT_READ_ERROR))
    img.src = src
  })
}

/**
 * Downscale to {@link PORTRAIT_MAX_EDGE_PX} and encode as JPEG for compact saves.
 */
export async function resizePortraitDataUrl(dataUrl: string): Promise<string> {
  const img = await loadHtmlImage(dataUrl)
  const scale = Math.min(
    1,
    PORTRAIT_MAX_EDGE_PX / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height, 1),
  )
  const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale))
  const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(PORTRAIT_READ_ERROR)
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', PORTRAIT_JPEG_QUALITY)
}

export type PortraitIngestResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string }

/** Validate + resize a device file into a persistable portrait data URL. */
export async function ingestPortraitFile(file: File): Promise<PortraitIngestResult> {
  if (!isAcceptedPortraitMimeType(file.type)) {
    return { ok: false, error: PORTRAIT_TYPE_ERROR }
  }
  try {
    const raw = await readFileAsDataUrl(file)
    const resized = await resizePortraitDataUrl(raw)
    if (resized.length > PORTRAIT_MAX_DATA_URL_CHARS) {
      return { ok: false, error: PORTRAIT_SIZE_ERROR }
    }
    return { ok: true, dataUrl: resized }
  } catch {
    return { ok: false, error: PORTRAIT_READ_ERROR }
  }
}

/** Patch helper for identityProfile.portraits merges. */
export function identityProfileWithPortrait(
  profile: CharacterIdentityProfile | undefined,
  formKey: CharacterPortraitFormKey,
  dataUrl: string | undefined,
): Pick<CharacterIdentityProfile, 'portraits'> {
  return {
    portraits: withPortraitForForm(profile?.portraits, formKey, dataUrl),
  }
}

/** Normalize peer allowlist — default empty (share off until explicitly allowed). */
export function normalizePortraitShareAllowIds(
  ids?: readonly string[] | null,
): string[] {
  if (!Array.isArray(ids)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of ids) {
    if (typeof raw !== 'string') continue
    const id = raw.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

export function isPortraitSharedWithPeer(
  allowIds: readonly string[] | null | undefined,
  peerCharacterId: string | null | undefined,
): boolean {
  const peer = peerCharacterId?.trim()
  if (!peer) return false
  return normalizePortraitShareAllowIds(allowIds).includes(peer)
}

export function setPortraitShareForPeer(
  allowIds: readonly string[] | null | undefined,
  peerCharacterId: string,
  allowed: boolean,
): string[] {
  const peer = peerCharacterId.trim()
  if (!peer) return normalizePortraitShareAllowIds(allowIds)
  const next = new Set(normalizePortraitShareAllowIds(allowIds))
  if (allowed) next.add(peer)
  else next.delete(peer)
  return [...next]
}

/**
 * Portrait a peer may show for this subject on their People list.
 * Default deny; Nightbane uses `form` (callers pass table viewForm when defined,
 * otherwise `primary` / Facade — do not invent table presentation rules).
 */
export function resolvePeerVisiblePortrait(
  subject: {
    portraits?: CharacterIdentityPortraits | null
    portraitShareAllowCharacterIds?: readonly string[] | null
  },
  viewerCharacterId: string | null | undefined,
  form: ActiveForm = 'primary',
): string | undefined {
  if (!isPortraitSharedWithPeer(subject.portraitShareAllowCharacterIds, viewerCharacterId)) {
    return undefined
  }
  return resolveActivePortrait(subject.portraits ?? undefined, form)
}

/** Extract peer-facing portrait projection from a party.snapshot character JSON. */
export function extractPeerPortraitProjection(characterJson: unknown): {
  portraits: CharacterIdentityPortraits
  portraitShareAllowCharacterIds: string[]
} {
  const json = characterJson as {
    identityProfile?: { portraits?: CharacterIdentityPortraits }
    portraitShareAllowCharacterIds?: string[]
  } | null
  return {
    portraits: normalizeIdentityPortraits(json?.identityProfile?.portraits),
    portraitShareAllowCharacterIds: normalizePortraitShareAllowIds(
      json?.portraitShareAllowCharacterIds,
    ),
  }
}
