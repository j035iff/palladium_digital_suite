/** Pillar 5 — physical dice priority (vision.md): manual trust + clear random helpers. */

export function rollD20(): number {
  return 1 + Math.floor(Math.random() * 20)
}

export function rollD6(): number {
  return 1 + Math.floor(Math.random() * 6)
}
