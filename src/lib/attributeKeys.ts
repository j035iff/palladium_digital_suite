/** Eight primary attributes used in creation allocation (includes P.S.). */
export const FORGE_ATTRIBUTE_KEYS = [
  'iq',
  'me',
  'ma',
  'ps',
  'pp',
  'pe',
  'pb',
  'spd',
] as const

export type ForgeAttrKey = (typeof FORGE_ATTRIBUTE_KEYS)[number]

/** Phase I.2 O.C.C. variable dice — primary seven only (Spd uses ledger OCC dice row). */
export const OCC_VARIABLE_PHASE_ATTRIBUTE_KEYS = [
  'iq',
  'me',
  'ma',
  'ps',
  'pp',
  'pe',
  'pb',
] as const satisfies readonly ForgeAttrKey[]
