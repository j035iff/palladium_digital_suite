/**
 * Client-side join runtime — connect, hello, interacting-sheet outbound.
 */

import { createGmId } from './sessionId'
import {
  createGmEnvelope,
  isGmEnvelope,
  type GmDmPayload,
  type GmGroupCreatePayload,
  type GmGroupMembersPayload,
  type GmGroupSendPayload,
  type GmHelloPayload,
  type GmProtocolMessage,
} from './sessionMessages'
import type { GmSeat } from './sessionPresence'
import type { GmTransport } from './sessionTransport'
import {
  appendDmMessage,
  createDmMessage,
  dmMessageFromPayload,
  dmPayloadFromMessage,
  emptyDmThreadState,
  markDmThreadRead,
  type GmDmMessage,
  type GmDmThreadState,
} from './sessionDm'
import {
  appendGroupMessage,
  createGroupChatMessage,
  emptyGroupChatState,
  groupChatById,
  groupChatFromCreatePayload,
  groupMessageFromPayload,
  groupSendPayloadFromMessage,
  isGroupMember,
  markGroupChatRead,
  setGroupMembers,
  upsertGroupChat,
  type GmGroupChatMessage,
  type GmGroupChatState,
} from './sessionGroupChat'

const DEVICE_ID_KEY = 'pds:gmDeviceId'

export function loadOrCreateDeviceId(): string {
  if (typeof localStorage === 'undefined') return createGmId('dev')
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing && existing.trim()) return existing
  const id = createGmId('dev')
  localStorage.setItem(DEVICE_ID_KEY, id)
  return id
}

export type GmClientJoinStatus =
  | 'idle'
  | 'connecting'
  | 'joined'
  | 'rejected'
  | 'closed'
  | 'error'

export type GmClientRuntimeState = {
  status: GmClientJoinStatus
  deviceId: string
  displayName: string
  hello: GmHelloPayload | null
  campaignId: string | null
  seats: GmSeat[]
  lastError: string | null
  /** Live H.F. emit mirrored from host broadcast. */
  activeHf: {
    npcInstanceId: string
    saveTarget: number
    useNightbaneHorrorFactor: boolean
  } | null
  initiativeLocked: boolean
  /** Play-session DM thread for this device’s seated character. */
  dm: GmDmThreadState
  /** Play-session group chats this seat is a member of. */
  groupChat: GmGroupChatState
  /** Character id attached via party.snapshot (local mirror for DM). */
  attachedCharacterId: string | null
}

export type GmClientRuntime = {
  getState: () => GmClientRuntimeState
  attachTransport: (transport: GmTransport) => () => void
  join: (input: {
    campaignId: string
    playSessionId: string
    joinToken: string
    shortCode?: string
    displayName: string
  }) => void
  leave: () => void
  sendPartySnapshot: (characterId: string, characterJson: unknown) => void
  sendInitiative: (characterId: string, d20: number) => void
  sendHfSave: (characterId: string, d20: number) => void
  sendApmSpend: (characterId: string, actions?: number) => void
  sendDm: (
    text: string,
  ) => { ok: true; message: GmDmMessage } | { ok: false; reason: string }
  markDmRead: () => void
  sendGroupChat: (
    groupId: string,
    text: string,
  ) => { ok: true; message: GmGroupChatMessage } | { ok: false; reason: string }
  markGroupChatRead: (groupId: string) => void
  subscribe: (listener: (state: GmClientRuntimeState) => void) => () => void
}

export function createGmClientRuntime(
  deviceId = loadOrCreateDeviceId(),
): GmClientRuntime {
  let state: GmClientRuntimeState = {
    status: 'idle',
    deviceId,
    displayName: 'Player',
    hello: null,
    campaignId: null,
    seats: [],
    lastError: null,
    activeHf: null,
    initiativeLocked: false,
    dm: emptyDmThreadState(),
    groupChat: emptyGroupChatState(),
    attachedCharacterId: null,
  }
  let transport: GmTransport | null = null
  const listeners = new Set<(s: GmClientRuntimeState) => void>()

  const emit = () => {
    for (const l of listeners) l(state)
  }

  const setState = (patch: Partial<GmClientRuntimeState>) => {
    state = { ...state, ...patch }
    emit()
  }

  const attachTransport = (t: GmTransport): (() => void) => {
    transport = t
    const unsub = t.onMessage((_from, message) => {
      if (!isGmEnvelope(message)) return
      if (message.v !== 1) {
        setState({
          status: 'error',
          lastError: 'Protocol version mismatch (expected v1).',
        })
        return
      }
      if (state.campaignId && message.sessionId !== state.campaignId) return

      if (message.type === 'session.welcome') {
        const payload = message.payload as {
          deviceId: string
          hello: GmHelloPayload
        }
        setState({
          status: 'joined',
          hello: payload.hello,
          campaignId: message.sessionId,
          lastError: null,
        })
        return
      }
      if (message.type === 'session.hello') {
        setState({
          hello: message.payload as GmHelloPayload,
          campaignId: message.sessionId,
          status: state.status === 'connecting' ? 'joined' : state.status,
        })
        return
      }
      if (message.type === 'session.presence') {
        const payload = message.payload as { seats: GmSeat[] }
        const me = payload.seats.find((s) => s.deviceId === state.deviceId)
        setState({
          seats: payload.seats,
          attachedCharacterId:
            me?.characterId ?? state.attachedCharacterId,
        })
        return
      }
      if (message.type === 'session.kick' || message.type === 'session.closed') {
        const reason =
          (message.payload as { reason?: string }).reason ?? 'Session closed.'
        setState({
          status: message.type === 'session.kick' ? 'rejected' : 'closed',
          lastError: reason,
          hello: null,
          activeHf: null,
          dm: emptyDmThreadState(),
          groupChat: emptyGroupChatState(),
          attachedCharacterId: null,
        })
        return
      }
      if (message.type === 'combat.hfEmit') {
        setState({
          activeHf: message.payload as GmClientRuntimeState['activeHf'],
        })
        return
      }
      if (message.type === 'combat.hfClear') {
        setState({ activeHf: null })
        return
      }
      if (message.type === 'combat.initiativeLock') {
        const payload = message.payload as { locked: boolean }
        setState({ initiativeLocked: Boolean(payload.locked) })
        return
      }
      if (message.type === 'dm.send') {
        const payload = message.payload as GmDmPayload
        if (payload.from !== 'gm') return
        const charId = state.attachedCharacterId
        if (!charId || payload.characterId !== charId) return
        const dmMessage = dmMessageFromPayload(payload, message.sentAtMs)
        if (!dmMessage) return
        setState({
          dm: appendDmMessage(state.dm, dmMessage, 'gm'),
        })
        return
      }
      if (message.type === 'dm.groupCreate') {
        const payload = message.payload as GmGroupCreatePayload
        const chat = groupChatFromCreatePayload(payload)
        if (!chat) return
        const charId = state.attachedCharacterId
        if (charId && !isGroupMember(chat, charId)) {
          // Removed from group via empty/non-member create — drop locally.
          if (state.groupChat.byId[chat.id]) {
            const byId = { ...state.groupChat.byId }
            const unreadByGroupId = { ...state.groupChat.unreadByGroupId }
            delete byId[chat.id]
            delete unreadByGroupId[chat.id]
            setState({ groupChat: { byId, unreadByGroupId } })
          }
          return
        }
        if (charId && isGroupMember(chat, charId)) {
          setState({ groupChat: upsertGroupChat(state.groupChat, chat) })
        }
        return
      }
      if (message.type === 'dm.groupMembers') {
        const payload = message.payload as GmGroupMembersPayload
        const charId = state.attachedCharacterId
        if (!charId) return
        if (!payload.memberCharacterIds.includes(charId)) {
          if (!state.groupChat.byId[payload.groupId]) return
          const byId = { ...state.groupChat.byId }
          const unreadByGroupId = { ...state.groupChat.unreadByGroupId }
          delete byId[payload.groupId]
          delete unreadByGroupId[payload.groupId]
          setState({ groupChat: { byId, unreadByGroupId } })
          return
        }
        if (!state.groupChat.byId[payload.groupId]) {
          // Roster update before create is ignored; create carries full chat.
          return
        }
        setState({
          groupChat: setGroupMembers(
            state.groupChat,
            payload.groupId,
            payload.memberCharacterIds,
          ),
        })
        return
      }
      if (message.type === 'dm.groupSend') {
        const payload = message.payload as GmGroupSendPayload
        const charId = state.attachedCharacterId
        if (!charId) return
        const chat = groupChatById(state.groupChat, payload.groupId)
        if (!chat || !isGroupMember(chat, charId)) return
        const groupMessage = groupMessageFromPayload(payload, message.sentAtMs)
        if (!groupMessage) return
        const fromSelf =
          groupMessage.from === 'player' &&
          groupMessage.characterId === charId
        setState({
          groupChat: appendGroupMessage(
            state.groupChat,
            groupMessage,
            !fromSelf,
          ),
        })
      }
    })
    return () => {
      unsub()
      if (transport === t) transport = null
    }
  }

  const join: GmClientRuntime['join'] = (input) => {
    if (!transport) {
      setState({
        status: 'error',
        lastError: 'Transport not started.',
      })
      return
    }
    setState({
      status: 'connecting',
      campaignId: input.campaignId,
      displayName: input.displayName,
      lastError: null,
      dm: emptyDmThreadState(),
      groupChat: emptyGroupChatState(),
      attachedCharacterId: null,
    })
    const envelope = createGmEnvelope('session.join', input.campaignId, {
      playSessionId: input.playSessionId,
      joinToken: input.joinToken,
      shortCode: input.shortCode,
      deviceId: state.deviceId,
      displayName: input.displayName,
    })
    // Client → host: mock hub uses send to host peer id "host"
    transport.send('host', envelope)
  }

  const requireJoined = (): boolean =>
    state.status === 'joined' && state.campaignId != null && transport != null

  const leave = () => {
    if (requireJoined()) {
      transport!.send(
        'host',
        createGmEnvelope('session.leave', state.campaignId!, {
          deviceId: state.deviceId,
        }),
      )
    }
    setState({
      status: 'idle',
      hello: null,
      campaignId: null,
      seats: [],
      activeHf: null,
      lastError: null,
      dm: emptyDmThreadState(),
      groupChat: emptyGroupChatState(),
      attachedCharacterId: null,
    })
  }

  const sendPartySnapshot = (characterId: string, characterJson: unknown) => {
    if (!requireJoined()) return
    setState({ attachedCharacterId: characterId })
    transport!.send(
      'host',
      createGmEnvelope('party.snapshot', state.campaignId!, {
        characterId,
        characterJson,
      }),
    )
  }

  const sendInitiative = (characterId: string, d20: number) => {
    if (!requireJoined()) return
    transport!.send(
      'host',
      createGmEnvelope('combat.initiative', state.campaignId!, {
        combatantKey: characterId,
        kind: 'pc',
        d20,
      }),
    )
  }

  const sendHfSave = (characterId: string, d20: number) => {
    if (!requireJoined()) return
    transport!.send(
      'host',
      createGmEnvelope('combat.hfSave', state.campaignId!, {
        characterId,
        d20,
      }),
    )
  }

  const sendApmSpend = (characterId: string, actions = 1) => {
    if (!requireJoined()) return
    transport!.send(
      'host',
      createGmEnvelope('combat.apmSpend', state.campaignId!, {
        combatantKey: characterId,
        kind: 'pc',
        actions,
      }),
    )
  }

  const sendDm: GmClientRuntime['sendDm'] = (text) => {
    if (!requireJoined()) {
      return { ok: false, reason: 'Not joined to a table.' }
    }
    const playSessionId = state.hello?.playSessionId
    const characterId = state.attachedCharacterId
    if (!playSessionId || !characterId) {
      return {
        ok: false,
        reason: 'Sit at the table with a character before messaging.',
      }
    }
    const message = createDmMessage({
      playSessionId,
      characterId,
      from: 'player',
      text,
    })
    if (!message) {
      return { ok: false, reason: 'Message is empty or too long.' }
    }
    transport!.send(
      'host',
      createGmEnvelope('dm.send', state.campaignId!, dmPayloadFromMessage(message)),
    )
    setState({
      dm: appendDmMessage(state.dm, message, 'gm'),
    })
    return { ok: true, message }
  }

  const markDmRead = () => {
    const characterId = state.attachedCharacterId
    if (!characterId) return
    setState({ dm: markDmThreadRead(state.dm, characterId) })
  }

  const sendGroupChat: GmClientRuntime['sendGroupChat'] = (groupId, text) => {
    if (!requireJoined()) {
      return { ok: false, reason: 'Not joined to a table.' }
    }
    const playSessionId = state.hello?.playSessionId
    const characterId = state.attachedCharacterId
    if (!playSessionId || !characterId) {
      return {
        ok: false,
        reason: 'Sit at the table with a character before messaging.',
      }
    }
    const chat = groupChatById(state.groupChat, groupId)
    if (!chat || !isGroupMember(chat, characterId)) {
      return { ok: false, reason: 'You are not in that group chat.' }
    }
    const message = createGroupChatMessage({
      groupId,
      playSessionId,
      from: 'player',
      characterId,
      text,
    })
    if (!message) {
      return { ok: false, reason: 'Message is empty or too long.' }
    }
    transport!.send(
      'host',
      createGmEnvelope(
        'dm.groupSend',
        state.campaignId!,
        groupSendPayloadFromMessage(message),
      ),
    )
    setState({
      groupChat: appendGroupMessage(state.groupChat, message, false),
    })
    return { ok: true, message }
  }

  const markGroupChatReadClient: GmClientRuntime['markGroupChatRead'] = (
    groupId,
  ) => {
    setState({ groupChat: markGroupChatRead(state.groupChat, groupId) })
  }

  return {
    getState: () => state,
    attachTransport,
    join,
    leave,
    sendPartySnapshot,
    sendInitiative,
    sendHfSave,
    sendApmSpend,
    sendDm,
    markDmRead,
    sendGroupChat,
    markGroupChatRead: markGroupChatReadClient,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** Encode join URL for QR (ws URL + token + short code + ids). */
export function buildJoinUrl(input: {
  wsBase: string
  campaignId: string
  playSessionId: string
  joinToken: string
  shortCode: string
}): string {
  const u = new URL(input.wsBase.replace(/^http/, 'ws'))
  u.searchParams.set('campaignId', input.campaignId)
  u.searchParams.set('playSessionId', input.playSessionId)
  u.searchParams.set('token', input.joinToken)
  u.searchParams.set('code', input.shortCode)
  return u.toString()
}

export function parseJoinUrl(raw: string): {
  wsUrl: string
  campaignId: string
  playSessionId: string
  joinToken: string
  shortCode: string
} | null {
  try {
    const u = new URL(raw.trim())
    const campaignId = u.searchParams.get('campaignId') ?? ''
    const playSessionId = u.searchParams.get('playSessionId') ?? ''
    const joinToken = u.searchParams.get('token') ?? ''
    const shortCode = u.searchParams.get('code') ?? ''
    if (!campaignId || !playSessionId || (!joinToken && !shortCode)) return null
    u.search = ''
    return {
      wsUrl: u.toString(),
      campaignId,
      playSessionId,
      joinToken,
      shortCode,
    }
  } catch {
    return null
  }
}

export type { GmProtocolMessage }
