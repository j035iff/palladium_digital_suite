import { useEffect, useRef, useState } from 'react'
import {
  dmMessagesForCharacter,
  dmPlayerSenderLabel,
  dmUnreadForCharacter,
  GM_DM_MAX_LENGTH,
  type GmDmMessage,
  type GmDmThreadState,
} from '../../lib/gm/sessionDm'

type GmSeatDmPanelProps = {
  characterId: string
  characterName: string
  /** Seat join display name (People card); null/empty → Unknown player. */
  playerDisplayName: string | null
  dm: GmDmThreadState
  onSend: (characterId: string, text: string) => { ok: true } | { ok: false; reason: string }
  onMarkRead: (characterId: string) => void
}

/**
 * Per-seat DM thread on People → PCs → At the table.
 * Dumb UI — transport lives in host runtime.
 */
export function GmSeatDmPanel({
  characterId,
  characterName,
  playerDisplayName,
  dm,
  onSend,
  onMarkRead,
}: GmSeatDmPanelProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const messages = dmMessagesForCharacter(dm, characterId)
  const unread = dmUnreadForCharacter(dm, characterId)

  useEffect(() => {
    if (open) onMarkRead(characterId)
  }, [open, characterId, onMarkRead, messages.length])

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [open, messages.length])

  const submit = () => {
    const result = onSend(characterId, draft)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setDraft('')
    setError(null)
  }

  return (
    <div className="mt-3 border-t border-slate-800 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-[11px] font-bold uppercase tracking-wide text-slate-300 hover:bg-slate-800/60 hover:text-white"
        aria-expanded={open}
      >
        <span>Messages</span>
        <span className="flex items-center gap-2 font-normal normal-case tracking-normal text-slate-500">
          {unread > 0 ? (
            <span
              className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950"
              aria-label={`${unread} unread`}
            >
              {unread}
            </span>
          ) : null}
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open ? (
        <div className="mt-2 space-y-2">
          <p className="text-[10px] text-slate-500">
            Private notes with {characterName} for this sitting only.
          </p>
          <ul
            ref={listRef}
            className="max-h-36 space-y-1.5 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/70 p-2"
            aria-label={`Messages with ${characterName}`}
          >
            {messages.length === 0 ? (
              <li className="text-[11px] text-slate-500">No messages yet.</li>
            ) : (
              messages.map((m) => (
                <DmBubble
                  key={m.id}
                  message={m}
                  playerDisplayName={playerDisplayName}
                />
              ))
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
              placeholder="Message…"
              aria-label={`Message ${characterName}`}
              className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-600"
            />
            <button
              type="button"
              onClick={submit}
              className="shrink-0 rounded-md border border-cyan-700/70 bg-cyan-950/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100 hover:border-cyan-500"
            >
              Send
            </button>
          </div>
          {error ? (
            <p className="text-[11px] text-red-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function DmBubble({
  message,
  playerDisplayName,
}: {
  message: GmDmMessage
  playerDisplayName: string | null
}) {
  const fromGm = message.from === 'gm'
  return (
    <li
      className={`rounded px-2 py-1 text-[11px] leading-snug ${
        fromGm
          ? 'bg-cyan-950/50 text-cyan-50'
          : 'bg-slate-800/80 text-slate-100'
      }`}
    >
      <span className="mr-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {fromGm ? 'You' : dmPlayerSenderLabel(playerDisplayName)}
      </span>
      {message.text}
    </li>
  )
}
