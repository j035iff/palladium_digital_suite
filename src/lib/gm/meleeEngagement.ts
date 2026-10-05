/**
 * Melee round engagement — select from People data (joined PCs + local NPCs +
 * fodder) without a Combat People tab. Reuses party/NPC ids; filters the shared
 * combat roster assembler (Pillar 9).
 */

import { joinedPartyCharacterIds } from './joinTableLeave'
import type { GmPartyObserverSlice } from './partyObserver'
import type { GmSeat } from './sessionPresence'
import type { GmSessionRecord } from './sessionTypes'

export type MeleeCharacterCandidate = {
  key: string
  kind: 'pc' | 'local_npc'
  characterId: string
  label: string
}

export type MeleeFodderCandidate = {
  key: string
  kind: 'fodder'
  npcInstanceId: string
  label: string
}

export type MeleeAddCandidate = MeleeCharacterCandidate | MeleeFodderCandidate

function combatIds(session: GmSessionRecord): {
  characters: Set<string>
  npcs: Set<string>
} {
  return {
    characters: new Set(session.combat.meleeCharacterIds ?? []),
    npcs: new Set(session.combat.meleeNpcInstanceIds ?? []),
  }
}

/** Joined PCs not yet in the Melee roster. */
export function listMeleePcCandidates(
  session: GmSessionRecord,
  party: GmPartyObserverSlice[],
  joinSeats: readonly GmSeat[],
): MeleeCharacterCandidate[] {
  const joined = joinedPartyCharacterIds(joinSeats)
  const inMelee = combatIds(session).characters
  const byId = new Map(party.map((row) => [row.characterId, row]))
  const out: MeleeCharacterCandidate[] = []
  for (const characterId of joined) {
    if (inMelee.has(characterId)) continue
    if (!session.partyCharacterIds.includes(characterId)) continue
    const slice = byId.get(characterId)
    out.push({
      key: `pc:${characterId}`,
      kind: 'pc',
      characterId,
      label: slice?.name ?? characterId,
    })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Local-machine party characters (GM-run NPCs) + fodder instances not yet in
 * the Melee roster. Same People → NPCs pool; no second pipeline.
 */
export function listMeleeNpcCandidates(
  session: GmSessionRecord,
  party: GmPartyObserverSlice[],
  joinSeats: readonly GmSeat[],
): MeleeAddCandidate[] {
  const joined = new Set(joinedPartyCharacterIds(joinSeats))
  const { characters: inMeleeChars, npcs: inMeleeNpcs } = combatIds(session)
  const out: MeleeAddCandidate[] = []

  for (const slice of party) {
    if (joined.has(slice.characterId)) continue
    if (inMeleeChars.has(slice.characterId)) continue
    out.push({
      key: `local:${slice.characterId}`,
      kind: 'local_npc',
      characterId: slice.characterId,
      label: slice.name,
    })
  }

  for (const npc of session.npcs) {
    if (inMeleeNpcs.has(npc.instanceId)) continue
    out.push({
      key: `fodder:${npc.instanceId}`,
      kind: 'fodder',
      npcInstanceId: npc.instanceId,
      label: npc.displayName,
    })
  }

  return out.sort((a, b) => a.label.localeCompare(b.label))
}

export function addCharacterToMelee(
  session: GmSessionRecord,
  characterId: string,
): GmSessionRecord {
  if (!session.partyCharacterIds.includes(characterId)) return session
  const ids = session.combat.meleeCharacterIds ?? []
  if (ids.includes(characterId)) return session
  return {
    ...session,
    updatedAtMs: Date.now(),
    combat: {
      ...session.combat,
      meleeCharacterIds: [...ids, characterId],
      meleeNpcInstanceIds: session.combat.meleeNpcInstanceIds ?? [],
    },
  }
}

export function addNpcInstanceToMelee(
  session: GmSessionRecord,
  npcInstanceId: string,
): GmSessionRecord {
  if (!session.npcs.some((n) => n.instanceId === npcInstanceId)) return session
  const ids = session.combat.meleeNpcInstanceIds ?? []
  if (ids.includes(npcInstanceId)) return session
  return {
    ...session,
    updatedAtMs: Date.now(),
    combat: {
      ...session.combat,
      meleeCharacterIds: session.combat.meleeCharacterIds ?? [],
      meleeNpcInstanceIds: [...ids, npcInstanceId],
    },
  }
}

export function removeCharacterFromMelee(
  session: GmSessionRecord,
  characterId: string,
): GmSessionRecord {
  const ids = session.combat.meleeCharacterIds ?? []
  if (!ids.includes(characterId)) return session
  return {
    ...session,
    updatedAtMs: Date.now(),
    combat: {
      ...session.combat,
      meleeCharacterIds: ids.filter((id) => id !== characterId),
      meleeNpcInstanceIds: session.combat.meleeNpcInstanceIds ?? [],
    },
  }
}

export function removeNpcInstanceFromMelee(
  session: GmSessionRecord,
  npcInstanceId: string,
): GmSessionRecord {
  const ids = session.combat.meleeNpcInstanceIds ?? []
  if (!ids.includes(npcInstanceId)) return session
  return {
    ...session,
    updatedAtMs: Date.now(),
    combat: {
      ...session.combat,
      meleeCharacterIds: session.combat.meleeCharacterIds ?? [],
      meleeNpcInstanceIds: ids.filter((id) => id !== npcInstanceId),
    },
  }
}

/** Drop melee engagement when a character leaves the party. */
export function detachCharacterFromMelee(
  session: GmSessionRecord,
  characterId: string,
): GmSessionRecord {
  return removeCharacterFromMelee(session, characterId)
}

/** Drop melee engagement when a fodder instance is removed. */
export function detachNpcFromMelee(
  session: GmSessionRecord,
  npcInstanceId: string,
): GmSessionRecord {
  return removeNpcInstanceFromMelee(session, npcInstanceId)
}

/** Ensure melee id arrays exist (older saves). */
export function hydrateMeleeEngagement(
  session: GmSessionRecord,
): GmSessionRecord {
  const combat = session.combat
  const hasChars = Array.isArray(combat.meleeCharacterIds)
  const hasNpcs = Array.isArray(combat.meleeNpcInstanceIds)
  if (hasChars && hasNpcs) return session
  return {
    ...session,
    combat: {
      ...combat,
      meleeCharacterIds: hasChars ? combat.meleeCharacterIds : [],
      meleeNpcInstanceIds: hasNpcs ? combat.meleeNpcInstanceIds : [],
    },
  }
}
