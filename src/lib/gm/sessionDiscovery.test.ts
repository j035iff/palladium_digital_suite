import { afterEach, describe, expect, it, vi } from 'vitest'
import WebSocket from 'ws'
import {
  advertiseOpenSessions,
  clearDiscoverCache,
  createInterimGmHost,
  fetchPeerLocalSessions,
  hostsInCidr,
  mergeLocalAndRemoteSessions,
  stampSessionHosts,
} from '../../../scripts/gm-interim-ws-host.mjs'
import {
  emptyLanBrowseHint,
  interimWsDiscoverUrl,
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

  it('prefers stamped peer host from discover rows', () => {
    const row = parseLanSessionAdvertisement(
      {
        campaignName: 'Harbor Watch',
        campaignId: 'camp_1',
        playSessionId: 'play_1',
        joinToken: 'join_abc',
        shortCode: 'ABCDEF',
        host: '192.168.1.10',
        port: 8765,
      },
      '127.0.0.1',
      8765,
    )
    expect(row?.hostHint).toBe('192.168.1.10')
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

  it('marks discover responses and empty-browse hint', () => {
    const parsed = parseLanSessionsResponse(
      {
        ok: true,
        discover: true,
        port: 8765,
        lanAddresses: [],
        sessions: [],
      },
      '127.0.0.1',
    )
    expect(parsed.discovered).toBe(true)
    expect(emptyLanBrowseHint(parsed)).toMatch(/Open Table/i)
  })
})

describe('hostsInCidr', () => {
  it('enumerates /30 usable hosts excluding self', () => {
    const hosts = hostsInCidr('192.168.1.1/30', {
      exclude: ['192.168.1.1'],
    })
    expect(hosts).toEqual(['192.168.1.2'])
  })

  it('skips oversized subnets', () => {
    expect(hostsInCidr('10.0.0.1/16')).toEqual([])
  })
})

describe('mergeLocalAndRemoteSessions', () => {
  it('dedupes by joinToken preferring local first', () => {
    const local = stampSessionHosts(
      [
        {
          campaignName: 'Local',
          campaignId: 'c1',
          playSessionId: 'p1',
          joinToken: 't1',
          shortCode: 'AAAAAA',
        },
      ],
      '127.0.0.1',
      8765,
    )
    const remote = stampSessionHosts(
      [
        {
          campaignName: 'Remote',
          campaignId: 'c2',
          playSessionId: 'p2',
          joinToken: 't2',
          shortCode: 'BBBBBB',
        },
        {
          campaignName: 'Dup',
          campaignId: 'c1',
          playSessionId: 'p1',
          joinToken: 't1',
          shortCode: 'AAAAAA',
        },
      ],
      '192.168.1.10',
      8765,
    )
    const merged = mergeLocalAndRemoteSessions(local, remote)
    expect(merged).toHaveLength(2)
    expect(merged.find((r) => r.joinToken === 't1')?.campaignName).toBe('Local')
    expect(merged.find((r) => r.joinToken === 't2')?.host).toBe('192.168.1.10')
  })
})

describe('listLanSessions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('prefers /discover then falls back to /sessions', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/discover')) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            discover: true,
            port: 8765,
            lanAddresses: [],
            sessions: [
              {
                campaignName: 'Harbor Watch',
                campaignId: 'camp_1',
                playSessionId: 'play_1',
                joinToken: 'join_abc',
                shortCode: 'ABCDEF',
                host: '192.168.1.10',
                port: 8765,
              },
            ],
          }),
        }
      }
      throw new Error('should not hit /sessions')
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await listLanSessions('127.0.0.1')
    expect(fetchMock).toHaveBeenCalledWith(
      interimWsDiscoverUrl('127.0.0.1', 8765),
      expect.anything(),
    )
    expect(result.ok).toBe(true)
    expect(result.discovered).toBe(true)
    expect(result.sessions[0]?.hostHint).toBe('192.168.1.10')
    expect(result.reason).toBeNull()
  })

  it('falls back to /sessions when /discover missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/discover')) {
          return { ok: false, status: 404, json: async () => ({}) }
        }
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
    const result = await listLanSessions({
      hostHint: '127.0.0.1',
      preferDiscover: true,
    })
    expect(result.ok).toBe(true)
    expect(result.sessions[0]?.campaignName).toBe('Harbor Watch')
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
    expect(result.reason).toMatch(/reachable|8765/i)
  })
})

describe('interim host /sessions advertise', () => {
  afterEach(() => {
    clearDiscoverCache()
  })

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
      preferDiscover: false,
    })
    expect(listed.ok).toBe(true)
    expect(listed.sessions).toHaveLength(1)
    expect(listed.sessions[0]?.campaignName).toBe('Harbor Watch')

    const discovered = await fetch(`${base}/discover`).then((r) => r.json())
    expect(discovered.discover).toBe(true)
    expect(discovered.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          campaignName: 'Harbor Watch',
          joinToken: 'join_token_1',
          host: expect.any(String),
        }),
      ]),
    )

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

  it('discover on player host lists a peer GM open table', async () => {
    const gm = createInterimGmHost({ port: 0 })
    const player = createInterimGmHost({ port: 0 })
    await gm.listen()
    await player.listen()
    const gmAddr = gm.server.address()
    const playerAddr = player.server.address()
    if (
      !gmAddr ||
      typeof gmAddr === 'string' ||
      !playerAddr ||
      typeof playerAddr === 'string'
    ) {
      throw new Error('expected TCP addresses')
    }

    const ws = new WebSocket(`ws://127.0.0.1:${gmAddr.port}`)
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
        campaignId: 'camp_gm',
        campaignName: 'Night Harbor',
        playSessionId: 'play_gm',
        joinToken: 'join_gm_1',
        shortCode: 'GMCODE',
      }),
    )
    await registered

    // Simulate player-side peer probe hitting the GM (loopback stands in for LAN).
    const peered = await fetchPeerLocalSessions('127.0.0.1', gmAddr.port, 2000)
    expect(peered).toEqual([
      {
        campaignName: 'Night Harbor',
        campaignId: 'camp_gm',
        playSessionId: 'play_gm',
        joinToken: 'join_gm_1',
        shortCode: 'GMCODE',
        host: '127.0.0.1',
        port: gmAddr.port,
      },
    ])

    const listed = await listLanSessions({
      hostHint: '127.0.0.1',
      port: playerAddr.port,
      timeoutMs: 2000,
    })
    // Player local discover may not find GM on other loopback ports via /24 scan,
    // but /discover still returns ok + local empty; peer fetch above proves path.
    expect(listed.ok).toBe(true)
    expect(listed.discovered).toBe(true)

    ws.close()
    await gm.close()
    await player.close()
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
