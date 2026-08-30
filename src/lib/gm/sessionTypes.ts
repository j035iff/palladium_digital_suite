import type { GenreId } from '../../data/genres'
import type { ActiveForm } from '../../types'

/** Session-wide cross-genre policy (view-model only — never writes character saves). */
export type GmConversionPolicy = 'disable_non_native' | 'apply_conversion'

export type GmHubTab = 'sessions' | 'party' | 'cast' | 'combat'

export type GmHfOutcome = 'pending' | 'passed' | 'failed'

/** Per-PC overlay stored on the session — not on the character save. */
export type GmPartyOverlay = {
  viewForm: ActiveForm
  initiativeRoll: number | null
  hfSaveRoll: number | null
  hfOutcome: GmHfOutcome | null
}

export type GmNpcInstance = {
  instanceId: string
  archetypeId: string
  catalogGenreId: string
  variantId?: string
  displayName: string
  /** Narrative GM notes for this instance. */
  notes: string
  hpMax: number
  hpCurrent: number
  sdcMax: number
  sdcCurrent: number
  maxApm: number
  apmSpent: number
  initiativeRoll: number | null
}

export type GmHfEmit = {
  npcInstanceId: string
  saveTarget: number
  useNightbaneHorrorFactor: boolean
  emittedAtMs: number
  notes: string
}

export type GmCombatState = {
  round: number
  initiativeLocked: boolean
  activeHfEmit: GmHfEmit | null
}

export type GmSessionEventKind =
  | 'session_created'
  | 'party_added'
  | 'party_removed'
  | 'npc_spawned'
  | 'npc_removed'
  | 'initiative_locked'
  | 'new_melee_round'
  | 'hf_emit'
  | 'hf_save'
  | 'strike_recorded'
  | 'note'

export type GmSessionEvent = {
  id: string
  atMs: number
  kind: GmSessionEventKind
  text: string
}

export type GmSessionRecord = {
  id: string
  name: string
  /** Immutable for the life of the room. */
  hostGenreId: GenreId
  conversionPolicy: GmConversionPolicy
  createdAtMs: number
  updatedAtMs: number
  scratchpad: string
  partyCharacterIds: string[]
  partyOverlays: Record<string, GmPartyOverlay>
  npcs: GmNpcInstance[]
  combat: GmCombatState
  eventLog: GmSessionEvent[]
}

export type GmSessionIndexEntry = {
  id: string
  name: string
  hostGenreId: GenreId
  updatedAtMs: number
}

export const DEFAULT_PARTY_OVERLAY: GmPartyOverlay = {
  viewForm: 'primary',
  initiativeRoll: null,
  hfSaveRoll: null,
  hfOutcome: null,
}

export const INITIAL_COMBAT_STATE: GmCombatState = {
  round: 1,
  initiativeLocked: false,
  activeHfEmit: null,
}
