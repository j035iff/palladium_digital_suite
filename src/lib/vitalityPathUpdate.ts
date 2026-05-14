import type { Character, FormState } from '../types'

type PoolKey = 'hitPoints' | 'structuralDamageCapacity'
type SubKey = 'current' | 'maximum'

function patchFormPool(
  form: FormState,
  pool: PoolKey,
  field: SubKey,
  value: number,
): FormState {
  const poolState = form[pool]
  const nextVal = Math.max(0, Math.round(value))
  return {
    ...form,
    [pool]: {
      ...poolState,
      [field]: nextVal,
    },
  }
}

/**
 * Apply numeric sheet updates used at Spawn (vitality + shared P.P.E.).
 * Paths: `ppe.current`, `ppe.maximum`, `facade.hitPoints.maximum`, `morphus.isp.current`, …
 */
export function tryApplyNumericSheetPath(
  character: Character,
  path: string,
  value: number,
): Character | null {
  if (!Number.isFinite(value)) return null
  const parts = path.trim().split('.').filter(Boolean)
  if (parts.length < 2) return null

  if (parts[0] === 'ppe') {
    const field = parts[1]
    if (field !== 'current' && field !== 'maximum') return null
    const v = Math.max(0, Math.round(value))
    return {
      ...character,
      ppe: { ...character.ppe, [field]: v },
    }
  }

  const formKey = parts[0]
  if (formKey !== 'facade' && formKey !== 'morphus') return null

  const poolName = parts[1]
  if (poolName !== 'hitPoints' && poolName !== 'structuralDamageCapacity') {
    if (poolName === 'isp') {
      const field = parts[2]
      if (field !== 'current' && field !== 'maximum') return null
      const v = Math.max(0, Math.round(value))
      const branch = character[formKey]
      return {
        ...character,
        [formKey]: {
          ...branch,
          isp: { ...branch.isp, [field]: v },
        },
      }
    }
    return null
  }

  const field = parts[2]
  if (field !== 'current' && field !== 'maximum') return null

  const branch = character[formKey]
  const nextForm = patchFormPool(
    branch,
    poolName as PoolKey,
    field,
    value,
  )
  return { ...character, [formKey]: nextForm }
}

export function isNumericSheetPath(path: string): boolean {
  const p = path.trim()
  if (/^ppe\.(current|maximum)$/.test(p)) return true
  if (/^(facade|morphus)\.isp\.(current|maximum)$/.test(p)) return true
  if (
    /^(facade|morphus)\.(hitPoints|structuralDamageCapacity)\.(current|maximum)$/.test(
      p,
    )
  ) {
    return true
  }
  return false
}
