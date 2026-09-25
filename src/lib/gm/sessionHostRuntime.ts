/**
 * Host-side join / presence / inbound client command reducer.
 * Pure where possible; session mutators applied via injected applySession.
 */

import {
  attachSeatCharacter,
  clearPresence,
  emptyPresence,
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
  type GmHfSavePayload,
  type GmInitiativePayload,
  type GmJoinPayload,
  type GmPartySnapshotPayload,
  type GmProtocolMessage,
} from './sessionMessages'
import type { GmJoinCredentials } from './sessionJoinCode'
import { shortCodesMatch } from './sessionJoinCode'
import { cacheJoinedCharacter } from './sessionPartyCache'
import { activePlaySession } from './playSession'
import type { GmSessionRecord } from './sessionTypes'
import type { GmTransport, GmTransportPeer } from './sessionTransport'

export type GmHostRuntimeState = {
  listening: boolean
  credentials: GmJoinCredentials | null
  presence: GmPresenceState | null
  /** peerId → deviceId for connected clients */
  peerDevices: Record<string, string>
}

export type GmHostRuntimeHooks = {
  getSession: () => GmSessionRecord | null
  applySession: (next: GmSessionRecord) => void
  /** Record PC initiative from client (physical d20 on player device). */
  applyPcInitiative: (characterId: string, d20: number) => void
  applyPcHfSave: (characterId: string, d20: number) => void
  /** PC APM is player-managed; log / acknowledge only. */
  applyPcApmSpend: (characterId: string, actions: number) => void
  /** Attach party member after caching joiner snapshot. */
  applyPartySnapshot: (characterId: string, label: string) => void
  onPresenceChange?: (presence: GmPresenceState | null) => void
}

export function createInitialHostRuntimeState(): GmHostRuntimeState {
  return {
    listening: false,
    credentials: null,
    presence: null,
    peerDevices: {},
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
  /** Wire transport inbound; returns unsubscribe. */
  attachTransport: (transport: GmTransport) => () => void
}

export function createGmHostRuntime(hooks: GmHostRuntimeHooks): GmHostRuntime {
  let state = createInitialHostRuntimeState()
  let transport: GmTransport | null = null

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
        reason: 'No open play sitting. Open Session before listening for joins.',
      }
    }
    state = {
      listening: true,
      credentials,
      presence: emptyPresence(live.id),
      peerDevices: {},
    }
    hooks.onPresenceChange?.(state.presence)
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
    state = createInitialHostRuntimeState()
    hooks.onPresenceChange?.(null)
  }

  const kickDevice = (deviceId: string, reason = 'Removed by GM.') => {
    const session = hooks.getSession()
    if (!state.presence || !session || !transport) return
    const peerId = Object.entries(state.peerDevices).find(
      ([, id]) => id === deviceId,
    )?.[0]
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
      hooks.applyPartySnapshot(payload.characterId, label)
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
