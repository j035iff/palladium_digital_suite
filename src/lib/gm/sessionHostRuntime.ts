/**
 * Host-side join / presence / inbound client command reducer.
 * Pure where possible; session mutators applied via injected applySession.
 */

import {
  attachSeatCharacter,
  clearPresence,
  emptyPresence,
  findSeat,
  grantOrReclaimSeat,
  kickSeat,
  markSeatReconnecting,
  type GmPresenceState,
  type GmSeat,
} from './sessionPresence'
import {
  createGmEnvelope,
  gmHelloPayloadFromCampaign,
  isClientToHostType,
  isGmEnvelope,
  type GmApmSpendPayload,
  type GmDmPayload,
  type GmGroupSendPayload,
  type GmHfSavePayload,
  type GmInitiativePayload,
  type GmJoinPayload,
  type GmPartySnapshotPayload,
  type GmProtocolMessage,
} from './sessionMessages'
import type { GmJoinCredentials } from './sessionJoinCode'
import { shortCodesMatch } from './sessionJoinCode'
import {
  cacheJoinedCharacter,
  clearJoinedCharacter,
} from './sessionPartyCache'
import { activePlaySession } from './playSession'
import type { GmSessionRecord } from './sessionTypes'
import type { GmTransport, GmTransportPeer } from './sessionTransport'
import {
  appendDmMessage,
  createDmMessage,
  dmMessageFromPayload,
  dmPayloadFromMessage,
  dropDmCharacterThread,
  emptyDmThreadState,
  markDmThreadRead,
  type GmDmMessage,
  type GmDmThreadState,
} from './sessionDm'
import {
  addMembersToGroup,
  appendGroupMessage,
  createGroupChat,
  createGroupChatMessage,
  emptyGroupChatState,
  groupChatById,
  groupCreatePayloadFromChat,
  groupMessageFromPayload,
  groupSendPayloadFromMessage,
  isGroupMember,
  markGroupChatRead,
  removeMemberFromGroups,
  setGroupMembers,
  upsertGroupChat,
  type GmGroupChat,
  type GmGroupChatMessage,
  type GmGroupChatState,
} from './sessionGroupChat'

export type GmHostRuntimeState = {
  listening: boolean
  credentials: GmJoinCredentials | null
  presence: GmPresenceState | null
  /** peerId → deviceId for connected clients */
  peerDevices: Record<string, string>
  /** Play-session-scoped DM threads (cleared on Close Table). */
  dm: GmDmThreadState
  /** Play-session-scoped group chats (cleared on Close Table). */
  groupChat: GmGroupChatState
}

export type GmHostRuntimeHooks = {
  getSession: () => GmSessionRecord | null
  applySession: (next: GmSessionRecord) => void
  /** Record PC initiative from client (physical d20 on player device). */
  applyPcInitiative: (characterId: string, d20: number) => void
  applyPcHfSave: (characterId: string, d20: number) => void
  /** PC APM is player-managed; log / acknowledge only. */
  applyPcApmSpend: (characterId: string, actions: number) => void
  /**
   * Attach party member after caching joiner snapshot.
   * `playerLabel` + `characterJson` feed campaign PC history (spawned only).
   */
  applyPartySnapshot: (
    characterId: string,
    label: string,
    meta?: { playerLabel?: string | null; characterJson?: unknown },
  ) => void
  /**
   * Detach party member when a seat leaves / is kicked / listen ends.
   * Clears joiner cache + removes partyCharacterIds entry (no Missing saves).
   */
  applyPartyDetach: (characterId: string) => void
  onPresenceChange?: (presence: GmPresenceState | null) => void
  /** DM thread updates for hub UI (People → PCs At the table). */
  onDmChange?: (dm: GmDmThreadState) => void
  /** Group chat updates for hub UI. */
  onGroupChatChange?: (groupChat: GmGroupChatState) => void
}

export function createInitialHostRuntimeState(): GmHostRuntimeState {
  return {
    listening: false,
    credentials: null,
    presence: null,
    peerDevices: {},
    dm: emptyDmThreadState(),
    groupChat: emptyGroupChatState(),
  }
}

function presencePayload(
  campaignId: string,
  presence: GmPresenceState,
): GmProtocolMessage {
  return createGmEnvelope('session.presence', campaignId, {
    playSessionId: presence.playSessionId,
    seats: presence.seats,
  })
}

function emitPresence(
  transport: GmTransport,
  campaignId: string,
  presence: GmPresenceState,
  hooks: GmHostRuntimeHooks,
): void {
  transport.broadcast(presencePayload(campaignId, presence))
  hooks.onPresenceChange?.(presence)
}

export type GmHostRuntime = {
  getState: () => GmHostRuntimeState
  /** Begin listen cycle with rotated credentials; requires open play sitting. */
  beginListen: (credentials: GmJoinCredentials) => { ok: true } | { ok: false; reason: string }
  endListen: (reason?: string) => void
  kickDevice: (deviceId: string, reason?: string) => void
  broadcastEnvelope: (message: GmProtocolMessage) => void
  /** GM → seated player DM (unicast). Requires fully joined seat with character. */
  sendDmToCharacter: (
    characterId: string,
    text: string,
  ) => { ok: true; message: GmDmMessage } | { ok: false; reason: string }
  markDmRead: (characterId: string) => void
  /** GM creates a group with currently seated members. */
  createGroupChat: (input: {
    memberCharacterIds: string[]
    title?: string | null
  }) => { ok: true; chat: GmGroupChat } | { ok: false; reason: string }
  /** GM adds seated players to an existing group. */
  addGroupMembers: (
    groupId: string,
    characterIds: string[],
  ) => { ok: true; chat: GmGroupChat } | { ok: false; reason: string }
  /** GM removes a seated member from a group (cheap v1). */
  removeGroupMember: (
    groupId: string,
    characterId: string,
  ) => { ok: true; chat: GmGroupChat } | { ok: false; reason: string }
  sendGroupChatMessage: (
    groupId: string,
    text: string,
  ) => { ok: true; message: GmGroupChatMessage } | { ok: false; reason: string }
  markGroupChatRead: (groupId: string) => void
  /** Wire transport inbound; returns unsubscribe. */
  attachTransport: (transport: GmTransport) => () => void
}

export function createGmHostRuntime(hooks: GmHostRuntimeHooks): GmHostRuntime {
  let state = createInitialHostRuntimeState()
  let transport: GmTransport | null = null

  const setDm = (dm: GmDmThreadState) => {
    state = { ...state, dm }
    hooks.onDmChange?.(dm)
  }

  const setGroupChat = (groupChat: GmGroupChatState) => {
    state = { ...state, groupChat }
    hooks.onGroupChatChange?.(groupChat)
  }

  const peerIdForCharacter = (characterId: string): string | null => {
    if (!state.presence) return null
    const seat = state.presence.seats.find((s) => s.characterId === characterId)
    if (!seat) return null
    const entry = Object.entries(state.peerDevices).find(
      ([, deviceId]) => deviceId === seat.deviceId,
    )
    return entry?.[0] ?? null
  }

  const seatedConnectedCharacter = (
    characterId: string,
  ): { ok: true } | { ok: false; reason: string } => {
    if (!state.presence) {
      return { ok: false, reason: 'Table is not open for messages.' }
    }
    const seat = state.presence.seats.find((s) => s.characterId === characterId)
    if (!seat || seat.status !== 'connected' || !seat.characterId) {
      return {
        ok: false,
        reason: 'That player is not fully seated at the table.',
      }
    }
    if (!peerIdForCharacter(characterId)) {
      return { ok: false, reason: 'Player device is not connected.' }
    }
    return { ok: true }
  }

  const fanoutToMembers = (
    sessionId: string,
    memberCharacterIds: string[],
    envelope: GmProtocolMessage,
    exceptCharacterId?: string | null,
  ) => {
    if (!transport) return
    for (const characterId of memberCharacterIds) {
      if (exceptCharacterId && characterId === exceptCharacterId) continue
      const peerId = peerIdForCharacter(characterId)
      if (peerId) transport.send(peerId, envelope)
    }
  }

  const notifyGroupMembers = (chat: GmGroupChat, sessionId: string) => {
    fanoutToMembers(
      sessionId,
      chat.memberCharacterIds,
      createGmEnvelope(
        'dm.groupCreate',
        sessionId,
        groupCreatePayloadFromChat(chat),
      ),
    )
  }

  const pushGroupMembers = (chat: GmGroupChat, sessionId: string) => {
    fanoutToMembers(
      sessionId,
      chat.memberCharacterIds,
      createGmEnvelope('dm.groupMembers', sessionId, {
        playSessionId: chat.playSessionId,
        groupId: chat.id,
        memberCharacterIds: [...chat.memberCharacterIds],
      }),
    )
  }

  const beginListen = (
    credentials: GmJoinCredentials,
  ): { ok: true } | { ok: false; reason: string } => {
    const session = hooks.getSession()
    if (!session) {
      return { ok: false, reason: 'No campaign open on the host.' }
    }
    const live = activePlaySession(session)
    if (!live) {
      return {
        ok: false,
        reason: 'No open table. Open Table before listening for joins.',
      }
    }
    state = {
      listening: true,
      credentials,
      presence: emptyPresence(live.id),
      peerDevices: {},
      dm: emptyDmThreadState(),
      groupChat: emptyGroupChatState(),
    }
    hooks.onPresenceChange?.(state.presence)
    hooks.onDmChange?.(state.dm)
    hooks.onGroupChatChange?.(state.groupChat)
    if (transport) {
      const hello = createGmEnvelope(
        'session.hello',
        session.id,
        gmHelloPayloadFromCampaign(session),
      )
      transport.broadcast(hello)
    }
    return { ok: true }
  }

  const detachSeatParty = (
    session: GmSessionRecord,
    characterId: string | null | undefined,
  ) => {
    if (!characterId) return
    clearJoinedCharacter(session.id, characterId)
    hooks.applyPartyDetach(characterId)
    setDm(dropDmCharacterThread(state.dm, characterId))
    const before = state.groupChat
    const after = removeMemberFromGroups(before, characterId)
    if (after !== before) {
      setGroupChat(after)
      // Notify remaining members of updated rosters.
      for (const chat of Object.values(after.byId)) {
        const prev = before.byId[chat.id]
        if (
          prev &&
          prev.memberCharacterIds.includes(characterId) &&
          !chat.memberCharacterIds.includes(characterId)
        ) {
          pushGroupMembers(chat, session.id)
        }
      }
    }
  }

  const endListen = (reason = 'Play sitting closed.') => {
    const session = hooks.getSession()
    if (transport && state.presence && session) {
      transport.broadcast(
        createGmEnvelope('session.closed', session.id, {
          playSessionId: state.presence.playSessionId,
          reason,
        }),
      )
    }
    if (session && state.presence) {
      for (const seat of state.presence.seats) {
        if (seat.characterId) {
          clearJoinedCharacter(session.id, seat.characterId)
          hooks.applyPartyDetach(seat.characterId)
        }
      }
    }
    state = createInitialHostRuntimeState()
    hooks.onPresenceChange?.(null)
    hooks.onDmChange?.(state.dm)
    hooks.onGroupChatChange?.(state.groupChat)
  }

  const kickDevice = (deviceId: string, reason = 'Removed by GM.') => {
    const session = hooks.getSession()
    if (!state.presence || !session || !transport) return
    const peerId = Object.entries(state.peerDevices).find(
      ([, id]) => id === deviceId,
    )?.[0]
    const leaving = findSeat(state.presence, deviceId)
    detachSeatParty(session, leaving?.characterId)
    const next = kickSeat(state.presence, deviceId)
    const peerDevices = { ...state.peerDevices }
    if (peerId) delete peerDevices[peerId]
    state = { ...state, presence: next, peerDevices }
    if (peerId) {
      transport.send(
        peerId,
        createGmEnvelope('session.kick', session.id, { deviceId, reason }),
      )
    }
    emitPresence(transport, session.id, next, hooks)
  }

  const broadcastEnvelope = (message: GmProtocolMessage) => {
    transport?.broadcast(message)
  }

  const sendDmToCharacter: GmHostRuntime['sendDmToCharacter'] = (
    characterId,
    text,
  ) => {
    const session = hooks.getSession()
    if (!session || !state.listening || !state.presence || !transport) {
      return { ok: false, reason: 'Table is not open for messages.' }
    }
    const live = activePlaySession(session)
    if (!live) {
      return { ok: false, reason: 'No open table.' }
    }
    const seat = state.presence.seats.find((s) => s.characterId === characterId)
    if (!seat || seat.status !== 'connected' || !seat.characterId) {
      return {
        ok: false,
        reason: 'That player is not fully seated at the table.',
      }
    }
    const peerId = peerIdForCharacter(characterId)
    if (!peerId) {
      return { ok: false, reason: 'Player device is not connected.' }
    }
    const message = createDmMessage({
      playSessionId: live.id,
      characterId,
      from: 'gm',
      text,
    })
    if (!message) {
      return { ok: false, reason: 'Message is empty or too long.' }
    }
    setDm(appendDmMessage(state.dm, message, 'player'))
    transport.send(
      peerId,
      createGmEnvelope('dm.send', session.id, dmPayloadFromMessage(message)),
    )
    return { ok: true, message }
  }

  const markDmRead = (characterId: string) => {
    setDm(markDmThreadRead(state.dm, characterId))
  }

  const createGroupChatForHost: GmHostRuntime['createGroupChat'] = (input) => {
    const session = hooks.getSession()
    if (!session || !state.listening || !state.presence || !transport) {
      return { ok: false, reason: 'Table is not open for messages.' }
    }
    const live = activePlaySession(session)
    if (!live) {
      return { ok: false, reason: 'No open table.' }
    }
    const members = input.memberCharacterIds
    if (members.length === 0) {
      return { ok: false, reason: 'Pick at least one player at the table.' }
    }
    for (const characterId of members) {
      const seated = seatedConnectedCharacter(characterId)
      if (!seated.ok) return seated
    }
    const chat = createGroupChat({
      playSessionId: live.id,
      memberCharacterIds: members,
      title: input.title,
    })
    if (!chat) {
      return { ok: false, reason: 'Could not create group chat.' }
    }
    setGroupChat(upsertGroupChat(state.groupChat, chat))
    notifyGroupMembers(chat, session.id)
    return { ok: true, chat }
  }

  const addGroupMembers: GmHostRuntime['addGroupMembers'] = (
    groupId,
    characterIds,
  ) => {
    const session = hooks.getSession()
    if (!session || !state.listening || !state.presence || !transport) {
      return { ok: false, reason: 'Table is not open for messages.' }
    }
    const chat = groupChatById(state.groupChat, groupId)
    if (!chat) {
      return { ok: false, reason: 'Group chat not found.' }
    }
    const toAdd = characterIds.filter((id) => !isGroupMember(chat, id))
    if (toAdd.length === 0) {
      return { ok: true, chat }
    }
    for (const characterId of toAdd) {
      const seated = seatedConnectedCharacter(characterId)
      if (!seated.ok) return seated
    }
    const nextState = addMembersToGroup(state.groupChat, groupId, toAdd)
    const nextChat = groupChatById(nextState, groupId)
    if (!nextChat) {
      return { ok: false, reason: 'Group chat not found.' }
    }
    setGroupChat(nextState)
    // New members get full create (title + roster); others get roster update.
    for (const characterId of toAdd) {
      const peerId = peerIdForCharacter(characterId)
      if (peerId) {
        transport.send(
          peerId,
          createGmEnvelope(
            'dm.groupCreate',
            session.id,
            groupCreatePayloadFromChat(nextChat),
          ),
        )
      }
    }
    pushGroupMembers(nextChat, session.id)
    return { ok: true, chat: nextChat }
  }

  const removeGroupMember: GmHostRuntime['removeGroupMember'] = (
    groupId,
    characterId,
  ) => {
    const session = hooks.getSession()
    if (!session || !state.listening || !transport) {
      return { ok: false, reason: 'Table is not open for messages.' }
    }
    const chat = groupChatById(state.groupChat, groupId)
    if (!chat) {
      return { ok: false, reason: 'Group chat not found.' }
    }
    if (!isGroupMember(chat, characterId)) {
      return { ok: true, chat }
    }
    const nextMembers = chat.memberCharacterIds.filter((id) => id !== characterId)
    const nextState = setGroupMembers(state.groupChat, groupId, nextMembers)
    const nextChat = groupChatById(nextState, groupId)
    if (!nextChat) {
      return { ok: false, reason: 'Group chat not found.' }
    }
    setGroupChat(nextState)
    const peerId = peerIdForCharacter(characterId)
    if (peerId) {
      transport.send(
        peerId,
        createGmEnvelope('dm.groupMembers', session.id, {
          playSessionId: nextChat.playSessionId,
          groupId: nextChat.id,
          memberCharacterIds: [],
        }),
      )
    }
    pushGroupMembers(nextChat, session.id)
    return { ok: true, chat: nextChat }
  }

  const sendGroupChatMessage: GmHostRuntime['sendGroupChatMessage'] = (
    groupId,
    text,
  ) => {
    const session = hooks.getSession()
    if (!session || !state.listening || !state.presence || !transport) {
      return { ok: false, reason: 'Table is not open for messages.' }
    }
    const live = activePlaySession(session)
    if (!live) {
      return { ok: false, reason: 'No open table.' }
    }
    const chat = groupChatById(state.groupChat, groupId)
    if (!chat || chat.playSessionId !== live.id) {
      return { ok: false, reason: 'Group chat not found.' }
    }
    const message = createGroupChatMessage({
      groupId,
      playSessionId: live.id,
      from: 'gm',
      characterId: null,
      text,
    })
    if (!message) {
      return { ok: false, reason: 'Message is empty or too long.' }
    }
    setGroupChat(appendGroupMessage(state.groupChat, message, false))
    fanoutToMembers(
      session.id,
      chat.memberCharacterIds,
      createGmEnvelope(
        'dm.groupSend',
        session.id,
        groupSendPayloadFromMessage(message),
      ),
    )
    return { ok: true, message }
  }

  const markGroupChatReadHost: GmHostRuntime['markGroupChatRead'] = (groupId) => {
    setGroupChat(markGroupChatRead(state.groupChat, groupId))
  }

  const handleJoin = (
    from: GmTransportPeer,
    envelope: ReturnType<typeof createGmEnvelope<'session.join', GmJoinPayload>>,
  ) => {
    const session = hooks.getSession()
    if (!session || !state.listening || !state.credentials || !state.presence) {
      return
    }
    const live = activePlaySession(session)
    if (!live || live.id !== envelope.payload.playSessionId) {
      transport?.send(
        from.peerId,
        createGmEnvelope('session.closed', session.id, {
          playSessionId: envelope.payload.playSessionId,
          reason: 'Play sitting is closed or does not match this join.',
        }),
      )
      return
    }
    const tokenOk = envelope.payload.joinToken === state.credentials.joinToken
    const codeOk =
      envelope.payload.shortCode != null &&
      shortCodesMatch(envelope.payload.shortCode, state.credentials.shortCode)
    if (!tokenOk && !codeOk) {
      transport?.send(
        from.peerId,
        createGmEnvelope('session.closed', session.id, {
          playSessionId: live.id,
          reason: 'Join token or code does not match. Ask the GM for a fresh code.',
        }),
      )
      return
    }

    const presence = grantOrReclaimSeat(state.presence, {
      deviceId: envelope.payload.deviceId,
      displayName: envelope.payload.displayName,
      atMs: envelope.sentAtMs,
    })
    state = {
      ...state,
      presence,
      peerDevices: {
        ...state.peerDevices,
        [from.peerId]: envelope.payload.deviceId,
      },
    }
    const hello = gmHelloPayloadFromCampaign(session)
    transport?.send(
      from.peerId,
      createGmEnvelope('session.welcome', session.id, {
        deviceId: envelope.payload.deviceId,
        hello,
      }),
    )
    transport?.send(
      from.peerId,
      createGmEnvelope('session.hello', session.id, hello),
    )
    if (transport) emitPresence(transport, session.id, presence, hooks)
  }

  const handleClientCommand = (
    from: GmTransportPeer,
    envelope: GmProtocolMessage,
  ) => {
    const session = hooks.getSession()
    if (!session || !state.listening || !state.presence) return
    const deviceId = state.peerDevices[from.peerId]
    if (!deviceId) return

    if (envelope.type === 'session.leave') {
      const leaving = findSeat(state.presence, deviceId)
      detachSeatParty(session, leaving?.characterId)
      const next = kickSeat(state.presence, deviceId)
      const peerDevices = { ...state.peerDevices }
      delete peerDevices[from.peerId]
      state = { ...state, presence: next, peerDevices }
      if (transport) emitPresence(transport, session.id, next, hooks)
      return
    }

    if (envelope.type === 'party.snapshot') {
      const payload = envelope.payload as GmPartySnapshotPayload
      cacheJoinedCharacter(session.id, payload.characterId, payload.characterJson)
      const json = payload.characterJson as { name?: string } | null
      const label =
        json && typeof json.name === 'string' && json.name.trim()
          ? json.name.trim()
          : payload.characterId
      const seatBefore = findSeat(state.presence, deviceId)
      hooks.applyPartySnapshot(payload.characterId, label, {
        playerLabel: seatBefore?.displayName ?? null,
        characterJson: payload.characterJson,
      })
      const presence = attachSeatCharacter(
        state.presence,
        deviceId,
        payload.characterId,
      )
      state = { ...state, presence }
      if (transport) emitPresence(transport, session.id, presence, hooks)
      return
    }

    if (envelope.type === 'combat.initiative') {
      const payload = envelope.payload as GmInitiativePayload
      if (payload.kind !== 'pc') return
      if (!Number.isFinite(payload.d20)) return
      hooks.applyPcInitiative(payload.combatantKey, payload.d20)
      return
    }

    if (envelope.type === 'combat.hfSave') {
      const payload = envelope.payload as GmHfSavePayload
      if (!Number.isFinite(payload.d20)) return
      hooks.applyPcHfSave(payload.characterId, payload.d20)
      return
    }

    if (envelope.type === 'combat.apmSpend') {
      const payload = envelope.payload as GmApmSpendPayload
      if (payload.kind !== 'pc') return
      hooks.applyPcApmSpend(payload.combatantKey, payload.actions)
      return
    }

    if (envelope.type === 'dm.send') {
      const payload = envelope.payload as GmDmPayload
      if (payload.from !== 'player') return
      const seat = findSeat(state.presence, deviceId)
      if (!seat?.characterId || seat.characterId !== payload.characterId) return
      if (seat.status !== 'connected') return
      const live = activePlaySession(session)
      if (!live || live.id !== payload.playSessionId) return
      const message = dmMessageFromPayload(payload, envelope.sentAtMs)
      if (!message) return
      setDm(appendDmMessage(state.dm, message, 'player'))
      return
    }

    if (envelope.type === 'dm.groupSend') {
      const payload = envelope.payload as GmGroupSendPayload
      if (payload.from !== 'player') return
      const seat = findSeat(state.presence, deviceId)
      if (!seat?.characterId || seat.status !== 'connected') return
      if (payload.characterId !== seat.characterId) return
      const live = activePlaySession(session)
      if (!live || live.id !== payload.playSessionId) return
      const chat = groupChatById(state.groupChat, payload.groupId)
      if (!chat || !isGroupMember(chat, seat.characterId)) return
      const message = groupMessageFromPayload(payload, envelope.sentAtMs)
      if (!message) return
      setGroupChat(appendGroupMessage(state.groupChat, message, true))
      fanoutToMembers(
        session.id,
        chat.memberCharacterIds,
        createGmEnvelope(
          'dm.groupSend',
          session.id,
          groupSendPayloadFromMessage(message),
        ),
        seat.characterId,
      )
    }
  }

  const attachTransport = (t: GmTransport): (() => void) => {
    transport = t
    const unsub = t.onMessage((from, message) => {
      if (!isGmEnvelope(message)) return
      if (message.v !== 1) return
      const session = hooks.getSession()
      if (!session || message.sessionId !== session.id) {
        // Ignore foreign campaign envelopes.
        return
      }
      if (message.type === 'session.join') {
        handleJoin(
          from,
          message as ReturnType<
            typeof createGmEnvelope<'session.join', GmJoinPayload>
          >,
        )
        return
      }
      if (!isClientToHostType(message.type)) return
      handleClientCommand(from, message as GmProtocolMessage)
    })

    const unsubPeers = t.onPeerChange?.((peers) => {
      if (!state.presence) return
      const session = hooks.getSession()
      if (!session) return
      const clientPeerIds = new Set(
        peers.filter((p) => p.role === 'client').map((p) => p.peerId),
      )
      let presence = state.presence
      let changed = false
      for (const [peerId, deviceId] of Object.entries(state.peerDevices)) {
        if (!clientPeerIds.has(peerId)) {
          presence = markSeatReconnecting(presence, deviceId)
          changed = true
        }
      }
      if (changed) {
        state = { ...state, presence }
        emitPresence(t, session.id, presence, hooks)
      }
    })

    return () => {
      unsub()
      unsubPeers?.()
      if (transport === t) transport = null
    }
  }

  return {
    getState: () => state,
    beginListen,
    endListen,
    kickDevice,
    broadcastEnvelope,
    sendDmToCharacter,
    markDmRead,
    createGroupChat: createGroupChatForHost,
    addGroupMembers,
    removeGroupMember,
    sendGroupChatMessage,
    markGroupChatRead: markGroupChatReadHost,
    attachTransport,
  }
}

export function seatsForUi(state: GmHostRuntimeState): GmSeat[] {
  return state.presence?.seats ?? []
}

/** Close-session helper: clear presence without requiring transport. */
export function hostRuntimeAfterClosePlay(
  state: GmHostRuntimeState,
): GmHostRuntimeState {
  if (!state.presence) return createInitialHostRuntimeState()
  return {
    ...createInitialHostRuntimeState(),
    presence: clearPresence(state.presence.playSessionId),
  }
}
