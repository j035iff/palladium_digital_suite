import type { PalladiumOcc, Race, PalladiumSourceRef } from '../types'
import { occCharacterCategory } from './occCatalogEngine'

export type ConfiguratorFilterGroupOp = 'and' | 'or'
export type ConfiguratorFilterDomain = 'race' | 'occ' | 'book'

/** @deprecated Use {@link ConfiguratorFilterDomain}. */
export type OccTagFilterGroupOp = ConfiguratorFilterGroupOp

export type ConfiguratorFilterExpression =
  | { id: string; kind: 'predicate'; domain: ConfiguratorFilterDomain; value: string }
  | { id: string; kind: 'not'; child: ConfiguratorFilterExpression }
  | {
      id: string
      kind: 'group'
      op: ConfiguratorFilterGroupOp
      children: ConfiguratorFilterExpression[]
    }

/** @deprecated Use {@link ConfiguratorFilterExpression}. */
export type OccTagFilterExpression = ConfiguratorFilterExpression

export type ConfiguratorFilterEvalContext = {
  race?: Race
  occ?: PalladiumOcc
  /** When set, Book predicates only check the focused row/column entity. */
  focus?: 'race' | 'occ'
}

export function newConfiguratorFilterId(): string {
  return crypto.randomUUID()
}

/** @deprecated Use {@link newConfiguratorFilterId}. */
export const newOccTagFilterId = newConfiguratorFilterId

/** Whether an O.C.C. matches a configurator tag (catalog tags, occType, or psychic category). */
export function occMatchesConfiguratorTag(occ: PalladiumOcc, tag: string): boolean {
  const normalized = tag.trim().toLowerCase()
  if (!normalized) return false
  if (
    (occ.tags ?? []).some((occTag) => occTag.trim().toLowerCase() === normalized)
  ) {
    return true
  }
  if (normalized === 'psychic' && occCharacterCategory(occ) === 'psychic') {
    return true
  }
  if (occ.occType?.trim().toLowerCase() === normalized) return true
  return false
}

export function raceMatchesConfiguratorFilter(
  race: Race | undefined,
  value: string,
): boolean {
  if (!race || !value.trim()) return false
  const n = value.trim().toLowerCase()
  if (race.id.toLowerCase() === n) return true
  if (race.name.trim().toLowerCase() === n) return true
  if (race.lineage?.trim().toLowerCase() === n) return true
  return false
}

export function occMatchesConfiguratorFilter(
  occ: PalladiumOcc | undefined,
  value: string,
): boolean {
  if (!occ || !value.trim()) return false
  const n = value.trim().toLowerCase()
  if (occ.id.toLowerCase() === n) return true
  if (occ.name.trim().toLowerCase() === n) return true
  return occMatchesConfiguratorTag(occ, value)
}

/** Strip edition / volume suffixes — e.g. "Between the Shadows (WB1)" → "Between the Shadows". */
export function canonicalBookTitle(reference: string): string {
  const trimmed = reference.trim()
  const paren = trimmed.indexOf('(')
  return (paren >= 0 ? trimmed.slice(0, paren) : trimmed).trim()
}

/** Stable filter id for a book citation reference. */
export function bookReferenceToFilterId(reference: string): string {
  return canonicalBookTitle(reference)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export function entityHasBookSource(
  sources: readonly PalladiumSourceRef[] | undefined,
  bookFilterId: string,
): boolean {
  if (!sources?.length || !bookFilterId.trim()) return false
  const target = bookFilterId.trim().toLowerCase()
  return sources.some((source) => {
    const id = bookReferenceToFilterId(source.reference)
    return (
      id === target ||
      canonicalBookTitle(source.reference).toLowerCase() ===
        target.replace(/_/g, ' ')
    )
  })
}

export function entityMatchesBookFilter(
  entity: { sources?: readonly PalladiumSourceRef[] } | undefined,
  bookFilterId: string,
): boolean {
  return entityHasBookSource(entity?.sources, bookFilterId)
}

export type ConfiguratorFilterCategoryOption = {
  value: string
  label: string
}

/** Unique books cited on race / O.C.C. rows in the active configurator pools. */
export function listConfiguratorBookCategories(
  rows: readonly { sources?: readonly PalladiumSourceRef[] }[],
): ConfiguratorFilterCategoryOption[] {
  const byId = new Map<string, string>()
  for (const row of rows) {
    for (const source of row.sources ?? []) {
      const value = bookReferenceToFilterId(source.reference)
      const label = canonicalBookTitle(source.reference)
      if (value && label) byId.set(value, label)
    }
  }
  return [...byId.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function normalizeFilterNode(node: ConfiguratorFilterExpression): ConfiguratorFilterExpression {
  const legacy = node as ConfiguratorFilterExpression & { kind: string; tag?: string }
  if (legacy.kind === 'tag') {
    return {
      id: legacy.id,
      kind: 'predicate',
      domain: 'occ',
      value: legacy.tag ?? '',
    }
  }
  if (node.kind === 'not') {
    return { ...node, child: normalizeFilterNode(node.child) }
  }
  if (node.kind === 'group') {
    return {
      ...node,
      children: node.children.map((child) => normalizeFilterNode(child)),
    }
  }
  return node
}

export function normalizeConfiguratorFilterExpression(
  expr: ConfiguratorFilterExpression | null | undefined,
): ConfiguratorFilterExpression | null {
  if (!expr) return null
  return normalizeFilterNode(expr)
}

export function newFilterPredicateNode(
  domain: ConfiguratorFilterDomain = 'occ',
  value = '',
): ConfiguratorFilterExpression {
  return { id: newConfiguratorFilterId(), kind: 'predicate', domain, value }
}

/** @deprecated Use {@link newFilterPredicateNode}. */
export function newTagFilterTagNode(tag = ''): ConfiguratorFilterExpression {
  return newFilterPredicateNode('occ', tag)
}

export function newFilterNotNode(
  child: ConfiguratorFilterExpression = newFilterPredicateNode(),
): ConfiguratorFilterExpression {
  return { id: newConfiguratorFilterId(), kind: 'not', child }
}

/** @deprecated Use {@link newFilterNotNode}. */
export const newTagFilterNotNode = newFilterNotNode

export function newFilterGroupNode(
  op: ConfiguratorFilterGroupOp = 'and',
  children: ConfiguratorFilterExpression[] = [],
): ConfiguratorFilterExpression {
  return { id: newConfiguratorFilterId(), kind: 'group', op, children }
}

/** @deprecated Use {@link newFilterGroupNode}. */
export const newTagFilterGroupNode = newFilterGroupNode

export function createDefaultConfiguratorFilterRoot(): ConfiguratorFilterExpression {
  return newFilterGroupNode('and', [newFilterPredicateNode()])
}

/** Root AND group with a nested OR subgroup — for (A OR B) AND C style filters. */
export function createDefaultConfiguratorGroupFilterRoot(): ConfiguratorFilterExpression {
  return newFilterGroupNode('and', [newFilterGroupNode('or', [])])
}

/** @deprecated Use {@link createDefaultConfiguratorFilterRoot}. */
export const createDefaultTagFilterRoot = createDefaultConfiguratorFilterRoot

export function patchConfiguratorFilterTree(
  root: ConfiguratorFilterExpression,
  nodeId: string,
  updater: (node: ConfiguratorFilterExpression) => ConfiguratorFilterExpression,
): ConfiguratorFilterExpression {
  if (root.id === nodeId) return updater(root)
  if (root.kind === 'not') {
    return { ...root, child: patchConfiguratorFilterTree(root.child, nodeId, updater) }
  }
  if (root.kind === 'group') {
    return {
      ...root,
      children: root.children.map((child) =>
        patchConfiguratorFilterTree(child, nodeId, updater),
      ),
    }
  }
  return root
}

/** @deprecated Use {@link patchConfiguratorFilterTree}. */
export const patchOccTagFilterTree = patchConfiguratorFilterTree

export function removeConfiguratorFilterNode(
  root: ConfiguratorFilterExpression,
  nodeId: string,
): ConfiguratorFilterExpression | null {
  if (root.id === nodeId) return null
  if (root.kind === 'not') {
    const child = removeConfiguratorFilterNode(root.child, nodeId)
    if (!child) return null
    return { ...root, child }
  }
  if (root.kind === 'group') {
    const children = root.children
      .map((child) => removeConfiguratorFilterNode(child, nodeId))
      .filter((child): child is ConfiguratorFilterExpression => child != null)
    return { ...root, children }
  }
  return root
}

/** @deprecated Use {@link removeConfiguratorFilterNode}. */
export const removeOccTagFilterNode = removeConfiguratorFilterNode

export function appendConfiguratorFilterChild(
  root: ConfiguratorFilterExpression,
  groupId: string,
  child: ConfiguratorFilterExpression,
): ConfiguratorFilterExpression {
  return patchConfiguratorFilterTree(root, groupId, (node) => {
    if (node.kind !== 'group') return node
    return { ...node, children: [...node.children, child] }
  })
}

/** @deprecated Use {@link appendConfiguratorFilterChild}. */
export const appendOccTagFilterChild = appendConfiguratorFilterChild

function isPredicateComplete(node: ConfiguratorFilterExpression): boolean {
  if (node.kind === 'predicate') return node.value.trim().length > 0
  if (node.kind === 'not') return isConfiguratorFilterActive(node.child)
  if (node.kind === 'group') {
    return node.children.some((child) => isConfiguratorFilterActive(child))
  }
  return false
}

export function isConfiguratorFilterActive(
  expr: ConfiguratorFilterExpression | null | undefined,
): boolean {
  if (!expr) return false
  return isPredicateComplete(normalizeFilterNode(expr))
}

/** @deprecated Use {@link isConfiguratorFilterActive}. */
export const isOccTagFilterExpressionActive = isConfiguratorFilterActive

function evaluatePredicate(
  ctx: ConfiguratorFilterEvalContext,
  domain: ConfiguratorFilterDomain,
  value: string,
): boolean {
  if (!value.trim()) return true
  if (domain === 'race') {
    if (!ctx.race) return true
    return raceMatchesConfiguratorFilter(ctx.race, value)
  }
  if (domain === 'occ') {
    if (!ctx.occ) return true
    return occMatchesConfiguratorFilter(ctx.occ, value)
  }
  if (domain === 'book') {
    if (ctx.focus === 'race') {
      if (!ctx.race) return true
      return entityHasBookSource(ctx.race.sources, value)
    }
    if (ctx.focus === 'occ') {
      if (!ctx.occ) return true
      return entityHasBookSource(ctx.occ.sources, value)
    }
    const checks: boolean[] = []
    if (ctx.race) checks.push(entityHasBookSource(ctx.race.sources, value))
    if (ctx.occ) checks.push(entityHasBookSource(ctx.occ.sources, value))
    if (checks.length === 0) return true
    return checks.every(Boolean)
  }
  return true
}

function evaluateConfiguratorFilterNode(
  ctx: ConfiguratorFilterEvalContext,
  expr: ConfiguratorFilterExpression,
): boolean {
  const node = normalizeFilterNode(expr)
  switch (node.kind) {
    case 'predicate':
      return evaluatePredicate(ctx, node.domain, node.value)
    case 'not':
      return !evaluateConfiguratorFilterNode(ctx, node.child)
    case 'group': {
      const activeChildren = node.children.filter((child) =>
        isConfiguratorFilterActive(child),
      )
      if (activeChildren.length === 0) return true
      const results = activeChildren.map((child) =>
        evaluateConfiguratorFilterNode(ctx, child),
      )
      return node.op === 'and'
        ? results.every(Boolean)
        : results.some(Boolean)
    }
  }
}

export function evaluateConfiguratorFilter(
  ctx: ConfiguratorFilterEvalContext,
  expr: ConfiguratorFilterExpression | null | undefined,
): boolean {
  if (!expr || !isConfiguratorFilterActive(expr)) return true
  return evaluateConfiguratorFilterNode(ctx, normalizeFilterNode(expr))
}

/** @deprecated Use {@link evaluateConfiguratorFilter} with full matrix context. */
export function evaluateOccTagFilter(
  occ: PalladiumOcc,
  expr: ConfiguratorFilterExpression | null | undefined,
): boolean {
  return evaluateConfiguratorFilter({ occ }, expr)
}

export function formatConfiguratorFilterLabel(value: string): string {
  return value.trim().replace(/^race_/, '').replace(/_/g, ' ')
}

/** @deprecated Use {@link formatConfiguratorFilterLabel}. */
export const formatOccTagFilterLabel = formatConfiguratorFilterLabel

export type ConfiguratorFilterFormatOptions = {
  raceLabelById?: ReadonlyMap<string, string>
  occLabelById?: ReadonlyMap<string, string>
  bookLabelById?: ReadonlyMap<string, string>
}

function formatPredicateLabel(
  domain: ConfiguratorFilterDomain,
  value: string,
  opts?: ConfiguratorFilterFormatOptions,
): string {
  const raw = value.trim()
  if (!raw) return '…'
  if (domain === 'race') {
    return opts?.raceLabelById?.get(raw) ?? formatConfiguratorFilterLabel(raw)
  }
  if (domain === 'book') {
    return opts?.bookLabelById?.get(raw) ?? canonicalBookTitle(raw.replace(/_/g, ' '))
  }
  return opts?.occLabelById?.get(raw) ?? formatConfiguratorFilterLabel(raw)
}

function predicateTypePrefix(domain: ConfiguratorFilterDomain): string {
  if (domain === 'race') return 'Race'
  if (domain === 'book') return 'Book'
  return 'OCC'
}

export function formatConfiguratorFilterExpression(
  expr: ConfiguratorFilterExpression,
  opts?: ConfiguratorFilterFormatOptions,
): string {
  const node = normalizeFilterNode(expr)
  switch (node.kind) {
    case 'predicate': {
      const prefix = predicateTypePrefix(node.domain)
      return `${prefix}: ${formatPredicateLabel(node.domain, node.value, opts)}`
    }
    case 'not': {
      const inner = formatConfiguratorFilterExpression(node.child, opts)
      const wrapped =
        node.child.kind === 'group' && node.child.children.length > 1
          ? `(${inner})`
          : inner
      return `NOT ${wrapped}`
    }
    case 'group': {
      const active = node.children.filter((child) => isConfiguratorFilterActive(child))
      if (active.length === 0) return '…'
      const join = node.op === 'and' ? ' AND ' : ' OR '
      const parts = active.map((child) => {
        const text = formatConfiguratorFilterExpression(child, opts)
        if (child.kind === 'group' && child.op !== node.op && child.children.length > 1) {
          return `(${text})`
        }
        return text
      })
      return parts.join(join)
    }
  }
}

/** @deprecated Use {@link formatConfiguratorFilterExpression}. */
export const formatOccTagFilterExpression = formatConfiguratorFilterExpression

export function describeConfiguratorFilterMismatch(
  ctx: ConfiguratorFilterEvalContext,
  expr: ConfiguratorFilterExpression | null | undefined,
  opts?: ConfiguratorFilterFormatOptions,
): string | null {
  if (!isConfiguratorFilterActive(expr)) return null
  if (evaluateConfiguratorFilter(ctx, expr)) return null
  return `Does not match filter: ${formatConfiguratorFilterExpression(expr!, opts)}`
}

/** @deprecated Use {@link describeConfiguratorFilterMismatch}. */
export function describeOccTagFilterMismatch(
  occ: PalladiumOcc,
  expr: ConfiguratorFilterExpression | null | undefined,
): string | null {
  return describeConfiguratorFilterMismatch({ occ }, expr)
}
