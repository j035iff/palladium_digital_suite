import { describe, expect, it } from 'vitest'
import {
  appendDmMessage,
  clampDmText,
  createDmMessage,
  dmMessagesForCharacter,
  dmPlayerSenderLabel,
  dmTotalUnread,
  dmUnreadForCharacter,
  dropDmCharacterThread,
  emptyDmThreadState,
  GM_DM_MAX_LENGTH,
  isValidDmText,
  markDmThreadRead,
} from './sessionDm'
import { CLIENT_TO_HOST_TYPES, isClientToHostType } from './sessionMessages'
import { createGmHostRuntime } from './sessionHostRuntime'
import { createGmClientRuntime } from './sessionClientRuntime'
import { MockTransportHub } from './sessionTransport'
import {
  addPartyMember,
  createGmSession,
  openPlaySession,
  removePartyMember,
} from './sessionModel'
import { rotateJoinCredentials } from './sessionJoinCode'
import { sendPartySnapshotOnJoin } from './joinSessionConnect'
import { __resetJoinedCharacterCacheForTests } from './sessionPartyCache'

describe('sessionDm helpers', () => {
  it('clamps and validates short text', () => {
    expect(isValidDmText('  hi  ')).toBe(true)
    expect(isValidDmText('   ')).toBe(false)
    expect(clampDmText('x'.repeat(GM_DM_MAX_LENGTH + 10))).toHaveLength(
      GM_DM_MAX_LENGTH,
    )
  })

  it('tracks unread for the opposite sender and clears on mark read', () => {
    let state = emptyDmThreadState()
    const msg = createDmMessage({
      playSessionId: 'play_1',
      characterId: 'char_1',
      from: 'player',
      text: 'Hello GM',
    })!
    state = appendDmMessage(state, msg, 'player')
    expect(dmUnreadForCharacter(state, 'char_1')).toBe(1)
    expect(dmTotalUnread(state)).toBe(1)
    expect(dmMessagesForCharacter(state, 'char_1')).toHaveLength(1)

    state = markDmThreadRead(state, 'char_1')
    expect(dmUnreadForCharacter(state, 'char_1')).toBe(0)

    state = dropDmCharacterThread(state, 'char_1')
    expect(dmMessagesForCharacter(state, 'char_1')).toHaveLength(0)
  })

  it('registers dm.send as client→host', () => {
    expect(CLIENT_TO_HOST_TYPES).toContain('dm.send')
    expect(isClientToHostType('dm.send')).toBe(true)
  })

  it('labels player bubbles with join display name (clear fallback)', () => {
    expect(dmPlayerSenderLabel('Ada')).toBe('Ada')
    expect(dmPlayerSenderLabel('  Bea  ')).toBe('Bea')
    expect(dmPlayerSenderLabel(null)).toBe('Unknown player')
    expect(dmPlayerSenderLabel(undefined)).toBe('Unknown player')
    expect(dmPlayerSenderLabel('   ')).toBe('Unknown player')
  })
})

describe('dm.send host/client round-trip', () => {
  it('exchanges two-way DMs for a fully seated character', async () => {
    __resetJoinedCharacterCacheForTests()
    let session = createGmSession({
      name: 'DM Table',
      hostGenreId: 'nightbane',
    })
    session = openPlaySession(session, Date.UTC(2026, 9, 2, 12, 0, 0))
    const playId = session.activePlaySessionId!

    const hub = new MockTransportHub()
    const hostT = hub.createHostTransport('host')
    const clientT = hub.createClientTransport('client:dev_dm', 'dev_dm')

    let hostDmUnread = 0
    const runtime = createGmHostRuntime({
      getSession: () => session,
      applySession: (next) => {
        session = next
      },
      applyPcInitiative: () => {},
      applyPcHfSave: () => {},
      applyPcApmSpend: () => {},
      applyPartySnapshot: (characterId, label) => {
        session = addPartyMember(session, characterId, label)
      },
      applyPartyDetach: (characterId) => {
        session = removePartyMember(session, characterId, characterId)
      },
      onDmChange: (dm) => {
        hostDmUnread = dm.unreadByCharacterId.char_dm ?? 0
      },
    })

    await hostT.start()
    await clientT.start()
    runtime.attachTransport(hostT)
    const creds = rotateJoinCredentials()
    expect(runtime.beginListen(creds).ok).toBe(true)

    const client = createGmClientRuntime('dev_dm')
    client.attachTransport(clientT)
    client.join({
      campaignId: session.id,
      playSessionId: playId,
      joinToken: creds.joinToken,
      shortCode: creds.shortCode,
      displayName: 'Blair',
    })
    await Promise.resolve()
    expect(client.getState().status).toBe('joined')

    const snap = sendPartySnapshotOnJoin(client, 'char_dm', {
      id: 'char_dm',
      name: 'Scout',
      creationGenreId: 'nightbane',
      hostGenreId: 'nightbane',
    })
    expect(snap.ok).toBe(true)
    await Promise.resolve()
    expect(runtime.getState().presence?.seats[0]?.characterId).toBe('char_dm')

    const playerSend = client.sendDm('Need a ruling on P.P.E.')
    expect(playerSend.ok).toBe(true)
    await Promise.resolve()
    expect(hostDmUnread).toBe(1)
    expect(
      runtime.getState().dm.byCharacterId.char_dm?.some((m) =>
        m.text.includes('P.P.E.'),
      ),
    ).toBe(true)

    runtime.markDmRead('char_dm')
    expect(runtime.getState().dm.unreadByCharacterId.char_dm ?? 0).toBe(0)

    const gmSend = runtime.sendDmToCharacter('char_dm', 'Spend 10 PPE.')
    expect(gmSend.ok).toBe(true)
    await Promise.resolve()
    expect(client.getState().dm.unreadByCharacterId.char_dm).toBe(1)
    expect(
      client.getState().dm.byCharacterId.char_dm?.some((m) =>
        m.text.includes('Spend 10'),
      ),
    ).toBe(true)

    client.markDmRead()
    expect(client.getState().dm.unreadByCharacterId.char_dm ?? 0).toBe(0)

    // Not seated → reject
    const noSeat = runtime.sendDmToCharacter('missing', 'Nope')
    expect(noSeat.ok).toBe(false)

    runtime.endListen('done')
    expect(runtime.getState().dm.byCharacterId).toEqual({})
  })
})
