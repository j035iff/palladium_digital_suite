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

  export function advertiseOpenSessions(
    rooms: Iterable<InterimGmRoom>,
  ): Array<{
    campaignName: string
    campaignId: string
    playSessionId: string
    joinToken: string
    shortCode: string
  }>

  export function createInterimGmHost(opts?: { port?: number }): {
    readonly port: number
    server: import('node:http').Server
    wss: unknown
    listRooms: () => InterimGmRoom[]
    listen: () => Promise<void>
    close: () => Promise<void>
  }
}
