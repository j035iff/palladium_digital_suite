import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { clampOverlayTooltipPosition } from '../../lib/overlayTooltipPosition'
import type { LiveSheetIdentityRolloverBlock } from '../../lib/liveSheetIdentityHeader'

type Props = {
  blocks: readonly LiveSheetIdentityRolloverBlock[]
  morphusActive: boolean
  children: ReactNode
  /** Match identity strip alignment (mockup Layer 1 centers the class line). */
  align?: 'left' | 'center'
}

/**
 * Hover + tap-to-pin book rollover for the identity class line (ruling #4).
 * Familiar Surface: touch tables get a non-hover path; click again / Escape / outside clears pin.
 */
export function IdentityHeaderRollover({
  blocks,
  morphusActive,
  children,
  align = 'left',
}: Props) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = (hover || pinned) && blocks.length > 0
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
        { width: tipRect.width || 360, height: tipRect.height || 80 },
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
  }, [open, blocks])

  useEffect(() => {
    if (!pinned) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPinned(false)
    }
    const onPointer = (e: MouseEvent) => {
      const a = anchorRef.current
      const t = tipRef.current
      if (a?.contains(e.target as Node) || t?.contains(e.target as Node)) return
      setPinned(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [pinned])

  if (blocks.length === 0) {
    return <>{children}</>
  }

  const tone = morphusActive
    ? 'border-violet-400/90 bg-black/92 text-violet-50'
    : 'border-blue-400 bg-white text-slate-900'

  return (
    <div
      ref={anchorRef}
      className={`min-w-0 max-w-full ${align === 'center' ? 'mx-auto' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        className={`max-w-full truncate ${align === 'center' ? 'text-center' : 'text-left'}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Book sources — hover or tap to pin"
        onClick={() => setPinned((v) => !v)}
      >
        {children}
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={tipRef}
              role="tooltip"
              className={`fixed z-[80] max-h-64 overflow-y-auto rounded-md border-2 px-3 py-2 text-left text-[11px] leading-snug shadow-lg ${
                pinned ? '' : 'pointer-events-none '
              }${tone}`}
              style={{
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                maxWidth: pos?.maxWidth ?? 360,
                visibility: pos ? 'visible' : 'hidden',
              }}
            >
              <ul className="space-y-2">
                {blocks.map((block) => (
                  <li key={`${block.kind}-${block.heading}`}>
                    <p className="font-black uppercase tracking-wide opacity-80">
                      {block.heading}
                    </p>
                    {block.description ? (
                      <p className="mt-0.5 whitespace-pre-wrap">
                        {block.description.length > 280
                          ? `${block.description.slice(0, 277)}…`
                          : block.description}
                      </p>
                    ) : null}
                    {block.citation ? (
                      <p className="mt-0.5 font-mono text-[10px] font-semibold opacity-75">
                        {block.citation}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
