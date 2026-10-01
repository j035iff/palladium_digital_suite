import { useMemo } from 'react'
import { useGmSession } from '../../context/GmSessionContext'
import {
  buildGmCharactersSubTabViews,
  isGmCharactersSubTabId,
} from '../../lib/gm/hubTabs'
import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import { GmCastPanel } from './GmCastPanel'
import { GmPartyPanel } from './GmPartyPanel'
import { GmPlaceholderLane } from './GmPlaceholderLane'

/**
 * Narrative → People — PCs / NPCs (same pipelines as former Characters).
 * Person stub list surfaces when a Notes [[person:]] link focuses here.
 * Also the join-blink clear target (People → PCs).
 */
export function GmPeoplePanel() {
  const {
    charactersSubTabId,
    setCharactersSubTabId,
    partyTabBlink,
    peopleShowPersonStubs,
    setPeopleShowPersonStubs,
  } = useGmSession()

  const subTabs = useMemo(
    () =>
      buildGmCharactersSubTabViews(charactersSubTabId, { partyTabBlink }),
    [charactersSubTabId, partyTabBlink],
  )

  if (peopleShowPersonStubs) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-slate-800 bg-slate-950/60 px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">
              Person stubs
            </p>
            <button
              type="button"
              onClick={() => setPeopleShowPersonStubs(false)}
              className="rounded border border-slate-600 px-2 py-1 text-[10px] font-bold uppercase text-slate-300 hover:border-amber-500"
            >
              Back to PCs / NPCs
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          <GmPlaceholderLane lane="people" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-800 bg-slate-950/60 px-4 py-2">
        <ForgeNavigationBar
          tabs={subTabs}
          activeTabId={charactersSubTabId}
          singleRow
          ariaLabel="People sub-tabs"
          onSelectTab={(id) => {
            if (isGmCharactersSubTabId(id)) setCharactersSubTabId(id)
          }}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {charactersSubTabId === 'pcs' ? <GmPartyPanel /> : <GmCastPanel />}
      </div>
    </div>
  )
}
