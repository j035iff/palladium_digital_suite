import { useMemo } from 'react'
import { useGmSession } from '../../context/GmSessionContext'
import {
  conversionRuleDescription,
  conversionRuleLabel,
} from '../../lib/gm/campaignForge'
import {
  buildGmStoryHomeSubTabViews,
  isGmStoryHomeSubTabId,
} from '../../lib/gm/hubTabs'
import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import { GmNotesScratchpad } from './GmNotesScratchpad'
import { GmPlaceholderLane } from './GmPlaceholderLane'

/**
 * Narrative Home (hubMode `story`) — People / Places / Things / Notes.
 * Combat Home stays GmCombatPanel (no these sub-tabs).
 * storyHomeSubTabId lives in shared hub context so Notes links can navigate here.
 */
export function GmSessionsPanel() {
  const { session, storyHomeSubTabId, setStoryHomeSubTabId } = useGmSession()

  const subTabs = useMemo(
    () => buildGmStoryHomeSubTabViews(storyHomeSubTabId),
    [storyHomeSubTabId],
  )

  if (!session) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-500">
          Open a campaign from the launcher to start a play session.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-800 bg-slate-950/60 px-4 py-2">
        <ForgeNavigationBar
          tabs={subTabs}
          activeTabId={storyHomeSubTabId}
          singleRow
          ariaLabel="Narrative Home sub-tabs"
          onSelectTab={(id) => {
            if (isGmStoryHomeSubTabId(id)) setStoryHomeSubTabId(id)
          }}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-700 bg-slate-900/70 p-4">
          <p className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">
              Conversion rules: {conversionRuleLabel(session.conversionPolicy)}
            </span>
            <span className="mt-0.5 block text-slate-500">
              {conversionRuleDescription(session.conversionPolicy)} Locked at
              campaign creation.
            </span>
          </p>

          {storyHomeSubTabId === 'notes' ? (
            <GmNotesScratchpad />
          ) : storyHomeSubTabId === 'people' ? (
            <GmPlaceholderLane lane="people" />
          ) : storyHomeSubTabId === 'places' ? (
            <GmPlaceholderLane lane="places" />
          ) : (
            <GmPlaceholderLane lane="things" />
          )}
        </section>
      </div>
    </div>
  )
}
