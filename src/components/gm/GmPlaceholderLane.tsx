import { useEffect, useRef } from 'react'
import { useGmSession } from '../../context/GmSessionContext'
import {
  contentLinkKindLabel,
  type GmContentLinkKind,
} from '../../lib/gm/contentLinks'
import { placeholdersOfKind } from '../../lib/gm/narrativePlaceholders'
import { isHubFocusMatch } from '../../lib/gm/hubNavigation'

const KIND_BY_SUB: Record<
  'people' | 'places' | 'things',
  GmContentLinkKind
> = {
  people: 'person',
  places: 'place',
  things: 'thing',
}

/**
 * Placeholder list for Narrative Home People / Places / Things.
 * People rows are note-ish; deep cast lives on Characters → NPCs when linked.
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
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/90">
            {contentLinkKindLabel(kind)} stubs
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-400">
            {lane === 'people'
              ? 'People is a notes page — link a person to a real Characters → NPCs entry for the deep sheet. Placeholders keep Notes links working.'
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
                    onClick={() => dropPlaceholder(row.id)}
                    className="text-[10px] uppercase text-red-400/80 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={row.notes}
                  onChange={(e) =>
                    updatePlaceholderNotes(row.id, e.target.value)
                  }
                  placeholder={
                    lane === 'people'
                      ? 'Person notes (not a full sheet)…'
                      : 'Stub notes…'
                  }
                  rows={2}
                  className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
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
                        Open Characters → NPCs
                      </button>
                    ) : (
                      <span className="text-slate-500">
                        none — deep cast lives on Characters → NPCs
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
