/**
 * Resolve JSON paths against palladium-morphus.schema.json (characteristic root).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { schemasDir } from './morphus-ingest-shared.mjs'

let cachedSchema = null

export function loadMorphusCharacteristicSchema() {
  if (!cachedSchema) {
    cachedSchema = JSON.parse(
      readFileSync(join(schemasDir, 'palladium-morphus.schema.json'), 'utf8'),
    )
  }
  return cachedSchema
}

export function clearMorphusSchemaCache() {
  cachedSchema = null
}

function resolveRef(root, node) {
  if (!node || typeof node !== 'object') return node
  if (node.$ref) {
    const key = node.$ref.replace('#/$defs/', '')
    return root.$defs?.[key] ?? node
  }
  return node
}

/**
 * Walk schema from characteristic root; return whether dotted path exists.
 * @param {string} path - e.g. "mobility.burrowingEngine" or "statModifiers.spd.dice"
 */
/** Map ingest shorthand paths to canonical schema locations. */
export function normalizeMorphusSchemaPath(path) {
  if (path === 'conditionalStanceModifiers') return 'mobility.conditionalStanceModifiers'
  return path
}

export function morphusSchemaPathExists(path) {
  const root = loadMorphusCharacteristicSchema()
  const parts = normalizeMorphusSchemaPath(path).split('.').filter(Boolean)
  let node = { type: 'object', properties: root.properties }
  for (const part of parts) {
    node = resolveRef(root, node)
    if (!node || typeof node !== 'object') return false
    if (node.type === 'array') {
      node = resolveRef(root, node.items)
    }
    const props = node.properties
    if (!props || !(part in props)) return false
    node = props[part]
  }
  return true
}

/** All dotted paths under characteristic properties (one level of $ref expansion). */
export function collectMorphusSchemaPaths(maxDepth = 4) {
  const root = loadMorphusCharacteristicSchema()
  const paths = new Set()

  function walk(node, prefix, depth) {
    node = resolveRef(root, node)
    if (!node || depth > maxDepth) return
    if (node.type === 'array') {
      walk(node.items, prefix, depth + 1)
      return
    }
    const props = node.properties
    if (!props) return
    for (const [key, sub] of Object.entries(props)) {
      const path = prefix ? `${prefix}.${key}` : key
      paths.add(path)
      walk(sub, path, depth + 1)
    }
  }

  for (const [key, sub] of Object.entries(root.properties ?? {})) {
    if (key === '$schema') continue
    paths.add(key)
    walk(sub, key, 1)
  }
  return paths
}
