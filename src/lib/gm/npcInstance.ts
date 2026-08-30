import type { CatalogEncounterArchetype } from '../../data/library/encounterArchetypeCatalogLoader'
import { createGmId } from './sessionId'
import type { GmNpcInstance } from './sessionTypes'

/** Book vitals may be a number or a dice/prose string — take the first integer. */
export function parseEncounterVital(value: number | string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }
  const match = String(value).match(/-?\d+/)
  if (!match) return 0
  const n = Number.parseInt(match[0], 10)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

export function createNpcFromArchetype(
  archetype: CatalogEncounterArchetype,
  variantId?: string,
): GmNpcInstance {
  const variant = archetype.variants?.find((v) => v.variantId === variantId)
  const vitals = {
    ...archetype.vitals,
    ...variant?.vitals,
  }
  const hp = parseEncounterVital(vitals.hp)
  const sdc = parseEncounterVital(vitals.sdc)
  const maxApm = Math.max(1, archetype.handToHand.attacksPerMelee ?? 2)
  const suffix = variant ? ` (${variant.label})` : ''
  return {
    instanceId: createGmId('npc'),
    archetypeId: archetype.id,
    catalogGenreId: archetype.catalogGenreId,
    variantId,
    displayName: `${archetype.name}${suffix}`,
    notes: '',
    hpMax: hp,
    hpCurrent: hp,
    sdcMax: sdc,
    sdcCurrent: sdc,
    maxApm,
    apmSpent: 0,
    initiativeRoll: null,
  }
}

export function npcStrikeBonus(
  archetype: CatalogEncounterArchetype,
  variantId?: string,
): number {
  const variant = archetype.variants?.find((v) => v.variantId === variantId)
  return (archetype.modifiers.strike ?? 0) + (variant?.modifiers?.strike ?? 0)
}

export function npcInitiativeBonus(
  archetype: CatalogEncounterArchetype,
  variantId?: string,
): number {
  const variant = archetype.variants?.find((v) => v.variantId === variantId)
  return (archetype.modifiers.initiative ?? 0) + (variant?.modifiers?.initiative ?? 0)
}

export function npcParryBonus(
  archetype: CatalogEncounterArchetype,
  variantId?: string,
): number {
  const variant = archetype.variants?.find((v) => v.variantId === variantId)
  return (archetype.modifiers.parry ?? 0) + (variant?.modifiers?.parry ?? 0)
}
