import magicSchoolsRef from '../data/content/magic/utils/magic_schools.json'
import { normalizeMagicSchool } from './magicSchool'

type MagicSchoolsRef = {
  gameSystems?: Record<
    string,
    {
      schools?: readonly { id: string; label: string }[]
    }
  >
}

/** Human label for a school slug; falls back to title-cased slug. */
export function magicSchoolFilterLabel(
  gameSystem: string | undefined,
  schoolId: string,
): string {
  const normalized = normalizeMagicSchool(schoolId)
  if (gameSystem) {
    const sys = (magicSchoolsRef as MagicSchoolsRef).gameSystems?.[
      gameSystem.toLowerCase()
    ]
    const match = sys?.schools?.find((s) => s.id === normalized)
    if (match?.label) return match.label
  }
  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
