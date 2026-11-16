/** Fisher–Yates shuffle (mutates and returns the same array). */
export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = items[i]!
    items[i] = items[j]!
    items[j] = tmp
  }
  return items
}

/** Shuffled shallow copy — debug fills pick randomly among legal candidates. */
export function shuffledCopy<T>(items: readonly T[]): T[] {
  return shuffleInPlace([...items])
}

/** Uniform pick from a non-empty list; undefined when empty. */
export function pickRandom<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(Math.random() * items.length)]
}
