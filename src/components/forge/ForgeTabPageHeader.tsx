import type { ReactNode } from 'react'
import type {
  ForgeTabRequirement,
  ForgeTabVisualState,
} from '../../lib/forgeNavigation/types'
import { forgeTabVisualTheme } from '../../lib/forgeNavigation/forgeTabVisual'
import { ForgeTabRequirementsChecklist } from './ForgeTabRequirementsChecklist'

export const FORGE_TAB_PAGE_HEADING_ID = 'forge-tab-page-heading'

function NaHeaderWatermark() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-end overflow-hidden pr-4"
    >
      <span className="select-none font-black uppercase tracking-tighter text-red-500/20 dark:text-red-400/25">
        N/A
      </span>
    </span>
  )
}

export function ForgeTabPageHeader({
  title,
  actions,
  requirements,
  spawnPrepRequirements,
  visual = 'active',
  subheader,
}: {
  title: string
  actions?: ReactNode
  requirements?: readonly ForgeTabRequirement[]
  spawnPrepRequirements?: readonly ForgeTabRequirement[]
  visual?: ForgeTabVisualState
  subheader?: ReactNode
}) {
  const theme = forgeTabVisualTheme(visual)
  const morphus =
    visual === 'active' ||
    visual === 'complete' ||
    visual === 'incomplete' ||
    visual === 'conflict'

  return (
    <div
      className={`relative overflow-hidden rounded-lg px-4 py-2.5 ${theme.headerBar}`}
    >
      {visual === 'na' ? <NaHeaderWatermark /> : null}
      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2
            id={FORGE_TAB_PAGE_HEADING_ID}
            className={`text-sm font-semibold uppercase tracking-wide ${theme.headerTitle}`}
          >
            {title}
          </h2>
          {subheader ? <div className="mt-2">{subheader}</div> : null}
          {requirements && requirements.length > 0 ? (
            <ForgeTabRequirementsChecklist
              requirements={requirements}
              morphus={morphus}
              tone="continue"
              heading="To continue"
            />
          ) : null}
          {spawnPrepRequirements && spawnPrepRequirements.length > 0 ? (
            <ForgeTabRequirementsChecklist
              requirements={spawnPrepRequirements}
              morphus={morphus}
              tone="spawn"
              heading="Before spawn"
            />
          ) : null}
        </div>
        {actions ? <div className="shrink-0 pt-0.5">{actions}</div> : null}
      </div>
    </div>
  )
}
