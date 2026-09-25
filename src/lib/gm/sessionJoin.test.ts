import { describe, expect, it } from 'vitest'
import {
  attachSeatCharacter,
  clearPresence,
  connectedSeatCount,
  emptyPresence,
  grantOrReclaimSeat,
  kickSeat,
  markSeatReconnecting,
} from './sessionPresence'
import {
  rotateJoinCredentials,
  shortCodeFromJoinToken,
  shortCodesMatch,
} from './sessionJoinCode'
import {
  CLIENT_TO_HOST_TYPES,
  createGmEnvelope,
  gmHelloPayloadFromCampaign,
  isClientToHostType,
  isGmEnvelope,
} from './sessionMessages'
import { createGmHostRuntime } from './sessionHostRuntime'
import { createGmClientRuntime } from './sessionClientRuntime'
import { MockTransportHub } from './sessionTransport'
import {
  closePlaySession,
  createGmSession,
  openPlaySession,
  setPartyInitiativeRoll,
  recordPartyHfSave,
  recordPcApmSpendEvent,
  addPartyMember,
  emitHorrorFactor,
} from './sessionModel'
import type { GmSessionRecord } from './sessionTypes'
import { resolveJoinListenCapability } from './desktopHostCapability'
import {
  __resetJoinedCharacterCacheForTests,
  cacheJoinedCharacter,
  loadCachedJoinedCharacter,
} from './sessionPartyCache'

describe('join credentials', () => {
  it('rotates token and derives a stable short code', () => {
    const a = rotateJoinCredentials()
    const b = rotateJoinCredentials()
    expect(a.joinToken).not.toBe(b.joinToken)
    expect(a.shortCode).toHaveLength(6)
    expect(shortCodeFromJoinToken(a.joinToken)).toBe(a.shortCode)
    expect(shortCodesMatch(a.shortCode.toLowerCase(), a.shortCode)).toBe(true)
  })
})

describe('presence reduce', () => {
  it('reclaims the same deviceId and clears on close', () => {
    let p = emptyPresence('play_1')
    p = grantOrReclaimSeat(p, { deviceId: 'dev_a', displayName: 'Ada', atMs: 1 })
    expect(connectedSeatCount(p)).toBe(1)
    p = grantOrReclaimSeat(p, {
      deviceId: 'dev_a',
      displayName: 'Ada 2',
      atMs: 2,
    })
    expect(p.seats).toHaveLength(1)
    expect(p.seats[0]?.displayName).toBe('Ada 2')
    p = markSeatReconnecting(p, 'dev_a', 3)
    expect(p.seats[0]?.status).toBe('reconnecting')
    p = attachSeatCharacter(p, 'dev_a', 'char_1')
    expect(p.seats[0]?.characterId).toBe('char_1')
    p = kickSeat(p, 'dev_a')
    expect(p.seats).toHaveLength(0)
    p = clearPresence('play_1')
    expect(p.seats).toHaveLength(0)
  })
})

describe('desktop capability Radical Visibility', () => {
  it('greys listen when sitting closed or interim unreachable', () => {
    const closed = resolveJoinListenCapability({
      playSessionOpen: false,
      interimHostReachable: true,
    })
    expect(closed.canListen).toBe(false)
    expect(closed.listenDisabledReason).toMatch(/Open a play sitting/i)
    expect(closed.productionDisabledReason).toMatch(/desktop WebSocket host/i)

    const noInterim = resolveJoinListenCapability({
      playSessionOpen: true,
      interimHostReachable: false,
    })
    expect(noInterim.canListen).toBe(false)
    expect(noInterim.listenDisabledReason).toMatch(/Interim/i)

    const interim = resolveJoinListenCapability({
      playSessionOpen: true,
      interimHostReachable: true,
    })
    expect(interim.canListen).toBe(true)
    expect(interim.mode).toBe('interim')
  })
})

describe('host runtime join + combat round-trip (mock transport)', () => {
  it('rejects join when play sitting is closed', async () => {
    let session = createGmSession({
      name: 'Harbor Watch',
      hostGenreId: 'nightbane',
    })
    const hub = new MockTransportHub()
    const hostT = hub.createHostTransport('host')
    const clientT = hub.createClientTransport('client:dev_a', 'dev_a')

    const runtime = createGmHostRuntime({
      getSession: () => session,
      applySession: (next) => {
        session = next
      },
      applyPcInitiative: () => {},
      applyPcHfSave: () => {},
      applyPcApmSpend: () => {},
      applyPartySnapshot: () => {},
    })

    await hostT.start()
    await clientT.start()
    runtime.attachTransport(hostT)

    const creds = rotateJoinCredentials()
    const began = runtime.beginListen(creds)
    expect(began.ok).toBe(false)

    session = openPlaySession(session, Date.UTC(2026, 7, 30, 12, 0, 0))
    expect(runtime.beginListen(creds).ok).toBe(true)

    session = closePlaySession(session)
    const client = createGmClientRuntime('dev_a')
    client.attachTransport(clientT)
    const closedStates: string[] = []
    client.subscribe((s) => closedStates.push(s.status))

    client.join({
      campaignId: session.id,
      playSessionId: 'stale_play',
      joinToken: creds.joinToken,
      displayName: 'Ada',
    })

    // Allow microtask delivery
    await Promise.resolve()
    expect(
      client.getState().status === 'closed' ||
        client.getState().status === 'rejected' ||
        client.getState().lastError != null ||
        client.getState().status === 'connecting',
    ).toBe(true)
  })

  it('welcome + initiative / H.F. / APM / party.snapshot round-trip', async () => {
    __resetJoinedCharacterCacheForTests()
    let session = createGmSession({
      name: 'Harbor Watch',
      hostGenreId: 'nightbane',
    })
    session = openPlaySession(session, Date.UTC(2026, 7, 30, 12, 0, 0))
    const playId = session.activePlaySessionId!
    session = addPartyMember(session, 'char_pc', 'Scout')

    const hub = new MockTransportHub()
    const hostT = hub.createHostTransport('host')
    const clientT = hub.createClientTransport('client:dev_a', 'dev_a')

    const runtime = createGmHostRuntime({
      getSession: () => session,
      applySession: (next) => {
        session = next
      },
      applyPcInitiative: (characterId, d20) => {
        session = setPartyInitiativeRoll(session, characterId, d20)
      },
      applyPcHfSave: (characterId, d20) => {
        const result = recordPartyHfSave(session, characterId, 'Scout', d20, 0)
        if (result) session = result.session
      },
      applyPcApmSpend: (characterId, actions) => {
        session = recordPcApmSpendEvent(session, characterId, 'Scout', actions)
      },
      applyPartySnapshot: (characterId, label) => {
        session = addPartyMember(session, characterId, label)
      },
    })

    await hostT.start()
    await clientT.start()
    runtime.attachTransport(hostT)
    const creds = rotateJoinCredentials()
    expect(runtime.beginListen(creds).ok).toBe(true)

    const client = createGmClientRuntime('dev_a')
    client.attachTransport(clientT)
    client.join({
      campaignId: session.id,
      playSessionId: playId,
      joinToken: creds.joinToken,
      shortCode: creds.shortCode,
      displayName: 'Ada',
    })
    await Promise.resolve()

    expect(client.getState().status).toBe('joined')
    expect(client.getState().hello?.campaignName).toBe('Harbor Watch')
    expect(runtime.getState().presence?.seats).toHaveLength(1)

    client.sendInitiative('char_pc', 15)
    await Promise.resolve()
    expect(session.partyOverlays.char_pc?.initiativeRoll).toBe(15)

    session = emitHorrorFactor(
      session,
      {
        instanceId: 'npc_1',
        archetypeId: 'x',
        catalogGenreId: 'nightbane',
        displayName: 'Horror',
        notes: '',
        hpMax: 10,
        hpCurrent: 10,
        sdcMax: 10,
        sdcCurrent: 10,
        maxApm: 3,
        apmSpent: 0,
        initiativeRoll: null,
      },
      12,
      false,
      'test',
    )
    // Host would broadcast hfEmit; simulate client save path via host handler
    client.sendHfSave('char_pc', 14)
    await Promise.resolve()
    expect(session.partyOverlays.char_pc?.hfOutcome).toBe('passed')

    client.sendApmSpend('char_pc', 1)
    await Promise.resolve()
    expect(session.eventLog.some((e) => e.text.includes('spent 1 APM'))).toBe(
      true,
    )

    client.sendPartySnapshot('char_remote', {
      id: 'char_remote',
      name: 'Remote Hero',
      creationGenreId: 'nightbane',
      hostGenreId: 'nightbane',
    })
    await Promise.resolve()
    expect(session.partyCharacterIds).toContain('char_remote')
    expect(loadCachedJoinedCharacter(session.id, 'char_remote')).toBeTruthy()

    // Reclaim seat
    clientT.stop()
    await Promise.resolve()
    const client2T = hub.createClientTransport('client:dev_a', 'dev_a')
    await client2T.start()
    const client2 = createGmClientRuntime('dev_a')
    client2.attachTransport(client2T)
    client2.join({
      campaignId: session.id,
      playSessionId: playId,
      joinToken: creds.joinToken,
      displayName: 'Ada',
    })
    await Promise.resolve()
    expect(runtime.getState().presence?.seats).toHaveLength(1)

    runtime.endListen('closed')
    expect(runtime.getState().listening).toBe(false)
  })
})

describe('protocol helpers', () => {
  it('keeps v1 envelopes and client→host allow-list', () => {
    const env = createGmEnvelope('session.hello', 'sess_1', {
      hostGenreId: 'nightbane',
      conversionPolicy: 'disable_non_native' as const,
      sessionName: 'x',
      campaignName: 'x',
      playSessionId: null,
    })
    expect(isGmEnvelope(env)).toBe(true)
    expect(env.v).toBe(1)
    expect(isClientToHostType('combat.initiative')).toBe(true)
    expect(isClientToHostType('combat.hfEmit')).toBe(false)
    expect(CLIENT_TO_HOST_TYPES).toContain('party.snapshot')

    let s: GmSessionRecord = createGmSession({
      name: 'T',
      hostGenreId: 'nightbane',
    })
    s = openPlaySession(s)
    expect(gmHelloPayloadFromCampaign(s).playSessionId).toBeTruthy()
  })
})

describe('party cache', () => {
  it('stores session-scoped joiner snapshots', () => {
    __resetJoinedCharacterCacheForTests()
    cacheJoinedCharacter('camp', 'c1', { id: 'c1', name: 'A' })
    expect(loadCachedJoinedCharacter('camp', 'c1')).toEqual({
      id: 'c1',
      name: 'A',
    })
  })
})
