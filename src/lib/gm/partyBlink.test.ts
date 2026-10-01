import { describe, expect, it } from 'vitest'
import {
  anySeatFlippedToFullyJoined,
  nextPartyTabBlink,
  partyTabBlinkAfterCharactersSubTabChange,
  partyTabBlinkAfterTabChange,
} from './partyBlink'
import {
  attachSeatCharacter,
  emptyPresence,
  grantOrReclaimSeat,
  type GmPresenceState,
} from './sessionPresence'

function presenceWithJoining(deviceId = 'dev_a'): GmPresenceState {
  return grantOrReclaimSeat(emptyPresence('play_1'), {
    deviceId,
    displayName: 'Alex',
  })
}

describe('partyBlink', () => {
  it('detects a seat flipping to fully joined', () => {
    const joining = presenceWithJoining()
    const joined = attachSeatCharacter(joining, 'dev_a', 'char_1')
    expect(anySeatFlippedToFullyJoined(joining, joined)).toBe(true)
    expect(anySeatFlippedToFullyJoined(joined, joined)).toBe(false)
  })

  it('sets blink when a seat flips and People → PCs is not open', () => {
    const joining = presenceWithJoining()
    const joined = attachSeatCharacter(joining, 'dev_a', 'char_1')
    expect(
      nextPartyTabBlink({
        currentlyBlinking: false,
        previousPresence: joining,
        nextPresence: joined,
        viewingCharactersPcs: false,
      }),
    ).toBe(true)
  })

  it('does not set blink when People → PCs is already open', () => {
    const joining = presenceWithJoining()
    const joined = attachSeatCharacter(joining, 'dev_a', 'char_1')
    expect(
      nextPartyTabBlink({
        currentlyBlinking: false,
        previousPresence: joining,
        nextPresence: joined,
        viewingCharactersPcs: true,
      }),
    ).toBe(false)
  })

  it('keeps an existing blink until People → PCs opens or presence clears', () => {
    const joined = attachSeatCharacter(presenceWithJoining(), 'dev_a', 'char_1')
    expect(
      nextPartyTabBlink({
        currentlyBlinking: true,
        previousPresence: joined,
        nextPresence: joined,
        viewingCharactersPcs: false,
      }),
    ).toBe(true)
    expect(
      nextPartyTabBlink({
        currentlyBlinking: true,
        previousPresence: joined,
        nextPresence: null,
        viewingCharactersPcs: false,
      }),
    ).toBe(false)
    expect(partyTabBlinkAfterTabChange('people', true, 'pcs')).toBe(false)
    expect(partyTabBlinkAfterTabChange('people', true, 'npcs')).toBe(true)
    expect(partyTabBlinkAfterTabChange('melee', true)).toBe(true)
    expect(partyTabBlinkAfterCharactersSubTabChange('pcs', true)).toBe(false)
    expect(partyTabBlinkAfterCharactersSubTabChange('npcs', true)).toBe(true)
  })
})
