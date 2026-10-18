import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { clampOverlayTooltipPosition } from '../../lib/overlayTooltipPosition'

export type ClampedOverlayTooltipTone = 'sheet' | 'weapon' | 'indigo'

type Props = {
  /** Breakdown / equation string (or rich tip content). */
  tip: ReactNode
  morphus: boolean
  /** Visual tone — combat sheet tiles, weapon chips, or Bonuses-overlay indigo. */
  tone?: ClampedOverlayTooltipTone
  /** Extra classes on the hover/focus anchor shell. */
  className?: string
  children: ReactNode
}

const TONE_CLASS: Record<
  ClampedOverlayTooltipTone,
  { facade: string; morphus: string }
> = {
  sheet: {
    facade: 'border-blue-400 bg-white text-slate-900',
    morphus: 'border-violet-400/90 bg-black/92 text-violet-50',
  },
  weapon: {
    facade: 'border-sky-700 bg-white text-slate-900',
    morphus: 'border-amber-300/70 bg-black/93 text-amber-50',
  },
  indigo: {
    facade: 'border-slate-400 bg-white text-slate-900',
    morphus: 'border-indigo-600/90 bg-black/95 text-violet-50',
  },
}

/**
 * Hover/focus bonus-breakdown tooltip — `position: fixed` + viewport clamp,
 * portaled to `document.body` so expand panels with `overflow: hidden` never clip it
 * (Unified Path with Bonuses/Skills `clampOverlayTooltipPosition`).
 */
export function ClampedOverlayTooltip({
  tip,
  morphus,
  tone = 'sheet',
  className = '',
  children,
}: Props) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{
    top: number
    left: number
    maxWidth: number
  } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const anchorEl = anchorRef.current
    const tipEl = tipRef.current
    if (!anchorEl || !tipEl) return

    const place = () => {
      const tipRect = tipEl.getBoundingClientRect()
      const next = clampOverlayTooltipPosition(
        anchorEl.getBoundingClientRect(),
        { width: tipRect.width || 352, height: tipRect.height || 48 },
        null,
      )
      setPos({ top: next.top, left: next.left, maxWidth: next.maxWidth })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, tip])

  const toneClass = morphus ? TONE_CLASS[tone].morphus : TONE_CLASS[tone].facade

  return (
    <div
      ref={anchorRef}
      className={className}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={tipRef}
              role="tooltip"
              className={`pointer-events-none fixed z-[80] max-h-48 overflow-y-auto rounded-md border-2 px-2 py-1.5 text-left font-mono text-[10px] font-semibold leading-snug shadow-lg ${toneClass}`}
              style={{
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                maxWidth: pos?.maxWidth ?? 352,
                visibility: pos ? 'visible' : 'hidden',
              }}
            >
              {tip}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
