import type {
  ActiveForm,
  CharacterAttributes,
  PhysicalStrengthTier,
  ScalarAttributeKey,
} from '../types'

export function isScalarAttributeKey(k: string): k is ScalarAttributeKey {
  return (
    k === 'iq' ||
    k === 'me' ||
    k === 'ma' ||
    k === 'pp' ||
    k === 'pe' ||
    k === 'pb' ||
    k === 'spd'
  )
}

function isPhysicalStrengthTier(v: unknown): v is PhysicalStrengthTier {
  return (
    v === 'standard' ||
    v === 'augmented' ||
    v === 'robotic' ||
    v === 'supernatural'
  )
}

/**
 * Paths: `facade.attributes.iq`, `morphus.attributes.ps.score`, or shorthand
 * `attributes.pp` (uses {@link ActiveForm} at call time).
 */
export function parseAttributePath(
  path: string,
  activeForm: ActiveForm,
): { formKey: ActiveForm; tail: string[] } | null {
  const parts = path.trim().split('.').filter(Boolean)
  if (parts.length < 2) return null

  if (parts[0] === 'primary' || parts[0] === 'morphus') {
    if (parts[1] !== 'attributes') return null
    return { formKey: parts[0], tail: parts.slice(2) }
  }

  if (parts[0] === 'attributes') {
    return { formKey: activeForm, tail: parts.slice(1) }
  }

  return null
}

/** Apply tail segments after `…attributes.` (e.g. `iq`, `ps`, `score`). */
export function applyAttributeTail(
  attrs: CharacterAttributes,
  tail: string[],
  value: number | string,
): CharacterAttributes | null {
  if (tail.length === 1) {
    const key = tail[0]
    if (!key || key === 'ps') return null
    if (!isScalarAttributeKey(key)) return null
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    return { ...attrs, [key]: value }
  }

  if (tail.length === 2 && tail[0] === 'ps') {
    const sub = tail[1]
    if (sub === 'score') {
      if (typeof value !== 'number' || !Number.isFinite(value)) return null
      return { ...attrs, ps: { ...attrs.ps, score: value } }
    }
    if (sub === 'tier') {
      if (!isPhysicalStrengthTier(value)) return null
      return { ...attrs, ps: { ...attrs.ps, tier: value } }
    }
  }

  return null
}
