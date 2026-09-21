import type {
  Weapon,
  WeaponForgeAbilityTrigger,
  WeaponForgeDamageMultiplier,
  WeaponForgeProperties,
} from '../types'

/** Built-in quality presets — write concrete combat fields (Unified Path). */
export type WeaponQualityPresetId = 'none' | 'excellent' | 'dwarven'

export type WeaponQualityPreset = {
  id: WeaponQualityPresetId
  label: string
  /** Added to strikeBonus when applied. */
  strikeBonusDelta: number
  /** Optional note appended to damage display (GM Agency — not auto-parsed). */
  damageNote?: string
}

export const WEAPON_QUALITY_PRESETS: readonly WeaponQualityPreset[] = [
  { id: 'none', label: 'None', strikeBonusDelta: 0 },
  { id: 'excellent', label: 'Excellent', strikeBonusDelta: 1 },
  {
    id: 'dwarven',
    label: 'Dwarven',
    strikeBonusDelta: 1,
    damageNote: '+1 (Dwarven)',
  },
] as const

export function getWeaponQualityPreset(
  id: string | undefined,
): WeaponQualityPreset | undefined {
  if (!id || id === 'none') return WEAPON_QUALITY_PRESETS[0]
  return WEAPON_QUALITY_PRESETS.find((p) => p.id === id)
}

export function hasForgeProperties(
  weapon: Pick<Weapon, 'forgeProperties'> | null | undefined,
): boolean {
  const fp = weapon?.forgeProperties
  if (!fp) return false
  if (fp.indestructible) return true
  if (fp.qualityLabel?.trim()) return true
  if (fp.notes?.trim()) return true
  if (fp.editorDraft && Object.keys(fp.editorDraft).length > 0) return true
  if (fp.damageMultipliers?.length) return true
  if (fp.abilityTriggers?.length) return true
  return false
}

export function isArtifactWeapon(
  weapon: Pick<Weapon, 'isArtifact' | 'forgeProperties'> | null | undefined,
): boolean {
  if (!weapon) return false
  if (weapon.isArtifact) return true
  return hasForgeProperties(weapon)
}

export function summarizeForgeProperties(
  fp: WeaponForgeProperties | undefined,
): string {
  if (!fp) return ''
  const bits: string[] = []
  if (fp.indestructible) bits.push('Indestructible')
  if (fp.qualityLabel?.trim()) bits.push(fp.qualityLabel.trim())
  if (fp.notes?.trim()) bits.push('Notes')
  for (const m of fp.damageMultipliers ?? []) {
    bits.push(`${m.multiplier}× ${m.label}`)
  }
  for (const t of fp.abilityTriggers ?? []) {
    bits.push(`${t.name} (${t.cost} ${t.resourceType.toUpperCase()})`)
  }
  return bits.join(' · ')
}

export function applyQualityPresetToDraft(args: {
  strikeBonus: number
  damage: string
  presetId: WeaponQualityPresetId
}): {
  strikeBonus: number
  damage: string
  qualityLabel: string | undefined
  forgePatch: Pick<WeaponForgeProperties, 'qualityLabel'>
} {
  const preset = getWeaponQualityPreset(args.presetId) ?? WEAPON_QUALITY_PRESETS[0]!
  if (preset.id === 'none') {
    return {
      strikeBonus: args.strikeBonus,
      damage: args.damage,
      qualityLabel: undefined,
      forgePatch: { qualityLabel: undefined },
    }
  }
  const strikeBonus = args.strikeBonus + preset.strikeBonusDelta
  let damage = args.damage.trim() || '1D6'
  if (preset.damageNote && !damage.includes(preset.damageNote)) {
    damage = `${damage} ${preset.damageNote}`
  }
  return {
    strikeBonus,
    damage,
    qualityLabel: preset.label,
    forgePatch: { qualityLabel: preset.label },
  }
}

export function newDamageMultiplier(
  partial?: Partial<WeaponForgeDamageMultiplier>,
): WeaponForgeDamageMultiplier {
  return {
    id:
      partial?.id ??
      `dm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    label: partial?.label?.trim() || 'vs Supernatural',
    multiplier:
      typeof partial?.multiplier === 'number' && Number.isFinite(partial.multiplier)
        ? partial.multiplier
        : 2,
  }
}

export function newAbilityTrigger(
  partial?: Partial<WeaponForgeAbilityTrigger>,
): WeaponForgeAbilityTrigger {
  return {
    id:
      partial?.id ??
      `at_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: partial?.name?.trim() || 'Ability',
    description: partial?.description?.trim() || undefined,
    resourceType: partial?.resourceType === 'isp' ? 'isp' : 'ppe',
    cost:
      typeof partial?.cost === 'number' && Number.isFinite(partial.cost)
        ? Math.max(0, Math.round(partial.cost))
        : 10,
  }
}
