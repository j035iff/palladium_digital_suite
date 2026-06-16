/**
 * Canonical `saveKind` slugs for catalog rows (magic, psionic, talent).
 * Attribute-only kinds use displayed P.E. / M.E. exceptional bonuses — no racial, O.C.C., or skill save modifiers.
 */

export const CATALOG_SAVE_KINDS = [
  'standard',
  'magic',
  'horror_factor',
  'dodge',
  'psionic',
  'psionics',
  'pe_check',
  'attribute_check',
  'none',
  'conditional',
  'special',
  'other',
  'non_lethal_poison',
  /** P.E. exceptional bonus only (e.g. Darksong — roll under target + P.E.). */
  'base_pe',
  /** M.E. exceptional bonus only. */
  'base_me',
  /** Nightbane Becoming — M.E. bonus + level progression vs target 12+. */
  'vs_becoming',
] as const

export type CatalogSaveKind = (typeof CATALOG_SAVE_KINDS)[number]

export const ATTRIBUTE_ONLY_SAVE_KINDS = ['base_pe', 'base_me', 'vs_becoming'] as const

export type AttributeOnlySaveKind = (typeof ATTRIBUTE_ONLY_SAVE_KINDS)[number]

export function isAttributeOnlySaveKind(
  kind: string | undefined,
): kind is AttributeOnlySaveKind {
  return (
    kind === 'base_pe' ||
    kind === 'base_me' ||
    kind === 'vs_becoming'
  )
}

export const CATALOG_SAVE_ROLL_STYLES = ['high', 'under'] as const

export type CatalogSaveRollStyle = (typeof CATALOG_SAVE_ROLL_STYLES)[number]
