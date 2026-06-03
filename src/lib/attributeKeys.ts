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
