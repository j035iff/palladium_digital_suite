import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react'
import type { ForgeTabView } from '../../lib/forgeNavigation/types'
import { forgeTabVisualTheme } from '../../lib/forgeNavigation/forgeTabVisual'

/** Viewport tab — visible on every status color (green/red/blue/slate). */
const VIEWING_RING =
  'relative z-[1] !ring-2 !ring-slate-900 !ring-offset-2 !ring-offset-slate-100 dark:!ring-white dark:!ring-offset-slate-900'

function NaTabWatermark() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-full"
    >
      <span className="select-none text-lg font-black uppercase tracking-tighter text-red-500/30 dark:text-red-400/35">
        N/A
      </span>
    </span>
  )
}

/** First non-N/A tab after `activeTabId` — used after Continue to open the next step. */
export function nextForgeTabIdAfter(
  tabs: readonly ForgeTabView[],
  activeTabId: string,
): string | null {
  const idx = tabs.findIndex((tab) => tab.id === activeTabId)
  if (idx < 0) return null
  for (let i = idx + 1; i < tabs.length; i++) {
    const tab = tabs[i]
    if (!tab || tab.visual === 'na') continue
    return tab.id
  }
  return null
}

export function ForgeNavigationBar({
  tabs,
  activeTabId,
  onSelectTab,
  onContinueTab,
  continueEnabled = false,
  continueTooltip,
  /** Keep pills on one row; overflow scrolls horizontally (Phase 2 short-viewport chrome). */
  singleRow = false,
  /** Exposes the Continue control for banner→tab collapse targeting. */
  continueTargetRef,
}: {
  tabs: ForgeTabView[]
  activeTabId: string
  onSelectTab: (id: string) => void
  /** When set and the viewing tab is Continue-ready, that pill advances progression. */
  onContinueTab?: (id: string) => void
  continueEnabled?: boolean
  continueTooltip?: string
  singleRow?: boolean
  continueTargetRef?: RefObject<HTMLButtonElement | null>
}) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!singleRow) return
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  }, [activeTabId, singleRow, tabs])

  return (
    <nav
      aria-label="Forge steps"
      className={
        singleRow
          ? 'flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]'
          : 'flex flex-wrap items-center gap-2'
      }
    >
      {tabs.map((tab) => {
        const isViewing = tab.isViewing === true || tab.id === activeTabId
        const isContinuePill =
          isViewing &&
          continueEnabled &&
          tab.visual !== 'complete' &&
          onContinueTab != null
        const theme = forgeTabVisualTheme(tab.visual)
        const title = isContinuePill
          ? continueTooltip ||
            'Validate this section and open the next step. Choices stay editable.'
          : [
              tab.label,
              tab.visual === 'na' ? tab.naReason ?? 'Not applicable to this build' : '',
              tab.visual === 'locked' ? 'Not unlocked yet' : '',
              tab.conflictReason,
              tab.blockers.length ? tab.blockers.join('; ') : '',
            ]
              .filter(Boolean)
              .join(' — ')

        return (
          <button
            key={tab.id}
            ref={(node) => {
              if (isViewing) activeRef.current = node
              if (isContinuePill && continueTargetRef) {
                ;(continueTargetRef as MutableRefObject<HTMLButtonElement | null>).current =
                  node
              }
            }}
            type="button"
            disabled={!isContinuePill && !tab.clickable}
            title={title || tab.label}
            onClick={() => {
              if (isContinuePill) {
                onContinueTab(tab.id)
                return
              }
              if (tab.clickable) onSelectTab(tab.id)
            }}
            className={
              isContinuePill
                ? 'pds-forge-continue shrink-0'
                : `relative shrink-0 overflow-hidden rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition ${theme.pill} ${
                    tab.visual === 'na' ? 'cursor-pointer' : ''
                  } ${
                    !tab.clickable ? 'cursor-not-allowed opacity-95' : ''
                  } ${isViewing ? VIEWING_RING : ''}`
            }
            aria-current={isViewing ? 'step' : undefined}
            aria-disabled={!isContinuePill && !tab.clickable ? true : undefined}
            aria-label={
              isContinuePill
                ? `Continue — validate ${tab.label} and open the next step`
                : undefined
            }
          >
            {isContinuePill ? (
              <>
                <span className="relative z-[1] whitespace-nowrap">Continue</span>
                <span className="pds-forge-continue__chevron" aria-hidden>
                  ›
                </span>
              </>
            ) : (
              <>
                {tab.visual === 'na' ? <NaTabWatermark /> : null}
                <span className="relative z-[1] whitespace-nowrap">{tab.label}</span>
              </>
            )}
          </button>
        )
      })}
    </nav>
  )
}
