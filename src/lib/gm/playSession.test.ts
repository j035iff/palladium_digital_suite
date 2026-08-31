import { describe, expect, it } from 'vitest'
import {
  formatPlaySessionDate,
  playSessionPlayerLabel,
  uniquePlaySessionPlayerLabel,
} from './playSession'
import { gmHelloPayloadFromCampaign } from './sessionMessages'
import {
  closePlaySession,
  createGmSession,
  openPlaySession,
} from './sessionModel'

describe('play session labels', () => {
  it('formats player-facing names as campaign colon date', () => {
    const openedAtMs = Date.UTC(2026, 7, 30, 12, 0, 0)
    const label = playSessionPlayerLabel('Harbor Watch', openedAtMs)
    expect(label).toBe(`Harbor Watch: ${formatPlaySessionDate(openedAtMs)}`)
    expect(label).toContain('2026')
  })

  it('adds time when the same calendar date is already taken', () => {
    const openedAtMs = Date.UTC(2026, 7, 30, 18, 30, 0)
    const base = playSessionPlayerLabel('Harbor Watch', openedAtMs)
    const next = uniquePlaySessionPlayerLabel('Harbor Watch', openedAtMs, [base])
    expect(next).not.toBe(base)
    expect(next.startsWith('Harbor Watch:')).toBe(true)
  })
})

describe('open / close play session', () => {
  it('stamps one live sitting and refuses a second until closed', () => {
    let s = createGmSession({ name: 'Harbor Watch', hostGenreId: 'nightbane' })
    const openedAtMs = Date.UTC(2026, 7, 30, 12, 0, 0)
    s = openPlaySession(s, openedAtMs)
    expect(s.activePlaySessionId).toBeTruthy()
    expect(s.playSessions[0]?.playerLabel).toBe(
      playSessionPlayerLabel('Harbor Watch', openedAtMs),
    )
    const hello = gmHelloPayloadFromCampaign(s)
    expect(hello.campaignName).toBe('Harbor Watch')
    expect(hello.sessionName).toBe(s.playSessions[0]?.playerLabel)
    expect(hello.playSessionId).toBe(s.activePlaySessionId)

    const blocked = openPlaySession(s, openedAtMs + 60_000)
    expect(blocked.activePlaySessionId).toBe(s.activePlaySessionId)
    expect(blocked.playSessions).toHaveLength(1)

    s = closePlaySession(blocked)
    expect(s.activePlaySessionId).toBeNull()
    expect(s.playSessions[0]?.status).toBe('closed')
    expect(gmHelloPayloadFromCampaign(s).playSessionId).toBeNull()
    expect(gmHelloPayloadFromCampaign(s).sessionName).toBe('Harbor Watch')
  })
})
