import { describe, expect, it } from 'vitest'
import {
  applyQualityPresetToDraft,
  hasForgeProperties,
  isArtifactWeapon,
  summarizeForgeProperties,
} from './weaponForgeProperties'
import type { Weapon } from '../types'

describe('weaponForgeProperties', () => {
  it('detects forge property stacks', () => {
    expect(hasForgeProperties({ forgeProperties: undefined })).toBe(false)
    expect(
      hasForgeProperties({ forgeProperties: { indestructible: true } }),
    ).toBe(true)
    expect(
      isArtifactWeapon({
        isArtifact: false,
        forgeProperties: { qualityLabel: 'Excellent' },
      }),
    ).toBe(true)
  })

  it('summarizes forge chips', () => {
    const text = summarizeForgeProperties({
      indestructible: true,
      qualityLabel: 'Excellent',
      damageMultipliers: [{ id: '1', label: 'vs Supernatural', multiplier: 2 }],
      abilityTriggers: [
        { id: '2', name: 'Rune Flare', resourceType: 'ppe', cost: 20 },
      ],
    })
    expect(text).toContain('Indestructible')
    expect(text).toContain('Excellent')
    expect(text).toContain('2× vs Supernatural')
    expect(text).toContain('Rune Flare (20 PPE)')
  })

  it('applies quality presets to draft combat fields', () => {
    const excellent = applyQualityPresetToDraft({
      strikeBonus: 0,
      damage: '2D6',
      presetId: 'excellent',
    })
    expect(excellent.strikeBonus).toBe(1)
    expect(excellent.qualityLabel).toBe('Excellent')

    const dwarven = applyQualityPresetToDraft({
      strikeBonus: 0,
      damage: '2D6',
      presetId: 'dwarven',
    })
    expect(dwarven.damage).toContain('Dwarven')
  })

  it('treats isArtifact flag as artifact even without stack', () => {
    const w: Pick<Weapon, 'isArtifact' | 'forgeProperties'> = {
      isArtifact: true,
    }
    expect(isArtifactWeapon(w)).toBe(true)
  })
})
