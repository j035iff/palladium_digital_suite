import type { ReactNode } from 'react'

/**
 * When a forge tab is N/A, show its content read-only — no clicks, hovers, or pointer cursors.
 * An outer scroll shell keeps the preview browsable without re-enabling controls.
 */
export function ForgeTabInactiveShell({
  inactive,
  className = '',
  children,
}: {
  inactive: boolean
  className?: string
  children: ReactNode
}) {
  if (!inactive) {
    return className ? <div className={className}>{children}</div> : <>{children}</>
  }

  return (
    <div
      className={`cursor-default overflow-y-auto overscroll-contain ${className}`.trim()}
    >
      <div
        className="pointer-events-none cursor-default select-none [&_*]:pointer-events-none [&_*]:cursor-default [&_*]:select-none"
        inert
        aria-disabled="true"
      >
        {children}
      </div>
    </div>
  )
}
