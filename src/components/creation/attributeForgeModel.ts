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

export type ForgeRoll = {
  id: string
  dice: [number, number, number]
  bonus: number | null
}
