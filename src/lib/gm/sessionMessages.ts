import { activePlaySession } from './playSession'
import type { GmSessionRecord } from './sessionTypes'
import type { GmSeat } from './sessionPresence'

/**
 * GM Hub LAN / WebSocket payload shapes (protocol v1).
 * Host authority for GmSessionRecord; presence is ephemeral on the host.
 * sessionId on envelopes = campaign GmSessionRecord.id; room key = playSessionId.
 */

export const GM_PROTOCOL_VERSION = 1 as const

export type GmEnvelope<T extends string, P> = {
  v: typeof GM_PROTOCOL_VERSION
  type: T
  sessionId: string
  sentAtMs: number
  payload: P
}

export type GmHelloPayload = {
  hostGenreId: string
  conversionPolicy: 'disable_non_native' | 'apply_conversion'
  /** Player-visible join name when a play session is open; otherwise campaign name. */
  sessionName: string
  campaignName: string
  playSessionId: string | null
}

export type GmJoinPayload = {
  playSessionId: string
  joinToken: string
  /** Optional short code — host accepts token or matching shortCode. */
  shortCode?: string
  deviceId: string
  displayName: string
}

export type GmWelcomePayload = {
  deviceId: string
  hello: GmHelloPayload
}

export type GmLeavePayload = {
  deviceId: string
  reason?: string
}

export type GmClosedPayload = {
  playSessionId: string
  reason: string
}

export type GmPresencePayload = {
  playSessionId: string
  seats: GmSeat[]
}

export type GmKickPayload = {
  deviceId: string
  reason: string
}

export type GmPartySnapshotPayload = {
  characterId: string
  /** Native save JSON — GM caches; never mutated by conversion. */
  characterJson: unknown
}

export type GmInitiativePayload = {
  combatantKey: string
  kind: 'pc' | 'npc'
  d20: number
}

export type GmApmSpendPayload = {
  combatantKey: string
  kind: 'pc' | 'npc'
  actions: number
}

export type GmHfEmitPayload = {
  npcInstanceId: string
  saveTarget: number
  useNightbaneHorrorFactor: boolean
}

export type GmHfSavePayload = {
  characterId: string
  d20: number
}

export type GmStrikeRecordedPayload = {
  npcInstanceId: string
  d20: number
  strikeBonus: number
  total: number
}

export type GmInitiativeLockPayload = {
  locked: boolean
}

/** Clears live H.F. on clients (e.g. new melee round). */
export type GmHfClearPayload = Record<string, never>

export type GmProtocolMessage =
  | GmEnvelope<'session.hello', GmHelloPayload>
  | GmEnvelope<'session.join', GmJoinPayload>
  | GmEnvelope<'session.welcome', GmWelcomePayload>
  | GmEnvelope<'session.leave', GmLeavePayload>
  | GmEnvelope<'session.closed', GmClosedPayload>
  | GmEnvelope<'session.presence', GmPresencePayload>
  | GmEnvelope<'session.kick', GmKickPayload>
  | GmEnvelope<'party.snapshot', GmPartySnapshotPayload>
  | GmEnvelope<'combat.initiative', GmInitiativePayload>
  | GmEnvelope<'combat.apmSpend', GmApmSpendPayload>
  | GmEnvelope<'combat.hfEmit', GmHfEmitPayload>
  | GmEnvelope<'combat.hfClear', GmHfClearPayload>
  | GmEnvelope<'combat.hfSave', GmHfSavePayload>
  | GmEnvelope<'combat.initiativeLock', GmInitiativeLockPayload>
  | GmEnvelope<'combat.strikeRecorded', GmStrikeRecordedPayload>

/** Client → host messages allowed after a successful welcome. */
export const CLIENT_TO_HOST_TYPES = [
  'session.leave',
  'party.snapshot',
  'combat.initiative',
  'combat.apmSpend',
  'combat.hfSave',
] as const

export type GmClientToHostType = (typeof CLIENT_TO_HOST_TYPES)[number]

export function isClientToHostType(type: string): type is GmClientToHostType {
  return (CLIENT_TO_HOST_TYPES as readonly string[]).includes(type)
}

export function createGmEnvelope<T extends string, P>(
  type: T,
  sessionId: string,
  payload: P,
  sentAtMs = Date.now(),
): GmEnvelope<T, P> {
  return {
    v: GM_PROTOCOL_VERSION,
    type,
    sessionId,
    sentAtMs,
    payload,
  }
}

export function isGmEnvelope(value: unknown): value is GmEnvelope<string, unknown> {
  if (value == null || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    row.v === GM_PROTOCOL_VERSION &&
    typeof row.type === 'string' &&
    typeof row.sessionId === 'string' &&
    typeof row.sentAtMs === 'number' &&
    'payload' in row
  )
}

export function gmHelloPayloadFromCampaign(
  session: GmSessionRecord,
): GmHelloPayload {
  const live = activePlaySession(session)
  return {
    hostGenreId: session.hostGenreId,
    conversionPolicy: session.conversionPolicy,
    sessionName: live?.playerLabel ?? session.name,
    campaignName: session.name,
    playSessionId: live?.id ?? null,
  }
}

export function parseWireJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}
