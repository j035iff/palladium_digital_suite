import type { InventoryItem } from '../types'

/**
 * Demo inventory — armor + encumbrance sample (attribute_and_stat.md §4 carry).
 */
export const initialInventoryItems: InventoryItem[] = [
  {
    id: 'urban_body',
    itemType: 'armor',
    name: 'Urban body armor',
    weightLbs: 8,
    ar: 12,
    currentSDC: 45,
    maxSDC: 50,
    morphusCompatible: false,
  },
  {
    id: 'synth_weave',
    itemType: 'armor',
    name: 'Synth-weave coat',
    weightLbs: 4,
    ar: 8,
    currentSDC: 20,
    maxSDC: 20,
    morphusCompatible: true,
  },
  {
    id: 'field_kit',
    itemType: 'gear',
    name: 'Field kit',
    weightLbs: 12,
  },
  {
    id: 'salvage_plating',
    itemType: 'gear',
    name: 'Salvaged plating crate',
    weightLbs: 85,
  },
]
