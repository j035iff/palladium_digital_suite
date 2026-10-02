import { describe, expect, it } from 'vitest'
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
import {
  appendGroupMessage,
  createGroupChat,
  createGroupChatMessage,
  emptyGroupChatState,
  GM_GROUP_CHAT_DEFAULT_TITLE,
  groupTotalUnread,
  groupUnread,
  listGroupChats,
  markGroupChatRead,
  normalizeGroupTitle,
  removeMemberFromGroups,
  upsertGroupChat,
} from './sessionGroupChat'

describe('sessionGroupChat helpers', () => {
  it('defaults blank title and requires members', () => {
    expect(normalizeGroupTitle('')).toBe(GM_GROUP_CHAT_DEFAULT_TITLE)
    expect(normalizeGroupTitle('  Scouts  ')).toBe('Scouts')
    expect(
      createGroupChat({ playSessionId: 'play_1', memberCharacterIds: [] }),
    ).toBeNull()
    const chat = createGroupChat({
      playSessionId: 'play_1',
      memberCharacterIds: ['a', 'a', 'b'],
      title: '',
    })!
    expect(chat.title).toBe(GM_GROUP_CHAT_DEFAULT_TITLE)
    expect(chat.memberCharacterIds).toEqual(['a', 'b'])
  })

  it('tracks unread and strips a leaving member', () => {
    let state = emptyGroupChatState()
    const chat = createGroupChat({
      playSessionId: 'play_1',
      memberCharacterIds: ['c1', 'c2'],
      title: 'Table',
    })!
    state = upsertGroupChat(state, chat)
    const msg = createGroupChatMessage({
      groupId: chat.id,
      playSessionId: 'play_1',
      from: 'player',
      characterId: 'c1',
      text: 'Hi group',
    })!
    state = appendGroupMessage(state, msg, true)
    expect(groupUnread(state, chat.id)).toBe(1)
    expect(groupTotalUnread(state)).toBe(1)
    state = markGroupChatRead(state, chat.id)
    expect(groupUnread(state, chat.id)).toBe(0)

    state = removeMemberFromGroups(state, 'c1')
    expect(listGroupChats(state)[0]?.memberCharacterIds).toEqual(['c2'])
  })

  it('registers dm.groupSend as client→host', () => {
    expect(CLIENT_TO_HOST_TYPES).toContain('dm.groupSend')
    expect(isClientToHostType('dm.groupSend')).toBe(true)
    expect(isClientToHostType('dm.groupCreate')).toBe(false)
  })
})

describe('dm.group* host/client round-trip', () => {
  it('creates a group, fans out messages, and clears on Close Table', async () => {
    __resetJoinedCharacterCacheForTests()
    let session = createGmSession({
      name: 'Group Table',
      hostGenreId: 'nightbane',
    })
    session = openPlaySession(session, Date.UTC(2026, 9, 2, 12, 0, 0))
    const playId = session.activePlaySessionId!

    const hub = new MockTransportHub()
    const hostT = hub.createHostTransport('host')
    const clientAT = hub.createClientTransport('client:dev_a', 'dev_a')
    const clientBT = hub.createClientTransport('client:dev_b', 'dev_b')

    let hostGroupUnread = 0
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
      onGroupChatChange: (gc) => {
        hostGroupUnread = groupTotalUnread(gc)
      },
    })

    await hostT.start()
    await clientAT.start()
    await clientBT.start()
    runtime.attachTransport(hostT)
    const creds = rotateJoinCredentials()
    expect(runtime.beginListen(creds).ok).toBe(true)

    const clientA = createGmClientRuntime('dev_a')
    const clientB = createGmClientRuntime('dev_b')
    clientA.attachTransport(clientAT)
    clientB.attachTransport(clientBT)

    clientA.join({
      campaignId: session.id,
      playSessionId: playId,
      joinToken: creds.joinToken,
      shortCode: creds.shortCode,
      displayName: 'Ada',
    })
    clientB.join({
      campaignId: session.id,
      playSessionId: playId,
      joinToken: creds.joinToken,
      shortCode: creds.shortCode,
      displayName: 'Bea',
    })
    await Promise.resolve()

    expect(
      sendPartySnapshotOnJoin(clientA, 'char_a', {
        id: 'char_a',
        name: 'Scout A',
        creationGenreId: 'nightbane',
        hostGenreId: 'nightbane',
      }).ok,
    ).toBe(true)
    expect(
      sendPartySnapshotOnJoin(clientB, 'char_b', {
        id: 'char_b',
        name: 'Scout B',
        creationGenreId: 'nightbane',
        hostGenreId: 'nightbane',
      }).ok,
    ).toBe(true)
    await Promise.resolve()

    const created = runtime.createGroupChat({
      memberCharacterIds: ['char_a', 'char_b'],
      title: '',
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.chat.title).toBe(GM_GROUP_CHAT_DEFAULT_TITLE)
    await Promise.resolve()

    expect(Object.keys(clientA.getState().groupChat.byId)).toHaveLength(1)
    expect(Object.keys(clientB.getState().groupChat.byId)).toHaveLength(1)

    const groupId = created.chat.id
    const gmSend = runtime.sendGroupChatMessage(groupId, 'Listen up.')
    expect(gmSend.ok).toBe(true)
    await Promise.resolve()
    expect(
      clientA.getState().groupChat.byId[groupId]?.messages.some((m) =>
        m.text.includes('Listen'),
      ),
    ).toBe(true)
    expect(clientA.getState().groupChat.unreadByGroupId[groupId]).toBe(1)

    const playerSend = clientA.sendGroupChat(groupId, 'Ready.')
    expect(playerSend.ok).toBe(true)
    await Promise.resolve()
    expect(hostGroupUnread).toBe(1)
    expect(
      clientB.getState().groupChat.byId[groupId]?.messages.some((m) =>
        m.text.includes('Ready'),
      ),
    ).toBe(true)

    // Non-member rejected
    const noSeat = runtime.createGroupChat({
      memberCharacterIds: ['missing'],
    })
    expect(noSeat.ok).toBe(false)

    runtime.endListen('done')
    expect(runtime.getState().groupChat.byId).toEqual({})
  })
})
