import { afterEach, describe, expect, it, vi } from 'vitest'
import WebSocket from 'ws'
import {
  advertiseOpenSessions,
  createInterimGmHost,
} from '../../../scripts/gm-interim-ws-host.mjs'
import {
  interimWsSessionsUrl,
  listLanSessions,
  parseLanSessionAdvertisement,
  parseLanSessionsResponse,
} from './sessionDiscovery'

describe('session discovery parse', () => {
  it('keeps campaignName as the only display identity field', () => {
    const row = parseLanSessionAdvertisement(
      {
        campaignName: 'Harbor Watch',
        campaignId: 'camp_1',
        playSessionId: 'play_1',
        joinToken: 'join_abc',
        shortCode: 'ABCDEF',
        // Extra host-side fields must not become list DTO display fields
        sessionName: 'Harbor Watch: August 30, 2026',
        playerLabel: 'Harbor Watch: August 30, 2026',
        openedAtMs: 1_700_000_000_000,
      },
      '127.0.0.1',
      8765,
    )
    expect(row).toEqual({
      campaignName: 'Harbor Watch',
      campaignId: 'camp_1',
      playSessionId: 'play_1',
      joinToken: 'join_abc',
      shortCode: 'ABCDEF',
      hostHint: '127.0.0.1',
      port: 8765,
    })
    expect(row).not.toHaveProperty('sessionName')
    expect(row).not.toHaveProperty('playerLabel')
    expect(row).not.toHaveProperty('openedAtMs')
  })

  it('rejects incomplete rows', () => {
    expect(
      parseLanSessionAdvertisement(
        { campaignName: 'X', campaignId: 'c' },
        '127.0.0.1',
        8765,
      ),
    ).toBeNull()
  })

  it('parses /sessions envelope', () => {
    const parsed = parseLanSessionsResponse(
      {
        ok: true,
        port: 8765,
        lanAddresses: ['192.168.1.10'],
        sessions: [
          {
            campaignName: 'Harbor Watch',
            campaignId: 'camp_1',
            playSessionId: 'play_1',
            joinToken: 'join_abc',
            shortCode: 'ABCDEF',
          },
        ],
      },
      '192.168.1.10',
    )
    expect(parsed.ok).toBe(true)
    expect(parsed.sessions).toHaveLength(1)
    expect(parsed.sessions[0]?.campaignName).toBe('Harbor Watch')
    expect(parsed.lanAddresses).toEqual(['192.168.1.10'])
  })
})

describe('listLanSessions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns advertised sittings from /sessions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toBe(interimWsSessionsUrl('127.0.0.1', 8765))
        return {
          ok: true,
          json: async () => ({
            ok: true,
            port: 8765,
            lanAddresses: [],
            sessions: [
              {
                campaignName: 'Harbor Watch',
                campaignId: 'camp_1',
                playSessionId: 'play_1',
                joinToken: 'join_abc',
                shortCode: 'ABCDEF',
              },
            ],
          }),
        }
      }),
    )
    const result = await listLanSessions('127.0.0.1')
    expect(result.ok).toBe(true)
    expect(result.sessions[0]?.campaignName).toBe('Harbor Watch')
    expect(result.reason).toBeNull()
  })

  it('surfaces Radical Visibility reason when host unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network')
      }),
    )
    const result = await listLanSessions({ hostHint: '127.0.0.1', timeoutMs: 50 })
    expect(result.ok).toBe(false)
    expect(result.sessions).toEqual([])
    expect(result.reason).toMatch(/reachable/i)
  })
})

describe('interim host /sessions advertise', () => {
  it('lists open table and drops closed table', async () => {
    const host = createInterimGmHost({ port: 0 })
    await host.listen()
    const address = host.server.address()
    if (!address || typeof address === 'string') {
      throw new Error('expected TCP address')
    }
    const port = address.port
    const base = `http://127.0.0.1:${port}`

    const empty = await fetch(`${base}/sessions`).then((r) => r.json())
    expect(empty.sessions).toEqual([])

    const ws = new WebSocket(`ws://127.0.0.1:${port}`)
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve())
      ws.once('error', reject)
    })
    const registered = new Promise<void>((resolve, reject) => {
      ws.once('message', (data) => {
        try {
          const row = JSON.parse(String(data))
          if (row.op === 'registered') resolve()
          else if (row.op === 'error') reject(new Error(row.reason))
          else reject(new Error(`unexpected op ${row.op}`))
        } catch (err) {
          reject(err)
        }
      })
    })
    ws.send(
      JSON.stringify({
        op: 'register_host',
        campaignId: 'camp_1',
        campaignName: 'Harbor Watch',
        playSessionId: 'play_1',
        joinToken: 'join_token_1',
        shortCode: 'ABCD12',
      }),
    )
    await registered

    const open = await fetch(`${base}/sessions`).then((r) => r.json())
    expect(open.sessions).toEqual([
      {
        campaignName: 'Harbor Watch',
        campaignId: 'camp_1',
        playSessionId: 'play_1',
        joinToken: 'join_token_1',
        shortCode: 'ABCD12',
      },
    ])
    expect(open.sessions[0]).not.toHaveProperty('sessionName')
    expect(open.sessions[0]).not.toHaveProperty('openedAtMs')

    const listed = await listLanSessions({
      hostHint: '127.0.0.1',
      port,
      timeoutMs: 2000,
    })
    expect(listed.ok).toBe(true)
    expect(listed.sessions).toHaveLength(1)
    expect(listed.sessions[0]?.campaignName).toBe('Harbor Watch')

    await new Promise<void>((resolve) => {
      ws.once('close', () => resolve())
      ws.close()
    })
    // Allow host close handler to unlist
    await new Promise((r) => setTimeout(r, 50))

    const closed = await fetch(`${base}/sessions`).then((r) => r.json())
    expect(closed.sessions).toEqual([])

    await host.close()
  })

  it('advertiseOpenSessions skips rooms without a live host', () => {
    const sessions = advertiseOpenSessions([
      {
        campaignId: 'c1',
        campaignName: 'Open',
        playSessionId: 'p1',
        joinToken: 't1',
        shortCode: 'AAAAAA',
        host: {} as never,
        clients: new Map(),
      },
      {
        campaignId: 'c2',
        campaignName: 'Closed',
        playSessionId: 'p2',
        joinToken: 't2',
        shortCode: 'BBBBBB',
        host: null,
        clients: new Map(),
      },
    ])
    expect(sessions).toEqual([
      {
        campaignName: 'Open',
        campaignId: 'c1',
        playSessionId: 'p1',
        joinToken: 't1',
        shortCode: 'AAAAAA',
      },
    ])
  })
})
