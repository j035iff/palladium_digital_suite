import { useMemo } from 'react'
import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import {
  buildGmHubTabViews,
  gmHubModeLabel,
  gmHubTabTitle,
  isGmHubTabIdForMode,
  isViewingNarrativePeoplePcs,
  type GmCharactersSubTabId,
  type GmHubMode,
  type GmHubTabId,
} from '../../lib/gm/hubTabs'

const MODES: readonly GmHubMode[] = ['story', 'combat']

/**
 * Top nav under Hub title — Narrative/Combat + lane-specific tabs.
 * Compact shell places this in the header (no bottom bar).
 * Internal hubMode id `story` displays as Narrative.
 */
export function GmTabBar({
  mode,
  tabId,
  charactersSubTabId,
  onModeChange,
  onTabChange,
  campaignOpen,
  partyTabBlink = false,
}: {
  mode: GmHubMode
  tabId: GmHubTabId
  charactersSubTabId: GmCharactersSubTabId
  onModeChange: (mode: GmHubMode) => void
  onTabChange: (tab: GmHubTabId) => void
  campaignOpen: boolean
  /** Ephemeral Join Table cue — clears when Narrative → People → PCs opens. */
  partyTabBlink?: boolean
}) {
  const tabs = useMemo(
    () => buildGmHubTabViews(mode, tabId, { campaignOpen, partyTabBlink }),
    [mode, tabId, campaignOpen, partyTabBlink],
  )

  const showJoinerHint =
    partyTabBlink &&
    !isViewingNarrativePeoplePcs(mode, tabId, charactersSubTabId)

  return (
    <div aria-label="GM Hub mode and tabs">
      <div className="flex flex-col gap-1.5">
        <div
          className="flex w-fit rounded-lg border-2 border-amber-700/70 bg-slate-950 p-1"
          role="group"
          aria-label="GM Hub mode"
        >
          {MODES.map((row) => {
            const active = mode === row
            const modeAttention =
              partyTabBlink && row === 'story' && mode === 'combat'
            return (
              <button
                key={row}
                type="button"
                aria-pressed={active}
                data-attention={modeAttention ? 'true' : undefined}
                onClick={() => onModeChange(row)}
                className={`rounded-md px-4 py-1.5 text-xs font-black uppercase tracking-wide transition ${
                  active
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : modeAttention
                      ? 'animate-pulse text-amber-100 ring-2 ring-amber-400/80'
                      : 'text-amber-200/80 hover:bg-amber-950/60'
                }`}
              >
                {gmHubModeLabel(row)}
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
            if (isGmHubTabIdForMode(mode, id)) onTabChange(id)
          }}
        />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">
          {gmHubTabTitle(mode, tabId)}
          {showJoinerHint ? (
            <span className="ml-2 font-bold normal-case tracking-normal text-amber-400">
              · new joiner on Narrative → People → PCs
            </span>
          ) : null}
        </p>
      </div>
    </div>
  )
}
