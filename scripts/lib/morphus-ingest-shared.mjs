/**

 * Shared helpers for morphus table ingest (scripts/morphus-ingest.mjs).

 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

import { dirname, join, basename } from 'node:path'

import { fileURLToPath } from 'node:url'

import Ajv2020 from 'ajv/dist/2020.js'

import addFormats from 'ajv-formats'



export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

export const schemasDir = join(repoRoot, 'src/data/schemas')

export const ingestRoot = join(repoRoot, 'src/data/source/morphus-ingest')

export const referenceRoot = join(repoRoot, 'src/data/reference')



export function loadJson(absPath) {

  return JSON.parse(readFileSync(absPath, 'utf8'))

}



export function writeJson(absPath, data) {

  mkdirSync(dirname(absPath), { recursive: true })

  writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

}



export function resolveRepoPath(relOrAbs) {

  if (relOrAbs.startsWith('/') || /^[A-Za-z]:/.test(relOrAbs)) return relOrAbs

  return join(repoRoot, relOrAbs)

}



export function manifestPath(tableId) {

  return join(ingestRoot, `${tableId}.manifest.json`)

}



export function workDir(tableId) {

  return join(ingestRoot, tableId)

}



export function defaultReference(bookPdf) {

  if (/dark.?designs/i.test(bookPdf)) {

    return 'Nightbane® Dark Designs Sourcebook (WB6)'

  }

  if (/nightbane.*rpg/i.test(bookPdf) || /Nightbane_RPG/i.test(bookPdf)) {

    return 'Nightbane RPG'

  }

  if (/between.*shadows/i.test(bookPdf)) return 'Between the Shadows'

  if (/survival/i.test(bookPdf)) return 'Nightbane Survival Guide'

  if (/nightlands/i.test(bookPdf)) return 'Nightlands'

  if (/glass.darkly/i.test(bookPdf)) return 'Through the Glass Darkly'

  if (/shadows.of.light/i.test(bookPdf)) return 'Shadows of Light'

  return basename(bookPdf).replace(/\.pdf$/i, '')

}



export function bookKeyFromPdf(pdf) {

  if (/dark.?designs/i.test(pdf)) return 'dark_designs'

  if (/nightbane_rpg/i.test(pdf) || /Nightbane_RPG/i.test(pdf)) return 'core'

  if (/between.*shadows/i.test(pdf)) return 'between_the_shadows'

  if (/survival/i.test(pdf)) return 'survival_guide'

  if (/nightlands/i.test(pdf)) return 'nightlands'

  if (/glass.darkly/i.test(pdf)) return 'through_the_glass_darkly'

  if (/shadows.of.light/i.test(pdf)) return 'shadows_of_light'

  return basename(pdf)

    .replace(/\.pdf$/i, '')

    .replace(/[^a-z0-9]+/gi, '_')

    .toLowerCase()

}



/**

 * Normalize legacy single-book manifests to `books[]`.

 * Dark Designs (or explicit authoritative flag) is the description/rules authority.

 */

export function normalizeManifest(raw) {

  if (raw.books?.length) {

    const books = raw.books.map((b) => ({

      key: b.key ?? bookKeyFromPdf(b.pdf),

      pdf: b.pdf,

      reference: b.reference ?? defaultReference(b.pdf),

      tableHeading: b.tableHeading ?? raw.tableHeading,

      authoritative: Boolean(b.authoritative),

      required: b.required !== false,

    }))

    let authoritativeBookKey = raw.authoritativeBookKey

    if (!authoritativeBookKey) {

      const auth = books.find((b) => b.authoritative)

      authoritativeBookKey = auth?.key ?? books[0].key

    }

    for (const b of books) {

      b.authoritative = b.key === authoritativeBookKey

    }

    return { ...raw, books, authoritativeBookKey }

  }



  if (raw.bookPdf) {

    const key = bookKeyFromPdf(raw.bookPdf)

    const authoritative = /dark.?designs/i.test(raw.bookPdf)

    return normalizeManifest({

      ...raw,

      books: [

        {

          key,

          pdf: raw.bookPdf,

          reference: raw.sourceReference ?? defaultReference(raw.bookPdf),

          tableHeading: raw.tableHeading,

          authoritative,

        },

      ],

      authoritativeBookKey: key,

    })

  }



  throw new Error('Manifest must define books[] or legacy bookPdf')

}



export function loadManifest(tableId) {

  const path = manifestPath(tableId)

  if (!existsSync(path)) {

    throw new Error(`Missing manifest: ${path}\nRun: npm run morphus:ingest -- init --id ${tableId} ...`)

  }

  return normalizeManifest(loadJson(path))

}



let ajvInstance

let validateCharacteristic

let validateTableDoc



export function getMorphusValidators() {

  if (!ajvInstance) {

    const morphusCharacteristicSchema = loadJson(

      join(schemasDir, 'palladium-morphus.schema.json'),

    )

    const morphusTableSchema = loadJson(

      join(schemasDir, 'palladium-morphus-table.schema.json'),

    )

    ajvInstance = new Ajv2020({ allErrors: true, strict: false, validateSchema: false })

    addFormats(ajvInstance)

    ajvInstance.addSchema(morphusCharacteristicSchema)

    validateCharacteristic = ajvInstance.compile(morphusCharacteristicSchema)

    validateTableDoc = ajvInstance.compile(morphusTableSchema)

  }

  return { validateCharacteristic, validateTableDoc }

}



/** Clear cached Ajv compilers after palladium-morphus.schema.json changes. */

export function resetMorphusValidators() {

  ajvInstance = undefined

  validateCharacteristic = undefined

  validateTableDoc = undefined

}



/** Top-level keys allowed on a characteristic row (from palladium-morphus.schema.json). */

export function characteristicSchemaKeys() {

  const schema = loadJson(join(schemasDir, 'palladium-morphus.schema.json'))

  return Object.keys(schema.properties ?? {}).filter((k) => k !== '$schema')

}



export function slugifyTraitId(tableId, name) {

  const tableSlug = String(tableId).toLowerCase().replace(/-/g, '_')

  const base = name

    .toLowerCase()

    .replace(/[''\u2019`]/g, '')

    .replace(/[^a-z0-9]+/g, '_')

    .replace(/^_+|_+$/g, '')

  const prefixed = base.startsWith(`${tableSlug}_`) ? base : `${tableSlug}_${base}`

  return prefixed.replace(/_+/g, '_')

}



export function formatAjvErrors(validate) {

  return (validate.errors ?? [])

    .map((e) => `${e.instancePath || '/'} ${e.message}`)

    .join('\n')

}



import { sortSourcesByGenreReferenceOrder } from './genre-source-reference-order.mjs'

/** Build catalog sources[] from merged trait index row. */

export function sourcesFromTraitIndex(trait, gameSystem) {

  const refs = trait.sources ?? []

  const sources = refs.map((s) => ({

    gameSystem,

    reference: s.reference,

    pageNumber: s.pageNumber,

  }))

  return sortSourcesByGenreReferenceOrder(gameSystem, sources)

}


