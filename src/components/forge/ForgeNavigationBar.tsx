import type { ForgeTabView, ForgeTabVisualState } from '../../lib/forgeNavigation/types'

const VISUAL_CLASSES: Record<ForgeTabVisualState, string> = {
  complete: 'bg-emerald-600 text-white ring-1 ring-emerald-400/60',
  active: 'bg-blue-600 text-white ring-2 ring-blue-300',
  incomplete: 'bg-red-600 text-white ring-1 ring-red-400/70',
  conflict: 'bg-amber-500 text-amber-950 ring-1 ring-amber-300',
  locked: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
  na: 'bg-slate-900 text-slate-400 ring-1 ring-slate-600 cursor-not-allowed',
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
      className="flex flex-wrap items-center gap-2 border-b border-dashed border-slate-300 pb-3 dark:border-violet-800"
    >
      {tabs.map((tab) => {
        const title = [
          tab.label,
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
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-90 ${VISUAL_CLASSES[tab.visual]}`}
            aria-current={tab.id === activeTabId ? 'step' : undefined}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
