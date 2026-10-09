import { describe, expect, it } from 'vitest'
import { clampOverlayTooltipPosition } from './overlayTooltipPosition'

describe('clampOverlayTooltipPosition', () => {
  const viewport = { width: 800, height: 600 }
  const bounds = {
    top: 40,
    left: 40,
    width: 720,
    height: 520,
    right: 760,
    bottom: 560,
  }

  it('centers above when there is room', () => {
    const anchor = {
      top: 200,
      left: 300,
      width: 100,
      height: 80,
      right: 400,
      bottom: 280,
    }
    const pos = clampOverlayTooltipPosition(
      anchor,
      { width: 200, height: 60 },
      bounds,
      viewport,
    )
    expect(pos.side).toBe('above')
    expect(pos.top).toBe(200 - 60 - 8)
    expect(pos.left).toBe(300 + 50 - 100) // centered on anchor
  })

  it('shifts left-edge tooltips into the overlay bounds', () => {
    const anchor = {
      top: 200,
      left: 48,
      width: 80,
      height: 80,
      right: 128,
      bottom: 280,
    }
    const pos = clampOverlayTooltipPosition(
      anchor,
      { width: 300, height: 60 },
      bounds,
      viewport,
    )
    expect(pos.left).toBeGreaterThanOrEqual(bounds.left + 8)
    expect(pos.left + pos.maxWidth).toBeLessThanOrEqual(bounds.right - 8)
  })

  it('shifts right-edge tooltips into the overlay bounds', () => {
    const anchor = {
      top: 200,
      left: 680,
      width: 70,
      height: 80,
      right: 750,
      bottom: 280,
    }
    const pos = clampOverlayTooltipPosition(
      anchor,
      { width: 300, height: 60 },
      bounds,
      viewport,
    )
    expect(pos.left).toBeGreaterThanOrEqual(bounds.left + 8)
    expect(pos.left + pos.maxWidth).toBeLessThanOrEqual(bounds.right - 8)
  })

  it('flips below when there is no room above', () => {
    const anchor = {
      top: 50,
      left: 300,
      width: 100,
      height: 60,
      right: 400,
      bottom: 110,
    }
    const pos = clampOverlayTooltipPosition(
      anchor,
      { width: 200, height: 80 },
      bounds,
      viewport,
    )
    expect(pos.side).toBe('below')
    expect(pos.top).toBe(110 + 8)
  })
})
