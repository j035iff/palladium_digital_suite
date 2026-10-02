/**
 * Play-session-scoped multi-person group chat (GM + seated players).
 * Same message pipeline family as 1:1 DM (`sessionDm` + `dm.*` envelopes).
 * Ephemeral: cleared when the sitting ends — not campaign history.
 * Pillar 9: one host/client transport; UI stays dumb.
 */

import { createGmId } from './sessionId'
import {
  clampDmText,
  dmPlayerSenderLabel,
  GM_DM_MAX_LENGTH,
  isValidDmText,
  normalizeDmText,
  type GmDmSender,
} from './sessionDm'

export { GM_DM_MAX_LENGTH, clampDmText, isValidDmText, normalizeDmText }
export { dmPlayerSenderLabel }

export const GM_GROUP_CHAT_DEFAULT_TITLE = 'Group chat'

export type GmGroupChatMessage = {
  id: string
  groupId: string
  playSessionId: string
  from: GmDmSender
  /** Sender seat character when from === 'player'; null for GM. */
  characterId: string | null
  text: string
  sentAtMs: number
}

export type GmGroupChat = {
  id: string
  playSessionId: string
  title: string
  /** Seated character ids. GM is always a participant (not listed). */
  memberCharacterIds: string[]
  messages: GmGroupChatMessage[]
}

export type GmGroupChatState = {
  byId: Record<string, GmGroupChat>
  /**
   * Unread from the local viewer’s perspective:
   * host: messages from players; client: messages not from self.
   */
  unreadByGroupId: Record<string, number>
}

/** Wire payload for `dm.groupCreate` (host → members). */
export type GmGroupCreatePayload = {
  playSessionId: string
  groupId: string
  title: string
  memberCharacterIds: string[]
}

/** Wire payload for `dm.groupSend` (both directions). */
export type GmGroupSendPayload = {
  playSessionId: string
  groupId: string
  from: GmDmSender
  characterId: string | null
  text: string
  messageId: string
}

/** Wire payload for `dm.groupMembers` (host → members after add/remove). */
export type GmGroupMembersPayload = {
  playSessionId: string
  groupId: string
  memberCharacterIds: string[]
}

export function emptyGroupChatState(): GmGroupChatState {
  return { byId: {}, unreadByGroupId: {} }
}

export function normalizeGroupTitle(raw: string | null | undefined): string {
  const t = raw?.replace(/\s+/g, ' ').trim() ?? ''
  return t || GM_GROUP_CHAT_DEFAULT_TITLE
}

export function createGroupChat(input: {
  playSessionId: string
  memberCharacterIds: string[]
  title?: string | null
  id?: string
}): GmGroupChat | null {
  if (!input.playSessionId) return null
  const members = uniqueIds(input.memberCharacterIds)
  if (members.length === 0) return null
  return {
    id: input.id ?? createGmId('gchat'),
    playSessionId: input.playSessionId,
    title: normalizeGroupTitle(input.title),
    memberCharacterIds: members,
    messages: [],
  }
}

export function createGroupChatMessage(input: {
  groupId: string
  playSessionId: string
  from: GmDmSender
  characterId: string | null
  text: string
  sentAtMs?: number
  id?: string
}): GmGroupChatMessage | null {
  const text = clampDmText(input.text)
  if (!text) return null
  if (!input.groupId || !input.playSessionId) return null
  if (input.from === 'player' && !input.characterId) return null
  if (input.from === 'gm' && input.characterId) return null
  return {
    id: input.id ?? createGmId('gmsg'),
    groupId: input.groupId,
    playSessionId: input.playSessionId,
    from: input.from,
    characterId: input.from === 'gm' ? null : input.characterId,
    text,
    sentAtMs: input.sentAtMs ?? Date.now(),
  }
}

export function groupCreatePayloadFromChat(
  chat: GmGroupChat,
): GmGroupCreatePayload {
  return {
    playSessionId: chat.playSessionId,
    groupId: chat.id,
    title: chat.title,
    memberCharacterIds: [...chat.memberCharacterIds],
  }
}

export function groupChatFromCreatePayload(
  payload: GmGroupCreatePayload,
): GmGroupChat | null {
  return createGroupChat({
    playSessionId: payload.playSessionId,
    memberCharacterIds: payload.memberCharacterIds,
    title: payload.title,
    id: payload.groupId,
  })
}

export function groupSendPayloadFromMessage(
  message: GmGroupChatMessage,
): GmGroupSendPayload {
  return {
    playSessionId: message.playSessionId,
    groupId: message.groupId,
    from: message.from,
    characterId: message.characterId,
    text: message.text,
    messageId: message.id,
  }
}

export function groupMessageFromPayload(
  payload: GmGroupSendPayload,
  sentAtMs: number,
): GmGroupChatMessage | null {
  return createGroupChatMessage({
    groupId: payload.groupId,
    playSessionId: payload.playSessionId,
    from: payload.from,
    characterId: payload.characterId,
    text: payload.text,
    id: payload.messageId,
    sentAtMs,
  })
}

export function upsertGroupChat(
  state: GmGroupChatState,
  chat: GmGroupChat,
): GmGroupChatState {
  const prev = state.byId[chat.id]
  if (prev) {
    return {
      ...state,
      byId: {
        ...state.byId,
        [chat.id]: {
          ...chat,
          messages: prev.messages.length ? prev.messages : chat.messages,
        },
      },
    }
  }
  return {
    ...state,
    byId: { ...state.byId, [chat.id]: chat },
  }
}

export function setGroupMembers(
  state: GmGroupChatState,
  groupId: string,
  memberCharacterIds: string[],
): GmGroupChatState {
  const chat = state.byId[groupId]
  if (!chat) return state
  const members = uniqueIds(memberCharacterIds)
  if (sameIdList(chat.memberCharacterIds, members)) return state
  return {
    ...state,
    byId: {
      ...state.byId,
      [groupId]: { ...chat, memberCharacterIds: members },
    },
  }
}

export function addMembersToGroup(
  state: GmGroupChatState,
  groupId: string,
  addCharacterIds: string[],
): GmGroupChatState {
  const chat = state.byId[groupId]
  if (!chat) return state
  return setGroupMembers(state, groupId, [
    ...chat.memberCharacterIds,
    ...addCharacterIds,
  ])
}

export function removeMemberFromGroups(
  state: GmGroupChatState,
  characterId: string | null | undefined,
): GmGroupChatState {
  if (!characterId) return state
  let next = state
  let changed = false
  for (const chat of Object.values(state.byId)) {
    if (!chat.memberCharacterIds.includes(characterId)) continue
    changed = true
    next = setGroupMembers(
      next,
      chat.id,
      chat.memberCharacterIds.filter((id) => id !== characterId),
    )
  }
  return changed ? next : state
}

/**
 * Append a group message.
 * `bumpUnread` true increments unread for that group (caller decides by role).
 */
export function appendGroupMessage(
  state: GmGroupChatState,
  message: GmGroupChatMessage,
  bumpUnread: boolean,
): GmGroupChatState {
  const chat = state.byId[message.groupId]
  if (!chat) return state
  if (chat.messages.some((m) => m.id === message.id)) return state
  const prevUnread = state.unreadByGroupId[message.groupId] ?? 0
  return {
    byId: {
      ...state.byId,
      [message.groupId]: {
        ...chat,
        messages: [...chat.messages, message],
      },
    },
    unreadByGroupId: bumpUnread
      ? {
          ...state.unreadByGroupId,
          [message.groupId]: prevUnread + 1,
        }
      : state.unreadByGroupId,
  }
}

export function markGroupChatRead(
  state: GmGroupChatState,
  groupId: string,
): GmGroupChatState {
  if (!(groupId in state.unreadByGroupId)) return state
  if ((state.unreadByGroupId[groupId] ?? 0) === 0) return state
  return {
    ...state,
    unreadByGroupId: {
      ...state.unreadByGroupId,
      [groupId]: 0,
    },
  }
}

export function clearGroupChats(): GmGroupChatState {
  return emptyGroupChatState()
}

export function groupChatById(
  state: GmGroupChatState,
  groupId: string,
): GmGroupChat | null {
  return state.byId[groupId] ?? null
}

export function listGroupChats(state: GmGroupChatState): GmGroupChat[] {
  return Object.values(state.byId).sort((a, b) => a.title.localeCompare(b.title))
}

export function groupsForCharacter(
  state: GmGroupChatState,
  characterId: string,
): GmGroupChat[] {
  return listGroupChats(state).filter((g) =>
    g.memberCharacterIds.includes(characterId),
  )
}

export function groupUnread(
  state: GmGroupChatState,
  groupId: string,
): number {
  return state.unreadByGroupId[groupId] ?? 0
}

export function groupTotalUnread(state: GmGroupChatState): number {
  let n = 0
  for (const v of Object.values(state.unreadByGroupId)) n += v
  return n
}

export function isGroupMember(
  chat: GmGroupChat,
  characterId: string | null | undefined,
): boolean {
  if (!characterId) return false
  return chat.memberCharacterIds.includes(characterId)
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    const t = id.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

function sameIdList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}
