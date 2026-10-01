import { useGmSession } from '../../context/GmSessionContext'
import { GmConversionRulesBanner } from './GmThingsPanel'
import { GmNotesScratchpad } from './GmNotesScratchpad'
import { GmPlaceholderLane } from './GmPlaceholderLane'

/**
 * Narrative → Story Beats — notes-like stub for this pass.
 * Reuses Notes editor pattern / scratchpad UX later; placeholder for now.
 */
export function GmStoryBeatsPanel() {
  const { session } = useGmSession()

  if (!session) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-500">
          Open a campaign from the launcher to start Story Beats.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <GmConversionRulesBanner />
        <div className="mt-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/90">
            Story Beats
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-400">
            Notes-like scratch space for beat tracking. Full beat tools are a
            later pass — use the campaign Notes tab for structured content
            links today.
          </p>
          <p className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-3 py-6 text-center text-sm text-slate-500">
            Story Beats editor stub — not in this build yet beyond this
            placeholder.
          </p>
        </div>
      </section>
    </div>
  )
}

/** Narrative → Places — unchanged Places stub lane. */
export function GmPlacesPanel() {
  const { session } = useGmSession()

  if (!session) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-500">
          Open a campaign from the launcher to manage Places.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <GmConversionRulesBanner />
        <GmPlaceholderLane lane="places" />
      </section>
    </div>
  )
}

/** Narrative → Notes — campaign scratchpad + content links (unchanged). */
export function GmNotesPanel() {
  const { session } = useGmSession()

  if (!session) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-500">
          Open a campaign from the launcher to open Notes.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <GmConversionRulesBanner />
        <GmNotesScratchpad />
      </section>
    </div>
  )
}

/** Combat → Prefabs — stub for this pass. */
export function GmPrefabsPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/90">
          Prefabs
        </h2>
        <p className="mt-1 max-w-xl text-xs text-slate-400">
          Encounter prefab kits for quick Melee setup. Not in this build yet.
        </p>
        <p className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-3 py-6 text-center text-sm text-slate-500">
          Prefabs stub — manage People on Narrative, then add them to Melee
          via the Melee dropdowns.
        </p>
      </section>
    </div>
  )
}
