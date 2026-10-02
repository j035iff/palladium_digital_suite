import { useEffect, useMemo, useRef, useState } from 'react'
import {
  dmPlayerSenderLabel,
  GM_DM_MAX_LENGTH,
  GM_GROUP_CHAT_DEFAULT_TITLE,
  groupTotalUnread,
  groupUnread,
  listGroupChats,
  type GmGroupChat,
  type GmGroupChatMessage,
  type GmGroupChatState,
} from '../../lib/gm/sessionGroupChat'
import type { GmSeat } from '../../lib/gm/sessionPresence'
import { playerNameForPartyCharacter } from '../../lib/gm/joinTableLeave'

type SeatedOption = {
  characterId: string
  characterName: string
  playerDisplayName: string | null
}

type GmGroupChatSectionProps = {
  seatedOptions: SeatedOption[]
  seats: GmSeat[]
  groupChat: GmGroupChatState
  onCreate: (input: {
    memberCharacterIds: string[]
    title?: string | null
  }) => { ok: true } | { ok: false; reason: string }
  onSend: (
    groupId: string,
    text: string,
  ) => { ok: true } | { ok: false; reason: string }
  onMarkRead: (groupId: string) => void
  onAddMembers: (
    groupId: string,
    characterIds: string[],
  ) => { ok: true } | { ok: false; reason: string }
  onRemoveMember: (
    groupId: string,
    characterId: string,
  ) => { ok: true } | { ok: false; reason: string }
}

/**
 * GM group chats on People → PCs → At the table.
 * Familiar Surface: Create + shared thread — no protocol jargon.
 */
export function GmGroupChatSection({
  seatedOptions,
  seats,
  groupChat,
  onCreate,
  onSend,
  onMarkRead,
  onAddMembers,
  onRemoveMember,
}: GmGroupChatSectionProps) {
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [createError, setCreateError] = useState<string | null>(null)
  const groups = listGroupChats(groupChat)
  const totalUnread = groupTotalUnread(groupChat)
  const canCreate = seatedOptions.length > 0

  const toggle = (characterId: string) => {
    setSelected((prev) => ({ ...prev, [characterId]: !prev[characterId] }))
  }

  const submitCreate = () => {
    const memberCharacterIds = seatedOptions
      .map((o) => o.characterId)
      .filter((id) => selected[id])
    const result = onCreate({
      memberCharacterIds,
      title: title.trim() || null,
    })
    if (!result.ok) {
      setCreateError(result.reason)
      return
    }
    setCreating(false)
    setTitle('')
    setSelected({})
    setCreateError(null)
  }

  return (
    <section className="mt-5 border-t border-slate-800 pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
            Group chats
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Shared notes with seated players for this sitting only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalUnread > 0 ? (
            <span
              className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950"
              aria-label={`${totalUnread} unread group messages`}
            >
              {totalUnread}
            </span>
          ) : null}
          <button
            type="button"
            disabled={!canCreate}
            title={
              canCreate
                ? undefined
                : 'Open Table and seat players before creating a group chat.'
            }
            onClick={() => {
              setCreating((v) => !v)
              setCreateError(null)
            }}
            className="rounded-md border border-cyan-700/70 bg-cyan-950/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100 hover:border-cyan-500 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
          >
            {creating ? 'Cancel' : 'Create Group Chat'}
          </button>
        </div>
      </div>

      {creating ? (
        <div className="mb-3 space-y-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3">
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={GM_GROUP_CHAT_DEFAULT_TITLE}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs font-normal normal-case tracking-normal text-slate-100 placeholder:text-slate-600"
            />
          </label>
          <fieldset>
            <legend className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Players at the table
            </legend>
            <ul className="mt-1.5 space-y-1">
              {seatedOptions.map((opt) => (
                <li key={opt.characterId}>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[opt.characterId])}
                      onChange={() => toggle(opt.characterId)}
                    />
                    <span>
                      {opt.playerDisplayName?.trim() || 'Unknown player'}
                      <span className="text-slate-500">
                        {' '}
                        · {opt.characterName}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <button
            type="button"
            onClick={submitCreate}
            className="rounded-md border border-cyan-700/70 bg-cyan-950/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100 hover:border-cyan-500"
          >
            Create
          </button>
          {createError ? (
            <p className="text-[11px] text-red-300" role="alert">
              {createError}
            </p>
          ) : null}
        </div>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-[11px] text-slate-500">No group chats yet.</p>
      ) : (
        <ul className="space-y-2">
          {groups.map((chat) => (
            <li key={chat.id}>
              <GmGroupThread
                chat={chat}
                unread={groupUnread(groupChat, chat.id)}
                seats={seats}
                seatedOptions={seatedOptions}
                onSend={onSend}
                onMarkRead={onMarkRead}
                onAddMembers={onAddMembers}
                onRemoveMember={onRemoveMember}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function GmGroupThread({
  chat,
  unread,
  seats,
  seatedOptions,
  onSend,
  onMarkRead,
  onAddMembers,
  onRemoveMember,
}: {
  chat: GmGroupChat
  unread: number
  seats: GmSeat[]
  seatedOptions: SeatedOption[]
  onSend: (
    groupId: string,
    text: string,
  ) => { ok: true } | { ok: false; reason: string }
  onMarkRead: (groupId: string) => void
  onAddMembers: (
    groupId: string,
    characterIds: string[],
  ) => { ok: true } | { ok: false; reason: string }
  onRemoveMember: (
    groupId: string,
    characterId: string,
  ) => { ok: true } | { ok: false; reason: string }
}) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addSelected, setAddSelected] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  const memberLabels = useMemo(
    () =>
      chat.memberCharacterIds.map((id) => {
        const name = playerNameForPartyCharacter(seats, id)
        const opt = seatedOptions.find((o) => o.characterId === id)
        return {
          characterId: id,
          label: dmPlayerSenderLabel(name),
          characterName: opt?.characterName ?? id,
        }
      }),
    [chat.memberCharacterIds, seats, seatedOptions],
  )

  const addable = seatedOptions.filter(
    (o) => !chat.memberCharacterIds.includes(o.characterId),
  )

  useEffect(() => {
    if (open) onMarkRead(chat.id)
  }, [open, chat.id, onMarkRead, chat.messages.length])

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [open, chat.messages.length])

  const submit = () => {
    const result = onSend(chat.id, draft)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setDraft('')
    setError(null)
  }

  const submitAdd = () => {
    const ids = addable
      .map((o) => o.characterId)
      .filter((id) => addSelected[id])
    const result = onAddMembers(chat.id, ids)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setAdding(false)
    setAddSelected({})
    setError(null)
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-[11px] font-bold text-slate-200 hover:bg-slate-800/60"
        aria-expanded={open}
      >
        <span className="truncate">{chat.title}</span>
        <span className="flex shrink-0 items-center gap-2 font-normal text-slate-500">
          {unread > 0 ? (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
              {unread}
            </span>
          ) : null}
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open ? (
        <div className="mt-2 space-y-2">
          <p className="text-[10px] text-slate-500">
            Members:{' '}
            {memberLabels.length === 0
              ? 'none seated'
              : memberLabels.map((m) => m.label).join(', ')}
          </p>
          <ul
            ref={listRef}
            className="max-h-36 space-y-1.5 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/70 p-2"
            aria-label={`${chat.title} messages`}
          >
            {chat.messages.length === 0 ? (
              <li className="text-[11px] text-slate-500">No messages yet.</li>
            ) : (
              chat.messages.map((m) => (
                <GroupBubble
                  key={m.id}
                  message={m}
                  seats={seats}
                  selfIsGm
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
              placeholder="Message group…"
              aria-label={`Message ${chat.title}`}
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

          <div className="flex flex-wrap gap-2">
            {addable.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setAdding((v) => !v)
                  setError(null)
                }}
                className="text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-slate-200"
              >
                {adding ? 'Cancel add' : 'Add players'}
              </button>
            ) : null}
            {memberLabels.map((m) => (
              <button
                key={m.characterId}
                type="button"
                onClick={() => {
                  const result = onRemoveMember(chat.id, m.characterId)
                  if (!result.ok) setError(result.reason)
                }}
                className="text-[10px] text-slate-500 hover:text-red-300"
                title={`Remove ${m.label}`}
              >
                Remove {m.label}
              </button>
            ))}
          </div>

          {adding ? (
            <div className="space-y-1.5 rounded-md border border-slate-800 p-2">
              {addable.map((opt) => (
                <label
                  key={opt.characterId}
                  className="flex cursor-pointer items-center gap-2 text-xs text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(addSelected[opt.characterId])}
                    onChange={() =>
                      setAddSelected((prev) => ({
                        ...prev,
                        [opt.characterId]: !prev[opt.characterId],
                      }))
                    }
                  />
                  {opt.playerDisplayName?.trim() || 'Unknown player'}
                </label>
              ))}
              <button
                type="button"
                onClick={submitAdd}
                className="rounded-md border border-slate-600 px-2 py-1 text-[10px] font-bold uppercase text-slate-200"
              >
                Add
              </button>
            </div>
          ) : null}

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

export function GroupBubble({
  message,
  seats,
  selfIsGm,
  selfCharacterId,
}: {
  message: GmGroupChatMessage
  seats: GmSeat[]
  selfIsGm?: boolean
  selfCharacterId?: string | null
}) {
  const fromGm = message.from === 'gm'
  const fromSelf =
    (selfIsGm && fromGm) ||
    (!!selfCharacterId &&
      message.from === 'player' &&
      message.characterId === selfCharacterId)
  const label = fromSelf
    ? 'You'
    : fromGm
      ? 'GM'
      : dmPlayerSenderLabel(
          playerNameForPartyCharacter(seats, message.characterId ?? ''),
        )
  return (
    <li
      className={`rounded px-2 py-1 text-[11px] leading-snug ${
        fromSelf
          ? selfIsGm
            ? 'bg-cyan-950/50 text-cyan-50'
            : 'bg-amber-950/50 text-amber-50'
          : 'bg-slate-800/80 text-slate-100'
      }`}
    >
      <span className="mr-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {message.text}
    </li>
  )
}
