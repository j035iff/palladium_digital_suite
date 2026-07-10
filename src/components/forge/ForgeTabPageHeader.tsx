import type { CSSProperties, ReactNode, RefObject } from 'react'
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
  /** When true, omit the duplicate tab title (active pill already shows it). */
  hideTitle = false,
  /** Play collapse into the Continue tab (parent owns timing + target offset). */
  collapsing = false,
  collapseOffset,
  onCollapseEnd,
  bannerRef,
}: {
  title: string
  actions?: ReactNode
  requirements?: readonly ForgeTabRequirement[]
  spawnPrepRequirements?: readonly ForgeTabRequirement[]
  visual?: ForgeTabVisualState
  subheader?: ReactNode
  hideTitle?: boolean
  collapsing?: boolean
  /** Pixel position of Continue tab center relative to banner top-left (transform origin). */
  collapseOffset?: { dx: number; dy: number } | null
  onCollapseEnd?: () => void
  bannerRef?: RefObject<HTMLDivElement | null>
}) {
  const theme = forgeTabVisualTheme(visual)
  const morphus =
    visual === 'active' ||
    visual === 'complete' ||
    visual === 'incomplete' ||
    visual === 'conflict'

  const continueReqs = requirements ?? []
  const spawnReqs = spawnPrepRequirements ?? []
  const hasContinueReqs = continueReqs.length > 0
  const hasSpawnReqs = spawnReqs.length > 0
  const hasSubheader = subheader != null
  const hasActions = actions != null
  const showTitle = !hideTitle
  const showBannerChrome =
    showTitle ||
    hasContinueReqs ||
    hasSpawnReqs ||
    hasSubheader ||
    hasActions ||
    visual === 'na' ||
    collapsing

  if (!showBannerChrome) {
    return (
      <h2 id={FORGE_TAB_PAGE_HEADING_ID} className="sr-only">
        {title}
      </h2>
    )
  }

  const collapseStyle =
    collapsing && collapseOffset
      ? ({
          '--pds-collapse-ox': `${collapseOffset.dx}px`,
          '--pds-collapse-oy': `${collapseOffset.dy}px`,
        } as CSSProperties)
      : undefined

  return (
    <div
      ref={bannerRef}
      style={collapseStyle}
      className={`relative overflow-hidden rounded-lg px-4 py-2 ${
        collapsing
          ? 'pds-forge-banner-collapse bg-amber-500 ring-1 ring-amber-300'
          : theme.headerBar
      }`}
      onAnimationEnd={(event) => {
        if (!collapsing) return
        if (event.target !== event.currentTarget) return
        onCollapseEnd?.()
      }}
    >
      {visual === 'na' && !collapsing ? <NaHeaderWatermark /> : null}
      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          {showTitle ? (
            <h2
              id={FORGE_TAB_PAGE_HEADING_ID}
              className={`text-sm font-semibold uppercase tracking-wide ${
                collapsing ? 'text-amber-950' : theme.headerTitle
              }`}
            >
              {title}
            </h2>
          ) : (
            <h2 id={FORGE_TAB_PAGE_HEADING_ID} className="sr-only">
              {title}
            </h2>
          )}
          {subheader ? <div className={showTitle ? 'mt-2' : ''}>{subheader}</div> : null}
          {hasContinueReqs ? (
            <ForgeTabRequirementsChecklist
              requirements={continueReqs}
              morphus={morphus}
              tone="continue"
            />
          ) : null}
          {hasSpawnReqs ? (
            <ForgeTabRequirementsChecklist
              requirements={spawnReqs}
              morphus={morphus}
              tone="spawn"
            />
          ) : null}
        </div>
        {actions ? <div className="shrink-0 pt-0.5">{actions}</div> : null}
      </div>
    </div>
  )
}
