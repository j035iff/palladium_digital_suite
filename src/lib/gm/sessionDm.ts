/**
 * Play-session-scoped direct messages (GM ↔ seated player).
 * Ephemeral: cleared when the sitting ends / listen stops — not campaign history.
 * Pillar 9: one thread model; UI stays dumb.
 */

import { createGmId } from './sessionId'

/** Short table notes — keep friction low (Speed Over Spectacle). */
export const GM_DM_MAX_LENGTH = 500

export type GmDmSender = 'gm' | 'player'

export type GmDmMessage = {
  id: string
  playSessionId: string
  characterId: string
  from: GmDmSender
  text: string
  sentAtMs: number
}

/** Wire payload for `dm.send` (both directions). */
export type GmDmSendPayload = {
  playSessionId: string
  characterId: string
  from: GmDmSender
  text: string
  messageId: string
}

export type GmDmThreadState = {
  /** characterId → ordered messages for this sitting. */
  byCharacterId: Record<string, GmDmMessage[]>
  /**
   * Unread from the local viewer’s perspective:
   * host tracks player→gm; client tracks gm→player.
   */
  unreadByCharacterId: Record<string, number>
}

export function emptyDmThreadState(): GmDmThreadState {
  return { byCharacterId: {}, unreadByCharacterId: {} }
}

export function normalizeDmText(raw: string): string {
  return raw.replace(/\r\n/g, '\n').trim()
}

export function clampDmText(raw: string): string {
  const t = normalizeDmText(raw)
  if (t.length <= GM_DM_MAX_LENGTH) return t
  return t.slice(0, GM_DM_MAX_LENGTH)
}

export function isValidDmText(raw: string): boolean {
  const t = normalizeDmText(raw)
  return t.length > 0 && t.length <= GM_DM_MAX_LENGTH
}

export function createDmMessage(input: {
  playSessionId: string
  characterId: string
  from: GmDmSender
  text: string
  sentAtMs?: number
  id?: string
}): GmDmMessage | null {
  const text = clampDmText(input.text)
  if (!text) return null
  if (!input.playSessionId || !input.characterId) return null
  return {
    id: input.id ?? createGmId('dm'),
    playSessionId: input.playSessionId,
    characterId: input.characterId,
    from: input.from,
    text,
    sentAtMs: input.sentAtMs ?? Date.now(),
  }
}

export function dmPayloadFromMessage(message: GmDmMessage): GmDmSendPayload {
  return {
    playSessionId: message.playSessionId,
    characterId: message.characterId,
    from: message.from,
    text: message.text,
    messageId: message.id,
  }
}

export function dmMessageFromPayload(
  payload: GmDmSendPayload,
  sentAtMs: number,
): GmDmMessage | null {
  return createDmMessage({
    playSessionId: payload.playSessionId,
    characterId: payload.characterId,
    from: payload.from,
    text: payload.text,
    id: payload.messageId,
    sentAtMs,
  })
}

/**
 * Append a message. Increments unread when `unreadFor` matches the sender
 * (host: unread when from === 'player'; client: unread when from === 'gm').
 */
export function appendDmMessage(
  state: GmDmThreadState,
  message: GmDmMessage,
  unreadFor: GmDmSender,
): GmDmThreadState {
  const list = state.byCharacterId[message.characterId] ?? []
  if (list.some((m) => m.id === message.id)) return state
  const nextList = [...list, message]
  const bumpUnread = message.from === unreadFor
  const prevUnread = state.unreadByCharacterId[message.characterId] ?? 0
  return {
    byCharacterId: {
      ...state.byCharacterId,
      [message.characterId]: nextList,
    },
    unreadByCharacterId: bumpUnread
      ? {
          ...state.unreadByCharacterId,
          [message.characterId]: prevUnread + 1,
        }
      : state.unreadByCharacterId,
  }
}

export function markDmThreadRead(
  state: GmDmThreadState,
  characterId: string,
): GmDmThreadState {
  if (!(characterId in state.unreadByCharacterId)) return state
  if ((state.unreadByCharacterId[characterId] ?? 0) === 0) return state
  return {
    ...state,
    unreadByCharacterId: {
      ...state.unreadByCharacterId,
      [characterId]: 0,
    },
  }
}

export function clearDmThreads(): GmDmThreadState {
  return emptyDmThreadState()
}

export function dmMessagesForCharacter(
  state: GmDmThreadState,
  characterId: string,
): GmDmMessage[] {
  return state.byCharacterId[characterId] ?? []
}

export function dmUnreadForCharacter(
  state: GmDmThreadState,
  characterId: string,
): number {
  return state.unreadByCharacterId[characterId] ?? 0
}

export function dmTotalUnread(state: GmDmThreadState): number {
  let n = 0
  for (const v of Object.values(state.unreadByCharacterId)) n += v
  return n
}

/**
 * GM-side bubble label for a player→GM message.
 * Uses the seat join display name; clear fallback when missing (Radical Visibility).
 */
export function dmPlayerSenderLabel(
  playerDisplayName: string | null | undefined,
): string {
  const name = playerDisplayName?.trim()
  return name ? name : 'Unknown player'
}

/** Drop one seat’s thread when they leave / are kicked. */
export function dropDmCharacterThread(
  state: GmDmThreadState,
  characterId: string | null | undefined,
): GmDmThreadState {
  if (!characterId) return state
  if (!(characterId in state.byCharacterId) && !(characterId in state.unreadByCharacterId)) {
    return state
  }
  const byCharacterId = { ...state.byCharacterId }
  const unreadByCharacterId = { ...state.unreadByCharacterId }
  delete byCharacterId[characterId]
  delete unreadByCharacterId[characterId]
  return { byCharacterId, unreadByCharacterId }
}
