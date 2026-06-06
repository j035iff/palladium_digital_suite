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

export function ForgeNavigationBar({
  tabs,
  activeTabId,
  onSelectTab,
}: {
  tabs: ForgeTabView[]
  activeTabId: string
  onSelectTab: (id: string) => void
}) {
  return (
    <nav
      aria-label="Forge steps"
      className="flex flex-wrap items-center gap-2 border-b border-dashed border-slate-300 pb-0 dark:border-violet-800"
    >
      {tabs.map((tab) => {
        const isViewing = tab.isViewing === true || tab.id === activeTabId
        const theme = forgeTabVisualTheme(tab.visual)
        const title = [
          tab.label,
          tab.visual === 'na' ? 'Not applicable to this build' : '',
          tab.visual === 'locked' ? 'Not unlocked yet' : '',
          tab.conflictReason,
          tab.blockers.length ? tab.blockers.join('; ') : '',
        ]
          .filter(Boolean)
          .join(' — ')

        return (
          <button
            key={tab.id}
            type="button"
            disabled={!tab.clickable}
            title={title || tab.label}
            onClick={() => {
              if (tab.clickable) onSelectTab(tab.id)
            }}
            className={`relative overflow-hidden rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-95 ${theme.pill} ${
              isViewing ? VIEWING_RING : ''
            }`}
            aria-current={isViewing ? 'step' : undefined}
          >
            {tab.visual === 'na' ? <NaTabWatermark /> : null}
            <span className="relative z-[1]">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
