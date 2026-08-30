/**
 * Future LAN / WebSocket payload shapes.
 * v1 has no transport — keep these envelopes stable so a desktop server can bind later.
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
  sessionName: string
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

export type GmProtocolMessage =
  | GmEnvelope<'session.hello', GmHelloPayload>
  | GmEnvelope<'party.snapshot', GmPartySnapshotPayload>
  | GmEnvelope<'combat.initiative', GmInitiativePayload>
  | GmEnvelope<'combat.apmSpend', GmApmSpendPayload>
  | GmEnvelope<'combat.hfEmit', GmHfEmitPayload>
  | GmEnvelope<'combat.hfSave', GmHfSavePayload>
  | GmEnvelope<'combat.strikeRecorded', GmStrikeRecordedPayload>

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
