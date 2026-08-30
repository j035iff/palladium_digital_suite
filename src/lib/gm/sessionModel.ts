import type { GenreId } from '../../data/genres'
import { createGmId } from './sessionId'
import {
  DEFAULT_PARTY_OVERLAY,
  INITIAL_COMBAT_STATE,
  type GmConversionPolicy,
  type GmHfOutcome,
  type GmNpcInstance,
  type GmPartyOverlay,
  type GmSessionEvent,
  type GmSessionEventKind,
  type GmSessionRecord,
} from './sessionTypes'

const EVENT_LOG_CAP = 60

function touch(session: GmSessionRecord): GmSessionRecord {
  return { ...session, updatedAtMs: Date.now() }
}

function pushEvent(
  session: GmSessionRecord,
  kind: GmSessionEventKind,
  text: string,
): GmSessionRecord {
  const event: GmSessionEvent = {
    id: createGmId('evt'),
    atMs: Date.now(),
    kind,
    text,
  }
  return {
    ...session,
    eventLog: [event, ...session.eventLog].slice(0, EVENT_LOG_CAP),
  }
}

export function createGmSession(input: {
  name: string
  hostGenreId: GenreId
  conversionPolicy?: GmConversionPolicy
}): GmSessionRecord {
  const name = input.name.trim() || 'Untitled session'
  const now = Date.now()
  const session: GmSessionRecord = {
    id: createGmId('sess'),
    name,
    hostGenreId: input.hostGenreId,
    conversionPolicy: input.conversionPolicy ?? 'disable_non_native',
    createdAtMs: now,
    updatedAtMs: now,
    scratchpad: '',
    partyCharacterIds: [],
    partyOverlays: {},
    npcs: [],
    combat: { ...INITIAL_COMBAT_STATE },
    eventLog: [],
  }
  return pushEvent(
    session,
    'session_created',
    `Session “${name}” opened (${input.hostGenreId}).`,
  )
}

export function overlayFor(
  session: GmSessionRecord,
  characterId: string,
): GmPartyOverlay {
  return session.partyOverlays[characterId] ?? DEFAULT_PARTY_OVERLAY
}

export function setScratchpad(
  session: GmSessionRecord,
  scratchpad: string,
): GmSessionRecord {
  return touch({ ...session, scratchpad })
}

export function setConversionPolicy(
  session: GmSessionRecord,
  conversionPolicy: GmConversionPolicy,
): GmSessionRecord {
  return touch({ ...session, conversionPolicy })
}

export function renameSession(
  session: GmSessionRecord,
  name: string,
): GmSessionRecord {
  const next = name.trim()
  if (!next) return session
  return touch({ ...session, name: next })
}

export function addPartyMember(
  session: GmSessionRecord,
  characterId: string,
  label: string,
): GmSessionRecord {
  if (session.partyCharacterIds.includes(characterId)) return session
  return touch(
    pushEvent(
      {
        ...session,
        partyCharacterIds: [...session.partyCharacterIds, characterId],
        partyOverlays: {
          ...session.partyOverlays,
          [characterId]: { ...DEFAULT_PARTY_OVERLAY },
        },
      },
      'party_added',
      `Party: ${label}`,
    ),
  )
}

export function removePartyMember(
  session: GmSessionRecord,
  characterId: string,
  label: string,
): GmSessionRecord {
  const { [characterId]: _removed, ...rest } = session.partyOverlays
  return touch(
    pushEvent(
      {
        ...session,
        partyCharacterIds: session.partyCharacterIds.filter((id) => id !== characterId),
        partyOverlays: rest,
      },
      'party_removed',
      `Removed ${label}`,
    ),
  )
}

export function patchPartyOverlay(
  session: GmSessionRecord,
  characterId: string,
  patch: Partial<GmPartyOverlay>,
): GmSessionRecord {
  if (!session.partyCharacterIds.includes(characterId)) return session
  const prev = overlayFor(session, characterId)
  return touch({
    ...session,
    partyOverlays: {
      ...session.partyOverlays,
      [characterId]: { ...prev, ...patch },
    },
  })
}

export function setPartyInitiativeRoll(
  session: GmSessionRecord,
  characterId: string,
  d20: number | null,
): GmSessionRecord {
  if (session.combat.initiativeLocked) return session
  return patchPartyOverlay(session, characterId, { initiativeRoll: d20 })
}

export function addNpcInstance(
  session: GmSessionRecord,
  npc: GmNpcInstance,
): GmSessionRecord {
  return touch(
    pushEvent(
      { ...session, npcs: [...session.npcs, npc] },
      'npc_spawned',
      `Cast: ${npc.displayName}`,
    ),
  )
}

export function removeNpcInstance(
  session: GmSessionRecord,
  instanceId: string,
): GmSessionRecord {
  const npc = session.npcs.find((n) => n.instanceId === instanceId)
  if (!npc) return session
  const activeHf =
    session.combat.activeHfEmit?.npcInstanceId === instanceId
      ? null
      : session.combat.activeHfEmit
  return touch(
    pushEvent(
      {
        ...session,
        npcs: session.npcs.filter((n) => n.instanceId !== instanceId),
        combat: { ...session.combat, activeHfEmit: activeHf },
      },
      'npc_removed',
      `Removed ${npc.displayName}`,
    ),
  )
}

export function patchNpcInstance(
  session: GmSessionRecord,
  instanceId: string,
  patch: Partial<GmNpcInstance>,
): GmSessionRecord {
  let found = false
  const npcs = session.npcs.map((n) => {
    if (n.instanceId !== instanceId) return n
    found = true
    return { ...n, ...patch }
  })
  if (!found) return session
  return touch({ ...session, npcs })
}

export function setNpcInitiativeRoll(
  session: GmSessionRecord,
  instanceId: string,
  d20: number | null,
): GmSessionRecord {
  if (session.combat.initiativeLocked) return session
  return patchNpcInstance(session, instanceId, { initiativeRoll: d20 })
}

export function spendNpcApm(
  session: GmSessionRecord,
  instanceId: string,
  actions = 1,
): GmSessionRecord {
  const npc = session.npcs.find((n) => n.instanceId === instanceId)
  if (!npc) return session
  const next = Math.min(npc.maxApm, Math.max(0, npc.apmSpent + actions))
  return patchNpcInstance(session, instanceId, { apmSpent: next })
}

export function lockInitiative(session: GmSessionRecord): GmSessionRecord {
  if (session.combat.initiativeLocked) return session
  return touch(
    pushEvent(
      {
        ...session,
        combat: { ...session.combat, initiativeLocked: true },
      },
      'initiative_locked',
      `Initiative locked — melee round ${session.combat.round}.`,
    ),
  )
}

export function unlockInitiative(session: GmSessionRecord): GmSessionRecord {
  if (!session.combat.initiativeLocked) return session
  return touch({
    ...session,
    combat: { ...session.combat, initiativeLocked: false },
  })
}

/** Refill NPC APM, increment round, unlock initiative. PC APM stays player-owned (not tracked). */
export function startNewMeleeRound(session: GmSessionRecord): GmSessionRecord {
  const npcs = session.npcs.map((n) => ({ ...n, apmSpent: 0 }))
  return touch(
    pushEvent(
      {
        ...session,
        npcs,
        combat: {
          round: session.combat.round + 1,
          initiativeLocked: false,
          activeHfEmit: null,
        },
      },
      'new_melee_round',
      `Melee round ${session.combat.round + 1}. NPC actions refilled.`,
    ),
  )
}

export function emitHorrorFactor(
  session: GmSessionRecord,
  npc: GmNpcInstance,
  saveTarget: number,
  useNightbaneHorrorFactor: boolean,
  notes: string,
): GmSessionRecord {
  const overlays: Record<string, GmPartyOverlay> = { ...session.partyOverlays }
  for (const id of session.partyCharacterIds) {
    const prev = overlayFor(session, id)
    overlays[id] = { ...prev, hfSaveRoll: null, hfOutcome: 'pending' }
  }
  return touch(
    pushEvent(
      {
        ...session,
        partyOverlays: overlays,
        combat: {
          ...session.combat,
          activeHfEmit: {
            npcInstanceId: npc.instanceId,
            saveTarget,
            useNightbaneHorrorFactor,
            emittedAtMs: Date.now(),
            notes,
          },
        },
      },
      'hf_emit',
      `${npc.displayName} emitted H.F. ${saveTarget}. Record party saves — do not auto-spend APM.`,
    ),
  )
}

export function recordPartyHfSave(
  session: GmSessionRecord,
  characterId: string,
  label: string,
  d20: number,
  saveBonus: number,
): { session: GmSessionRecord; passed: boolean; total: number } | null {
  const emit = session.combat.activeHfEmit
  if (!emit || !session.partyCharacterIds.includes(characterId)) return null
  const total = d20 + saveBonus
  const passed = total >= emit.saveTarget
  const outcome: GmHfOutcome = passed ? 'passed' : 'failed'
  const next = patchPartyOverlay(session, characterId, {
    hfSaveRoll: d20,
    hfOutcome: outcome,
  })
  return {
    session: pushEvent(
      next,
      'hf_save',
      `${label}: ${d20} + ${saveBonus} = ${total} vs H.F. ${emit.saveTarget} — ${passed ? 'saved' : 'failed'} (APM unchanged).`,
    ),
    passed,
    total,
  }
}

export function recordNpcStrike(
  session: GmSessionRecord,
  npc: GmNpcInstance,
  d20: number,
  strikeBonus: number,
): GmSessionRecord {
  const total = d20 + strikeBonus
  return touch(
    pushEvent(
      session,
      'strike_recorded',
      `${npc.displayName} strike: ${d20} + ${strikeBonus} = ${total}`,
    ),
  )
}

export function adjustNpcPool(
  session: GmSessionRecord,
  instanceId: string,
  pool: 'hp' | 'sdc',
  delta: number,
): GmSessionRecord {
  const npc = session.npcs.find((n) => n.instanceId === instanceId)
  if (!npc) return session
  if (pool === 'hp') {
    const hpCurrent = Math.min(npc.hpMax, Math.max(0, npc.hpCurrent + delta))
    return patchNpcInstance(session, instanceId, { hpCurrent })
  }
  const sdcCurrent = Math.min(npc.sdcMax, Math.max(0, npc.sdcCurrent + delta))
  return patchNpcInstance(session, instanceId, { sdcCurrent })
}
