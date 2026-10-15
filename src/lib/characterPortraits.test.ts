import { describe, expect, it } from 'vitest'
import {
  applyPortraitCornerDrag,
  extractPeerPortraitProjection,
  fitPortraitWindowToImageAspect,
  identityProfileWithPortrait,
  isAcceptedPortraitMimeType,
  isPortraitSharedWithPeer,
  normalizeIdentityPortraits,
  normalizePortraitShareAllowIds,
  portraitFormKeysForCharacter,
  portraitSlotLabel,
  PORTRAIT_WINDOW_DEFAULT,
  PORTRAIT_WINDOW_MAX_HEIGHT_PX,
  PORTRAIT_WINDOW_MAX_WIDTH_PX,
  PORTRAIT_WINDOW_MIN_HEIGHT_PX,
  PORTRAIT_WINDOW_MIN_WIDTH_PX,
  resolveActivePortrait,
  resolvePeerVisiblePortrait,
  resolvePortraitWindowSize,
  setPortraitShareForPeer,
  withPortraitForForm,
  PORTRAIT_TYPE_ERROR,
  ingestPortraitFile,
} from './characterPortraits'

describe('characterPortraits', () => {
  it('accepts jpeg/png/webp only', () => {
    expect(isAcceptedPortraitMimeType('image/jpeg')).toBe(true)
    expect(isAcceptedPortraitMimeType('image/png')).toBe(true)
    expect(isAcceptedPortraitMimeType('image/webp')).toBe(true)
    expect(isAcceptedPortraitMimeType('image/gif')).toBe(false)
    expect(isAcceptedPortraitMimeType('application/pdf')).toBe(false)
    expect(isAcceptedPortraitMimeType('')).toBe(false)
  })

  it('normalizes missing or invalid portrait payloads', () => {
    expect(normalizeIdentityPortraits(undefined)).toEqual({})
    expect(
      normalizeIdentityPortraits({
        primary: 'not-a-data-url',
        morphus: 'data:image/jpeg;base64,abc',
      }),
    ).toEqual({ morphus: 'data:image/jpeg;base64,abc' })
  })

  it('resolves active-form portrait (Facade vs Morphus)', () => {
    const portraits = {
      primary: 'data:image/jpeg;base64,facade',
      morphus: 'data:image/jpeg;base64,morphus',
    }
    expect(resolveActivePortrait(portraits, 'primary')).toBe(
      'data:image/jpeg;base64,facade',
    )
    expect(resolveActivePortrait(portraits, 'morphus')).toBe(
      'data:image/jpeg;base64,morphus',
    )
    expect(resolveActivePortrait({ primary: portraits.primary }, 'morphus')).toBe(
      undefined,
    )
  })

  it('sets Facade and Morphus portraits independently', () => {
    const facade = withPortraitForForm({}, 'primary', 'data:image/jpeg;base64,a')
    const both = withPortraitForForm(facade, 'morphus', 'data:image/jpeg;base64,b')
    expect(both).toEqual({
      primary: 'data:image/jpeg;base64,a',
      morphus: 'data:image/jpeg;base64,b',
    })
    const clearedMorphus = withPortraitForForm(both, 'morphus', undefined)
    expect(clearedMorphus).toEqual({ primary: 'data:image/jpeg;base64,a' })
  })

  it('labels slots for Familiar Surface (no engine form keys)', () => {
    expect(portraitSlotLabel('primary', false)).toBe('Character Image')
    expect(portraitSlotLabel('primary', true)).toBe('Facade Image')
    expect(portraitSlotLabel('morphus', true)).toBe('Morphus Image')
    expect(portraitFormKeysForCharacter(false)).toEqual(['primary'])
    expect(portraitFormKeysForCharacter(true)).toEqual(['primary', 'morphus'])
  })

  it('patches identityProfile.portraits without wiping the other form', () => {
    const patch = identityProfileWithPortrait(
      {
        sex: '',
        age: '',
        heightFeet: '',
        heightInches: '',
        weightLbs: '',
        eyes: '',
        hair: '',
        portraits: { primary: 'data:image/jpeg;base64,a' },
      },
      'morphus',
      'data:image/jpeg;base64,b',
    )
    expect(patch.portraits).toEqual({
      primary: 'data:image/jpeg;base64,a',
      morphus: 'data:image/jpeg;base64,b',
    })
  })

  it('rejects unsupported device file types before decode', async () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' })
    const result = await ingestPortraitFile(file)
    expect(result).toEqual({ ok: false, error: PORTRAIT_TYPE_ERROR })
  })

  it('defaults portrait window to at least double the prior ~176×160 size', () => {
    expect(PORTRAIT_WINDOW_DEFAULT.widthPx).toBeGreaterThanOrEqual(352)
    expect(PORTRAIT_WINDOW_DEFAULT.heightPx).toBeGreaterThanOrEqual(320)
    expect(resolvePortraitWindowSize({}, 'primary')).toEqual(PORTRAIT_WINDOW_DEFAULT)
  })

  it('fits new picks to image aspect within min/max', () => {
    const landscape = fitPortraitWindowToImageAspect(800, 400)
    expect(landscape.widthPx).toBeGreaterThanOrEqual(PORTRAIT_WINDOW_MIN_WIDTH_PX)
    expect(landscape.heightPx).toBeGreaterThanOrEqual(PORTRAIT_WINDOW_MIN_HEIGHT_PX)
    expect(landscape.widthPx).toBeLessThanOrEqual(PORTRAIT_WINDOW_MAX_WIDTH_PX)
    expect(landscape.heightPx).toBeLessThanOrEqual(PORTRAIT_WINDOW_MAX_HEIGHT_PX)
    expect(landscape.widthPx / landscape.heightPx).toBeCloseTo(2, 0)

    const portrait = fitPortraitWindowToImageAspect(400, 800)
    expect(portrait.heightPx).toBeGreaterThan(portrait.widthPx)
  })

  it('applies corner-drag deltas with clamping', () => {
    const start = { widthPx: 352, heightPx: 320 }
    const grown = applyPortraitCornerDrag(start, 'se', 40, 40)
    expect(grown.widthPx).toBe(392)
    expect(grown.heightPx).toBe(360)
    const shrunk = applyPortraitCornerDrag(start, 'nw', 40, 40)
    // nw: width -= dx, height -= dy
    expect(shrunk.widthPx).toBe(312)
    expect(shrunk.heightPx).toBe(280)
    const minned = applyPortraitCornerDrag(start, 'se', -1000, -1000)
    expect(minned.widthPx).toBe(PORTRAIT_WINDOW_MIN_WIDTH_PX)
    expect(minned.heightPx).toBe(PORTRAIT_WINDOW_MIN_HEIGHT_PX)
  })

  it('stores portrait window size with portrait patch when provided', () => {
    const patch = identityProfileWithPortrait(
      {
        sex: '',
        age: '',
        heightFeet: '',
        heightInches: '',
        weightLbs: '',
        eyes: '',
        hair: '',
      },
      'primary',
      'data:image/jpeg;base64,a',
      { widthPx: 400, heightPx: 300 },
    )
    expect(patch.portraitWindows?.primary).toEqual({
      widthPx: 400,
      heightPx: 300,
    })
  })

  it('defaults portrait share allowlist to off (safer)', () => {
    expect(normalizePortraitShareAllowIds(undefined)).toEqual([])
    expect(isPortraitSharedWithPeer(undefined, 'char_b')).toBe(false)
    expect(isPortraitSharedWithPeer(['char_b'], 'char_b')).toBe(true)
    expect(setPortraitShareForPeer([], 'char_b', true)).toEqual(['char_b'])
    expect(setPortraitShareForPeer(['char_b'], 'char_b', false)).toEqual([])
  })

  it('resolves peer-visible portrait only when allowlisted', () => {
    const subject = {
      portraits: { primary: 'data:image/jpeg;base64,a' },
      portraitShareAllowCharacterIds: ['char_b'],
    }
    expect(resolvePeerVisiblePortrait(subject, 'char_b')).toBe(
      'data:image/jpeg;base64,a',
    )
    expect(resolvePeerVisiblePortrait(subject, 'char_c')).toBeUndefined()
    expect(resolvePeerVisiblePortrait(subject, 'char_b', 'morphus')).toBeUndefined()
  })

  it('extracts portrait projection from party.snapshot JSON', () => {
    expect(
      extractPeerPortraitProjection({
        identityProfile: {
          portraits: { primary: 'data:image/jpeg;base64,x' },
        },
        portraitShareAllowCharacterIds: ['peer_1'],
      }),
    ).toEqual({
      portraits: { primary: 'data:image/jpeg;base64,x' },
      portraitShareAllowCharacterIds: ['peer_1'],
      presentedForm: 'primary',
    })
    expect(
      extractPeerPortraitProjection({
        presentedForm: 'morphus',
        identityProfile: {
          portraits: { morphus: 'data:image/jpeg;base64,m' },
        },
      }),
    ).toMatchObject({ presentedForm: 'morphus' })
  })
})
