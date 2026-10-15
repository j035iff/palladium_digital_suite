/**
 * Character portrait plumbing (Unified Path).
 * Single-form characters use `primary` only; Nightbane dual-form stores
 * Facade (`primary`) and Morphus (`morphus`) independently. Active-form
 * display resolves through {@link resolveActivePortrait}.
 * Portrait window size (corner-drag + aspect fit on pick) lives on
 * `identityProfile.portraitWindows` — Save-gated with the character.
 */
import type {
  ActiveForm,
  CharacterIdentityProfile,
  CharacterPortraitWindowSize,
} from '../types'

export type CharacterPortraitFormKey = 'primary' | 'morphus'

/** Device-picked portrait data URLs keyed by form (Facade = primary). */
export type CharacterIdentityPortraits = {
  primary?: string
  morphus?: string
}

/** Per-form Character Image window sizes. */
export type CharacterPortraitWindows = {
  primary?: CharacterPortraitWindowSize
  morphus?: CharacterPortraitWindowSize
}

/**
 * Default Identity Expand portrait window.
 * Joe 2026-10-15: at least **double** the prior ~11rem×10rem (~176×160) default → 352×320.
 */
export const PORTRAIT_WINDOW_DEFAULT: CharacterPortraitWindowSize = {
  widthPx: 352,
  heightPx: 320,
}

export const PORTRAIT_WINDOW_MIN_WIDTH_PX = 120
export const PORTRAIT_WINDOW_MIN_HEIGHT_PX = 120
export const PORTRAIT_WINDOW_MAX_WIDTH_PX = 480
export const PORTRAIT_WINDOW_MAX_HEIGHT_PX = 560

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

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** Clamp a portrait window to sheet-safe min/max. */
export function clampPortraitWindowSize(
  size: CharacterPortraitWindowSize | undefined | null,
  fallback: CharacterPortraitWindowSize = PORTRAIT_WINDOW_DEFAULT,
): CharacterPortraitWindowSize {
  const widthPx = clampInt(
    size?.widthPx ?? fallback.widthPx,
    PORTRAIT_WINDOW_MIN_WIDTH_PX,
    PORTRAIT_WINDOW_MAX_WIDTH_PX,
  )
  const heightPx = clampInt(
    size?.heightPx ?? fallback.heightPx,
    PORTRAIT_WINDOW_MIN_HEIGHT_PX,
    PORTRAIT_WINDOW_MAX_HEIGHT_PX,
  )
  return { widthPx, heightPx }
}

export function normalizePortraitWindowSize(
  size?: CharacterPortraitWindowSize | null,
): CharacterPortraitWindowSize | undefined {
  if (!size || typeof size !== 'object') return undefined
  if (typeof size.widthPx !== 'number' || typeof size.heightPx !== 'number') {
    return undefined
  }
  if (!Number.isFinite(size.widthPx) || !Number.isFinite(size.heightPx)) {
    return undefined
  }
  return clampPortraitWindowSize(size)
}

export function normalizePortraitWindows(
  windows?: CharacterPortraitWindows | null,
): CharacterPortraitWindows {
  const primary = normalizePortraitWindowSize(windows?.primary)
  const morphus = normalizePortraitWindowSize(windows?.morphus)
  const out: CharacterPortraitWindows = {}
  if (primary) out.primary = primary
  if (morphus) out.morphus = morphus
  return out
}

export function resolvePortraitWindowSize(
  windows: CharacterPortraitWindows | undefined,
  formKey: CharacterPortraitFormKey,
): CharacterPortraitWindowSize {
  return clampPortraitWindowSize(windows?.[formKey], PORTRAIT_WINDOW_DEFAULT)
}

export function withPortraitWindowForForm(
  windows: CharacterPortraitWindows | undefined,
  formKey: CharacterPortraitFormKey,
  size: CharacterPortraitWindowSize | undefined,
): CharacterPortraitWindows {
  const next = { ...normalizePortraitWindows(windows) }
  const normalized = normalizePortraitWindowSize(size)
  if (normalized) next[formKey] = normalized
  else delete next[formKey]
  return next
}

/**
 * Aspect-aware window size for a newly picked image.
 * Fits inside max box (prefer filling the larger axis) then clamps to min —
 * extreme ratios may slightly break aspect at the hard clamp ("within reason").
 */
export function fitPortraitWindowToImageAspect(
  naturalWidth: number,
  naturalHeight: number,
): CharacterPortraitWindowSize {
  const nw = Math.max(1, naturalWidth)
  const nh = Math.max(1, naturalHeight)
  const aspect = nw / nh

  let width = PORTRAIT_WINDOW_MAX_WIDTH_PX
  let height = width / aspect
  if (height > PORTRAIT_WINDOW_MAX_HEIGHT_PX) {
    height = PORTRAIT_WINDOW_MAX_HEIGHT_PX
    width = height * aspect
  }

  // Prefer a comfortable default long-edge when the max box would look huge
  // for near-square images — scale down toward DEFAULT long edge when larger.
  const longEdge = Math.max(width, height)
  const defaultLong = Math.max(
    PORTRAIT_WINDOW_DEFAULT.widthPx,
    PORTRAIT_WINDOW_DEFAULT.heightPx,
  )
  if (longEdge > defaultLong * 1.35) {
    const scale = (defaultLong * 1.35) / longEdge
    width *= scale
    height *= scale
  }

  if (width < PORTRAIT_WINDOW_MIN_WIDTH_PX) {
    width = PORTRAIT_WINDOW_MIN_WIDTH_PX
    height = width / aspect
  }
  if (height < PORTRAIT_WINDOW_MIN_HEIGHT_PX) {
    height = PORTRAIT_WINDOW_MIN_HEIGHT_PX
    width = height * aspect
  }

  return clampPortraitWindowSize({
    widthPx: width,
    heightPx: height,
  })
}

export type PortraitCorner = 'nw' | 'ne' | 'sw' | 'se'

/**
 * Apply a corner-drag delta to a portrait window (Familiar Surface resize).
 * Opposite corner stays conceptually anchored.
 */
export function applyPortraitCornerDrag(
  start: CharacterPortraitWindowSize,
  corner: PortraitCorner,
  deltaX: number,
  deltaY: number,
): CharacterPortraitWindowSize {
  let width = start.widthPx
  let height = start.heightPx
  if (corner === 'se' || corner === 'ne') width += deltaX
  else width -= deltaX
  if (corner === 'se' || corner === 'sw') height += deltaY
  else height -= deltaY
  return clampPortraitWindowSize({ widthPx: width, heightPx: height })
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

export type ResizedPortraitBitmap = {
  dataUrl: string
  width: number
  height: number
}

/**
 * Downscale to {@link PORTRAIT_MAX_EDGE_PX} and encode as JPEG for compact saves.
 * Returns intrinsic pixel size of the persisted bitmap (for aspect-fit window).
 */
export async function resizePortraitDataUrl(
  dataUrl: string,
): Promise<ResizedPortraitBitmap> {
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
  return {
    dataUrl: canvas.toDataURL('image/jpeg', PORTRAIT_JPEG_QUALITY),
    width,
    height,
  }
}

export type PortraitIngestResult =
  | {
      ok: true
      dataUrl: string
      width: number
      height: number
      /** Aspect-fit window suggestion for this pick. */
      windowSize: CharacterPortraitWindowSize
    }
  | { ok: false; error: string }

/** Validate + resize a device file into a persistable portrait data URL. */
export async function ingestPortraitFile(file: File): Promise<PortraitIngestResult> {
  if (!isAcceptedPortraitMimeType(file.type)) {
    return { ok: false, error: PORTRAIT_TYPE_ERROR }
  }
  try {
    const raw = await readFileAsDataUrl(file)
    const resized = await resizePortraitDataUrl(raw)
    if (resized.dataUrl.length > PORTRAIT_MAX_DATA_URL_CHARS) {
      return { ok: false, error: PORTRAIT_SIZE_ERROR }
    }
    return {
      ok: true,
      dataUrl: resized.dataUrl,
      width: resized.width,
      height: resized.height,
      windowSize: fitPortraitWindowToImageAspect(resized.width, resized.height),
    }
  } catch {
    return { ok: false, error: PORTRAIT_READ_ERROR }
  }
}

/** Patch helper for identityProfile.portraits merges. */
export function identityProfileWithPortrait(
  profile: CharacterIdentityProfile | undefined,
  formKey: CharacterPortraitFormKey,
  dataUrl: string | undefined,
  windowSize?: CharacterPortraitWindowSize,
): Pick<CharacterIdentityProfile, 'portraits' | 'portraitWindows'> {
  const portraits = withPortraitForForm(profile?.portraits, formKey, dataUrl)
  if (dataUrl == null) {
    return {
      portraits,
      portraitWindows: withPortraitWindowForForm(
        profile?.portraitWindows,
        formKey,
        undefined,
      ),
    }
  }
  if (windowSize) {
    return {
      portraits,
      portraitWindows: withPortraitWindowForForm(
        profile?.portraitWindows,
        formKey,
        windowSize,
      ),
    }
  }
  return { portraits }
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
  presentedForm: ActiveForm
} {
  const json = characterJson as {
    identityProfile?: { portraits?: CharacterIdentityPortraits }
    portraitShareAllowCharacterIds?: string[]
    presentedForm?: ActiveForm
  } | null
  return {
    portraits: normalizeIdentityPortraits(json?.identityProfile?.portraits),
    portraitShareAllowCharacterIds: normalizePortraitShareAllowIds(
      json?.portraitShareAllowCharacterIds,
    ),
    presentedForm: json?.presentedForm === 'morphus' ? 'morphus' : 'primary',
  }
}
