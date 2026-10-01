import { useGmSession } from '../../context/GmSessionContext'
import { isHubFocusMatch } from '../../lib/gm/hubNavigation'
import { GmContentLinkedNotesField } from './GmContentLinkedNotesField'

/**
 * Campaign Notes scratchpad — thin host over the shared content-linked notes
 * field (Pillar 9). Storage remains `[[kind:id|label]]`.
 */
export function GmNotesScratchpad() {
  const {
    session,
    updateScratchpad,
    updatePlaceholderNotes,
    hubFocus,
  } = useGmSession()

  if (!session) return null

  const noteStubs = session.placeholders.filter((row) => row.kind === 'note')

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
      <GmContentLinkedNotesField
        id="gm-notes-scratchpad"
        label="Scratchpad"
        value={session.scratchpad}
        onChange={updateScratchpad}
        density="scratchpad"
        placeholder="Scene notes… type @ to link places, NPCs, PCs, things. Auto-saves."
        className="min-h-[10rem] flex-1"
      />

      <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Note stubs
        </h3>
        <p className="mt-1 text-[11px] text-slate-500">
          Optional note link targets (separate from this scratchpad body).
        </p>
        {noteStubs.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">No note stubs yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {noteStubs.map((stub) => {
              const focused = isHubFocusMatch(hubFocus, 'note', stub.id)
              return (
                <li
                  key={stub.id}
                  id={`gm-focus-note-${stub.id}`}
                  className={`rounded-lg border px-3 py-2 ${
                    focused
                      ? 'border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-400/40'
                      : 'border-slate-800 bg-slate-950/60'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {stub.name}
                  </p>
                  <GmContentLinkedNotesField
                    id={`gm-note-stub-${stub.id}`}
                    value={stub.notes}
                    onChange={(text) => updatePlaceholderNotes(stub.id, text)}
                    density="compact"
                    placeholder="Stub notes… type @ to link"
                    className="mt-2"
                    aria-label={`${stub.name} notes`}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
