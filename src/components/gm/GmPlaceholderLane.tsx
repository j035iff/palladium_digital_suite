import { useEffect, useRef } from 'react'
import { useGmSession } from '../../context/GmSessionContext'
import {
  contentLinkKindLabel,
  type GmContentLinkKind,
} from '../../lib/gm/contentLinks'
import { placeholdersOfKind } from '../../lib/gm/narrativePlaceholders'
import { isHubFocusMatch } from '../../lib/gm/hubNavigation'
import { GmContentLinkedNotesField } from './GmContentLinkedNotesField'
import { confirmPermanentDelete } from '../../lib/gm/permanentDeleteConfirm'

const KIND_BY_SUB: Record<
  'people' | 'places' | 'things',
  GmContentLinkKind
> = {
  people: 'person',
  places: 'place',
  things: 'thing',
}

/**
 * Placeholder list for Narrative Places / Things (and person stubs under People).
 * Person rows are note-ish; deep cast lives on People → NPCs when linked.
 */
export function GmPlaceholderLane({
  lane,
}: {
  lane: 'people' | 'places' | 'things'
}) {
  const {
    session,
    hubFocus,
    createContentStub,
    updatePlaceholderNotes,
    updatePlaceholderName,
    dropPlaceholder,
    linkPersonToNpc,
    navigateContentLink,
  } = useGmSession()
  const kind = KIND_BY_SUB[lane]
  const focusRef = useRef<HTMLLIElement | null>(null)

  useEffect(() => {
    if (hubFocus?.kind === kind) {
      focusRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [hubFocus, kind])

  if (!session) return null

  const rows = placeholdersOfKind(session, kind)

  const handleAdd = () => {
    const name = window.prompt(
      `Name for new ${contentLinkKindLabel(kind).toLowerCase()} stub?`,
    )
    if (!name?.trim()) return
    createContentStub({ kind, name: name.trim() })
  }

  return (
    <div className="mt-4 flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/90">
            {contentLinkKindLabel(kind)} stubs
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-400">
            {lane === 'people'
              ? 'Person stubs are a notes page — link a person to a real People → NPCs entry for the deep sheet. Placeholders keep Notes links working.'
              : 'Placeholder entries so Notes content links can navigate here before full CRUD.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-950 hover:bg-amber-400"
        >
          Add {contentLinkKindLabel(kind)}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No {contentLinkKindLabel(kind).toLowerCase()} stubs yet. Create from
          here or via Notes → Insert link → Create?
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => {
            const focused = isHubFocusMatch(hubFocus, kind, row.id)
            return (
              <li
                key={row.id}
                ref={focused ? focusRef : undefined}
                id={`gm-focus-${kind}-${row.id}`}
                className={`rounded-xl border p-3 ${
                  focused
                    ? 'border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-400/50'
                    : 'border-slate-700 bg-slate-950/60'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <input
                    value={row.name}
                    onChange={(e) =>
                      updatePlaceholderName(row.id, e.target.value)
                    }
                    className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm font-semibold text-white hover:border-slate-700 focus:border-slate-500"
                    aria-label={`${contentLinkKindLabel(kind)} name`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirmPermanentDelete(row.name)) return
                      dropPlaceholder(row.id)
                    }}
                    className="text-[10px] uppercase text-red-400/80 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
                <GmContentLinkedNotesField
                  id={`gm-${kind}-notes-${row.id}`}
                  value={row.notes}
                  onChange={(text) => updatePlaceholderNotes(row.id, text)}
                  density="compact"
                  placeholder={
                    lane === 'people'
                      ? 'Person notes (not a full sheet)… type @ to link'
                      : 'Stub notes… type @ to link'
                  }
                  className="mt-2"
                  aria-label={`${row.name} notes`}
                />
                {lane === 'people' ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span>Linked NPC:</span>
                    {row.linkedNpcId ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigateContentLink('npc', row.linkedNpcId!)
                        }
                        className="font-semibold text-cyan-300 underline hover:text-cyan-100"
                      >
                        Open People → NPCs
                      </button>
                    ) : (
                      <span className="text-slate-500">
                        none — deep cast lives on People → NPCs
                      </span>
                    )}
                    <select
                      value={row.linkedNpcId ?? ''}
                      onChange={(e) =>
                        linkPersonToNpc(
                          row.id,
                          e.target.value || undefined,
                        )
                      }
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-xs text-slate-200"
                    >
                      <option value="">—</option>
                      {session.npcs.map((npc) => (
                        <option key={npc.instanceId} value={npc.instanceId}>
                          {npc.displayName}
                        </option>
                      ))}
                      {session.placeholders
                        .filter((p) => p.kind === 'npc')
                        .map((npc) => (
                          <option key={npc.id} value={npc.id}>
                            {npc.name} (stub)
                          </option>
                        ))}
                    </select>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
