import type { GenreId } from '../../data/genres'
import type { ActiveForm } from '../../types'
import type { GmContentLinkKind } from './contentLinks'

/** Session-wide cross-genre policy (view-model only — never writes character saves). */
export type GmConversionPolicy = 'disable_non_native' | 'apply_conversion'

export function isGmConversionPolicy(
  value: string,
): value is GmConversionPolicy {
  return value === 'disable_non_native' || value === 'apply_conversion'
}

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

/**
 * Placeholder stub for Notes content links (v1) — person / place / thing /
 * note / npc / pc. Real combat NPCs stay on `npcs`; joined PCs on party ids.
 */
export type GmPlaceholderEntity = {
  id: string
  kind: GmContentLinkKind
  name: string
  /** Freeform stub notes (person rows are note-ish). */
  notes: string
  /** Optional person → real Characters NPC deep link. */
  linkedNpcId?: string
  createdAtMs: number
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
  /**
   * Character save ids currently in the Melee roster (joined PCs and/or
   * local-machine NPCs from People). Empty until GM adds via Melee dropdowns.
   */
  meleeCharacterIds: string[]
  /**
   * Fodder NPC instance ids currently in the Melee roster. Empty until GM adds
   * via Melee dropdowns. People still owns spawn/management.
   */
  meleeNpcInstanceIds: string[]
}

export type GmSessionEventKind =
  | 'session_created'
  | 'play_session_opened'
  | 'play_session_closed'
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

/** Joinable play sitting under a campaign. Players see `playerLabel`. */
export type GmPlaySessionStatus = 'open' | 'closed'

export type GmPlaySession = {
  id: string
  playerLabel: string
  openedAtMs: number
  closedAtMs: number | null
  status: GmPlaySessionStatus
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
  /**
   * Placeholder stubs for Notes content links (person / place / thing / note /
   * npc / pc). Real combat NPCs stay on `npcs`; joined PCs stay on party ids.
   */
  placeholders: GmPlaceholderEntity[]
  partyCharacterIds: string[]
  partyOverlays: Record<string, GmPartyOverlay>
  npcs: GmNpcInstance[]
  combat: GmCombatState
  eventLog: GmSessionEvent[]
  /** Play sittings players can connect to. Campaign `name` stays separate. */
  playSessions: GmPlaySession[]
  activePlaySessionId: string | null
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
  meleeCharacterIds: [],
  meleeNpcInstanceIds: [],
}
