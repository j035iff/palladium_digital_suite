import { describe, expect, it } from 'vitest'
import {
  buildMorphusSlotTree,
  deriveMorphusSlotResolutionView,
  isMorphusSlotTreeComplete,
  rootMorphusSlotPlan,
} from './morphusSlotResolution'
import type { MorphusForgeSlotState, MorphusForgeState, MorphusSlotNode } from '../types'

function findMorphusSlotNode(
  nodes: readonly MorphusSlotNode[],
  predicate: (node: MorphusSlotNode) => boolean,
): MorphusSlotNode | undefined {
  for (const node of nodes) {
    if (predicate(node)) return node
    const nested = findMorphusSlotNode(node.children, predicate)
    if (nested) return nested
  }
  return undefined
}

describe('morphusSlotResolution', () => {
  it('expands Amalgam into three required table slots', () => {
    const forgeState: MorphusForgeState = {
      path: 'appearance',
      appearanceEntryId: 'amalgam',
    }
    const plan = rootMorphusSlotPlan(forgeState)
    expect(plan).toHaveLength(3)
    const nodes = buildMorphusSlotTree(forgeState, {})
    expect(nodes).toHaveLength(3)
    expect(nodes.map((node) => node.label)).toEqual(['Animal Form', 'Plant Life', 'Mineral'])
  })

  it('resolves animal hub pick into nested sub-table slot', () => {
    const forgeState: MorphusForgeState = {
      path: 'appearance',
      appearanceEntryId: 'amalgam',
    }
    const slotState: MorphusForgeSlotState = {
      picks: {
        'plan:0': 'animal_canine_router',
      },
    }
    const nodes = buildMorphusSlotTree(forgeState, slotState)
    const animal = nodes[0]!
    expect(animal.resolvedEntryName).toBe('Canine')
    expect(animal.children[0]?.tableId).toBe('animal_canine')
    expect(animal.children[0]?.status).toBe('ready')
  })

  it('generates Path 2 characteristic slots from count', () => {
    const forgeState: MorphusForgeState = {
      path: 'characteristics',
      characteristicsPickCount: 4,
    }
    expect(rootMorphusSlotPlan(forgeState)).toHaveLength(4)
  })

  it('requires combination_pool dice before spawning combo slots', () => {
    const forgeState: MorphusForgeState = {
      path: 'appearance',
      appearanceEntryId: 'condemned',
    }
    const withoutDice = buildMorphusSlotTree(forgeState, {
      picks: {
        'plan:0/r:0': 'infernal_demon_claw',
        'plan:0/r:1': 'infernal_demon_claw',
      },
    })
    const combo = withoutDice[1]!
    expect(combo.kind).toBe('dice')
    expect(combo.children).toHaveLength(0)

    const withDice = buildMorphusSlotTree(forgeState, {
      picks: {
        'plan:0/r:0': 'infernal_demon_claw',
        'plan:0/r:1': 'infernal_demon_claw',
      },
      diceValues: {
        'plan:1/count': 2,
      },
      branchTableIds: {
        'plan:1/c:0': 'animal',
        'plan:1/c:1': 'nightmare',
      },
    })
    expect(withDice[1]?.children).toHaveLength(2)
  })

  it('reports incomplete until all slots resolve', () => {
    const forgeState: MorphusForgeState = {
      path: 'appearance',
      appearanceEntryId: 'amalgam',
    }
    expect(isMorphusSlotTreeComplete(buildMorphusSlotTree(forgeState, {}))).toBe(false)
  })

  it('collects trait slots from resolved picks', () => {
    const forgeState: MorphusForgeState = {
      path: 'appearance',
      appearanceEntryId: 'dino_freak',
    }
    const view = deriveMorphusSlotResolutionView(forgeState, {
      picks: {
        'plan:0': 'dinosaur_sauropod_humanoid',
      },
    })
    expect(view.traitSlots.some((slot) => slot.catalogEntryId === 'dinosaur_sauropod_humanoid')).toBe(
      true,
    )
  })

  it('resolves animal trait variant picks at the variant node path', () => {
    const forgeState: MorphusForgeState = {
      path: 'characteristics',
      characteristicsPickCount: 1,
    }
    const baseState: MorphusForgeSlotState = {
      routingPicks: { 'plan:0': 'anthropod' },
      branchTableIds: { 'plan:0/plan:0': 'animal_arachnid' },
      picks: { 'plan:0/plan:0/branch': 'animal_arachnid_full' },
    }

    const pending = buildMorphusSlotTree(forgeState, baseState)
    const variantPending = findMorphusSlotNode(
      pending,
      (node) => node.kind === 'variant_choice' && node.status === 'ready',
    )
    expect(variantPending?.path).toBe('plan:0/plan:0/branch/variant')
    expect(variantPending?.pickEntries?.map((row) => row.name)).toEqual(['Spider', 'Scorpion'])

    const resolved = buildMorphusSlotTree(forgeState, {
      ...baseState,
      variantPicks: { 'plan:0/plan:0/branch/variant': 'Spider' },
    })
    const variantDone = findMorphusSlotNode(
      resolved,
      (node) => node.kind === 'variant_choice' && node.status === 'complete',
    )
    expect(variantDone?.resolvedEntryName).toBe('Spider')
    expect(variantDone?.resolvedEntryId).toBe('animal_arachnid_full::variant:Spider')

    const view = deriveMorphusSlotResolutionView(forgeState, {
      ...baseState,
      variantPicks: { 'plan:0/plan:0/branch/variant': 'Spider' },
    })
    expect(
      view.traitSlots.some(
        (slot) => slot.catalogEntryId === 'animal_arachnid_full::variant:Spider',
      ),
    ).toBe(true)
    expect(
      view.traitSlots.some((slot) => slot.catalogEntryId === 'animal_arachnid_full'),
    ).toBe(false)
  })
})
