import { useMemo } from 'react'
import { useGmSession } from '../../context/GmSessionContext'
import {
  buildGmCharactersSubTabViews,
  isGmCharactersSubTabId,
} from '../../lib/gm/hubTabs'
import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import { GmCastPanel } from './GmCastPanel'
import { GmPartyPanel } from './GmPartyPanel'

/**
 * Shared Characters workspace under Narrative and Combat (Pillar 9).
 * PCs = joined seats only; NPCs = local-machine characters + fodder — same pipelines, no forks.
 */
export function GmCharactersPanel() {
  const { charactersSubTabId, setCharactersSubTabId, partyTabBlink } =
    useGmSession()

  const subTabs = useMemo(
    () =>
      buildGmCharactersSubTabViews(charactersSubTabId, { partyTabBlink }),
    [charactersSubTabId, partyTabBlink],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-800 bg-slate-950/60 px-4 py-2">
        <ForgeNavigationBar
          tabs={subTabs}
          activeTabId={charactersSubTabId}
          singleRow
          ariaLabel="Characters sub-tabs"
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
