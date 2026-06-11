import { describe, expect, it } from 'vitest'
import {
  deriveForgeNavigation,
  invalidateForgeCompletionFrom,
  markForgeTabComplete,
  type ForgeTabDefinition,
} from './engine'

type TabId = 'a' | 'b' | 'c'

function tabs(
  validators: Record<TabId, () => { ok: boolean; blockers: string[] }>,
): ForgeTabDefinition<TabId>[] {
  return (['a', 'b', 'c'] as const).map((id) => ({
    id,
    label: id,
    isNa: () => false,
    validate: () => validators[id](),
    snapshot: () => `snap-${id}`,
  }))
}

describe('deriveForgeNavigation', () => {
  it('blocks Continue until validation passes', () => {
    const defs = tabs({
      a: () => ({ ok: true, blockers: [] }),
      b: () => ({ ok: false, blockers: ['fix b'] }),
      c: () => ({ ok: true, blockers: [] }),
    })
    const nav = deriveForgeNavigation(defs, 'b', { completed: { a: true }, snapshots: {} })
    expect(nav.continueEnabled).toBe(false)
    expect(nav.continueTooltip).toContain('fix b')
  })

  it('flags conflict (yellow) when snapshot diverges and forces top-down repair', () => {
    const defs = tabs({
      a: () => ({ ok: true, blockers: [] }),
      b: () => ({ ok: true, blockers: [] }),
      c: () => ({ ok: true, blockers: [] }),
    })
    let completion = markForgeTabComplete<TabId>('a', 'snap-a', { completed: {}, snapshots: {} })
    completion = markForgeTabComplete<TabId>('b', 'stale-b', completion)
    const nav = deriveForgeNavigation(defs, 'c', completion)
    expect(nav.firstRepairTabId).toBe('b')
    const bView = nav.tabs.find((t) => t.id === 'b')
    expect(bView?.visual).toBe('conflict')
    expect(nav.continueEnabled).toBe(false)
  })

  it('uses blue only on progress frontier while viewed tab gets isViewing', () => {
    const defs = tabs({
      a: () => ({ ok: true, blockers: [] }),
      b: () => ({ ok: true, blockers: [] }),
      c: () => ({ ok: true, blockers: [] }),
    })
    const completion = markForgeTabComplete<TabId>('a', 'snap-a', {
      completed: {},
      snapshots: {},
    })
    const nav = deriveForgeNavigation(defs, 'a', completion)
    const aView = nav.tabs.find((t) => t.id === 'a')
    const bView = nav.tabs.find((t) => t.id === 'b')
    expect(aView?.visual).toBe('complete')
    expect(aView?.isViewing).toBe(true)
    expect(bView?.visual).toBe('active')
    expect(bView?.isViewing).toBe(false)
    expect(nav.progressFrontierTabId).toBe('b')
  })

  it('shows green on the active tab after Continue marks it complete', () => {
    const defs = tabs({
      a: () => ({ ok: true, blockers: [] }),
      b: () => ({ ok: true, blockers: [] }),
      c: () => ({ ok: true, blockers: [] }),
    })
    const completion = markForgeTabComplete<TabId>('a', 'snap-a', {
      completed: {},
      snapshots: {},
    })
    const nav = deriveForgeNavigation(defs, 'a', completion)
    const aView = nav.tabs.find((t) => t.id === 'a')
    expect(aView?.visual).toBe('complete')
  })

  it('optional continue hint when validation ok', () => {
    const defs = tabs({
      a: () => ({ ok: true, blockers: [] }),
      b: () => ({ ok: true, blockers: [] }),
      c: () => ({ ok: true, blockers: [] }),
    })
    const nav = deriveForgeNavigation(defs, 'b', { completed: { a: true }, snapshots: {} }, {
      continueHint: (id) => id === 'b',
    })
    expect(nav.continueEnabled).toBe(true)
    expect(nav.continueTooltip).toContain('Optional picks remain')
  })

  it('allows viewing N/A tabs with a reason while hiding Continue', () => {
    type TabId = 'a' | 'b' | 'c'
    const defs: ForgeTabDefinition<TabId>[] = [
      {
        id: 'a',
        label: 'a',
        isNa: () => false,
        validate: () => ({ ok: true, blockers: [] }),
        snapshot: () => 'snap-a',
      },
      {
        id: 'b',
        label: 'b',
        isNa: () => true,
        naReason: () => 'Step b does not apply.',
        validate: () => ({ ok: true, blockers: [] }),
        snapshot: () => 'snap-b',
      },
      {
        id: 'c',
        label: 'c',
        isNa: () => false,
        validate: () => ({ ok: true, blockers: [] }),
        snapshot: () => 'snap-c',
      },
    ]
    const nav = deriveForgeNavigation(defs, 'b', { completed: {}, snapshots: {} })
    const bView = nav.tabs.find((t) => t.id === 'b')
    expect(bView?.visual).toBe('na')
    expect(bView?.clickable).toBe(true)
    expect(bView?.naReason).toBe('Step b does not apply.')
    expect(nav.showContinue).toBe(false)
  })

  it('unlocks terminal tab when preceding tabs are complete (terminal not marked yet)', () => {
    type TabId = 'a' | 'b' | 'c' | 'terminal'
    const defs: ForgeTabDefinition<TabId>[] = [
      {
        id: 'a',
        label: 'a',
        isNa: () => false,
        validate: () => ({ ok: true, blockers: [] }),
        snapshot: () => 'snap-a',
      },
      {
        id: 'b',
        label: 'b',
        isNa: () => true,
        validate: () => ({ ok: true, blockers: [] }),
        snapshot: () => 'snap-b',
      },
      {
        id: 'c',
        label: 'c',
        isNa: () => true,
        validate: () => ({ ok: true, blockers: [] }),
        snapshot: () => 'snap-c',
      },
      {
        id: 'terminal',
        label: 'terminal',
        isNa: () => false,
        validate: () => ({ ok: true, blockers: [] }),
        snapshot: () => 'snap-terminal',
      },
    ]
    const completion = markForgeTabComplete<TabId>('a', 'snap-a', {
      completed: {},
      snapshots: {},
    })
    const nav = deriveForgeNavigation(defs, 'a', completion, {
      terminalTabId: 'terminal',
    })
    const terminal = nav.tabs.find((t) => t.id === 'terminal')
    expect(nav.terminalAccessible).toBe(true)
    expect(terminal?.clickable).toBe(true)
    expect(terminal?.visual).toBe('active')
  })
})

describe('invalidateForgeCompletionFrom', () => {
  it('clears downstream completion but keeps upstream', () => {
    const order = ['a', 'b', 'c'] as const
    let state = markForgeTabComplete<TabId>('a', '1', { completed: {}, snapshots: {} })
    state = markForgeTabComplete<TabId>('b', '2', state)
    state = markForgeTabComplete<TabId>('c', '3', state)
    const next = invalidateForgeCompletionFrom<TabId>('a', order, state)
    expect(next.completed.a).toBe(true)
    expect(next.completed.b).toBeUndefined()
    expect(next.completed.c).toBeUndefined()
  })
})
