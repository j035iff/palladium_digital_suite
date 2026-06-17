import { describe, expect, it } from 'vitest'
import {
  forgedOutputDisplayLabel,
  formatQuantitySpec,
  listMaterialComponentChecklist,
  resolveForgedOutputs,
  resolveMaterialRequirements,
  spellIsDowntimeRitual,
  spellProducesForgedItems,
  spellRequiresMaterialComponents,
} from './magicFeatureCrafting'
import {
  getMagicFeatureById,
  getPalladiumMagicSpellById,
  palladiumMagicToFeature,
} from '../data/library/magicCatalogLoader'
import magicSchemaExample from '../data/schemas/examples/palladium-magic.example.json'

describe('magicFeatureCrafting', () => {
  it('resolves ritualProfile materialComponents over root', () => {
    const spell = magicSchemaExample as import('../types').PalladiumMagicSpell
    const requirements = resolveMaterialRequirements(spell)
    expect(requirements?.label).toBe('Golem construction materials')
    expect(requirements?.entries).toHaveLength(3)
    expect(spellRequiresMaterialComponents(spell)).toBe(true)
  })

  it('builds a visible material checklist', () => {
    const spell = magicSchemaExample as import('../types').PalladiumMagicSpell
    const checklist = listMaterialComponentChecklist(spell)
    expect(checklist[0]?.displayLabel).toBe('Clay')
    expect(checklist[0]?.quantityLabel).toBe('600')
    expect(checklist[1]?.catalogItemId).toBe('item_silver')
  })

  it('resolves forged outputs and display labels', () => {
    const spell = magicSchemaExample as import('../types').PalladiumMagicSpell
    const outputs = resolveForgedOutputs(spell)
    expect(outputs).toHaveLength(1)
    expect(outputs[0]?.destination).toBe('caster_inventory')
    expect(spellProducesForgedItems(spell)).toBe(true)
    expect(forgedOutputDisplayLabel(outputs[0]!)).toBe('item_amulet_of_protection')
  })

  it('flags downtime rituals from profile, kind, or crafting fields', () => {
    expect(
      spellIsDowntimeRitual(magicSchemaExample as import('../types').PalladiumMagicSpell),
    ).toBe(true)
    expect(
      spellIsDowntimeRitual({
        spellLevel: 1,
        magicKind: 'invocation',
      } as import('../types').PalladiumMagicSpell),
    ).toBe(false)
  })

  it('formats quantity specs for UI labels', () => {
    expect(formatQuantitySpec({ kind: 'fixed', value: 2 })).toBe('2')
    expect(formatQuantitySpec({ kind: 'formula', formula: '1D4 doses' })).toBe('1D4 doses')
  })
})

describe('magicCatalogLoader', () => {
  it('maps catalog rows into Feature metadata with crafting fields', () => {
    const row = getPalladiumMagicSpellById('magic_wizard_ritual_call_creature_of_light')
    expect(row).toBeDefined()
    const feature = palladiumMagicToFeature(row!)
    expect(feature.identity.system).toBe('magic')
    expect(feature.metadata?.pickBucket).toBe('magic')
    expect(feature.metadata?.spawnedPresence).toBeDefined()
    expect(getMagicFeatureById('magic_wizard_ritual_call_creature_of_light')).toEqual(feature)
  })
})
