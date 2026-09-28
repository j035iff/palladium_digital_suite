import { describe, expect, it } from 'vitest'
import {
  anySeatFlippedToFullyJoined,
  nextPartyTabBlink,
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

  it('sets blink when a seat flips and Party is not open', () => {
    const joining = presenceWithJoining()
    const joined = attachSeatCharacter(joining, 'dev_a', 'char_1')
    expect(
      nextPartyTabBlink({
        currentlyBlinking: false,
        previousPresence: joining,
        nextPresence: joined,
        viewingPartyTab: false,
      }),
    ).toBe(true)
  })

  it('does not set blink when Party is already open', () => {
    const joining = presenceWithJoining()
    const joined = attachSeatCharacter(joining, 'dev_a', 'char_1')
    expect(
      nextPartyTabBlink({
        currentlyBlinking: false,
        previousPresence: joining,
        nextPresence: joined,
        viewingPartyTab: true,
      }),
    ).toBe(false)
  })

  it('keeps an existing blink until Party opens or presence clears', () => {
    const joined = attachSeatCharacter(presenceWithJoining(), 'dev_a', 'char_1')
    expect(
      nextPartyTabBlink({
        currentlyBlinking: true,
        previousPresence: joined,
        nextPresence: joined,
        viewingPartyTab: false,
      }),
    ).toBe(true)
    expect(
      nextPartyTabBlink({
        currentlyBlinking: true,
        previousPresence: joined,
        nextPresence: null,
        viewingPartyTab: false,
      }),
    ).toBe(false)
    expect(partyTabBlinkAfterTabChange('party', true)).toBe(false)
    expect(partyTabBlinkAfterTabChange('cast', true)).toBe(true)
  })
})
