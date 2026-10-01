import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useGmSession } from '../../context/GmSessionContext'
import {
  GM_CONTENT_LINK_KINDS,
  contentLinkKindLabel,
  findActiveMention,
  insertContentLink,
  replaceMentionWithContentLink,
  segmentContentLinks,
  type GmActiveMention,
  type GmContentLinkKind,
  type GmContentLinkRef,
} from '../../lib/gm/contentLinks'
import {
  resolveContentLinkTarget,
  searchAllLinkableEntities,
  searchLinkableEntities,
  type GmLinkableEntityHit,
} from '../../lib/gm/narrativePlaceholders'
import { getTextareaCaretCoords } from '../../lib/gm/textareaCaretCoords'

type MentionUiState = {
  mention: GmActiveMention
  top: number
  left: number
}

/**
 * Campaign Notes scratchpad with structured content links.
 * Primary authoring: Cursor-like `@` mentions → `[[kind:id|label]]`.
 * Insert link… remains a fallback dialog.
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
  const mentionListRef = useRef<HTMLUListElement>(null)
  const [linkerOpen, setLinkerOpen] = useState(false)
  const [linkKind, setLinkKind] = useState<GmContentLinkKind>('npc')
  const [linkQuery, setLinkQuery] = useState('')
  const [pendingCreate, setPendingCreate] = useState<{
    kind: GmContentLinkKind
    name: string
  } | null>(null)
  const [mentionUi, setMentionUi] = useState<MentionUiState | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [mentionCreateKind, setMentionCreateKind] =
    useState<GmContentLinkKind>('place')

  const partyNamesById = useMemo(() => {
    const map = new Map<string, string>()
    for (const slice of partySlices) {
      map.set(slice.characterId, slice.name)
    }
    return map
  }, [partySlices])

  const mentionHits: GmLinkableEntityHit[] = useMemo(() => {
    if (!session || !mentionUi) return []
    return searchAllLinkableEntities(session, mentionUi.mention.query, {
      partyNamesById,
    })
  }, [session, mentionUi, partyNamesById])

  useEffect(() => {
    setMentionIndex(0)
  }, [mentionUi?.mention.query, mentionUi?.mention.start])

  useLayoutEffect(() => {
    const el = mentionListRef.current
    if (!el) return
    const active = el.querySelector<HTMLElement>('[data-mention-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [mentionIndex, mentionHits.length])

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
  const mentionCreateName =
    mentionUi?.mention.query.trim() || 'Untitled'

  const syncMentionFromCaret = (text: string, caret: number) => {
    const el = textareaRef.current
    const mention = findActiveMention(text, caret)
    if (!mention || !el) {
      setMentionUi(null)
      return
    }
    const coords = getTextareaCaretCoords(el, mention.start)
    const maxLeft = Math.max(8, el.clientWidth - 280)
    setMentionUi({
      mention,
      top: coords.top + coords.height + 4,
      left: Math.min(Math.max(8, coords.left), maxLeft),
    })
  }

  const closeMention = () => setMentionUi(null)

  const applyInsertedText = (next: { text: string; cursor: number }) => {
    updateScratchpad(next.text)
    setLinkerOpen(false)
    setPendingCreate(null)
    setLinkQuery('')
    closeMention()
    requestAnimationFrame(() => {
      const field = textareaRef.current
      if (!field) return
      field.focus()
      field.setSelectionRange(next.cursor, next.cursor)
    })
  }

  const insertRef = (ref: GmContentLinkRef) => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? session.scratchpad.length
    const end = el?.selectionEnd ?? start
    applyInsertedText(
      insertContentLink(session.scratchpad, ref, { start, end }),
    )
  }

  const insertMentionHit = (hit: GmLinkableEntityHit) => {
    if (!mentionUi) return
    applyInsertedText(
      replaceMentionWithContentLink(session.scratchpad, mentionUi.mention, {
        kind: hit.kind,
        id: hit.id,
        label: hit.name,
      }),
    )
  }

  const createFromMention = () => {
    if (!mentionUi) return
    const stub = createContentStub({
      kind: mentionCreateKind,
      name: mentionCreateName,
    })
    if (!stub) return
    applyInsertedText(
      replaceMentionWithContentLink(session.scratchpad, mentionUi.mention, {
        kind: stub.kind,
        id: stub.id,
        label: stub.name,
      }),
    )
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

  const handleScratchpadChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    updateScratchpad(value)
    syncMentionFromCaret(value, e.target.selectionStart)
  }

  const handleScratchpadSelect = () => {
    const el = textareaRef.current
    if (!el) return
    syncMentionFromCaret(session.scratchpad, el.selectionStart)
  }

  const handleScratchpadKeyDown = (
    e: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (!mentionUi) return

    const totalRows =
      mentionHits.length > 0 ? mentionHits.length : 1

    if (e.key === 'Escape') {
      e.preventDefault()
      closeMention()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionIndex((i) => (i + 1) % totalRows)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionIndex((i) => (i - 1 + totalRows) % totalRows)
      return
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      if (mentionHits.length > 0) {
        const hit = mentionHits[mentionIndex]
        if (!hit) return
        e.preventDefault()
        insertMentionHit(hit)
        return
      }
      // No matches — Enter confirms Create? for the chosen kind.
      if (e.key === 'Enter') {
        e.preventDefault()
        createFromMention()
      }
    }
  }

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex min-h-[10rem] flex-1 flex-col">
        <label
          htmlFor="gm-notes-scratchpad"
          className="text-[10px] font-bold uppercase tracking-wide text-slate-500"
        >
          Scratchpad
        </label>
        <div className="relative mt-1 flex min-h-[10rem] flex-1 flex-col">
          <textarea
            id="gm-notes-scratchpad"
            ref={textareaRef}
            value={session.scratchpad}
            onChange={handleScratchpadChange}
            onKeyDown={handleScratchpadKeyDown}
            onClick={handleScratchpadSelect}
            onKeyUp={handleScratchpadSelect}
            onSelect={handleScratchpadSelect}
            onBlur={() => {
              // Delay so mention list mousedown can fire first.
              window.setTimeout(() => {
                const active = document.activeElement
                if (mentionListRef.current?.contains(active)) return
                closeMention()
              }, 120)
            }}
            placeholder="Scene notes… type @ to link places, NPCs, PCs, things. Auto-saves."
            className="min-h-[10rem] flex-1 resize-y rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-sans text-sm font-normal normal-case tracking-normal text-slate-100"
          />

          {mentionUi ? (
            <div
              className="absolute z-30 w-[min(18rem,calc(100%-1rem))] overflow-hidden rounded-lg border border-slate-600 bg-slate-950 shadow-lg shadow-black/40"
              style={{ top: mentionUi.top, left: mentionUi.left }}
              role="listbox"
              aria-label="Link existing entity"
            >
              <p className="border-b border-slate-800 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Link @{mentionUi.mention.query || '…'}
              </p>
              <ul ref={mentionListRef} className="max-h-48 overflow-y-auto">
                {mentionHits.length === 0 ? (
                  <li className="px-2.5 py-2 text-xs text-slate-500">
                    No existing match for “
                    {mentionUi.mention.query || '…'}”.
                  </li>
                ) : (
                  mentionHits.map((hit, index) => {
                    const active = index === mentionIndex
                    return (
                      <li key={`${hit.kind}:${hit.id}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          data-mention-active={active ? 'true' : undefined}
                          onMouseDown={(ev) => {
                            ev.preventDefault()
                            insertMentionHit(hit)
                          }}
                          onMouseEnter={() => setMentionIndex(index)}
                          className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm ${
                            active
                              ? 'bg-cyan-950/70 text-cyan-50'
                              : 'text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          <span className="truncate">{hit.name}</span>
                          <span className="shrink-0 text-[10px] uppercase text-slate-500">
                            {contentLinkKindLabel(hit.kind)}
                          </span>
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>

              <div className="border-t border-slate-800 px-2.5 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/80">
                  Create?
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <select
                    value={mentionCreateKind}
                    onChange={(e) =>
                      setMentionCreateKind(
                        e.target.value as GmContentLinkKind,
                      )
                    }
                    onMouseDown={(ev) => ev.stopPropagation()}
                    className="rounded border border-slate-600 bg-slate-900 px-1.5 py-1 text-xs text-slate-100"
                    aria-label="Create stub kind"
                  >
                    {GM_CONTENT_LINK_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {contentLinkKindLabel(kind)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onMouseDown={(ev) => {
                      ev.preventDefault()
                      createFromMention()
                    }}
                    className="rounded border border-dashed border-amber-700/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-100 hover:border-amber-500"
                  >
                    Create {contentLinkKindLabel(mentionCreateKind)} “
                    {mentionCreateName}”
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setLinkerOpen((open) => !open)
            setPendingCreate(null)
            const selected = readSelectionOrQuery()
            if (selected) setLinkQuery(selected)
          }}
          className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-500"
        >
          Insert link…
        </button>
        <p className="text-[11px] normal-case tracking-normal text-slate-500">
          Type <span className="font-semibold text-slate-400">@</span> to link
          existing entities. Insert link… is a fallback. Missing targets offer
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
