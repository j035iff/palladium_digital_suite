import { useGmSession } from '../../context/GmSessionContext'
import {
  conversionRuleDescription,
  conversionRuleLabel,
} from '../../lib/gm/campaignForge'

export function GmSessionsPanel() {
  const { session, updateScratchpad } = useGmSession()

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
        <label className="mt-4 flex min-h-[12rem] flex-1 flex-col text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Scratchpad
          <textarea
            value={session.scratchpad}
            onChange={(e) => updateScratchpad(e.target.value)}
            placeholder="Scene notes, clocks, names… auto-saves to this campaign."
            className="mt-1 min-h-[12rem] flex-1 resize-y rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-sans text-sm font-normal normal-case tracking-normal text-slate-100"
          />
        </label>
      </section>
    </div>
  )
}
