declare module '../../scripts/skill-engine-contract.mjs' {
  export const SCHEMA_TOP_LEVEL_KEYS: readonly string[]
  export const SKILL_PASS_B_KEYS: readonly string[]
  export function hasCatalogProgression(row: unknown): boolean
  export function hasPercentileProgression(row: unknown): boolean
  export function isDocumentedSynergyOnlySkill(row: unknown): boolean
  export function isPassACatalogComplete(row: unknown): boolean
  export function loadSchemaPropertyKeys(): Set<string>
}

declare module '../../scripts/talent-engine-contract.mjs' {
  export const SCHEMA_TOP_LEVEL_KEYS: readonly string[]
  export const TALENT_DEFAULT_USABLE_FORM: string
  export const TALENT_TIER2_PLAY_KEYS: readonly string[]
  export function inferTalentUsableInNightbaneForm(row: unknown): string
  export function isTier1ChargenComplete(row: unknown): boolean
}

declare module '../../../scripts/gm-interim-ws-host.mjs' {
  export type InterimGmRoom = {
    campaignId: string
    campaignName: string
    playSessionId: string
    joinToken: string
    shortCode: string
    host: unknown
    clients: Map<string, unknown>
  }

  export type InterimSessionAd = {
    campaignName: string
    campaignId: string
    playSessionId: string
    joinToken: string
    shortCode: string
    host?: string
    port?: number
  }

  export const DISCOVER_MSG_AD: string
  export const DISCOVER_MSG_QUERY: string
  export const DISCOVER_PROTOCOL_V: number
  export const DEFAULT_UDP_PORT: number
  export const DEFAULT_WS_PORT: number

  export function isIpv4Family(family: string | number | undefined): boolean
  export function lanAddresses(): string[]
  export function lanIpv4Cidrs(): Array<{
    address: string
    cidr: string
    prefix: number
    broadcast: string
  }>
  export function broadcastForCidr(cidr: string): string | null
  export function hostsInCidr(
    cidr: string,
    opts?: { exclude?: Iterable<string>; maxHosts?: number },
  ): string[]
  export function advertiseOpenSessions(
    rooms: Iterable<InterimGmRoom>,
  ): InterimSessionAd[]
  export function stampSessionHosts(
    sessions: InterimSessionAd[],
    host: string,
    port: number,
  ): InterimSessionAd[]
  export function mergeLocalAndRemoteSessions(
    local: InterimSessionAd[],
    remote: InterimSessionAd[],
  ): InterimSessionAd[]
  export function fetchPeerLocalSessions(
    ip: string,
    port: number,
    timeoutMs?: number,
  ): Promise<InterimSessionAd[]>
  export function probeLanHosts(
    hosts: string[],
    port: number,
    opts?: {
      concurrency?: number
      timeoutMs?: number
      earlyExit?: boolean
      deadlineMs?: number
    },
  ): Promise<InterimSessionAd[]>
  export function parseDiscoverDatagram(
    msg: Buffer | string,
    rinfoAddress: string,
  ): InterimSessionAd[]
  export function udpBrowseOpenSessions(opts?: {
    udpPort?: number
    listenMs?: number
    multicastAddr?: string
    tcpPort?: number
  }): Promise<InterimSessionAd[]>
  export function discoverLanPeerSessions(
    port: number,
    opts?: {
      cacheMs?: number
      emptyCacheMs?: number
      now?: number
      skipCache?: boolean
      udpPort?: number
      udpListenMs?: number
      skipUdp?: boolean
      skipTcp?: boolean
      tcpDeadlineMs?: number
      udpBrowse?: (listenMs?: number) => Promise<InterimSessionAd[]>
    },
  ): Promise<InterimSessionAd[]>
  export function clearDiscoverCache(): void

  export function createInterimGmHost(opts?: {
    port?: number
    udpPort?: number
  }): {
    readonly port: number
    readonly udpPort: number
    server: import('node:http').Server
    wss: unknown
    listRooms: () => InterimGmRoom[]
    listen: () => Promise<void>
    close: () => Promise<void>
  }
}
