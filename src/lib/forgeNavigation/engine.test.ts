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
