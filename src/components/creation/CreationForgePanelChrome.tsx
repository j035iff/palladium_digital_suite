import type { ReactNode } from 'react'
import {
  creationForgePanelHeaderBorderClass,
  creationForgePanelMutedTextClass,
  creationForgePanelSubduedTextClass,
  creationForgePanelSurfaceClass,
} from './creationForgeLeftPanelTheme'

export { creationForgePanelSurfaceClass } from './creationForgeLeftPanelTheme'

type CreationForgePanelChromeProps = {
  title: string
  description?: string
  morphus: boolean
  children: ReactNode
  'aria-label'?: string
}

export function CreationForgePanelChrome({
  title,
  description,
  morphus,
  children,
  'aria-label': ariaLabel,
}: CreationForgePanelChromeProps) {
  const surface = creationForgePanelSurfaceClass(morphus)

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border ${surface}`}
      aria-label={ariaLabel}
    >
      <div
        className={`shrink-0 border-b px-3 py-2 ${creationForgePanelHeaderBorderClass(morphus)}`}
      >
        <h3
          className={`text-xs font-bold uppercase tracking-wide ${creationForgePanelMutedTextClass(morphus)}`}
        >
          {title}
        </h3>
        {description ? (
          <p
            className={`mt-1 text-[11px] leading-snug ${creationForgePanelSubduedTextClass(morphus)}`}
          >
            {description}
          </p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">{children}</div>
    </div>
  )
}
