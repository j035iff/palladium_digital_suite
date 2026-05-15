/**
 * Sheet-first reference numbers (Pillar 5 — manual rolling at the table).
 * Psionics save targets follow Psychic Gate tier (psychic_gate.md); numeric bases match standard Palladium-style rows.
 */

/** Baseline Horror Factor aura when no custom base modifier is supplied (Nightbane-relevant silhouette). */
export const DEFAULT_HORROR_FACTOR_BY_FORM = {
  facade: 8,
  morphus: 12,
} as const

/** Row definition for aggregate save engine (@see ../lib/saveProfile.ts). */
export type SaveRowDefinition = {
  readonly id: string
  /** Shown on the Character Sheet Saving Throws grid. */
  readonly sheetLabel: string
  readonly baseTarget: number
  /** When true, ignore baseTarget and use contextual psionics tier target (Psychic Gate). */
  readonly usePsionicsTierBase: boolean
  /** Bonus from display P.E. reduces the required roll threshold (See attribute_and_stat.md §1–2). */
  readonly appliesPhysicalEnduranceBonus: boolean
  /** Bonus from display M.E. reduces the threshold (Psionics, Insanity). */
  readonly appliesMentalEnduranceBonus: boolean
  /**
   * Keys on {@link Feature.modifiers} / skill `modifiers` merged into passive saves.
   * Overlapping keys (e.g. save_poison) intentionally stack toward multiple poison rows.
   */
  readonly featureModifierKeys: readonly string[]
}

export const SAVING_THROW_REGISTRY: readonly SaveRowDefinition[] = [
  {
    id: 'poison_lethal',
    sheetLabel: 'Save vs. Lethal Poison',
    baseTarget: 14,
    usePsionicsTierBase: false,
    appliesPhysicalEnduranceBonus: true,
    appliesMentalEnduranceBonus: false,
    featureModifierKeys: ['save_poison_lethal', 'save_poison'],
  },
  {
    id: 'poison_nonlethal',
    sheetLabel: 'Save vs. Non-Lethal Poison / Toxin',
    baseTarget: 16,
    usePsionicsTierBase: false,
    appliesPhysicalEnduranceBonus: true,
    appliesMentalEnduranceBonus: false,
    featureModifierKeys: ['save_poison_nonlethal', 'save_poison'],
  },
  {
    id: 'harmful_drugs',
    sheetLabel: 'Save vs. Harmful Drugs',
    baseTarget: 15,
    usePsionicsTierBase: false,
    appliesPhysicalEnduranceBonus: true,
    appliesMentalEnduranceBonus: false,
    featureModifierKeys: ['save_drugs', 'save_harmful_drugs', 'save_poison'],
  },
  {
    id: 'magic_spell',
    sheetLabel: 'Save vs. Magic (Spell)',
    baseTarget: 12,
    usePsionicsTierBase: false,
    appliesPhysicalEnduranceBonus: true,
    appliesMentalEnduranceBonus: false,
    featureModifierKeys: ['save_magic', 'save_magic_spell', 'save_spell'],
  },
  {
    id: 'magic_ritual',
    sheetLabel: 'Save vs. Magic (Ritual)',
    baseTarget: 16,
    usePsionicsTierBase: false,
    appliesPhysicalEnduranceBonus: true,
    appliesMentalEnduranceBonus: false,
    featureModifierKeys: ['save_magic_ritual', 'save_magic', 'save_ritual'],
  },
  {
    id: 'insanity',
    sheetLabel: 'Save vs. Insanity',
    baseTarget: 12,
    usePsionicsTierBase: false,
    appliesPhysicalEnduranceBonus: false,
    appliesMentalEnduranceBonus: true,
    featureModifierKeys: ['save_insanity'],
  },
  {
    id: 'psionics',
    sheetLabel: 'Save vs. Psionics',
    baseTarget: 12,
    usePsionicsTierBase: true,
    appliesPhysicalEnduranceBonus: false,
    appliesMentalEnduranceBonus: true,
    featureModifierKeys: ['save_psionics', 'save_isp'],
  },
]
