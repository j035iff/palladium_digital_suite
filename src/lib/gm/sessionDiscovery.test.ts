import { afterEach, describe, expect, it, vi } from 'vitest'
import WebSocket from 'ws'
import {
  advertiseOpenSessions,
  broadcastForCidr,
  buildTcpProbeCandidates,
  cidrFromNetmask,
  clearDiscoverCache,
  createInterimGmHost,
  fetchPeerLocalSessions,
  hostsInCidr,
  isIpv4Family,
  mergeLocalAndRemoteSessions,
  parseDiscoverDatagram,
  slash24Containing,
  stampSessionHosts,
  udpBrowseOpenSessions,
  DISCOVER_MSG_AD,
  DISCOVER_PROTOCOL_V,
} from '../../../scripts/gm-interim-ws-host.mjs'
import {
  browserProbeLanSessions,
  hostsInSlash24,
  slash24ContainingIp,
} from './browserLanHints'
import {
  emptyLanBrowseHint,
  interimWsDiscoverUrl,
  interimWsSessionsUrl,
  listLanSessions,
  localBrowseHost,
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
    expect(emptyLanBrowseHint(parsed)).toMatch(/Open Table|same network/i)
    expect(emptyLanBrowseHint(parsed)).toMatch(/Advanced/i)
    expect(emptyLanBrowseHint(parsed)).not.toMatch(/firewall/i)
  })
})

describe('CIDR / family helpers', () => {
  it('treats numeric and string IPv4 family as equal', () => {
    expect(isIpv4Family('IPv4')).toBe(true)
    expect(isIpv4Family(4)).toBe(true)
    expect(isIpv4Family('IPv6')).toBe(false)
    expect(isIpv4Family(6)).toBe(false)
  })

  it('enumerates /24 and /23 hosts; skips huge clouds', () => {
    const hosts24 = hostsInCidr('192.168.4.87/24', {
      exclude: ['192.168.4.87'],
    })
    expect(hosts24).toContain('192.168.4.1')
    expect(hosts24).toContain('192.168.4.86')
    expect(hosts24).not.toContain('192.168.4.87')
    expect(hosts24.length).toBe(253)

    const hosts23 = hostsInCidr('192.168.4.87/23', { maxHosts: 20 })
    expect(hosts23.length).toBe(20)

    expect(hostsInCidr('10.0.0.1/16')).toEqual([])
  })

  it('computes subnet broadcast and netmask CIDR', () => {
    expect(broadcastForCidr('192.168.4.87/24')).toBe('192.168.4.255')
    expect(broadcastForCidr('10.0.0.5/30')).toBe('10.0.0.7')
    expect(cidrFromNetmask('192.168.4.87', '255.255.255.0')).toBe(
      '192.168.4.87/24',
    )
    expect(slash24Containing('192.168.4.87')).toBe('192.168.4.0/24')
  })

  it('TCP candidates include lanHint /24 even when Node ifaces differ (WSL case)', () => {
    const candidates = buildTcpProbeCandidates(8765, {
      lanHints: ['192.168.4.50'],
    })
    expect(candidates).toContain('192.168.4.87')
    expect(candidates).toContain('192.168.4.1')
    // Hint /24 peers are present even if this machine's iface is elsewhere.
    expect(candidates.indexOf('192.168.4.87')).toBeGreaterThanOrEqual(0)
  })
})

describe('browser LAN probe helpers', () => {
  it('builds /24 hosts and probes peer /sessions via browser fetch plane', async () => {
    expect(slash24ContainingIp('192.168.4.50')).toBe('192.168.4.0/24')
    expect(hostsInSlash24('192.168.4.0/24', ['192.168.4.50'])).toContain(
      '192.168.4.87',
    )

    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url) === 'http://192.168.4.87:8765/sessions') {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            port: 8765,
            sessions: [
              {
                campaignName: 'Night Harbor',
                campaignId: 'camp_gm',
                playSessionId: 'play_gm',
                joinToken: 'join_gm_1',
                shortCode: 'GMCODE',
              },
            ],
          }),
        }
      }
      throw new Error('unreachable')
    }) as unknown as typeof fetch

    const found = await browserProbeLanSessions({
      lanHints: ['192.168.4.50'],
      port: 8765,
      deadlineMs: 2000,
      concurrency: 64,
      perHostTimeoutMs: 50,
      fetchImpl,
    })
    expect(found).toEqual([
      expect.objectContaining({
        campaignName: 'Night Harbor',
        host: '192.168.4.87',
        joinToken: 'join_gm_1',
      }),
    ])
  })
})

describe('UDP discover datagram parse', () => {
  it('parses session ads and ignores queries / bad payloads', () => {
    const rows = parseDiscoverDatagram(
      JSON.stringify({
        t: DISCOVER_MSG_AD,
        v: DISCOVER_PROTOCOL_V,
        port: 8765,
        host: '192.168.4.87',
        sessions: [
          {
            campaignName: 'Night Harbor',
            campaignId: 'camp_gm',
            playSessionId: 'play_gm',
            joinToken: 'join_gm_1',
            shortCode: 'GMCODE',
          },
        ],
      }),
      '10.0.0.1',
    )
    expect(rows).toEqual([
      {
        campaignName: 'Night Harbor',
        campaignId: 'camp_gm',
        playSessionId: 'play_gm',
        joinToken: 'join_gm_1',
        shortCode: 'GMCODE',
        host: '192.168.4.87',
        port: 8765,
      },
    ])
    expect(parseDiscoverDatagram('not-json', '1.2.3.4')).toEqual([])
    expect(
      parseDiscoverDatagram(
        JSON.stringify({ t: 'pds-gm-discover-query', v: 1 }),
        '1.2.3.4',
      ),
    ).toEqual([])
  })
})

describe('merge + stamp', () => {
  it('merges remote without clobbering local tokens', () => {
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
          campaignId: 'c1b',
          playSessionId: 'p1b',
          joinToken: 't1',
          shortCode: 'CCCCCC',
        },
      ],
      '192.168.1.10',
      8765,
    )
    const merged = mergeLocalAndRemoteSessions(local, remote)
    expect(merged).toHaveLength(2)
    expect(merged.find((r) => r.joinToken === 't1')?.host).toBe('127.0.0.1')
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
    const result = await listLanSessions({
      hostHint: '127.0.0.1',
      detectLanHints: async () => [],
      allowBrowserProbe: false,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      interimWsDiscoverUrl('127.0.0.1', 8765),
      expect.anything(),
    )
    expect(result.ok).toBe(true)
    expect(result.discovered).toBe(true)
    expect(result.sessions[0]?.hostHint).toBe('192.168.1.10')
    expect(result.reason).toBeNull()
  })

  it('passes browser lanHints on /discover and browser-probes when discover empty', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/discover')) {
        expect(String(url)).toContain('lanHint=192.168.4.50')
        return {
          ok: true,
          json: async () => ({
            ok: true,
            discover: true,
            port: 8765,
            lanAddresses: ['172.30.0.2'],
            sessions: [],
          }),
        }
      }
      throw new Error(`unexpected ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await listLanSessions({
      hostHint: '127.0.0.1',
      lanHints: ['192.168.4.50'],
      browserProbe: async () => [
        {
          campaignName: 'Night Harbor',
          campaignId: 'camp_gm',
          playSessionId: 'play_gm',
          joinToken: 'join_gm_1',
          shortCode: 'GMCODE',
          host: '192.168.4.87',
          port: 8765,
        },
      ],
    })
    expect(result.ok).toBe(true)
    expect(result.browserProbed).toBe(true)
    expect(result.sessions[0]?.hostHint).toBe('192.168.4.87')
    expect(result.sessions[0]?.campaignName).toBe('Night Harbor')
  })

  it('keeps browse on local host (Advanced IP must not rebind discover)', () => {
    expect(localBrowseHost('localhost')).toBe('127.0.0.1')
    expect(localBrowseHost('192.168.4.50')).toBe('192.168.4.50')
    expect(interimWsDiscoverUrl('localhost', 8765, ['192.168.4.50'])).toBe(
      'http://127.0.0.1:8765/discover?lanHint=192.168.4.50',
    )
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
      detectLanHints: async () => [],
      allowBrowserProbe: false,
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
    const result = await listLanSessions({
      hostHint: '127.0.0.1',
      timeoutMs: 50,
      detectLanHints: async () => [],
      allowBrowserProbe: false,
    })
    expect(result.ok).toBe(false)
    expect(result.sessions).toEqual([])
    expect(result.reason).toMatch(/reachable|Advanced/i)
    expect(result.reason).not.toMatch(/firewall/i)
  })
})

async function registerHost(
  port: number,
  fields: {
    campaignId: string
    campaignName: string
    playSessionId: string
    joinToken: string
    shortCode: string
  },
) {
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
  ws.send(JSON.stringify({ op: 'register_host', ...fields }))
  await registered
  return ws
}

describe('interim host /sessions advertise', () => {
  afterEach(() => {
    clearDiscoverCache()
  })

  it('lists open table and drops closed table', async () => {
    const host = createInterimGmHost({ port: 0, udpPort: 18765 })
    await host.listen()
    const address = host.server.address()
    if (!address || typeof address === 'string') {
      throw new Error('expected TCP address')
    }
    const port = address.port
    const base = `http://127.0.0.1:${port}`

    const empty = await fetch(`${base}/sessions`).then((r) => r.json())
    expect(empty.sessions).toEqual([])

    const ws = await registerHost(port, {
      campaignId: 'camp_1',
      campaignName: 'Harbor Watch',
      playSessionId: 'play_1',
      joinToken: 'join_token_1',
      shortCode: 'ABCD12',
    })

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
    expect(discovered.udpPort).toBe(18765)
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
    await new Promise((r) => setTimeout(r, 50))

    const closed = await fetch(`${base}/sessions`).then((r) => r.json())
    expect(closed.sessions).toEqual([])

    await host.close()
  })

  it('UDP beacon lets a player host discover a peer GM open table', async () => {
    const udpPort = 18766
    const gm = createInterimGmHost({ port: 0, udpPort })
    const player = createInterimGmHost({ port: 0, udpPort })
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

    const ws = await registerHost(gmAddr.port, {
      campaignId: 'camp_gm',
      campaignName: 'Night Harbor',
      playSessionId: 'play_gm',
      joinToken: 'join_gm_1',
      shortCode: 'GMCODE',
    })

    // Direct UDP browse (same path /discover uses) should see the GM ad.
    const viaUdp = await udpBrowseOpenSessions({
      udpPort,
      listenMs: 600,
      tcpPort: gmAddr.port,
    })
    expect(viaUdp).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          campaignName: 'Night Harbor',
          joinToken: 'join_gm_1',
          port: gmAddr.port,
        }),
      ]),
    )

    // Simulate player-side TCP peer probe hitting the GM (loopback stands in for LAN).
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

    clearDiscoverCache()
    const listed = await listLanSessions({
      hostHint: '127.0.0.1',
      port: playerAddr.port,
      timeoutMs: 4000,
    })
    expect(listed.ok).toBe(true)
    expect(listed.discovered).toBe(true)
    expect(listed.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          campaignName: 'Night Harbor',
          joinToken: 'join_gm_1',
        }),
      ]),
    )

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
