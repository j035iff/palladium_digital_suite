import type { ReactNode } from 'react'

/**
 * Shared GM Hub workspace scroll surface (Pillar 9).
 *
 * Hub chrome (title + Narrative/Combat lane tabs) stays anchored on
 * {@link GmHubShell}. Every workspace tab mounts inside this pane so
 * overflowing content scrolls here — do not fork per-tab overflow hacks.
 */
export const GM_HUB_CONTENT_PANE_CLASS =
  'min-h-0 flex-1 overflow-y-auto overscroll-contain'

type Props = {
  children: ReactNode
  className?: string
  /** Optional accessible name for the scrolling region. */
  'aria-label'?: string
}

export function GmHubContentPane({
  children,
  className = '',
  'aria-label': ariaLabel = 'Hub workspace',
}: Props) {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={`${GM_HUB_CONTENT_PANE_CLASS} ${className}`.trim()}
    >
      {children}
    </div>
  )
}
