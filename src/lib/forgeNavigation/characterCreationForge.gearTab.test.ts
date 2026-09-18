import { describe, expect, it } from 'vitest'
import { createBlankCharacterForGenre } from '../characterRoot'
import { getLibraryOccById, getRaceById } from '../../data/library/registry'
import {
  CHARACTER_CREATION_TAB_LABELS,
  CHARACTER_CREATION_TAB_ORDER,
  buildCharacterCreationForgeContext,
  deriveCharacterCreationForgeNavigation,
  resolveActiveForgeTab,
} from './characterCreationForge'

describe('Creation forge Gear tab (tab8_gear)', () => {
  it('keeps Gear before Review in master tab order and labels', () => {
    expect(CHARACTER_CREATION_TAB_ORDER).toEqual([
      'tab1_configurator',
      'tab2_attributes',
      'tab3_psionic',
      'tab4_skills',
      'tab5_finalize',
      'tab6_traits',
      'tab7_abilities',
      'tab8_gear',
      'tab9_review',
    ])
    expect(CHARACTER_CREATION_TAB_LABELS.tab8_gear).toBe('Gear')
    expect(CHARACTER_CREATION_TAB_LABELS.tab9_review).toBe('Review & Spawn')
  })

  it('always includes Gear in derived nav (never N/A, never filtered out)', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    const ctx = buildCharacterCreationForgeContext(character, race, occ, 'none')
    const nav = deriveCharacterCreationForgeNavigation(ctx, 'tab1_configurator')
    const gear = nav.tabs.find((t) => t.id === 'tab8_gear')
    const review = nav.tabs.find((t) => t.id === 'tab9_review')

    expect(nav.tabs.map((t) => t.id)).toEqual([...CHARACTER_CREATION_TAB_ORDER])
    expect(gear).toBeDefined()
    expect(gear?.label).toBe('Gear')
    expect(gear?.visual).not.toBe('na')
    expect(gear?.naReason).toBeUndefined()
    expect(review?.id).toBe('tab9_review')
  })

  it('migrates legacy tab8_review to tab9_review without removing Gear from order', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      // Legacy persisted value, handled by resolveActiveForgeTab.
      creationForgeTab: 'tab8_review',
    } as unknown as Parameters<typeof resolveActiveForgeTab>[0]

    expect(resolveActiveForgeTab(character)).toBe('tab9_review')
    expect(CHARACTER_CREATION_TAB_ORDER.indexOf('tab8_gear')).toBeLessThan(
      CHARACTER_CREATION_TAB_ORDER.indexOf('tab9_review'),
    )
  })
})
