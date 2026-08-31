import { useMemo } from 'react'
import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import {
  buildGmHubTabViews,
  gmHubTabTitle,
  isGmHubTabId,
  type GmHubMode,
  type GmHubTabId,
} from '../../lib/gm/hubTabs'

const MODES: readonly GmHubMode[] = ['story', 'combat']

export function GmTabBar({
  mode,
  tabId,
  onModeChange,
  onTabChange,
  campaignOpen,
}: {
  mode: GmHubMode
  tabId: GmHubTabId
  onModeChange: (mode: GmHubMode) => void
  onTabChange: (tab: GmHubTabId) => void
  campaignOpen: boolean
}) {
  const tabs = useMemo(
    () => buildGmHubTabViews(tabId, { campaignOpen }),
    [tabId, campaignOpen],
  )

  return (
    <div
      className="shrink-0 border-b border-slate-800 bg-slate-950/90 px-4 py-2"
      aria-label="GM Hub mode and tabs"
    >
      <div className="flex flex-col gap-1.5">
        <div
          className="flex w-fit rounded-lg border-2 border-amber-700/70 bg-slate-950 p-1"
          role="group"
          aria-label="GM Hub mode"
        >
          {MODES.map((row) => {
            const active = mode === row
            return (
              <button
                key={row}
                type="button"
                aria-pressed={active}
                onClick={() => onModeChange(row)}
                className={`rounded-md px-4 py-1.5 text-xs font-black uppercase tracking-wide transition ${
                  active
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-amber-200/80 hover:bg-amber-950/60'
                }`}
              >
                {row}
              </button>
            )
          })}
        </div>
        <ForgeNavigationBar
          tabs={tabs}
          activeTabId={tabId}
          singleRow
          ariaLabel="GM Hub tabs"
          onSelectTab={(id) => {
            if (isGmHubTabId(id)) onTabChange(id)
          }}
        />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">
          {gmHubTabTitle(mode, tabId)}
        </p>
      </div>
    </div>
  )
}
