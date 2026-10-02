import { useEffect, useMemo, useRef, useState } from 'react'
import { getSharedGmClientRuntime } from '../../lib/gm/sessionClientHandle'
import type { GmClientRuntimeState } from '../../lib/gm/sessionClientRuntime'
import {
  dmMessagesForCharacter,
  dmUnreadForCharacter,
  GM_DM_MAX_LENGTH,
  type GmDmMessage,
} from '../../lib/gm/sessionDm'

/**
 * Small inbox tray for a joined player (sheet / forge chrome).
 * Familiar Surface: “Messages” — no protocol jargon.
 */
export function GmPlayerDmTray() {
  const runtime = useMemo(() => getSharedGmClientRuntime(), [])
  const [state, setState] = useState<GmClientRuntimeState>(() =>
    runtime.getState(),
  )
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  useEffect(() => runtime.subscribe(setState), [runtime])

  const joined = state.status === 'joined'
  const characterId = state.attachedCharacterId
  const messages = characterId
    ? dmMessagesForCharacter(state.dm, characterId)
    : []
  const unread = characterId
    ? dmUnreadForCharacter(state.dm, characterId)
    : 0

  useEffect(() => {
    if (open && characterId) runtime.markDmRead()
  }, [open, characterId, runtime, messages.length])

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [open, messages.length])

  if (!joined || !characterId) return null

  const submit = () => {
    const result = runtime.sendDm(draft)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setDraft('')
    setError(null)
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex max-w-[min(100vw-2rem,20rem)] flex-col items-end gap-2">
      {open ? (
        <div
          className="w-full rounded-xl border border-slate-600 bg-slate-950/95 p-3 shadow-xl backdrop-blur-sm"
          role="dialog"
          aria-label="Messages with the GM"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-200">
              Messages
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <p className="mb-2 text-[10px] text-slate-500">
            Private notes with the GM for this sitting.
          </p>
          <ul
            ref={listRef}
            className="mb-2 max-h-44 space-y-1.5 overflow-y-auto rounded-md border border-slate-800 bg-slate-900/80 p-2"
          >
            {messages.length === 0 ? (
              <li className="text-[11px] text-slate-500">No messages yet.</li>
            ) : (
              messages.map((m) => <PlayerDmBubble key={m.id} message={m} />)
            )}
          </ul>
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              maxLength={GM_DM_MAX_LENGTH}
              onChange={(e) => {
                setDraft(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="Message the GM…"
              aria-label="Message the GM"
              className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600"
            />
            <button
              type="button"
              onClick={submit}
              className="shrink-0 rounded-md border border-amber-700/70 bg-amber-950/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 hover:border-amber-500"
            >
              Send
            </button>
          </div>
          {error ? (
            <p className="mt-1.5 text-[11px] text-red-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center gap-2 rounded-full border border-slate-500 bg-slate-900 px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-slate-100 shadow-lg hover:border-slate-300"
        aria-expanded={open}
        aria-label={
          unread > 0 ? `Messages, ${unread} unread` : 'Messages'
        }
      >
        Messages
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-950">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
    </div>
  )
}

function PlayerDmBubble({ message }: { message: GmDmMessage }) {
  const fromPlayer = message.from === 'player'
  return (
    <li
      className={`rounded px-2 py-1 text-[11px] leading-snug ${
        fromPlayer
          ? 'bg-amber-950/50 text-amber-50'
          : 'bg-slate-800/80 text-slate-100'
      }`}
    >
      <span className="mr-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {fromPlayer ? 'You' : 'GM'}
      </span>
      {message.text}
    </li>
  )
}
