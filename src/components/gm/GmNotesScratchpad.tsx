import { useMemo, useRef, useState } from 'react'
import { useGmSession } from '../../context/GmSessionContext'
import {
  GM_CONTENT_LINK_KINDS,
  contentLinkKindLabel,
  insertContentLink,
  segmentContentLinks,
  type GmContentLinkKind,
  type GmContentLinkRef,
} from '../../lib/gm/contentLinks'
import {
  resolveContentLinkTarget,
  searchLinkableEntities,
} from '../../lib/gm/narrativePlaceholders'

/**
 * Campaign Notes scratchpad with structured content links.
 * Markup stays `[[kind:id|label]]`; links navigate via shared hubNavigation.
 */
export function GmNotesScratchpad() {
  const {
    session,
    updateScratchpad,
    partySlices,
    createContentStub,
    navigateContentLink,
    hubFocus,
  } = useGmSession()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [linkerOpen, setLinkerOpen] = useState(false)
  const [linkKind, setLinkKind] = useState<GmContentLinkKind>('npc')
  const [linkQuery, setLinkQuery] = useState('')
  const [pendingCreate, setPendingCreate] = useState<{
    kind: GmContentLinkKind
    name: string
  } | null>(null)

  const partyNamesById = useMemo(() => {
    const map = new Map<string, string>()
    for (const slice of partySlices) {
      map.set(slice.characterId, slice.name)
    }
    return map
  }, [partySlices])

  if (!session) return null

  const noteStubs = session.placeholders.filter((row) => row.kind === 'note')
  const segments = segmentContentLinks(session.scratchpad)
  const matches = searchLinkableEntities(session, linkKind, linkQuery, {
    partyNamesById,
  })

  /** Selection is only read in handlers — never during render (react-hooks/refs). */
  const readSelectionOrQuery = (): string => {
    const el = textareaRef.current
    if (el && el.selectionStart !== el.selectionEnd) {
      return session.scratchpad
        .slice(el.selectionStart, el.selectionEnd)
        .trim()
    }
    return linkQuery.trim()
  }

  const createNamePreview = linkQuery.trim()

  const insertRef = (ref: GmContentLinkRef) => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? session.scratchpad.length
    const end = el?.selectionEnd ?? start
    const next = insertContentLink(session.scratchpad, ref, { start, end })
    updateScratchpad(next.text)
    setLinkerOpen(false)
    setPendingCreate(null)
    setLinkQuery('')
    requestAnimationFrame(() => {
      const field = textareaRef.current
      if (!field) return
      field.focus()
      field.setSelectionRange(next.cursor, next.cursor)
    })
  }

  const handleCreateConfirm = () => {
    if (!pendingCreate) return
    const stub = createContentStub(pendingCreate)
    if (!stub) return
    insertRef({
      kind: stub.kind,
      id: stub.id,
      label: stub.name,
    })
  }

  const offerCreate = () => {
    const name = readSelectionOrQuery()
    if (!name) return
    setPendingCreate({ kind: linkKind, name })
  }

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
      <label className="flex min-h-[10rem] flex-1 flex-col text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Scratchpad
        <textarea
          ref={textareaRef}
          value={session.scratchpad}
          onChange={(e) => updateScratchpad(e.target.value)}
          placeholder="Scene notes, clocks, names… use Insert link for [[kind:id|label]] refs. Auto-saves."
          className="mt-1 min-h-[10rem] flex-1 resize-y rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-sans text-sm font-normal normal-case tracking-normal text-slate-100"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setLinkerOpen((open) => !open)
            setPendingCreate(null)
            const selected = readSelectionOrQuery()
            if (selected) setLinkQuery(selected)
          }}
          className="rounded-lg border border-cyan-700/70 bg-cyan-950/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100 hover:border-cyan-500"
        >
          Insert link…
        </button>
        <p className="text-[11px] normal-case tracking-normal text-slate-500">
          Outbound only — click a rendered link to jump. Missing targets offer
          Create?
        </p>
      </div>

      {linkerOpen ? (
        <div
          className="rounded-lg border border-slate-700 bg-slate-950/80 p-3"
          role="dialog"
          aria-label="Insert content link"
        >
          <div className="flex flex-wrap gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Kind
              <select
                value={linkKind}
                onChange={(e) => {
                  setLinkKind(e.target.value as GmContentLinkKind)
                  setPendingCreate(null)
                }}
                className="mt-1 block rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm font-normal normal-case tracking-normal text-slate-100"
              >
                {GM_CONTENT_LINK_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {contentLinkKindLabel(kind)}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-[12rem] flex-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Search / name
              <input
                value={linkQuery}
                onChange={(e) => {
                  setLinkQuery(e.target.value)
                  setPendingCreate(null)
                }}
                placeholder="Type a name…"
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm font-normal normal-case tracking-normal text-slate-100"
              />
            </label>
          </div>

          <ul className="mt-2 max-h-40 overflow-y-auto divide-y divide-slate-800 rounded border border-slate-800">
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">
                No matches for “{linkQuery || '…'}”.
              </li>
            ) : (
              matches.map((row) => (
                <li key={`${row.source}:${row.id}`}>
                  <button
                    type="button"
                    onClick={() =>
                      insertRef({
                        kind: linkKind,
                        id: row.id,
                        label: row.name,
                      })
                    }
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900"
                  >
                    <span>{row.name}</span>
                    <span className="text-[10px] uppercase text-slate-500">
                      {row.source}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>

          {pendingCreate ? (
            <div className="mt-3 rounded border border-amber-800/60 bg-amber-950/30 px-3 py-2">
              <p className="text-xs text-amber-100">
                Create {contentLinkKindLabel(pendingCreate.kind)} “
                {pendingCreate.name}”? Makes a stub, then inserts the link.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateConfirm}
                  className="rounded bg-amber-600 px-3 py-1 text-[10px] font-black uppercase text-slate-950 hover:bg-amber-400"
                >
                  Create & link
                </button>
                <button
                  type="button"
                  onClick={() => setPendingCreate(null)}
                  className="rounded border border-slate-600 px-3 py-1 text-[10px] font-bold uppercase text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={!createNamePreview}
              onClick={offerCreate}
              className="mt-3 rounded border border-dashed border-amber-700/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-100/90 hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create {contentLinkKindLabel(linkKind)} “
              {createNamePreview || '…'}”?
            </button>
          )}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Linked preview
        </p>
        <div className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
          {session.scratchpad.trim() === '' ? (
            <span className="text-slate-500">No notes yet.</span>
          ) : (
            segments.map((seg, index) => {
              if (seg.type === 'text') {
                return <span key={`t-${index}`}>{seg.text}</span>
              }
              const resolved = resolveContentLinkTarget(
                session,
                seg.ref.kind,
                seg.ref.id,
                seg.ref.label,
                { partyNamesById },
              )
              if (resolved.status === 'ok') {
                return (
                  <button
                    key={`l-${index}`}
                    type="button"
                    onClick={() =>
                      navigateContentLink(seg.ref.kind, seg.ref.id)
                    }
                    className="mx-0.5 rounded px-0.5 font-semibold text-cyan-300 underline decoration-cyan-700/80 hover:bg-cyan-950/50 hover:text-cyan-100"
                    title={`Open ${contentLinkKindLabel(seg.ref.kind)}`}
                  >
                    {seg.ref.label}
                  </button>
                )
              }
              return (
                <span
                  key={`b-${index}`}
                  className="mx-0.5 inline-flex flex-wrap items-center gap-1 rounded border border-amber-800/70 bg-amber-950/40 px-1 py-0.5"
                >
                  <span
                    className="font-semibold text-amber-100"
                    title={resolved.reason}
                  >
                    {seg.ref.label}
                  </span>
                  <span className="text-[10px] text-amber-200/80">
                    {resolved.reason}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLinkKind(seg.ref.kind)
                      setLinkQuery(seg.ref.label)
                      setPendingCreate({
                        kind: seg.ref.kind,
                        name: seg.ref.label,
                      })
                      setLinkerOpen(true)
                    }}
                    className="rounded bg-amber-700/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-950 hover:bg-amber-500"
                  >
                    Create?
                  </button>
                </span>
              )
            })
          )}
        </div>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Note stubs
        </h3>
        <p className="mt-1 text-[11px] text-slate-500">
          Optional `note` link targets (separate from this scratchpad body).
        </p>
        {noteStubs.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">No note stubs yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {noteStubs.map((stub) => {
              const focused =
                hubFocus?.kind === 'note' && hubFocus.id === stub.id
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
                  {stub.notes ? (
                    <p className="mt-1 text-xs text-slate-400">{stub.notes}</p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
