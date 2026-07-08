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
          tab.spawnProfileIncomplete
            ? 'Step complete — character profile still needed before spawn'
            : '',
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
            type="button"
            disabled={!tab.clickable}
            title={title || tab.label}
            onClick={() => {
              if (tab.clickable) onSelectTab(tab.id)
            }}
            className={`relative overflow-hidden rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition ${theme.pill} ${
              tab.visual === 'na' ? 'cursor-pointer' : ''
            } disabled:cursor-not-allowed disabled:opacity-95 ${isViewing ? VIEWING_RING : ''}`}
            aria-current={isViewing ? 'step' : undefined}
            aria-disabled={!tab.clickable ? true : undefined}
          >
            {tab.visual === 'na' ? <NaTabWatermark /> : null}
            {tab.spawnProfileIncomplete ? (
              <span
                className="absolute -right-0.5 -top-0.5 z-[2] h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-950"
                aria-hidden
              />
            ) : null}
            <span className="relative z-[1]">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
