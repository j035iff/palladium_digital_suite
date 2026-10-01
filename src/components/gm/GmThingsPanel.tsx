import { useMemo } from 'react'
import { useGmSession } from '../../context/GmSessionContext'
import {
  conversionRuleDescription,
  conversionRuleLabel,
} from '../../lib/gm/campaignForge'
import {
  buildGmThingsSubTabViews,
  isGmThingsSubTabId,
} from '../../lib/gm/hubTabs'
import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import { GmGearPanel } from './GmGearPanel'
import { GmPlaceholderLane } from './GmPlaceholderLane'

/**
 * Narrative → Things — notes stub + Gear (moved from top-level Gear tab).
 * Gear panel is reused (Pillar 9); no forked forge host.
 */
export function GmThingsPanel() {
  const { session, thingsSubTabId, setThingsSubTabId } = useGmSession()

  const subTabs = useMemo(
    () => buildGmThingsSubTabViews(thingsSubTabId),
    [thingsSubTabId],
  )

  if (!session) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-500">
          Open a campaign from the launcher to manage Things.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-800 bg-slate-950/60 px-4 py-2">
        <ForgeNavigationBar
          tabs={subTabs}
          activeTabId={thingsSubTabId}
          singleRow
          ariaLabel="Things sub-tabs"
          onSelectTab={(id) => {
            if (isGmThingsSubTabId(id)) setThingsSubTabId(id)
          }}
        />
      </div>
      {thingsSubTabId === 'gear' ? (
        <GmGearPanel />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
              Things notes stub — placeholder entries for Notes content links.
              Gear lives on the Gear sub-tab (same forge as before).
            </p>
            <GmPlaceholderLane lane="things" />
          </section>
        </div>
      )}
    </div>
  )
}

/** Conversion rules blurb shared by Narrative notes surfaces. */
export function GmConversionRulesBanner() {
  const { session } = useGmSession()
  if (!session) return null
  return (
    <p className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
      <span className="font-semibold text-slate-200">
        Conversion rules: {conversionRuleLabel(session.conversionPolicy)}
      </span>
      <span className="mt-0.5 block text-slate-500">
        {conversionRuleDescription(session.conversionPolicy)} Locked at
        campaign creation.
      </span>
    </p>
  )
}
