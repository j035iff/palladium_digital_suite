import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { useGmSession } from '../../context/GmSessionContext'
import {
  applyContentLinkChipPresentation,
  contentLinkChipFromEventTarget,
  contentLinkEditorNeedsRewrite,
  getContentLinkEditorCaretClientOffset,
  getContentLinkEditorCaretStorageOffset,
  getContentLinkEditorSelectedText,
  serializeContentLinkEditor,
  setContentLinkEditorCaretStorageOffset,
  writeContentLinkEditor,
} from '../../lib/gm/contentLinkEditorDom'
import {
  GM_CONTENT_LINK_KINDS,
  contentLinkKindLabel,
  findActiveMention,
  insertContentLink,
  replaceMentionWithContentLink,
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
import type { GmSessionRecord } from '../../lib/gm/sessionTypes'

type MentionUiState = {
  mention: GmActiveMention
  top: number
  left: number
}

export type GmContentLinkedNotesFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  /** Scratchpad = tall + Insert link chrome; compact = stub/description fields. */
  density?: 'scratchpad' | 'compact'
  /** Show Insert link… fallback (default true for scratchpad, false for compact). */
  showInsertLink?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * Shared Narrative notes editor: storage is `[[kind:id|label]]`, UI shows
 * clickable labels inline in the primary body (Familiar Surface). No separate
 * “Linked Preview”. One pipeline for Notes, Story Beats, Places/Things/People
 * stubs, and cast notes (Pillar 9).
 */
export function GmContentLinkedNotesField({
  id,
  value,
  onChange,
  label,
  placeholder = 'Type @ to link places, NPCs, PCs, things…',
  density = 'compact',
  showInsertLink,
  className = '',
  'aria-label': ariaLabel,
}: GmContentLinkedNotesFieldProps) {
  const {
    session,
    partySlices,
    createContentStub,
    navigateContentLink,
  } = useGmSession()
  const editorRef = useRef<HTMLDivElement>(null)
  const mentionListRef = useRef<HTMLUListElement>(null)
  /** Skip one layout sync after local typing (DOM already matches). */
  const skipDomSyncRef = useRef(false)
  const pendingCaretRef = useRef<number | null>(null)

  const insertLinkEnabled = showInsertLink ?? density === 'scratchpad'

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

  const paintChips = (el: HTMLDivElement, live: GmSessionRecord) => {
    applyContentLinkChipPresentation(
      el,
      (kind, id, labelText) =>
        resolveContentLinkTarget(live, kind, id, labelText, {
          partyNamesById,
        }),
      contentLinkKindLabel,
    )
  }

  /** Write storage → label chips in the primary body (never leave raw `[[…]]`). */
  const syncDomFromStorage = (
    storage: string,
    caret: number | null,
    live: GmSessionRecord,
  ) => {
    const el = editorRef.current
    if (!el) return
    writeContentLinkEditor(el, storage)
    paintChips(el, live)
    if (caret != null) {
      setContentLinkEditorCaretStorageOffset(el, caret)
    }
  }

  useLayoutEffect(() => {
    const el = editorRef.current
    if (!el || !session) return

    if (skipDomSyncRef.current) {
      skipDomSyncRef.current = false
      // Even after local typing, never leave complete wiki tokens as raw text.
      if (contentLinkEditorNeedsRewrite(el, value)) {
        const caret =
          pendingCaretRef.current ?? getContentLinkEditorCaretStorageOffset(el)
        pendingCaretRef.current = null
        syncDomFromStorage(value, caret, session)
      } else {
        paintChips(el, session)
        if (pendingCaretRef.current != null) {
          setContentLinkEditorCaretStorageOffset(el, pendingCaretRef.current)
          pendingCaretRef.current = null
        }
      }
      return
    }

    if (
      serializeContentLinkEditor(el) === value &&
      !contentLinkEditorNeedsRewrite(el, value)
    ) {
      paintChips(el, session)
      if (pendingCaretRef.current != null) {
        setContentLinkEditorCaretStorageOffset(el, pendingCaretRef.current)
        pendingCaretRef.current = null
      }
      return
    }

    const caret = pendingCaretRef.current
    pendingCaretRef.current = null
    syncDomFromStorage(value, caret, session)
  }, [value, session, partyNamesById])

  if (!session) return null

  const matches = searchLinkableEntities(session, linkKind, linkQuery, {
    partyNamesById,
  })
  const createNamePreview = linkQuery.trim()
  const mentionCreateName = mentionUi?.mention.query.trim() || 'Untitled'

  const syncMentionFromCaret = (text: string, caret: number) => {
    const el = editorRef.current
    const mention = findActiveMention(text, caret)
    if (!mention || !el) {
      setMentionUi(null)
      return
    }
    const coords = getContentLinkEditorCaretClientOffset(el)
    const maxLeft = Math.max(8, el.clientWidth - 280)
    setMentionUi({
      mention,
      top: coords.top + 4,
      left: Math.min(Math.max(8, coords.left), maxLeft),
    })
  }

  const closeMention = () => setMentionUi(null)

  const applyExternalText = (next: { text: string; cursor: number }) => {
    // Synchronously paint chips into the primary body before React commits.
    skipDomSyncRef.current = true
    pendingCaretRef.current = next.cursor
    syncDomFromStorage(next.text, next.cursor, session)
    onChange(next.text)
    setLinkerOpen(false)
    setPendingCreate(null)
    setLinkQuery('')
    closeMention()
    requestAnimationFrame(() => {
      const field = editorRef.current
      if (!field) return
      field.focus()
      // Re-assert chips in case a stray input wiped them.
      if (contentLinkEditorNeedsRewrite(field, next.text)) {
        syncDomFromStorage(next.text, next.cursor, session)
      } else {
        setContentLinkEditorCaretStorageOffset(field, next.cursor)
        paintChips(field, session)
      }
      pendingCaretRef.current = null
    })
  }

  const insertRef = (ref: GmContentLinkRef) => {
    const el = editorRef.current
    const caret = el
      ? getContentLinkEditorCaretStorageOffset(el)
      : value.length
    const selected = el ? getContentLinkEditorSelectedText(el) : ''
    const start = selected
      ? Math.max(0, caret - selected.length)
      : caret
    const end = caret
    applyExternalText(insertContentLink(value, ref, { start, end }))
  }

  const insertMentionHit = (hit: GmLinkableEntityHit) => {
    if (!mentionUi) return
    applyExternalText(
      replaceMentionWithContentLink(value, mentionUi.mention, {
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
    applyExternalText(
      replaceMentionWithContentLink(value, mentionUi.mention, {
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

  const readSelectionOrQuery = (): string => {
    const el = editorRef.current
    if (el) {
      const selected = getContentLinkEditorSelectedText(el)
      if (selected) return selected
    }
    return linkQuery.trim()
  }

  const offerCreate = () => {
    const name = readSelectionOrQuery()
    if (!name) return
    setPendingCreate({ kind: linkKind, name })
  }

  const handleEditorInput = () => {
    const el = editorRef.current
    if (!el) return
    const caretBefore = getContentLinkEditorCaretStorageOffset(el)
    let next = serializeContentLinkEditor(el)
    // If the GM pasted or typed a complete wiki token, collapse it to a chip
    // immediately so the primary body never shows raw `[[…]]`.
    if (contentLinkEditorNeedsRewrite(el, next)) {
      writeContentLinkEditor(el, next)
      paintChips(el, session)
      setContentLinkEditorCaretStorageOffset(el, caretBefore)
      next = serializeContentLinkEditor(el)
    } else {
      paintChips(el, session)
    }
    skipDomSyncRef.current = true
    onChange(next)
    const caret = getContentLinkEditorCaretStorageOffset(el)
    syncMentionFromCaret(next, caret)
  }

  const handleEditorSelect = () => {
    const el = editorRef.current
    if (!el) return
    const text = serializeContentLinkEditor(el)
    const caret = getContentLinkEditorCaretStorageOffset(el)
    syncMentionFromCaret(text, caret)
  }

  const handleChipClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = editorRef.current
    if (!el) return
    const hit = contentLinkChipFromEventTarget(e.target, el)
    if (!hit) return
    e.preventDefault()
    e.stopPropagation()
    const resolved = resolveContentLinkTarget(
      session,
      hit.kind,
      hit.id,
      hit.label,
      { partyNamesById },
    )
    if (resolved.status === 'ok') {
      navigateContentLink(hit.kind, hit.id)
      return
    }
    setLinkKind(hit.kind)
    setLinkQuery(hit.label)
    setPendingCreate({ kind: hit.kind, name: hit.label })
    setLinkerOpen(true)
  }

  const handleEditorKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!mentionUi) return

    const totalRows = mentionHits.length > 0 ? mentionHits.length : 1

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
      if (e.key === 'Enter') {
        e.preventDefault()
        createFromMention()
      }
    }
  }

  const editorMinClass =
    density === 'scratchpad' ? 'min-h-[10rem] flex-1' : 'min-h-[2.5rem]'

  return (
    <div className={`flex min-h-0 flex-col gap-2 ${className}`}>
      {label ? (
        <label
          htmlFor={id}
          className="text-[10px] font-bold uppercase tracking-wide text-slate-500"
        >
          {label}
        </label>
      ) : null}

      <div className={`relative flex min-h-0 flex-col ${editorMinClass}`}>
        <div
          id={id}
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel ?? label ?? 'Notes'}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={handleEditorInput}
          onKeyDown={handleEditorKeyDown}
          onKeyUp={handleEditorSelect}
          onClick={(e) => {
            handleChipClick(e)
            handleEditorSelect()
          }}
          onSelect={handleEditorSelect}
          onBlur={() => {
            window.setTimeout(() => {
              const active = document.activeElement
              if (mentionListRef.current?.contains(active)) return
              closeMention()
            }, 120)
          }}
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData.getData('text/plain')
            document.execCommand('insertText', false, text)
          }}
          className={`gm-content-linked-notes whitespace-pre-wrap break-words rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-sans text-slate-100 outline-none focus:border-cyan-700/60 ${
            density === 'scratchpad'
              ? 'min-h-[10rem] flex-1 text-sm'
              : 'min-h-[2.5rem] w-full text-xs'
          } empty:before:pointer-events-none empty:before:text-slate-500 empty:before:content-[attr(data-placeholder)]`}
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
                  No existing match for “{mentionUi.mention.query || '…'}”.
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
                    setMentionCreateKind(e.target.value as GmContentLinkKind)
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

      {insertLinkEnabled ? (
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
            Type <span className="font-semibold text-slate-400">@</span> to link.
            Names show as clickable links in this field — not raw ids or{' '}
            <span className="font-mono text-[10px]">[[…]]</span> markup.
          </p>
        </div>
      ) : null}

      {insertLinkEnabled && linkerOpen ? (
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
    </div>
  )
}
