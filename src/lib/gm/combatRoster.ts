import type { CatalogEncounterArchetype } from '../../data/library/encounterArchetypeCatalogLoader'
import { npcInitiativeBonus } from './npcInstance'
import type { GmNpcInstance, GmPartyOverlay, GmSessionRecord } from './sessionTypes'
import type { GmPartyObserverSlice } from './partyObserver'

export type GmCombatantKind = 'pc' | 'npc'

export type GmCombatRosterRow = {
  key: string
  kind: GmCombatantKind
  name: string
  initiativeRoll: number | null
  initiativeBonus: number
  initiativeTotal: number | null
  maxApm: number
  apmSpent: number
  hfOutcome: GmPartyOverlay['hfOutcome']
  characterId?: string
  npcInstanceId?: string
}

export function initiativeTotal(
  roll: number | null,
  bonus: number,
): number | null {
  if (roll == null || !Number.isFinite(roll)) return null
  return roll + bonus
}

export function sortCombatRoster(rows: GmCombatRosterRow[]): GmCombatRosterRow[] {
  return [...rows].sort((a, b) => {
    const at = a.initiativeTotal
    const bt = b.initiativeTotal
    if (at == null && bt == null) return a.name.localeCompare(b.name)
    if (at == null) return 1
    if (bt == null) return -1
    if (bt !== at) return bt - at
    return a.name.localeCompare(b.name)
  })
}

export function assembleGmCombatRoster(input: {
  session: GmSessionRecord
  party: GmPartyObserverSlice[]
  overlays: Record<string, GmPartyOverlay>
  archetypesByKey: Map<string, CatalogEncounterArchetype>
}): GmCombatRosterRow[] {
  const { session, party, overlays, archetypesByKey } = input
  const pcRows: GmCombatRosterRow[] = party.map((slice) => {
    const overlay = overlays[slice.characterId]
    const roll = overlay?.initiativeRoll ?? null
    return {
      key: `pc:${slice.characterId}`,
      kind: 'pc',
      name: slice.name,
      initiativeRoll: roll,
      initiativeBonus: slice.initiativeBonus,
      initiativeTotal: initiativeTotal(roll, slice.initiativeBonus),
      maxApm: slice.maxApm,
      apmSpent: 0,
      hfOutcome: overlay?.hfOutcome ?? null,
      characterId: slice.characterId,
    }
  })

  const npcRows: GmCombatRosterRow[] = session.npcs.map((npc) =>
    npcToRosterRow(npc, archetypesByKey),
  )

  return sortCombatRoster([...pcRows, ...npcRows])
}

export function npcToRosterRow(
  npc: GmNpcInstance,
  archetypesByKey: Map<string, CatalogEncounterArchetype>,
): GmCombatRosterRow {
  const archetype = archetypesByKey.get(`${npc.catalogGenreId}:${npc.archetypeId}`)
  const bonus = archetype ? npcInitiativeBonus(archetype, npc.variantId) : 0
  return {
    key: `npc:${npc.instanceId}`,
    kind: 'npc',
    name: npc.displayName,
    initiativeRoll: npc.initiativeRoll,
    initiativeBonus: bonus,
    initiativeTotal: initiativeTotal(npc.initiativeRoll, bonus),
    maxApm: npc.maxApm,
    apmSpent: npc.apmSpent,
    hfOutcome: null,
    npcInstanceId: npc.instanceId,
  }
}
