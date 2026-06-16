import { describe, expect, it } from 'vitest'
import {
  buildMorphusSlotTree,
  collectMorphusSelectedTraitPanelRows,
  collectSelectedMorphusCatalogEntryIds,
  deriveMorphusSlotResolutionView,
  isMorphusSubTraitTablePickBlocked,
  isMorphusTraitPickAlreadySelected,
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

  it('lists selected trait rows for the sidebar panel', () => {
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
    const rows = collectMorphusSelectedTraitPanelRows(nodes, slotState)
    expect(rows).toEqual([
      expect.objectContaining({
        name: 'Canine',
        pending: true,
      }),
    ])
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

  it('treats traits already chosen on another slot as unavailable picks', () => {
    const forgeState: MorphusForgeState = {
      path: 'characteristics',
      characteristicsPickCount: 2,
    }
    const slotState: MorphusForgeSlotState = {
      routingPicks: {
        'plan:0': 'alien_creature',
        'plan:1': 'alien_creature',
      },
      branchTableIds: {
        'plan:0/plan:0': 'alien_shape',
        'plan:1/plan:0': 'alien_shape',
      },
      picks: {
        'plan:0/plan:0/branch': 'alien_shape_baggy_flaps_of_skin',
      },
    }

    const nodes = buildMorphusSlotTree(forgeState, slotState)
    const selectedIds = collectSelectedMorphusCatalogEntryIds(nodes, slotState)
    expect(selectedIds.has('alien_shape_baggy_flaps_of_skin')).toBe(true)
    expect(selectedIds.has('alien_creature')).toBe(false)

    const secondAlienShape = findMorphusSlotNode(
      nodes,
      (node) =>
        node.path === 'plan:1/plan:0/branch' &&
        node.kind === 'table' &&
        node.status === 'ready',
    )
    expect(secondAlienShape).toBeDefined()
    expect(
      isMorphusTraitPickAlreadySelected(
        secondAlienShape!,
        'alien_shape_baggy_flaps_of_skin',
        selectedIds,
        slotState,
      ),
    ).toBe(true)
    expect(
      isMorphusTraitPickAlreadySelected(
        secondAlienShape!,
        'alien_shape_armored_scales',
        selectedIds,
        slotState,
      ),
    ).toBe(false)

    const secondCharacteristic = findMorphusSlotNode(
      buildMorphusSlotTree(forgeState, {
        routingPicks: { 'plan:0': 'alien_creature' },
        branchTableIds: { 'plan:0/plan:0': 'alien_shape' },
        picks: { 'plan:0/plan:0/branch': 'alien_shape_baggy_flaps_of_skin' },
      }),
      (node) => node.path === 'plan:1' && node.kind === 'characteristic' && node.status === 'ready',
    )
    expect(secondCharacteristic).toBeDefined()
    expect(
      isMorphusTraitPickAlreadySelected(
        secondCharacteristic!,
        'alien_creature',
        selectedIds,
        slotState,
      ),
    ).toBe(false)
  })

  it('blocks duplicate sub-trait table picks unless house rule allows them', () => {
    const slotState: MorphusForgeSlotState = {
      subTraitPicks: {
        'plan:0/plan:0/branch#0': 'animal_arachnid',
      },
    }
    expect(isMorphusSubTraitTablePickBlocked('animal_arachnid', slotState)).toBe(true)
    expect(isMorphusSubTraitTablePickBlocked('animal_canine', slotState)).toBe(false)
    expect(
      isMorphusSubTraitTablePickBlocked('animal_arachnid', slotState, {
        allowDuplicateSubTraitTablePicks: true,
      }),
    ).toBe(false)
  })

  it('exposes sub-trait table blocking on animal combo second pick', () => {
    const forgeState: MorphusForgeState = {
      path: 'appearance',
      appearanceEntryId: 'amalgam',
    }
    const slotState: MorphusForgeSlotState = {
      picks: { 'plan:0': 'animal_combo_of_two' },
      subTraitPicks: { 'plan:0#0': 'animal_arachnid' },
    }
    const nodes = buildMorphusSlotTree(forgeState, slotState)
    const secondSubPick = findMorphusSlotNode(
      nodes,
      (node) => node.path === 'plan:0/sub:1' && node.kind === 'sub_trait_choice',
    )
    expect(secondSubPick).toBeDefined()
    expect(
      isMorphusSubTraitTablePickBlocked(
        'animal_arachnid',
        slotState,
        undefined,
        'plan:0#1',
      ),
    ).toBe(true)
    expect(
      isMorphusSubTraitTablePickBlocked(
        'animal_canine',
        slotState,
        undefined,
        'plan:0#1',
      ),
    ).toBe(false)
  })

  it('expands Gadgeteer with dice count and gadget pick slots', () => {
    const forgeState: MorphusForgeState = {
      path: 'characteristics',
      characteristicsPickCount: 1,
    }
    const slotState: MorphusForgeSlotState = {
      routingPicks: { 'plan:0': 'comic_book' },
      branchTableIds: { 'plan:0/plan:0': 'super_being' },
      picks: { 'plan:0/plan:0/branch': 'super_being_gadgeteer' },
      diceValues: { 'plan:0/plan:0/branch/gadget-budget/count': 3 },
    }

    const nodes = buildMorphusSlotTree(forgeState, slotState)
    const gadgeteerNode = findMorphusSlotNode(
      nodes,
      (node) => node.resolvedEntryId === 'super_being_gadgeteer',
    )
    expect(gadgeteerNode).toBeDefined()

    const diceNode = findMorphusSlotNode(
      nodes,
      (node) => node.path === 'plan:0/plan:0/branch/gadget-budget',
    )
    expect(diceNode?.kind).toBe('dice')
    expect(diceNode?.children).toHaveLength(3)

    const firstPick = findMorphusSlotNode(
      nodes,
      (node) =>
        node.path === 'plan:0/plan:0/branch/sub:0' &&
        node.kind === 'sub_trait_choice' &&
        node.status === 'ready',
    )
    expect(firstPick?.subTraitPoolMode).toBe('gimmick')
    expect(firstPick?.pickEntries?.some((row) => row.id === 'gadget_lock_pick')).toBe(true)
  })

  it('blocks duplicate gadget picks within the same Gadgeteer trait', () => {
    const slotState: MorphusForgeSlotState = {
      subTraitPicks: {
        'plan:0/plan:0/branch#0': 'gadget_lock_pick',
      },
    }
    expect(
      isMorphusSubTraitTablePickBlocked(
        'gadget_lock_pick',
        slotState,
        undefined,
        'plan:0/plan:0/branch#1',
      ),
    ).toBe(true)
    expect(
      isMorphusSubTraitTablePickBlocked(
        'gadget_glide_pack',
        slotState,
        undefined,
        'plan:0/plan:0/branch#1',
      ),
    ).toBe(false)
    expect(
      isMorphusSubTraitTablePickBlocked(
        'gadget_lock_pick',
        slotState,
        undefined,
        'plan:0/plan:1/branch#0',
      ),
    ).toBe(false)
  })

  it('resolves selected gimmicks on the trait slot', () => {
    const forgeState: MorphusForgeState = {
      path: 'characteristics',
      characteristicsPickCount: 1,
    }
    const slotState: MorphusForgeSlotState = {
      routingPicks: { 'plan:0': 'comic_book' },
      branchTableIds: { 'plan:0/plan:0': 'super_being' },
      picks: { 'plan:0/plan:0/branch': 'super_being_gadgeteer' },
      diceValues: { 'plan:0/plan:0/branch/gadget-budget/count': 3 },
      subTraitPicks: {
        'plan:0/plan:0/branch#0': 'gadget_lock_pick',
        'plan:0/plan:0/branch#1': 'gadget_glide_pack',
        'plan:0/plan:0/branch#2': 'gadget_grapple_gun',
      },
    }

    const nodes = buildMorphusSlotTree(forgeState, slotState)
    const diceNode = findMorphusSlotNode(
      nodes,
      (node) => node.path === 'plan:0/plan:0/branch/gadget-budget',
    )
    expect(diceNode?.children).toHaveLength(3)
    expect(
      findMorphusSlotNode(nodes, (node) => node.resolvedEntryId === 'super_being_gadgeteer'),
    ).toBeDefined()
    const view = deriveMorphusSlotResolutionView(forgeState, slotState)
    expect(view.blockers).toEqual([])
    expect(view.complete).toBe(true)
    expect(view.traitSlots.map((row) => row.catalogEntryId)).toContain('super_being_gadgeteer')
    const gadgeteerSlot = view.traitSlots.find(
      (row) => row.catalogEntryId === 'super_being_gadgeteer',
    )
    expect(gadgeteerSlot?.selectedSubTraitIds).toEqual([
      'gadget_lock_pick',
      'gadget_glide_pack',
      'gadget_grapple_gun',
    ])
    expect(view.complete).toBe(true)
  })
})
