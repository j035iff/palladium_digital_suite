import type { InventoryItem } from '../types'

/**
 * Demo inventory — armor, weapons, gear (attribute_and_stat.md §4 carry).
 */
export const initialInventoryItems: InventoryItem[] = [
  {
    id: 'urban_body',
    itemType: 'armor',
    name: 'Urban body armor',
    weightLbs: 8,
    ar: 12,
    currentSdc: 45,
    maxSdc: 50,
    isEquipped: false,
    morphusCompatible: false,
    humanSized: true,
  },
  {
    id: 'synth_weave',
    itemType: 'armor',
    name: 'Synth-weave coat',
    weightLbs: 4,
    ar: 8,
    currentSdc: 20,
    maxSdc: 20,
    isEquipped: true,
    morphusCompatible: true,
    humanSized: false,
  },
  {
    id: 'vibro_knife',
    itemType: 'weapon',
    name: 'Vibro-knife',
    weightLbs: 2,
    category: 'Swords',
    strikeBonus: 1,
    damage: '2d4',
    isEquipped: false,
    linkedWpSkillId: 'wp_sword',
  },
  {
    id: 'ion_pistol',
    itemType: 'weapon',
    name: 'Ion pistol',
    weightLbs: 3,
    category: 'Handguns',
    strikeBonus: 0,
    damage: '4d6',
    payload: { current: 12, max: 12 },
    isEquipped: false,
    linkedWpSkillId: 'wp_pistol',
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
