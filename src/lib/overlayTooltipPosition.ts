/**
 * Clamp / flip floating tooltips so they stay inside an overlay or the viewport
 * (Familiar Surface — no spill off the ends of the Bonuses dialog).
 */

export type OverlayTooltipBox = {
  top: number
  left: number
  width: number
  height: number
  right: number
  bottom: number
}

export type OverlayTooltipPlacement = {
  /** CSS `position: fixed` top (px). */
  top: number
  /** CSS `position: fixed` left (px). */
  left: number
  maxWidth: number
  /** Preferred side after flip. */
  side: 'above' | 'below'
}

const PAD = 8
const GAP = 8
const DEFAULT_MAX_WIDTH = 352 // ~22rem

function asBox(r: DOMRect | OverlayTooltipBox): OverlayTooltipBox {
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    right: r.right,
    bottom: r.bottom,
  }
}

/**
 * Place a tooltip relative to an anchor, flipping vertically and shifting
 * horizontally so it stays inside `bounds` (dialog) or the viewport.
 */
export function clampOverlayTooltipPosition(
  anchorRect: DOMRect | OverlayTooltipBox,
  tipSize: { width: number; height: number },
  boundsRect?: DOMRect | OverlayTooltipBox | null,
  viewport: { width: number; height: number } = {
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  },
): OverlayTooltipPlacement {
  const anchor = asBox(anchorRect)
  const bounds = boundsRect ? asBox(boundsRect) : null

  const minX = Math.max(PAD, bounds ? bounds.left + PAD : PAD)
  const maxX = Math.min(
    viewport.width - PAD,
    bounds ? bounds.right - PAD : viewport.width - PAD,
  )
  const minY = Math.max(PAD, bounds ? bounds.top + PAD : PAD)
  const maxY = Math.min(
    viewport.height - PAD,
    bounds ? bounds.bottom - PAD : viewport.height - PAD,
  )

  const availW = Math.max(120, maxX - minX)
  const maxWidth = Math.min(
    tipSize.width > 0 ? tipSize.width : DEFAULT_MAX_WIDTH,
    DEFAULT_MAX_WIDTH,
    availW,
  )
  const tipH = tipSize.height > 0 ? tipSize.height : 48

  let left = anchor.left + anchor.width / 2 - maxWidth / 2
  left = Math.max(minX, Math.min(left, maxX - maxWidth))

  const spaceAbove = anchor.top - minY
  const spaceBelow = maxY - anchor.bottom
  const preferAbove = spaceAbove >= tipH + GAP || spaceAbove >= spaceBelow

  let side: 'above' | 'below' = preferAbove ? 'above' : 'below'
  let top = preferAbove ? anchor.top - tipH - GAP : anchor.bottom + GAP

  if (preferAbove && top < minY) {
    side = 'below'
    top = anchor.bottom + GAP
  }
  if (side === 'below' && top + tipH > maxY) {
    if (spaceAbove >= tipH + GAP) {
      side = 'above'
      top = anchor.top - tipH - GAP
    } else {
      top = Math.max(minY, maxY - tipH)
    }
  }
  if (top < minY) top = minY
  if (top + tipH > maxY) top = Math.max(minY, maxY - tipH)

  return { top, left, maxWidth, side }
}
